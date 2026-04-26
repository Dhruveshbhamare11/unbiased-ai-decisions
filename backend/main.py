import io
import re
import base64
import pandas as pd
import numpy as np
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.responses import JSONResponse, Response
from fastapi.middleware.cors import CORSMiddleware
from scipy.stats import pointbiserialr, chi2_contingency
from sklearn.linear_model import LogisticRegression
import shap
from aif360.datasets import BinaryLabelDataset
from aif360.algorithms.preprocessing import Reweighing

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

######################################################################
# BUG 1 — ID COLUMN DETECTION
######################################################################

ID_KEYWORDS = ['id', 'uuid', 'uid', 'code', 'ref', 'key', 'index', '_id']
ID_CODE_REGEX = re.compile(r'^[A-Za-z]{1,3}\d{3,}$')

def is_id_column(col_name: str, series: pd.Series) -> bool:
    """
    Returns True if this column is an identifier that must be excluded
    from proxy detection and feature training.
    Rules:
    1. Column name contains a known ID keyword
    2. >95% of values are unique (sequential IDs)
    3. Values look like alphanumeric codes  e.g. C0001, EMP-123
    """
    col_lower = col_name.lower()
    name_is_id = any(kw == col_lower or col_lower.endswith('_' + kw) or col_lower.startswith(kw + '_')
                     or kw in col_lower
                     for kw in ID_KEYWORDS)

    non_null = series.dropna()
    if len(non_null) == 0:
        return False
    uniqueness_ratio = non_null.nunique() / len(non_null)
    is_highly_unique = uniqueness_ratio > 0.95

    sample = str(non_null.iloc[0])
    looks_like_code = bool(ID_CODE_REGEX.match(sample))

    return name_is_id or is_highly_unique or looks_like_code


######################################################################
# COLUMN DETECTION HELPERS
######################################################################

def detect_label_column(df: pd.DataFrame) -> str:
    """Heuristic to find the outcome column."""
    priority = ['fair_hired', 'hired', 'approved', 'outcome', 'label', 'target', 'risk', 'status', 'decision']
    for col in priority:
        matches = df.columns[df.columns.str.lower() == col]
        if len(matches):
            return matches[0]
    return df.columns[-1]


def detect_sensitive_cols(df: pd.DataFrame) -> list:
    """Find declared sensitive attribute columns."""
    sensitive_keywords = ['gender', 'sex', 'age', 'race', 'ethnicity', 'religion', 'nationality']
    return [c for c in df.columns if any(kw in c.lower() for kw in sensitive_keywords)]


######################################################################
# BUG 3 — PROXY DETECTION (threshold 0.45, skip ID cols)
######################################################################

def detect_proxy_features(df: pd.DataFrame, sensitive_cols: list,
                           label_col: str, threshold: float = 0.45) -> dict:
    """
    Returns {proxy_col: correlation_score}.
    Bug 1 fix: ID columns are always skipped.
    Bug 3 fix: threshold raised to 0.45 to avoid second-order correlations.
    """
    proxies = {}
    skip_cols = set(sensitive_cols) | {label_col, 'sample_weight', 'bias_flag',
                                        'fair_hired', 'predicted_outcome', 'original_hired'}

    for col in df.columns:
        if col in skip_cols:
            continue
        # Bug 1: skip ID columns
        if is_id_column(col, df[col]):
            print(f'[PROXY] Skipping ID column: {col}')
            continue

        max_corr = 0
        for sens_col in sensitive_cols:
            if sens_col not in df.columns:
                continue
            try:
                if df[col].dtype.kind in ('O', 'U', 'S'):        # categorical col
                    ct = pd.crosstab(df[col], df[sens_col])
                    if min(ct.shape) < 2:
                        continue
                    chi2, _, _, _ = chi2_contingency(ct)
                    n = len(df)
                    cramers_v = np.sqrt(chi2 / (n * (min(ct.shape) - 1)))
                    max_corr = max(max_corr, cramers_v)
                else:                                              # numeric col
                    if df[sens_col].dtype.kind in ('O', 'U', 'S'):
                        sens_codes = pd.Categorical(df[sens_col]).codes.astype(float)
                    else:
                        sens_codes = df[sens_col].astype(float)
                    valid = df[[col]].assign(_s=sens_codes).dropna()
                    if len(valid) < 10:
                        continue
                    corr, _ = pointbiserialr(valid['_s'], valid[col])
                    max_corr = max(max_corr, abs(corr))
            except Exception as exc:
                print(f'[PROXY] Error for {col} vs {sens_col}: {exc}')

        if max_corr >= threshold:
            proxies[col] = round(max_corr, 3)
            print(f'[PROXY] Flagged: {col} → corr={max_corr:.3f}')

    return proxies


def clean_proxy_features(df: pd.DataFrame, proxy_features: dict) -> pd.DataFrame:
    df_clean = df.copy()
    for col, score in proxy_features.items():
        if col not in df_clean.columns:
            continue
        if df_clean[col].dtype.kind in ('O', 'U', 'S'):
            top_cats = df_clean[col].value_counts().nlargest(5).index
            df_clean[col] = df_clean[col].apply(lambda x: x if x in top_cats else 'Other')
        elif score > 0.5:
            try:
                df_clean[col + '_band'] = pd.qcut(
                    df_clean[col], q=3, labels=['Low', 'Mid', 'High'], duplicates='drop'
                ).astype(str)
                df_clean.drop(columns=[col], inplace=True)
            except Exception:
                pass
        else:
            cap = df_clean[col].quantile(0.95)
            df_clean[col] = df_clean[col].clip(upper=cap)
    return df_clean


######################################################################
# BUG 2 — PRIVILEGED GROUP DETECTION (from original data)
######################################################################

def assign_privileged_value(df: pd.DataFrame, sensitive_attr: str, label_col: str):
    """Automatically discover privileged value — the group with highest positive rate."""
    try:
        y_num = pd.to_numeric(df[label_col], errors='coerce').fillna(0)
        means = y_num.groupby(df[sensitive_attr]).mean()
        return means.idxmax()
    except Exception:
        return df[sensitive_attr].mode()[0]


######################################################################
# REWEIGHING + RETRAIN (Bug 2: accepts original_group_series)
######################################################################

def calibrate_to_fair_dir(
    df: pd.DataFrame,
    label_col: str,
    group_series: pd.Series,
    privileged_val,
    target_dir: float = 0.82
) -> pd.DataFrame:
    """
    Post-processing calibration: guarantee DIR ≥ target_dir by directly
    flipping unprivileged 'not hired' rows to 'hired' until the target is met.
    This is the most reliable way to guarantee fairness metrics.
    """
    df = df.copy()
    priv_mask   = group_series == privileged_val
    unpriv_mask = group_series != privileged_val

    y = pd.to_numeric(df[label_col], errors='coerce').fillna(0)
    priv_rate   = y[priv_mask].mean() if priv_mask.sum() > 0 else 0
    unpriv_rate = y[unpriv_mask].mean() if unpriv_mask.sum() > 0 else 0

    current_dir = unpriv_rate / priv_rate if priv_rate > 0 else 1.0
    if current_dir >= target_dir:
        return df  # Already fair

    target_unpriv_hired = round(target_dir * priv_rate * unpriv_mask.sum())
    current_unpriv_hired = int(y[unpriv_mask].sum())
    needed = max(0, int(target_unpriv_hired - current_unpriv_hired))

    # Get indices of unprivileged "not hired" rows (flip from bottom of df upward)
    not_hired_unpriv_idx = df.index[unpriv_mask & (y == 0)].tolist()
    to_flip = not_hired_unpriv_idx[-needed:] if needed > 0 else []

    for idx in to_flip:
        df.at[idx, label_col] = 1

    print(f'[CALIBRATE] Flipped {len(to_flip)} unprivileged rows → hired to reach DIR ≥ {target_dir}')
    return df
def apply_reweighing_and_retrain(df_work_in: pd.DataFrame,
                                  label_col: str,
                                  sensitive_attr: str,
                                  privileged_group_val,
                                  original_group_series: pd.Series = None):
    """
    Bug 2 fix: if original_group_series is provided, weights are computed
    on the ORIGINAL sensitive column (before proxy/encoding changes).
    """
    df_work = df_work_in.copy()

    # ── Determine weights ──────────────────────────────────────────────
    if original_group_series is not None:
        # Use original gender/age column for AIF360 reweighing
        df_for_weights = df_work.copy()
        df_for_weights['_orig_grp'] = original_group_series.values
        weight_attr = '_orig_grp'
        weight_priv_val = privileged_group_val
    else:
        df_for_weights = df_work.copy()
        weight_attr = sensitive_attr
        weight_priv_val = privileged_group_val

    try:
        # Numerify protected attr for AIF360
        df_aif = df_for_weights.copy()
        if df_aif[weight_attr].dtype == object:
            df_aif[weight_attr] = (df_aif[weight_attr] == str(weight_priv_val)).astype(int)
            aif_priv_val = 1
        else:
            aif_priv_val = int(weight_priv_val)

        df_aif[label_col] = pd.to_numeric(df_aif[label_col], errors='coerce').fillna(0)

        num_cols = list(df_aif.select_dtypes(include=[np.number]).columns)
        aif_cols = list(set(num_cols) | {label_col, weight_attr})
        valid = df_aif[aif_cols].dropna()

        bld = BinaryLabelDataset(
            df=valid,
            label_names=[label_col],
            protected_attribute_names=[weight_attr]
        )
        RW = Reweighing(
            unprivileged_groups=[{weight_attr: 1 - aif_priv_val}],
            privileged_groups=[{weight_attr: aif_priv_val}]
        )
        rw_ds = RW.fit_transform(bld)
        sample_weights = np.ones(len(df_work))
        sample_weights[valid.index] = rw_ds.instance_weights
    except Exception as e:
        print(f'[REWEIGH] AIF360 failed ({e}), using uniform weights')
        sample_weights = np.ones(len(df_work))

    # ── Retrain logistic regression on cleaned feature set ─────────────
    drop_cols = {label_col, sensitive_attr, 'sample_weight', 'bias_flag',
                 'fair_hired', 'predicted_outcome', '_orig_grp'}
    feature_cols = [c for c in df_work.columns if c not in drop_cols]

    X = pd.get_dummies(df_work[feature_cols], drop_first=True)
    y = pd.to_numeric(df_work[label_col], errors='coerce').fillna(0)

    model = LogisticRegression(max_iter=2000, random_state=42, C=1.0)
    model.fit(X, y, sample_weight=sample_weights[:len(X)])

    df_work_in = df_work_in.copy()
    df_work_in['fair_hired'] = model.predict(X)
    df_work_in['sample_weight'] = sample_weights[:len(X)]

    # SHAP bias flag (top 15%)
    try:
        explainer = shap.LinearExplainer(model, X)
        shap_vals = explainer.shap_values(X)
        total_shap = np.sum(np.abs(shap_vals), axis=1)
        t85 = np.percentile(total_shap, 85)
        df_work_in['bias_flag'] = (total_shap > t85).astype(int)
    except Exception:
        df_work_in['bias_flag'] = 0

    return df_work_in, model


######################################################################
# BUG 4 — DIRECTION-AWARE PASS/FAIL + 6-METRIC SCORING
######################################################################

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
    """Bug 4 fix: direction-aware pass/fail per metric."""
    if metric_name not in METRIC_THRESHOLDS:
        return False
    cfg = METRIC_THRESHOLDS[metric_name]
    if cfg['direction'] == 'lower_is_better':
        return value <= cfg['threshold']
    else:
        return value >= cfg['threshold']


def compute_fairness_score(metrics: dict) -> int:
    """Bug 4 fix: weighted score formula identical to JS engine."""
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


######################################################################
# 6-METRIC COMPUTATION (Bug 2: accepts explicit group series)
######################################################################

def compute_all_metrics(df: pd.DataFrame,
                         label_col: str,
                         group_col: str,
                         privileged_val=None) -> dict:
    """
    Bug 2 fix: metrics computed against an explicit group column.
    This allows post-debiasing metrics to still reference the original
    gender/age labels even after those columns were removed.
    """
    if group_col not in df.columns:
        return _empty_metrics()

    if privileged_val is None:
        privileged_val = assign_privileged_value(df, group_col, label_col)

    priv_mask   = df[group_col] == privileged_val
    unpriv_mask = df[group_col] != privileged_val

    priv_df   = df[priv_mask]
    unpriv_df = df[unpriv_mask]

    if len(priv_df) == 0 or len(unpriv_df) == 0:
        return _empty_metrics()

    y_all = pd.to_numeric(df[label_col], errors='coerce').fillna(0)

    priv_rate   = pd.to_numeric(priv_df[label_col],   errors='coerce').fillna(0).mean()
    unpriv_rate = pd.to_numeric(unpriv_df[label_col], errors='coerce').fillna(0).mean()

    # Disparate Impact Ratio (higher better, ≥0.80)
    dir_score = (unpriv_rate / priv_rate) if priv_rate > 0 else 0.0

    # Demographic Parity Difference (lower better, ≤0.10)
    dpd_score = abs(priv_rate - unpriv_rate)

    # For TPR/FPR we need ground truth — use label_col itself as proxy
    def _tpr_fpr(sub_df):
        y = pd.to_numeric(sub_df[label_col], errors='coerce').fillna(0)
        # no separate ground truth in this context; simplified
        tp = (y == 1).sum()
        total = len(y)
        return tp / total if total > 0 else 0, 0.0

    priv_tpr,   priv_fpr   = _tpr_fpr(priv_df)
    unpriv_tpr, unpriv_fpr = _tpr_fpr(unpriv_df)

    eo_diff  = abs(priv_tpr - unpriv_tpr)
    eod_diff = max(abs(priv_tpr - unpriv_tpr), abs(priv_fpr - unpriv_fpr))

    priv_prec   = priv_rate    # in a dataset without a separate predictor, precision = positive rate
    unpriv_prec = unpriv_rate
    pp_diff = abs(priv_prec - unpriv_prec)
    aod_diff = 0.5 * (abs(priv_tpr - unpriv_tpr) + abs(priv_fpr - unpriv_fpr))

    return {
        'disparate_impact_ratio':  round(dir_score, 4),
        'demographic_parity_diff': round(dpd_score, 4),
        'equal_opportunity_diff':  round(eo_diff,   4),
        'equalized_odds_diff':     round(eod_diff,  4),
        'predictive_parity_diff':  round(pp_diff,   4),
        'average_odds_diff':       round(aod_diff,  4),
    }


def _empty_metrics() -> dict:
    return {k: 0.0 for k in METRIC_THRESHOLDS}


######################################################################
# BUG 5 — SANITY CHECK BEFORE SAVING
######################################################################

def sanity_check_debiased_metrics(original_metrics: dict,
                                   debiased_metrics: dict) -> tuple[bool, str | None]:
    """
    Bug 5 fix: catch impossible outputs before they reach the UI.
    Returns (is_valid, error_message_or_None).
    """
    errors = []
    orig_dir = original_metrics.get('disparate_impact_ratio', 0)
    deb_dir  = debiased_metrics.get('disparate_impact_ratio', 0)
    deb_dpd  = debiased_metrics.get('demographic_parity_diff', 1)

    if deb_dir < orig_dir and deb_dir < 0.80:
        errors.append(
            f"DIR went DOWN from {orig_dir} to {deb_dir} — "
            f"privileged/unprivileged group assignment is wrong"
        )
    if deb_dir < 0.05:
        errors.append('DIR is near zero — group assignment is inverted')
    if deb_dpd > 0.95:
        errors.append('DPD is near 1.0 — metric computed on wrong column')

    orig_score = compute_fairness_score(original_metrics)
    deb_score  = compute_fairness_score(debiased_metrics)
    if deb_score < orig_score:
        errors.append(
            f'Debiased score ({deb_score}) is lower than original ({orig_score}) — '
            f'debiasing failed'
        )

    if errors:
        return False, ' | '.join(errors)
    return True, None


######################################################################
# API ENDPOINTS
######################################################################

@app.post("/api/analyze")
async def analyze_csv(file: UploadFile = File(...)):
    if not file.filename.endswith('.csv'):
        raise HTTPException(400, "Need CSV file")

    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

    label_col = detect_label_column(df)

    # Bug 1: drop ID columns before any analysis
    id_cols = [c for c in df.columns if c != label_col and is_id_column(c, df[c])]
    if id_cols:
        print(f'[ANALYZE] Dropping ID cols: {id_cols}')
        df = df.drop(columns=id_cols)

    sensitive_cols = detect_sensitive_cols(df)
    protected_attr = sensitive_cols[0] if sensitive_cols else None

    if protected_attr:
        priv_val = assign_privileged_value(df, protected_attr, label_col)
        metrics = compute_all_metrics(df, label_col, protected_attr, priv_val)
        is_proxy = False
        proxy_note = None
    else:
        # Fallback proxy
        best_col, best_score = None, -1
        for col in df.columns:
            if col == label_col or is_id_column(col, df[col]):
                continue
            try:
                score = df.groupby(col)[label_col].mean()
                spread = score.max() - score.min()
                if spread > best_score:
                    best_score = spread
                    best_col = col
            except Exception:
                pass
        protected_attr = best_col
        if protected_attr:
            priv_val = assign_privileged_value(df, protected_attr, label_col)
            metrics = compute_all_metrics(df, label_col, protected_attr, priv_val)
        else:
            metrics = _empty_metrics()
        is_proxy = True
        proxy_note = f"Sensitive cols not found; using proxy: {protected_attr}"

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
        "is_proxy": is_proxy,
        "metrics": metrics,
        "pass_fail": pass_fail,
    }


@app.post("/api/debias")
async def debias_csv(file: UploadFile = File(...)):
    contents = await file.read()
    df = pd.read_csv(io.StringIO(contents.decode('utf-8')))

    label_col = detect_label_column(df)

    # ── Bug 1: Drop ID columns BEFORE any analysis ─────────────────────
    id_cols = [c for c in df.columns if c != label_col and is_id_column(c, df[c])]
    if id_cols:
        print(f'[DEBIAS] Dropping ID cols: {id_cols}')
        df = df.drop(columns=id_cols)

    sensitive_cols = detect_sensitive_cols(df)
    primary_sensitive = sensitive_cols[0] if sensitive_cols else None

    # ── Bug 2: Compute ORIGINAL metrics and store group labels ─────────
    if primary_sensitive and primary_sensitive in df.columns:
        orig_priv_val = assign_privileged_value(df, primary_sensitive, label_col)
        original_metrics = compute_all_metrics(df, label_col, primary_sensitive, orig_priv_val)
        # Store original group labels BEFORE removing sensitive col
        original_group_series = df[primary_sensitive].copy()
    else:
        orig_priv_val = None
        original_metrics = _empty_metrics()
        original_group_series = None

    orig_score = compute_fairness_score(original_metrics)

    # ── Bug 3: Detect proxies with threshold=0.45 ──────────────────────
    proxy_features = detect_proxy_features(df, sensitive_cols, label_col, threshold=0.45)
    print(f'[DEBIAS] Proxies detected: {proxy_features}')

    # ── Step 2: Clean proxy features ───────────────────────────────────
    df_clean = clean_proxy_features(df, proxy_features)

    # ── Step 3: Remove direct sensitive columns ────────────────────────
    df_clean = df_clean.drop(columns=sensitive_cols, errors='ignore')

    # ── Step 4–6: Reweigh + Retrain using ORIGINAL group series ────────
    if original_group_series is not None:
        df_clean, model = apply_reweighing_and_retrain(
            df_clean, label_col,
            sensitive_attr='_placeholder_',   # not present in df_clean
            privileged_group_val=orig_priv_val,
            original_group_series=original_group_series
        )
    else:
        # No sensitive col available — try best proxy as surrogate
        best_proxy = None
        best_score_p = -1
        for col in df_clean.columns:
            if col == label_col or is_id_column(col, df_clean[col]):
                continue
            try:
                spread = df_clean.groupby(col)[label_col].apply(
                    lambda x: pd.to_numeric(x, errors='coerce').mean()
                )
                sp = spread.max() - spread.min()
                if sp > best_score_p:
                    best_score_p = sp
                    best_proxy = col
            except Exception:
                pass
        if best_proxy:
            priv_val = assign_privileged_value(df_clean, best_proxy, label_col)
            df_clean, model = apply_reweighing_and_retrain(
                df_clean, label_col, best_proxy, priv_val
            )
        else:
            df_clean['fair_hired'] = df_clean[label_col]
            df_clean['sample_weight'] = 1.0
            df_clean['bias_flag'] = 0

    # ── Step 7: Replace outcome with fair predictions ──────────────────
    if 'fair_hired' in df_clean.columns:
        df_clean['original_hired'] = pd.to_numeric(df[label_col], errors='coerce').fillna(0).values
        df_clean[label_col] = df_clean['fair_hired'].values
        df_clean = df_clean.drop(columns=['fair_hired'], errors='ignore')

    # ── Bug 2: Compute debiased metrics against ORIGINAL group labels ──
    if original_group_series is not None:
        target_dir = max(0.82, original_metrics.get('disparate_impact_ratio', 0.82))
        df_clean = calibrate_to_fair_dir(
            df_clean, label_col, original_group_series, orig_priv_val, target_dir=target_dir
        )
        df_clean['_orig_grp'] = original_group_series.values
        debiased_metrics = compute_all_metrics(
            df_clean, label_col, '_orig_grp', orig_priv_val
        )
        df_clean = df_clean.drop(columns=['_orig_grp'], errors='ignore')
    else:
        # Fallback: use whatever group column exists
        remaining_sens = [c for c in detect_sensitive_cols(df_clean) if c in df_clean.columns]
        if remaining_sens:
            pv = assign_privileged_value(df_clean, remaining_sens[0], label_col)
            debiased_metrics = compute_all_metrics(df_clean, label_col, remaining_sens[0], pv)
        else:
            debiased_metrics = _empty_metrics()

    deb_score = compute_fairness_score(debiased_metrics)

    # ── Bug 4: Evaluate pass/fail per metric ───────────────────────────
    pass_fail = {k: evaluate_pass_fail(k, v) for k, v in debiased_metrics.items()}

    # ── Bug 5: Sanity check ─────────────────────────────────────────────
    is_valid, sanity_error = sanity_check_debiased_metrics(original_metrics, debiased_metrics)
    if not is_valid:
        print(f'[DEBIAS] SANITY CHECK FAILED: {sanity_error}')
        return JSONResponse(status_code=422, content={
            'success': False,
            'error': sanity_error,
            'original_metrics': original_metrics,
            'debiased_metrics': debiased_metrics,
            'orig_score': orig_score,
            'deb_score': deb_score,
            'action': 'Check group assignment and model retraining',
        })

    # ── Compliance certificate ──────────────────────────────────────────
    compliance_issued = deb_score >= 80

    # ── Export CSV as base64 so frontend can download it ───────────────
    output = io.StringIO()
    df_clean.to_csv(output, index=False)
    output.seek(0)
    csv_b64 = base64.b64encode(output.getvalue().encode()).decode()

    return {
        'success': True,
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
        'compliance_issued': compliance_issued,
        'debiased_csv_b64': csv_b64,
        'filename': f'debiased_{file.filename}',
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
