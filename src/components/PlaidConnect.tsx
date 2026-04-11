"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { setLinkedCards, type LinkedCardMapping } from "@/lib/linkedCards";

// The JSON to paste as the password in Plaid Link (user_custom)
const SANDBOX_PASSWORD = JSON.stringify({
  override_accounts: [
    { type: "credit", subtype: "credit card", starting_balance: 2400, meta: { name: "Amex Gold",        official_name: "American Express Gold Rewards Card", mask: "4800" } },
    { type: "credit", subtype: "credit card", starting_balance: 1850, meta: { name: "Sapphire Reserve",  official_name: "Chase Sapphire Reserve Visa",        mask: "3500" } },
    { type: "credit", subtype: "credit card", starting_balance:  730, meta: { name: "Double Cash",       official_name: "Citi Double Cash World Mastercard",  mask: "2700" } },
    { type: "credit", subtype: "credit card", starting_balance:  310, meta: { name: "Discover it",       official_name: "Discover it Cash Back Rewards",      mask: "9200" } },
    { type: "credit", subtype: "credit card", starting_balance: 1200, meta: { name: "Venture Rewards",   official_name: "Capital One Venture Rewards Visa",   mask: "6100" } },
  ],
});

type Props = {
  onComplete: (mappings: LinkedCardMapping[]) => void;
};

export default function PlaidConnect({ onComplete }: Props) {
  const [linkToken,  setLinkToken]  = useState<string | null>(null);
  const [fetching,   setFetching]   = useState(false);
  const [exchanging, setExchanging] = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [showCreds,  setShowCreds]  = useState(false);
  const [copied,     setCopied]     = useState<"user" | "pass" | null>(null);

  const copy = (text: string, which: "user" | "pass") => {
    navigator.clipboard.writeText(text);
    setCopied(which);
    setTimeout(() => setCopied(null), 2000);
  };

  // After Plaid Link succeeds — exchange token, auto-match cards, save
  const onSuccess = useCallback(async (public_token: string) => {
    setExchanging(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/exchange-token", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ publicToken: public_token }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Exchange failed");

      const mappings: LinkedCardMapping[] = data.mappings;
      if (mappings.length > 0) {
        setLinkedCards(mappings);
        onComplete(mappings);
      } else {
        setError("No recognisable cards found — make sure you used user_custom with the JSON password.");
      }
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch accounts");
    } finally {
      setExchanging(false);
      setLinkToken(null);
    }
  }, [onComplete]);

  const { open, ready } = usePlaidLink({
    token:  linkToken ?? "",
    onSuccess,
    onExit: () => { setFetching(false); setLinkToken(null); },
  });

  useEffect(() => {
    if (linkToken && ready) {
      open();
      setFetching(false);
    }
  }, [linkToken, ready, open]);

  const handleConnect = async () => {
    setFetching(true);
    setError(null);
    try {
      const res = await fetch("/api/plaid/create-link-token", { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Failed to create link token");
      setLinkToken(data.link_token);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Connection failed");
      setFetching(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center gap-3 flex-wrap">
        {/* Connect button */}
        <button
          onClick={handleConnect}
          disabled={fetching || exchanging}
          className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-400/30 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
        >
          {fetching || exchanging ? (
            <>
              <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              {exchanging ? "Linking cards..." : "Opening Plaid..."}
            </>
          ) : (
            <>
              <span className="text-green-400">🔗</span>
              Connect Cards via Plaid
            </>
          )}
        </button>

        {/* Toggle credentials hint */}
        <button
          onClick={() => setShowCreds(v => !v)}
          className="text-xs text-white/30 hover:text-white/60 transition-colors underline underline-offset-2"
        >
          {showCreds ? "hide" : "test credentials"}
        </button>
      </div>

      {/* Credentials panel */}
      {showCreds && (
        <div className="p-4 rounded-xl bg-white/[0.03] border border-white/8 max-w-sm space-y-3">
          <p className="text-[10px] font-bold text-white/30 tracking-widest">PLAID SANDBOX CREDENTIALS</p>

          {/* Username */}
          <div>
            <p className="text-[10px] text-white/30 mb-1">USERNAME</p>
            <div className="flex items-center justify-between gap-2 bg-black/30 rounded-lg px-3 py-2">
              <code className="text-xs text-green-400">user_custom</code>
              <button
                onClick={() => copy("user_custom", "user")}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors"
              >
                {copied === "user" ? "✓ copied" : "copy"}
              </button>
            </div>
          </div>

          {/* Password */}
          <div>
            <p className="text-[10px] text-white/30 mb-1">PASSWORD (paste entire JSON)</p>
            <div className="flex items-start justify-between gap-2 bg-black/30 rounded-lg px-3 py-2">
              <code className="text-[10px] text-white/40 break-all leading-relaxed line-clamp-2">
                {"{"}override_accounts:[...]{"}"}
              </code>
              <button
                onClick={() => copy(SANDBOX_PASSWORD, "pass")}
                className="text-[10px] text-white/30 hover:text-white/60 transition-colors whitespace-nowrap ml-2"
              >
                {copied === "pass" ? "✓ copied" : "copy"}
              </button>
            </div>
            <p className="text-[10px] text-white/20 mt-1">Contains: Amex Gold, Chase Sapphire, Citi Double Cash, Discover it, Capital One Venture</p>
          </div>
        </div>
      )}

      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
}
