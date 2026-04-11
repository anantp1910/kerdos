"use client";

import { useState, useEffect, useCallback, type CSSProperties } from "react";
import { usePlaidLink } from "react-plaid-link";

const SANDBOX_PASSWORD = JSON.stringify({
  override_accounts: [
    { type: "credit", subtype: "credit card", starting_balance: 2400, meta: { name: "Amex Gold",       official_name: "American Express Gold Rewards Card", mask: "4800" } },
    { type: "credit", subtype: "credit card", starting_balance: 1850, meta: { name: "Sapphire Reserve", official_name: "Chase Sapphire Reserve Visa",        mask: "3500" } },
    { type: "credit", subtype: "credit card", starting_balance:  730, meta: { name: "Double Cash",      official_name: "Citi Double Cash World Mastercard",  mask: "2700" } },
    { type: "credit", subtype: "credit card", starting_balance:  310, meta: { name: "Discover it",      official_name: "Discover it Cash Back Rewards",      mask: "9200" } },
    { type: "credit", subtype: "credit card", starting_balance: 1200, meta: { name: "Venture Rewards",  official_name: "Capital One Venture Rewards Visa",   mask: "6100" } },
  ],
});

export default function PlaidLinkPage() {
  const [linkToken,  setLinkToken]  = useState<string | null>(null);
  const [status,     setStatus]     = useState<"idle" | "loading" | "exchanging" | "done" | "error">("idle");
  const [error,      setError]      = useState<string | null>(null);
  const [copied,     setCopied]     = useState<"user" | "pass" | null>(null);

  const copy = (text: string, which: "user" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  const onSuccess = useCallback(async (public_token: string) => {
    setStatus("exchanging");
    try {
      const res  = await fetch("/api/plaid/exchange-token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ publicToken: public_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Exchange failed");

      const cardIds: string[] = (data.mappings ?? []).map((m: { cardId: string }) => m.cardId);
      if (cardIds.length === 0) throw new Error("No recognised cards — use user_custom + JSON password");

      setStatus("done");
      // Redirect back to the app via deep link
      setTimeout(() => {
        window.location.href = `cardiq://plaid-callback?cardIds=${cardIds.join(",")}`;
      }, 800);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed");
      setStatus("error");
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token:   linkToken ?? "",
    onSuccess,
    onExit:  () => { setStatus("idle"); setLinkToken(null); },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
      setStatus("idle");
    }
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    setStatus("loading");
    setError(null);
    try {
      const res  = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create link token");
      setLinkToken(data.link_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setStatus("error");
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0a0a0f",
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "24px",
      fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
    }}>
      {/* Header */}
      <div style={{ textAlign: "center", marginBottom: "32px" }}>
        <p style={{ fontSize: "12px", color: "#4ade80", fontWeight: 700, letterSpacing: "2px", margin: "0 0 8px" }}>
          CARDIQ × PLAID
        </p>
        <h1 style={{ fontSize: "28px", fontWeight: 800, color: "#fff", margin: "0 0 8px" }}>
          Connect your cards
        </h1>
        <p style={{ fontSize: "14px", color: "#6b7280", margin: 0 }}>
          Link your credit cards to get personalised recommendations
        </p>
      </div>

      {/* Credentials panel */}
      <div style={{
        width: "100%", maxWidth: "360px",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "16px",
        padding: "16px",
        marginBottom: "20px",
      }}>
        <p style={{ fontSize: "10px", fontWeight: 700, color: "rgba(255,255,255,0.3)", letterSpacing: "2px", margin: "0 0 12px" }}>
          PLAID SANDBOX CREDENTIALS
        </p>

        {/* Username */}
        <div style={{ marginBottom: "10px" }}>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>USERNAME</p>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "8px 12px" }}>
            <code style={{ fontSize: "13px", color: "#4ade80" }}>user_custom</code>
            <button
              onClick={() => copy("user_custom", "user")}
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer" }}
            >
              {copied === "user" ? "✓ copied" : "copy"}
            </button>
          </div>
        </div>

        {/* Password */}
        <div>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.3)", margin: "0 0 4px" }}>PASSWORD (paste entire JSON)</p>
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: "8px", background: "rgba(0,0,0,0.3)", borderRadius: "8px", padding: "8px 12px" }}>
            <code style={{ fontSize: "10px", color: "rgba(255,255,255,0.35)", wordBreak: "break-all", lineHeight: "1.5", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" } as CSSProperties}>
              {"{"}override_accounts:[...]{"}"}
            </code>
            <button
              onClick={() => copy(SANDBOX_PASSWORD, "pass")}
              style={{ fontSize: "11px", color: "rgba(255,255,255,0.4)", background: "none", border: "none", cursor: "pointer", whiteSpace: "nowrap" }}
            >
              {copied === "pass" ? "✓ copied" : "copy"}
            </button>
          </div>
          <p style={{ fontSize: "10px", color: "rgba(255,255,255,0.2)", margin: "6px 0 0" }}>
            Amex Gold · Sapphire Reserve · Double Cash · Discover it · Venture
          </p>
        </div>
      </div>

      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={status === "loading" || status === "exchanging"}
        style={{
          width: "100%", maxWidth: "360px",
          padding: "16px",
          background: status === "loading" || status === "exchanging" ? "rgba(255,255,255,0.06)" : "#4ade80",
          color:  status === "loading" || status === "exchanging" ? "rgba(255,255,255,0.3)" : "#000",
          border: "none",
          borderRadius: "14px",
          fontSize: "16px",
          fontWeight: 800,
          cursor: status === "loading" || status === "exchanging" ? "not-allowed" : "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          gap: "8px",
        }}
      >
        {status === "loading"    && <span style={{ display: "inline-block", width: "14px", height: "14px", border: "2px solid rgba(255,255,255,0.2)", borderTopColor: "#fff", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />}
        {status === "loading"    ? "Opening Plaid..." :
         status === "exchanging" ? "Linking cards..." :
         status === "done"       ? "Cards linked! Returning..." :
                                   "Connect Cards via Plaid"}
      </button>

      {status === "done" && (
        <p style={{ marginTop: "16px", fontSize: "13px", color: "#4ade80", textAlign: "center" }}>
          Cards linked! Returning to app...
        </p>
      )}

      {error && (
        <p style={{ marginTop: "12px", fontSize: "12px", color: "#f87171", textAlign: "center", maxWidth: "320px" }}>
          {error}
        </p>
      )}

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
