"use client";

import { useState, useEffect, useCallback } from "react";
import { usePlaidLink } from "react-plaid-link";
import { setLinkedCards, type LinkedCardMapping } from "@/lib/linkedCards";

const CARD_OPTIONS = [
  { value: "amex-gold",       label: "Amex Gold" },
  { value: "chase-sapphire",  label: "Chase Sapphire Preferred" },
  { value: "citi-double",     label: "Citi Double Cash" },
  { value: "discover-it",     label: "Discover it Cash Back" },
  { value: "capital-venture", label: "Capital One Venture" },
];

type PlaidAccount = {
  account_id: string;
  name:       string;
  mask:       string;
  subtype:    string | null;
  type:       string;
};

type Props = {
  onComplete: (mappings: LinkedCardMapping[]) => void;
};

export default function PlaidConnect({ onComplete }: Props) {
  const [linkToken,     setLinkToken]     = useState<string | null>(null);
  const [plaidAccounts, setPlaidAccounts] = useState<PlaidAccount[] | null>(null);
  const [mappings,      setMappings]      = useState<Record<string, string>>({});
  const [modalOpen,     setModalOpen]     = useState(false);
  const [fetching,      setFetching]      = useState(false);
  const [exchanging,    setExchanging]    = useState(false);
  const [error,         setError]         = useState<string | null>(null);

  // Exchange public token after Plaid Link succeeds
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
      setPlaidAccounts(data.accounts);
      setModalOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to fetch accounts");
    } finally {
      setExchanging(false);
      setLinkToken(null); // reset so next click fetches a fresh token
    }
  }, []);

  const { open, ready } = usePlaidLink({
    token:     linkToken ?? "",
    onSuccess,
    onExit:    () => { setFetching(false); setLinkToken(null); },
  });

  // Open Plaid Link as soon as token is ready
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

  const handleSave = () => {
    if (!plaidAccounts) return;
    const result: LinkedCardMapping[] = plaidAccounts
      .filter(a => mappings[a.account_id])
      .map(a => ({
        plaidAccountId: a.account_id,
        plaidName:      a.name,
        plaidMask:      a.mask,
        cardId:         mappings[a.account_id],
      }));
    if (result.length === 0) return;
    setLinkedCards(result);
    onComplete(result);
    setModalOpen(false);
    setPlaidAccounts(null);
    setMappings({});
  };

  const handleSkip = () => {
    setModalOpen(false);
    setPlaidAccounts(null);
    setMappings({});
  };

  const allMapped = plaidAccounts
    ? plaidAccounts.every(a => mappings[a.account_id])
    : false;

  return (
    <>
      {/* Connect button */}
      <button
        onClick={handleConnect}
        disabled={fetching || exchanging}
        className="px-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-green-400/30 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
      >
        {fetching || exchanging ? (
          <>
            <span className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            {exchanging ? "Fetching cards..." : "Opening Plaid..."}
          </>
        ) : (
          <>
            <span className="text-green-400">🔗</span>
            Connect Cards via Plaid
          </>
        )}
      </button>

      {error && (
        <p className="text-xs text-red-400 mt-1">{error}</p>
      )}

      {/* Mapping modal */}
      {modalOpen && plaidAccounts && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/70 backdrop-blur-sm"
            onClick={handleSkip}
          />

          {/* Modal */}
          <div className="relative w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl">
            {/* Header */}
            <div className="mb-5">
              <div className="flex items-center gap-2 mb-2">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
                <span className="text-[10px] font-bold text-green-400 tracking-widest">PLAID CONNECTED</span>
              </div>
              <h2 className="text-xl font-bold text-white">Map Your Cards</h2>
              <p className="text-sm text-white/40 mt-1">
                Plaid found {plaidAccounts.length} credit account{plaidAccounts.length !== 1 ? "s" : ""}. Tell us which is which.
              </p>
            </div>

            {/* Account rows */}
            <div className="space-y-4 mb-6">
              {plaidAccounts.length === 0 ? (
                <p className="text-sm text-white/40 text-center py-4">
                  No credit accounts found. Try a different institution.
                </p>
              ) : (
                plaidAccounts.map(account => (
                  <div key={account.account_id} className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                    <div className="flex items-center justify-between mb-3">
                      <div>
                        <p className="text-sm font-semibold text-white">{account.name}</p>
                        <p className="text-xs text-white/40">••••{account.mask}</p>
                      </div>
                      <span className="text-[10px] bg-white/5 text-white/40 px-2 py-1 rounded-full capitalize">
                        {account.subtype ?? "credit"}
                      </span>
                    </div>
                    <select
                      value={mappings[account.account_id] ?? ""}
                      onChange={e => setMappings(prev => ({ ...prev, [account.account_id]: e.target.value }))}
                      className="w-full bg-[#0a0a0f] border border-white/10 text-white text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-green-400/50 transition-colors"
                    >
                      <option value="" disabled>Select a card...</option>
                      {CARD_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                ))
              )}
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={handleSave}
                disabled={!allMapped || plaidAccounts.length === 0}
                className="flex-1 py-3 rounded-xl bg-green-400 hover:bg-green-300 text-black font-bold text-sm transition-all duration-200 disabled:bg-white/5 disabled:text-white/20 disabled:cursor-not-allowed"
              >
                Save & Start SmartSwiping →
              </button>
              <button
                onClick={handleSkip}
                className="px-4 py-3 rounded-xl bg-white/5 hover:bg-white/10 text-white/50 text-sm transition-all duration-200"
              >
                Skip
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
