"""
Feature Analysis & Visualization
Run AFTER features.py to analyze and visualize the computed features.

Generates plots and stats useful for the strategy team (Naman, Varnika).

Usage:
    python analyze_features.py
"""

import pandas as pd
import numpy as np
import matplotlib.pyplot as plt
import matplotlib.dates as mdates
from pathlib import Path
import sys


def load_features(path: str = "nq_features.parquet") -> pd.DataFrame:
    """Load the feature DataFrame."""
    if not Path(path).exists():
        print(f"Feature file not found at {path}")
        print("Run features.py first: python features.py")
        sys.exit(1)
    return pd.read_parquet(path)


def plot_delta_divergence(df: pd.DataFrame, date: str = None):
    """
    Plot Jeremy's key observation: delta divergence leading to reversals.
    Shows price, delta, and absorption signals.
    """
    if date:
        mask = df.index.date == pd.Timestamp(date).date()
        day = df[mask]
    else:
        # Use first available day
        dates = df.index.date
        day = df[df.index.date == dates[0]]
    
    fig, axes = plt.subplots(4, 1, figsize=(16, 12), sharex=True,
                              gridspec_kw={"height_ratios": [3, 1, 1, 1]})
    
    # Price with VWAP
    ax = axes[0]
    ax.plot(day.index, day["close"], label="Close", color="black", linewidth=1)
    ax.plot(day.index, day["vwap"], label="VWAP", color="blue", linewidth=1, linestyle="--")
    if "vwap_upper1" in day.columns:
        ax.fill_between(day.index, day["vwap_lower1"], day["vwap_upper1"], 
                        alpha=0.1, color="blue", label="VWAP ±1σ")
    ax.plot(day.index, day["poc"], ".", color="orange", markersize=3, alpha=0.5, label="POC")
    ax.set_ylabel("Price")
    ax.legend(loc="upper left", fontsize=8)
    ax.set_title(f"NQ Futures - {day.index[0].date()}")
    ax.grid(True, alpha=0.3)
    
    # Delta bars
    ax = axes[1]
    colors = ["green" if d > 0 else "red" for d in day["delta"]]
    ax.bar(day.index, day["delta"], color=colors, width=pd.Timedelta("45s"), alpha=0.7)
    ax.axhline(0, color="black", linewidth=0.5)
    ax.set_ylabel("Net Delta")
    ax.grid(True, alpha=0.3)
    
    # Absorption signal
    ax = axes[2]
    ax.plot(day.index, day["absorption"], color="purple", linewidth=1)
    ax.axhline(0, color="black", linewidth=0.5)
    ax.axhline(0.3, color="green", linewidth=0.5, linestyle="--", alpha=0.5)
    ax.axhline(-0.3, color="red", linewidth=0.5, linestyle="--", alpha=0.5)
    ax.set_ylabel("Absorption")
    ax.grid(True, alpha=0.3)
    
    # Volume with buy/sell coloring
    ax = axes[3]
    ax.bar(day.index, day["buy_vol"], color="green", width=pd.Timedelta("45s"), 
           alpha=0.6, label="Buy Vol")
    ax.bar(day.index, -day["sell_vol"], color="red", width=pd.Timedelta("45s"), 
           alpha=0.6, label="Sell Vol")
    ax.axhline(0, color="black", linewidth=0.5)
    ax.set_ylabel("Volume")
    ax.legend(loc="upper left", fontsize=8)
    ax.grid(True, alpha=0.3)
    
    ax.xaxis.set_major_formatter(mdates.DateFormatter("%H:%M"))
    plt.tight_layout()
    plt.savefig("delta_divergence_analysis.png", dpi=150, bbox_inches="tight")
    plt.show()
    print("Saved: delta_divergence_analysis.png")


def plot_feature_correlations(df: pd.DataFrame):
    """Correlation matrix of key features."""
    key_cols = [
        "returns", "delta", "delta_pct", "close_vs_poc", "absorption",
        "vol_skew", "imbalance_buy", "imbalance_sell",
        "dist_vwap_pct", "session_cum_delta", "delta_divergence",
        "volatility_15", "atr_14", "momentum_15", "rsi_14",
        "session_position", "vpin_20", "buy_pressure", "vol_zscore"
    ]
    available = [c for c in key_cols if c in df.columns]
    
    corr = df[available].corr()
    
    fig, ax = plt.subplots(figsize=(14, 12))
    im = ax.imshow(corr, cmap="RdBu_r", vmin=-1, vmax=1)
    ax.set_xticks(range(len(available)))
    ax.set_yticks(range(len(available)))
    ax.set_xticklabels(available, rotation=45, ha="right", fontsize=8)
    ax.set_yticklabels(available, fontsize=8)
    
    # Add correlation values
    for i in range(len(available)):
        for j in range(len(available)):
            val = corr.iloc[i, j]
            color = "white" if abs(val) > 0.5 else "black"
            ax.text(j, i, f"{val:.2f}", ha="center", va="center", 
                   fontsize=6, color=color)
    
    plt.colorbar(im, ax=ax, shrink=0.8)
    ax.set_title("Feature Correlation Matrix")
    plt.tight_layout()
    plt.savefig("feature_correlations.png", dpi=150, bbox_inches="tight")
    plt.show()
    print("Saved: feature_correlations.png")


def plot_feature_distributions(df: pd.DataFrame):
    """Distribution of key features to check for normality / outliers."""
    features = ["delta_pct", "close_vs_poc", "absorption", "dist_vwap_pct",
                "vol_skew", "volatility_15", "rsi_14", "vpin_20"]
    available = [f for f in features if f in df.columns]
    
    n = len(available)
    fig, axes = plt.subplots(2, (n + 1) // 2, figsize=(16, 8))
    axes = axes.flatten()
    
    for i, feat in enumerate(available):
        ax = axes[i]
        data = df[feat].dropna()
        ax.hist(data, bins=50, alpha=0.7, edgecolor="black", linewidth=0.5)
        ax.set_title(feat, fontsize=10)
        ax.axvline(data.mean(), color="red", linewidth=1, linestyle="--", label=f"μ={data.mean():.3f}")
        ax.legend(fontsize=7)
    
    plt.suptitle("Feature Distributions", fontsize=14)
    plt.tight_layout()
    plt.savefig("feature_distributions.png", dpi=150, bbox_inches="tight")
    plt.show()
    print("Saved: feature_distributions.png")


def predictive_power_analysis(df: pd.DataFrame, forward_returns: list = [1, 5, 15]):
    """
    Simple analysis: do features predict future returns?
    Computes correlation between each feature and forward returns.
    This is useful for the strategy team.
    """
    results = {}
    
    for n in forward_returns:
        df[f"fwd_ret_{n}"] = df["close"].pct_change(n).shift(-n)
    
    features = [
        "delta", "delta_pct", "close_vs_poc", "absorption",
        "vol_skew", "imbalance_buy", "imbalance_sell",
        "dist_vwap_pct", "cum_delta_15", "delta_divergence",
        "volatility_15", "momentum_15", "rsi_14",
        "session_position", "vpin_20", "buy_pressure", "vol_zscore",
        "close_position", "ema_cross_9_20"
    ]
    available = [f for f in features if f in df.columns]
    
    print("\n" + "=" * 70)
    print("PREDICTIVE POWER ANALYSIS")
    print("Correlation between features and forward returns")
    print("=" * 70)
    
    corr_table = pd.DataFrame(index=available)
    for n in forward_returns:
        col = f"fwd_ret_{n}"
        corr_table[f"{n}-bar fwd return"] = df[available + [col]].corr()[col][available]
    
    # Sort by absolute correlation with 1-bar forward return
    corr_table["abs_corr"] = corr_table.iloc[:, 0].abs()
    corr_table = corr_table.sort_values("abs_corr", ascending=False)
    corr_table.drop(columns=["abs_corr"], inplace=True)
    
    print(corr_table.to_string())
    corr_table.to_csv("predictive_power.csv")
    print("\nSaved: predictive_power.csv")
    
    return corr_table


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else "nq_features.parquet"
    df = load_features(path)
    
    print(f"Loaded {len(df):,} bars with {len(df.columns)} features")
    
    # Pick a date if available
    dates = sorted(set(df.index.date))
    mid_date = str(dates[len(dates) // 2])
    
    plot_delta_divergence(df, date=mid_date)
    plot_feature_correlations(df)
    plot_feature_distributions(df)
    predictive_power_analysis(df)
