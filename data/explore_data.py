"""
Data Exploration & Feature Visualization Script
Run this FIRST to understand the raw data structure before running the full pipeline.

Usage:
    python explore_data.py
"""

import pandas as pd
import numpy as np
from pathlib import Path
import sys


def explore_single_file(filepath: str):
    """Load a single parquet file and inspect its structure."""
    print(f"\n{'='*60}")
    print(f"INSPECTING: {filepath}")
    print(f"{'='*60}")
    
    df = pd.read_parquet(filepath)
    
    print(f"\nShape: {df.shape[0]:,} rows × {df.shape[1]} columns")
    print(f"\nColumns: {list(df.columns)}")
    print(f"\nData types:")
    print(df.dtypes.to_string())
    print(f"\nFirst 10 rows:")
    print(df.head(10).to_string())
    print(f"\nBasic stats:")
    print(df.describe().to_string())
    
    # Check for a time/datetime column
    for col in df.columns:
        if df[col].dtype == "datetime64[ns]" or "time" in col.lower() or "date" in col.lower():
            print(f"\nTime column '{col}' range: {df[col].min()} → {df[col].max()}")
    
    # Check if index is a datetime
    if hasattr(df.index, 'dtype') and 'datetime' in str(df.index.dtype):
        print(f"\nDatetime index range: {df.index.min()} → {df.index.max()}")
    
    return df


def explore_all_files(data_dir: str = "data/"):
    """Quick overview of all parquet files."""
    files = sorted(Path(data_dir).glob("nq_ticks_*.parquet"))
    
    if not files:
        print(f"No parquet files found in {data_dir}")
        print("Make sure you've pulled the latest from the repo!")
        return
    
    print(f"Found {len(files)} files:")
    
    total_rows = 0
    for f in files:
        df = pd.read_parquet(f)
        total_rows += len(df)
        print(f"  {f.name}: {len(df):>10,} rows")
    
    print(f"\nTotal: {total_rows:,} ticks across {len(files)} days")
    
    # Inspect first file in detail
    explore_single_file(str(files[0]))


if __name__ == "__main__":
    data_dir = sys.argv[1] if len(sys.argv) > 1 else "data/"
    explore_all_files(data_dir)
