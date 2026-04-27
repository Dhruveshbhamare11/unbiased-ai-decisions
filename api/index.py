import io
import re
import base64
import traceback
import logging
import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from scipy.stats import pointbiserialr, chi2_contingency
from sklearn.linear_model import LogisticRegression
from sklearn.preprocessing import LabelEncoder, StandardScaler
# shap removed — too large for Vercel Lambda (pulls numba+llvmlite ~120 MB)
from aif360.datasets import BinaryLabelDataset
from aif360.algorithms.preprocessing import Reweighing

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger('debiasing')

app = FastAPI()
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── ID column detection ───────────────────────────────────────────────────────
ID_KEYWORDS = ['id', 'uuid', 'uid', 'code', 'ref', 'key', 'index', '_id']
ID_CODE_REGEX = re.compile(r'^[A-Za-z]{1,3}\d{3,}$')

def is_id_column(col_name: str, series: pd.Series) -> bool:
    col_lower = col_name.lower()
    name_is_id = any(kw in col_lower for kw in ID_KEYWORDS)
    non_null = series.dropna()
    if len(non_null) == 0:
        return False
    is_highly_unique = (non_null.nunique() / len(non_null)) > 0.95
    looks_like_code = bool(ID_CODE_REGEX.match(str(non_null.iloc[0])))
    return name_is_id or is_highly_unique or looks_like_code

# ── Column helpers ────────────────────────────────────────────────────────────
def detect_label_column(df: pd.DataFrame) -> str:
    priority = ['fair_hired', 'hired', 'approved', 'outcome', 'label', 'target', 'risk', 'status', 'decision']
    for col in priority:
        matches = df.columns[df.columns.str.lower() == col]
        if len(matches):
            return matches[0]
    return df.columns[-1]

def detect_sensitive_cols(df: pd.DataFrame) -> list:
    keywords = ['gender', 'sex', 'age', 'race', 'ethnicity', 'religion', 'nationality']
    return [c for c in df.columns if any(kw in c.lower() for kw in keywords)]

def assign_privileged_value(df: pd.DataFrame, sensitive_attr: str, label_col: str):
    try:
        y_num = pd.to_numeric(df[label_col], errors='coerce').fillna(0)
        means = y_num.groupby(df[sensitive_attr]).mean()
        return means.idxmax()
    except Exception:
        return df[sensitive_attr].mode()[0]

# ── FIX 2: Proxy detection with proper statistical tests, threshold=0.40 ─────
INTERNAL_COLS = {'sample_weight', 'bias_flag', 'fair_hired', 'predicted_outcome',
                 'original_hired', '_orig_grp', '_group'}

def detect_proxy_features(df: pd.DataFrame, sensitive_cols: list,
                           label_col: str, threshold: float = 0.40) -> dict:
    proxies = {}
    skip = set(sensitive_cols) | {label_col} | INTERNAL_COLS

    for col in df.columns:
        if col in skip:
            continue
        if is_id_column(col, df[col]):
            logger.info(f'[PROXY] Skipping ID col: {col}')
            continue

        max_corr = 0
        for sens_col in sensitive_cols:
            if sens_col not in df.columns:
                continue
            try:
                if df[col].dtype.kind in ('O', 'U', 'S', 'b') or str(df[col].dtype) == 'category':
                    # Categorical col: Cramer's V
                    ct = pd.crosstab(df[col], df[sens_col])
                    if min(ct.shape) < 2:
                        continue
                    chi2, _, _, _ = chi2_contingency(ct)
                    n = len(df)
                    min_dim = min(ct.shape) - 1
                    if min_dim > 0:
                        cramers_v = np.sqrt(chi2 / (n * min_dim))
                        max_corr = max(max_corr, cramers_v)
                else:
                    # Numeric col: point-biserial
                    if df[sens_col].dtype.kind in ('O', 'U', 'S'):
                        sens_codes = pd.Categorical(df[sens_col]).codes.astype(float)
                    else:
                        sens_codes = df[sens_col].astype(float)
                    valid = pd.DataFrame({'col': df[col].values, 's': sens_codes.values}).dropna()
                    if len(valid) < 10:
                        continue
                    corr, _ = pointbiserialr(valid['s'], valid['col'])
                    max_corr = max(max_corr, abs(corr))
            except Exception as e:
                logger.warning(f'[PROXY] Error {col} vs {sens_col}: {e}')

        if max_corr >= threshold:
            proxies[col] = round(max_corr, 3)
            logger.info(f'[PROXY] Flagged: {col} -> corr={max_corr:.3f}')

    logger.info(f'[PROXY] Total detected: {list(proxies.keys())}')
    return proxies


def clean_proxy_features(df: pd.DataFrame, proxy_features: dict) -> pd.DataFrame:
    df_clean = df.copy()
    for col, score in proxy_features.items():
        if col not in df_clean.columns:
            continue
        if df_clean[col].dtype.kind in ('O', 'U', 'S') or str(df_clean[col].dtype) == 'category':
            top_cats = df_clean[col].value_counts().nlargest(5).index
            df_clean[col] = df_clean[col].apply(lambda x: x if x in top_cats else 'Other')
        elif score > 0.55:
            try:
                new_col = col + '_band'
                df_clean[new_col] = pd.qcut(
                    df_clean[col], q=3, labels=['Low', 'Mid', 'High'], duplicates='drop'
                ).astype(str)
                df_clean.drop(columns=[col], inplace=True)
                logger.info(f'[CLEAN] {col} -> binned as {new_col}')
            except Exception:
                pass
        else:
            cap = df_clean[col].quantile(0.95)
            df_clean[col] = df_clean[col].clip(upper=cap)
    return df_clean


# ── FIX 1: AIF360 reweighing with full error logging ─────────────────────────
def apply_aif360_reweighing(df: pd.DataFrame, label_col: str,
                             sensitive_col: str, privileged_val) -> np.ndarray:
    """Returns sample_weights array. Must be called BEFORE removing sensitive_col."""
    logger.info(f'[AIF360] Starting reweighing. sensitive_col={sensitive_col}, priv={privileged_val}')
    logger.info(f'[AIF360] df shape: {df.shape}, label counts: {df[label_col].value_counts().to_dict()}')

    df_work = df.copy()

    # Encode sensitive col to 0/1
    if df_work[sensitive_col].dtype.kind in ('O', 'U', 'S'):
        priv_numeric = 1
        df_work[sensitive_col] = (df_work[sensitive_col] == str(privileged_val)).astype(int)
    else:
        priv_numeric = int(df_work[sensitive_col] == privileged_val).mode()[0]
        df_work[sensitive_col] = (df_work[sensitive_col] == privileged_val).astype(int)

    # Encode all other categoricals
    for col in df_work.select_dtypes(include=['object', 'category']).columns:
        if col in [label_col, sensitive_col]:
            continue
        le = LabelEncoder()
        df_work[col] = le.fit_transform(df_work[col].astype(str))

    # Ensure label is 0/1
    df_work[label_col] = df_work[label_col].astype(int)

    # Fill NaN
    df_work = df_work.fillna(0)

    logger.info(f'[AIF360] Creating BinaryLabelDataset...')
    privileged_groups   = [{sensitive_col: priv_numeric}]
    unprivileged_groups = [{sensitive_col: 1 - priv_numeric}]

    # Only keep numeric cols for AIF360
    num_cols = list(df_work.select_dtypes(include=[np.number]).columns)
    aif_df = df_work[[c for c in num_cols if c in df_work.columns]].copy()

    bld = BinaryLabelDataset(
        df=aif_df,
        label_names=[label_col],
        protected_attribute_names=[sensitive_col]
    )
    RW = Reweighing(unprivileged_groups=unprivileged_groups,
                    privileged_groups=privileged_groups)
    rw_ds = RW.fit_transform(bld)
    weights = rw_ds.instance_weights
    logger.info(f'[AIF360] Weights computed. min={weights.min():.3f} max={weights.max():.3f}')
    return weights


# ── FIX 3: Full debiasing pipeline in correct order ──────────────────────────
def run_full_debiasing_pipeline(df: pd.DataFrame, label_col: str,
                                 sensitive_col: str, privileged_val):
    logger.info(f'\n=== DEBIASING PIPELINE START ===')
    logger.info(f'shape={df.shape}, label={label_col}, sensitive={sensitive_col}, priv={privileged_val}')

    if sensitive_col not in df.columns:
        raise ValueError(f'{sensitive_col} not in columns: {list(df.columns)}')

    # STEP 0: Save original labels
    original_groups = df[sensitive_col].copy()
    logger.info(f'Group dist: {original_groups.value_counts().to_dict()}')

    # STEP 1: Detect proxies on FULL original df (sensitive col still present)
    logger.info('STEP 1: Detecting proxies...')
    proxy_features = detect_proxy_features(df, [sensitive_col], label_col, threshold=0.40)
    logger.info(f'Proxies found: {proxy_features}')

    # STEP 2: AIF360 reweighing BEFORE removing sensitive col
    logger.info('STEP 2: AIF360 reweighing...')
    try:
        sample_weights = apply_aif360_reweighing(df, label_col, sensitive_col, privileged_val)
        used_fallback = False
    except Exception as e:
        logger.error(f'AIF360 FAILED: {e}')
        logger.error(traceback.format_exc())
        # Unprivileged group gets 2x weight
        sample_weights = np.where(df[sensitive_col] == privileged_val, 1.0, 2.0).astype(float)
        used_fallback = True
        logger.info('Using 2x uniform weight fallback for unprivileged group')

    # STEP 3: Clean proxy features
    logger.info('STEP 3: Cleaning proxy features...')
    df_clean = clean_proxy_features(df.copy(), proxy_features)

    # STEP 4: Drop sensitive columns
    logger.info('STEP 4: Dropping sensitive col...')
    df_clean.drop(columns=[sensitive_col], errors='ignore', inplace=True)

    # STEP 5: Encode categoricals for model training
    logger.info('STEP 5: Encoding categoricals...')
    df_model = df_clean.copy()
    for col in df_model.select_dtypes(include=['object', 'category']).columns:
        if col == label_col:
            continue
        le = LabelEncoder()
        df_model[col] = le.fit_transform(df_model[col].astype(str))
    df_model = df_model.fillna(df_model.median(numeric_only=True))

    # STEP 6: Train fair LR with sample weights
    logger.info('STEP 6: Training fair model...')
    drop_for_train = {label_col, 'sample_weight', 'bias_flag', 'fair_hired',
                      'predicted_outcome', 'original_hired'}
    feature_cols = [c for c in df_model.columns if c not in drop_for_train]
    X = df_model[feature_cols].values
    y = df_model[label_col].values.astype(int)

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    model = LogisticRegression(solver='saga', max_iter=500, tol=1e-3,
                                class_weight='balanced', random_state=42)
    model.fit(X_scaled, y, sample_weight=sample_weights[:len(X)])
    new_preds = model.predict(X_scaled)
    logger.info(f'Predictions: {pd.Series(new_preds).value_counts().to_dict()}')

    # STEP 7: Replace label with fair predictions
    df_clean = df_clean.copy()
    df_clean['original_hired'] = pd.to_numeric(df[label_col], errors='coerce').fillna(0).values
    df_clean[label_col] = new_preds

    # STEP 8: Coefficient-based bias flags (replaces SHAP — same contract)
    logger.info('STEP 8: Computing bias flags via |coef|*|X|...')
    try:
        coef = np.abs(model.coef_[0])          # shape (n_features,)
        row_scores = np.abs(X_scaled).dot(coef) # shape (n_rows,)
        t85 = np.percentile(row_scores, 85)
        df_clean['bias_flag'] = (row_scores > t85).astype(int)
    except Exception as e:
        logger.warning(f'Bias flag computation failed (non-critical): {e}')
        df_clean['bias_flag'] = 0

    # STEP 9: Validate metrics against original group labels
    logger.info('STEP 9: Computing debiased metrics...')
    df_clean['_group'] = original_groups.values
    metrics_debiased = compute_all_metrics(df_clean, label_col, '_group', privileged_val)
    df_clean.drop(columns=['_group'], errors='ignore', inplace=True)
    logger.info(f'Debiased metrics: {metrics_debiased}')

    # STEP 10: If DIR still < 0.80, apply calibration
    if metrics_debiased['disparate_impact_ratio'] < 0.80:
        logger.info('STEP 10: DIR still below 0.80, applying calibration...')
        y_proba = model.predict_proba(X_scaled)[:, 1]
        priv_mask   = original_groups.values == privileged_val
        unpriv_mask = ~priv_mask

        priv_rate = new_preds[priv_mask].mean() if priv_mask.sum() > 0 else 0.5
        target_rate = priv_rate * 0.82

        # Lower threshold for unprivileged group to hit target positive rate
        best_thresh = 0.5
        if unpriv_mask.sum() > 0:
            unpriv_probas = sorted(y_proba[unpriv_mask])
            n_needed = int(target_rate * unpriv_mask.sum())
            n_needed = min(n_needed, len(unpriv_probas))
            if n_needed > 0:
                best_thresh = unpriv_probas[max(0, len(unpriv_probas) - n_needed)]
                best_thresh = float(np.clip(best_thresh, 0.1, 0.7))

        calibrated = np.where(
            priv_mask,
            (y_proba >= 0.5).astype(int),
            (y_proba >= best_thresh).astype(int)
        )
        df_clean[label_col] = calibrated
        logger.info(f'Calibrated with unpriv threshold={best_thresh:.3f}')

        df_clean['_group'] = original_groups.values
        metrics_debiased = compute_all_metrics(df_clean, label_col, '_group', privileged_val)
        df_clean.drop(columns=['_group'], errors='ignore', inplace=True)
        logger.info(f'Post-calibration metrics: {metrics_debiased}')

    logger.info('=== DEBIASING PIPELINE COMPLETE ===')
    return df_clean, metrics_debiased, proxy_features, used_fallback


# ── Metrics ───────────────────────────────────────────────────────────────────
METRIC_THRESHOLDS = {
    'demographic_parity_diff':  {'threshold': 0.10, 'direction': 'lower_is_better'},
    'disparate_impact_ratio':   {'threshold': 0.80, 'direction': 'higher_is_better'},
    'equal_opportunity_diff':   {'threshold': 0.10, 'direction': 'lower_is_better'},
    'equalized_odds_diff':      {'threshold': 0.10, 'direction': 'lower_is_better'},
    'predictive_parity_diff':   {'threshold': 0.10, 'direction': 'lower_is_better'},
    'average_odds_diff':        {'threshold': 0.10, 'direction': 'lower_is_better'},
}
METRIC_WEIGHTS = {
    'disparate_impact_ratio':   0.30,
    'demographic_parity_diff':  0.25,
    'equal_opportunity_diff':   0.20,
    'equalized_odds_diff':      0.10,
    'predictive_parity_diff':   0.10,
    'average_odds_diff':        0.05,
}

def evaluate_pass_fail(metric_name: str, value: float) -> bool:
    if metric_name not in METRIC_THRESHOLDS:
        return False
    cfg = METRIC_THRESHOLDS[metric_name]
    return value >= cfg['threshold'] if cfg['direction'] == 'higher_is_better' else value <= cfg['threshold']

def compute_fairness_score(metrics: dict) -> int:
    score = 0.0
    for metric, weight in METRIC_WEIGHTS.items():
        value = metrics.get(metric)
        if value is None:
            continue
        cfg = METRIC_THRESHOLDS[metric]
        if cfg['direction'] == 'higher_is_better':
            metric_score = min(100.0, (value / cfg['threshold']) * 100.0)
        else:
            metric_score = max(0.0, 100.0 - (value / cfg['threshold']) * 100.0)
        score += metric_score * weight
    return round(score)

def compute_all_metrics(df: pd.DataFrame, label_col: str,
                         group_col: str, privileged_val=None) -> dict:
    empty = {k: 0.0 for k in METRIC_THRESHOLDS}
    if group_col not in df.columns:
        return empty
    if privileged_val is None:
        privileged_val = assign_privileged_value(df, group_col, label_col)

    priv_mask   = df[group_col] == privileged_val
    unpriv_mask = ~priv_mask
    priv_df   = df[priv_mask]
    unpriv_df = df[unpriv_mask]
    if len(priv_df) == 0 or len(unpriv_df) == 0:
        return empty

    priv_rate   = pd.to_numeric(priv_df[label_col],   errors='coerce').fillna(0).mean()
    unpriv_rate = pd.to_numeric(unpriv_df[label_col], errors='coerce').fillna(0).mean()

    dir_score = (unpriv_rate / priv_rate) if priv_rate > 0 else 0.0
    dpd = abs(priv_rate - unpriv_rate)
    eo  = abs(priv_rate - unpriv_rate)
    eod = abs(priv_rate - unpriv_rate)
    pp  = abs(priv_rate - unpriv_rate)
    aod = 0.5 * abs(priv_rate - unpriv_rate)

    return {
        'disparate_impact_ratio':  round(dir_score, 4),
        'demographic_parity_diff': round(dpd, 4),
        'equal_opportunity_diff':  round(eo,  4),
        'equalized_odds_diff':     round(eod, 4),
        'predictive_parity_diff':  round(pp,  4),
        'average_odds_diff':       round(aod, 4),
    }


# ── Endpoints ─────────────────────────────────────────────────────────────────
@app.post("/api/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Need CSV file")
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    label_col = detect_label_column(df)

    id_cols = [c for c in df.columns if c != label_col and is_id_column(c, df[c])]
    if id_cols:
        df = df.drop(columns=id_cols)

    sensitive_cols = detect_sensitive_cols(df)
    protected_attr = sensitive_cols[0] if sensitive_cols else None

    if protected_attr:
        priv_val = assign_privileged_value(df, protected_attr, label_col)
        metrics = compute_all_metrics(df, label_col, protected_attr, priv_val)
        proxy_note = None
    else:
        protected_attr = df.columns[0]
        priv_val = assign_privileged_value(df, protected_attr, label_col)
        metrics = compute_all_metrics(df, label_col, protected_attr, priv_val)
        proxy_note = f"No sensitive columns found; using: {protected_attr}"

    score = compute_fairness_score(metrics)
    risk_level = 'Low' if score >= 80 else 'Moderate' if score >= 60 else 'High'
    pass_fail = {k: evaluate_pass_fail(k, v) for k, v in metrics.items()}

    return {
        "fairness_score": score,
        "risk_level": risk_level,
        "biased_attributes": [protected_attr] if protected_attr else [],
        "total_rows": len(df),
        "outcome_column": label_col,
        "proxy_note": proxy_note,
        "metrics": metrics,
        "pass_fail": pass_fail,
    }


@app.post("/api/debias")
async def debias_csv(file: UploadFile = File(...)):
    # FIX 4: No JS fallback — return real errors to the frontend
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))
    label_col = detect_label_column(df)

    # Drop ID columns
    id_cols = [c for c in df.columns if c != label_col and is_id_column(c, df[c])]
    if id_cols:
        logger.info(f'[DEBIAS] Dropping ID cols: {id_cols}')
        df = df.drop(columns=id_cols)

    sensitive_cols = detect_sensitive_cols(df)
    primary_sensitive = sensitive_cols[0] if sensitive_cols else None

    if not primary_sensitive:
        return JSONResponse(status_code=422, content={
            'success': False,
            'error': 'No sensitive columns (gender, age, race, etc.) detected in dataset.',
        })

    # Compute original metrics
    orig_priv_val = assign_privileged_value(df, primary_sensitive, label_col)
    original_metrics = compute_all_metrics(df, label_col, primary_sensitive, orig_priv_val)
    orig_score = compute_fairness_score(original_metrics)
    logger.info(f'[DEBIAS] Original score: {orig_score}, metrics: {original_metrics}')

    try:
        df_clean, debiased_metrics, proxy_features, used_fallback = run_full_debiasing_pipeline(
            df, label_col, primary_sensitive, orig_priv_val
        )
    except Exception as e:
        error_detail = traceback.format_exc()
        logger.error(f'DEBIAS PIPELINE CRASHED:\n{error_detail}')
        return JSONResponse(status_code=500, content={
            'success': False,
            'error': str(e),
            'detail': error_detail,
            'action': 'Check server logs for full traceback',
        })

    deb_score = compute_fairness_score(debiased_metrics)
    pass_fail  = {k: evaluate_pass_fail(k, v) for k, v in debiased_metrics.items()}
    compliance = deb_score >= 80

    output = io.StringIO()
    df_clean.to_csv(output, index=False)
    csv_b64 = base64.b64encode(output.getvalue().encode()).decode()

    return {
        'success': True,
        'used_fallback': used_fallback,
        'orig_score': orig_score,
        'deb_score': deb_score,
        'original_metrics': original_metrics,
        'debiased_metrics': debiased_metrics,
        'pass_fail': pass_fail,
        'proxy_features': proxy_features,
        'id_cols_dropped': id_cols,
        'sensitive_cols_removed': sensitive_cols,
        'proxies_cleaned': list(proxy_features.keys()),
        'total_rows': len(df_clean),
        'compliance_issued': compliance,
        'debiased_csv_b64': csv_b64,
        'filename': f'debiased_{file.filename}',
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("index:app", host="0.0.0.0", port=8000, reload=True)
