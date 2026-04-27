import pandas as pd
from backend.main import apply_reweighing_and_retrain, assign_privileged_value

df = pd.read_csv('biased_engineers_v5.csv')
label_col = 'fair_hired'
primary_sensitive = 'gender'
orig_priv_val = assign_privileged_value(df, primary_sensitive, label_col)
original_group_series = df[primary_sensitive].copy()

df_clean = df.drop(columns=[primary_sensitive])

try:
    df_clean, model = apply_reweighing_and_retrain(
        df_clean, label_col,
        sensitive_attr='_placeholder_',
        privileged_group_val=orig_priv_val,
        original_group_series=original_group_series
    )
    print("Success")
except Exception as e:
    import traceback
    print("ERROR:")
    print(traceback.format_exc())
