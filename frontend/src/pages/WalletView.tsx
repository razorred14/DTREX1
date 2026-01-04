import React, { useEffect, useRef, useState } from "react";
import { rpcCall } from "../api/client";
import WalletConnectionStatus from "../components/WalletConnectionStatus";


export default function WalletView() {
  const [wallets, setWallets] = useState<any[]>([]);
  const [syncStatus, setSyncStatus] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [offerResult, setOfferResult] = useState<string | null>(null);

  useEffect(() => {
    async function fetchWalletInfo() {
      try {
        const [syncResp, walletsResp] = await Promise.all([
          rpcCall<any>("get_sync_status"),
          rpcCall<any>("get_wallets")
        ]);
        setSyncStatus(syncResp);
        const wallets = walletsResp.wallets || [];
        // Fetch balances for each wallet
        const walletsWithBalances = await Promise.all(wallets.map(async (w: any) => {
          try {
            const balanceResp = await rpcCall<any>("get_wallet_balance", { wallet_id: w.id });
            return { ...w, balance: balanceResp && balanceResp.wallet_balance ? balanceResp.wallet_balance.confirmed_wallet_balance : undefined };
          } catch (e) {
            return { ...w, balance: undefined };
          }
        }));
        setWallets(walletsWithBalances);
      } catch (e: any) {
        setError(e.message || "Failed to fetch wallet info");
      }
    }
    fetchWalletInfo();
  }, []);

  // Offer handlers
  const handleCreateOffer = async (offerParams: any) => {
    setLoading(true);
    setOfferResult(null);
    try {
      const result = await rpcCall<any>("create_offer_for_ids", offerParams);
      setOfferResult("Offer created: " + JSON.stringify(result));
    } catch (e: any) {
      setOfferResult("Error creating offer: " + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };
  const handleAcceptOffer = async (offer: string) => {
    setLoading(true);
    setOfferResult(null);
    try {
      const result = await rpcCall<any>("take_offer", { offer });
      setOfferResult("Offer accepted: " + JSON.stringify(result));
    } catch (e: any) {
      setOfferResult("Error accepting offer: " + (e.message || e.toString()));
    } finally {
      setLoading(false);
    }
  };

  // --- Offer Management UI ---
  function OfferSection({ onCreate, onAccept, loading }: { onCreate: (offer: any) => void, onAccept: (offer: string) => void, loading: boolean }) {
    const offerGiveRef = useRef<HTMLInputElement>(null);
    const offerGetRef = useRef<HTMLInputElement>(null);
    const offerFeeRef = useRef<HTMLInputElement>(null);
    const acceptOfferRef = useRef<HTMLTextAreaElement>(null);

    return (
      <div className="my-8 p-4 border rounded bg-gray-50">
        <h2 className="font-semibold mb-2">Offers</h2>
        <div className="mb-4">
          <h3 className="font-medium mb-1">Create Offer</h3>
          <p className="text-xs text-gray-600 mb-2">
            Create a new offer to trade XCH or CAT tokens. Specify what you want to give and what you want to receive. For example, to offer 1 XCH for 100 CAT, enter <span className="font-mono bg-gray-100 px-1 rounded">1:XCH</span> in "Give" and <span className="font-mono bg-gray-100 px-1 rounded">100:CAT_ID</span> in "Get". Fee is optional and specified in mojos.
          </p>
          <div className="flex gap-2 mb-2">
            <input ref={offerGiveRef} className="input-field flex-1" placeholder="Give (e.g. 1:XCH or 100:CAT_ID)" />
            <input ref={offerGetRef} className="input-field flex-1" placeholder="Get (e.g. 100:CAT_ID or 1:XCH)" />
            <input ref={offerFeeRef} className="input-field w-32" placeholder="Fee (mojo)" type="number" />
          </div>
          <button
            className="btn btn-primary"
            disabled={loading}
            onClick={() => {
              const give = offerGiveRef.current?.value;
              const get = offerGetRef.current?.value;
              const fee = offerFeeRef.current?.value;
              if (!give || !get) return;
              // Parse inputs: "1:XCH" or "100:CAT_ID"
              const parse = (str: string) => {
                const [amount, asset] = str.split(":");
                return { asset, amount: parseFloat(amount) };
              };
              const giveParsed = parse(give);
              const getParsed = parse(get);
              // XCH is wallet id 1, CATs are asset ids
              const offer: any = {};
              if (giveParsed.asset === "XCH") offer["1"] = -Math.round(giveParsed.amount * 1e12);
              else offer[giveParsed.asset] = -Math.round(giveParsed.amount * 1e0);
              if (getParsed.asset === "XCH") offer["1"] = (offer["1"] || 0) + Math.round(getParsed.amount * 1e12);
              else offer[getParsed.asset] = (offer[getParsed.asset] || 0) + Math.round(getParsed.amount * 1e0);
              onCreate({ offer, fee: fee ? parseInt(fee) : 0 });
            }}
          >Create Offer</button>
        </div>
        <div>
          <h3 className="font-medium mb-1">Accept Offer</h3>
          <p className="text-xs text-gray-600 mb-2">
            Accept an offer by pasting the offer string you received from another party. This will submit the offer to your wallet for processing and settlement.
          </p>
          <textarea ref={acceptOfferRef} className="input-field w-full mb-2" rows={3} placeholder="Paste offer string here" />
          <button
            className="btn btn-secondary"
            disabled={loading}
            onClick={() => {
              const offer = acceptOfferRef.current?.value;
              if (!offer) return;
              onAccept(offer);
            }}
          >Accept Offer</button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">Wallet RPC View</h1>
      {error && <div className="bg-red-100 text-red-700 p-2 rounded mb-4">{error}</div>}
      <WalletConnectionStatus />
      {/* OfferSection removed as requested */}
      {offerResult && <div className="bg-gray-100 text-gray-800 p-2 rounded mb-4 whitespace-pre-wrap">{offerResult}</div>}
      {syncStatus && (
        <div className="mb-4">
          <h2 className="font-semibold">Sync Status</h2>
          <pre className="bg-gray-100 p-2 rounded text-xs">{JSON.stringify(syncStatus, null, 2)}</pre>
        </div>
      )}
      <h2 className="font-semibold mb-2">Wallets</h2>
      {wallets.length === 0 ? (
        <div className="text-gray-500">No wallets found.</div>
      ) : (
        <>
          <table className="min-w-full text-sm border">
            <thead>
              <tr className="bg-gray-50">
                <th className="px-2 py-1 border">ID</th>
                <th className="px-2 py-1 border">Name</th>
                <th className="px-2 py-1 border">Type</th>
                <th className="px-2 py-1 border">Balance</th>
              </tr>
            </thead>
            <tbody>
              {wallets.map((w, i) => (
                <tr key={w.id}>
                  <td className="border px-2 py-1">{w.id}</td>
                  <td className="border px-2 py-1">{w.name}</td>
                  <td className="border px-2 py-1">{w.type}</td>
                  <td className="border px-2 py-1">
                    {w.balance !== undefined
                      ? `${(w.balance / 1e12).toLocaleString(undefined, { minimumFractionDigits: 12, maximumFractionDigits: 12 })} ${i === 3 ? 'SBX' : 'XCH'}`
                      : "-"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <OfferSection onCreate={handleCreateOffer} onAccept={handleAcceptOffer} loading={loading} />
          {offerResult && <div className="bg-gray-100 text-gray-800 p-2 rounded mb-4 whitespace-pre-wrap">{offerResult}</div>}
        </>
      )}
      <OfferSection onCreate={handleCreateOffer} onAccept={handleAcceptOffer} loading={loading} />
    </div>
  );
}
