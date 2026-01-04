import { useState, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { tradeApi, Trade } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useXchPrice, formatXch, usdToXch } from "../hooks/useXchPrice";

type OfferType = "item" | "xch" | "mixed";

export default function MakeOffer() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { price: xchRate, loading: priceLoading } = useXchPrice();
  
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Form state
  const [offerType, setOfferType] = useState<OfferType>("item");
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCondition, setItemCondition] = useState("good");
  const [itemValueUsd, setItemValueUsd] = useState("");
  const [xchAmount, setXchAmount] = useState(""); // in XCH, not mojos
  
  useEffect(() => {
    if (!id) return;
    
    const fetchTrade = async () => {
      try {
        const result = await tradeApi.getPublic(parseInt(id));
        setTrade(result);
        
        // Check if trade is still open for offers
        if (result.status !== "proposal") {
          setError("This trade is no longer accepting offers");
        }
      } catch (err) {
        setError("Failed to load trade");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    
    fetchTrade();
  }, [id]);
  
  // Redirect if not authenticated
  useEffect(() => {
    if (!loading && !isAuthenticated) {
      navigate("/login", { state: { from: `/trade/${id}/offer` } });
    }
  }, [loading, isAuthenticated, navigate, id]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trade) return;
    
    setSubmitting(true);
    setError(null);
    
    try {
      // Convert XCH to mojos (1 XCH = 1,000,000,000,000 mojos)
      const mojosAmount = xchAmount ? Math.round(parseFloat(xchAmount) * 1_000_000_000_000) : undefined;
      
      await tradeApi.accept({
        trade_id: trade.id,
        offer_type: offerType,
        item_title: offerType !== "xch" ? itemTitle : undefined,
        item_description: offerType !== "xch" ? itemDescription : undefined,
        item_condition: offerType !== "xch" ? itemCondition : undefined,
        item_value_usd: offerType !== "xch" && itemValueUsd ? parseFloat(itemValueUsd) : undefined,
        xch_amount: offerType !== "item" ? mojosAmount : undefined,
      });
      
      // Navigate to my-trades on success
      navigate("/my-trades", { 
        state: { message: "Offer submitted successfully! Waiting for proposer response." }
      });
    } catch (err: any) {
      setError(err.message || "Failed to submit offer");
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };
  
  // Calculate XCH equivalent of item value
  const itemXchEquivalent = itemValueUsd && xchRate > 0 
    ? usdToXch(parseFloat(itemValueUsd), xchRate)
    : 0;
  
  // Calculate USD equivalent of XCH amount
  const xchUsdEquivalent = xchAmount && xchRate > 0
    ? parseFloat(xchAmount) * xchRate
    : 0;
  
  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="animate-pulse">
          <div className="h-8 bg-gray-200 rounded w-1/4 mb-6"></div>
          <div className="space-y-4">
            <div className="h-32 bg-gray-200 rounded"></div>
            <div className="h-32 bg-gray-200 rounded"></div>
          </div>
        </div>
      </div>
    );
  }
  
  if (!trade) {
    return (
      <div className="max-w-4xl mx-auto p-6">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <h2 className="text-xl font-semibold text-red-800 mb-2">Trade Not Found</h2>
          <p className="text-red-600 mb-4">This trade doesn't exist or has been removed.</p>
          <Link to="/trades" className="text-green-600 hover:underline">
            Browse other trades
          </Link>
        </div>
      </div>
    );
  }
  
  return (
    <div className="max-w-4xl mx-auto p-6">
      {/* Header */}
      <div className="mb-6">
        <Link to={`/trade/${trade.id}`} className="text-green-600 hover:underline text-sm mb-2 inline-block">
          ← Back to Trade
        </Link>
        <h1 className="text-2xl font-bold">Make an Offer</h1>
        <p className="text-gray-600 mt-1">
          Submit your offer for "{trade.proposer_item_title}"
        </p>
      </div>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
          <p className="text-red-700">{error}</p>
        </div>
      )}
      
      {/* Trade Summary */}
      <div className="card mb-6">
        <h2 className="font-semibold text-lg mb-3">You're offering for:</h2>
        <div className="flex gap-4 items-start">
          <div className="w-20 h-20 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
            📦
          </div>
          <div className="flex-1">
            <h3 className="font-semibold">{trade.proposer_item_title}</h3>
            <p className="text-sm text-gray-600 line-clamp-2">{trade.proposer_item_description}</p>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-green-600 font-semibold">
                {formatXch(usdToXch(trade.proposer_item_value_usd || 0, xchRate))} XCH
              </span>
              <span className="text-sm text-gray-500">
                ≈ ${trade.proposer_item_value_usd?.toFixed(2)} USD
              </span>
            </div>
          </div>
        </div>
        
        {/* Show what they want */}
        {trade.wishlist && trade.wishlist.length > 0 && (
          <div className="mt-4 pt-4 border-t">
            <h4 className="text-sm font-medium text-gray-700 mb-2">They're looking for:</h4>
            <ul className="text-sm text-gray-600 space-y-1">
              {trade.wishlist.map((item: { item_description?: string; xch_amount?: number }, i: number) => (
                <li key={i} className="flex items-center gap-2">
                  <span className="text-green-500">✓</span>
                  {item.item_description}
                  {item.xch_amount && (
                    <span className="text-green-600 text-xs">
                      ({formatXch(item.xch_amount / 1_000_000_000_000)} XCH)
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      
      {/* Offer Form */}
      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Offer Type Selection */}
        <div className="card">
          <h2 className="font-semibold text-lg mb-4">What are you offering?</h2>
          <div className="grid grid-cols-3 gap-4">
            <button
              type="button"
              onClick={() => setOfferType("item")}
              className={`p-4 rounded-lg border-2 text-center transition ${
                offerType === "item" 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">📦</div>
              <div className="font-medium">Item</div>
              <div className="text-xs text-gray-500">Trade item for item</div>
            </button>
            
            <button
              type="button"
              onClick={() => setOfferType("xch")}
              className={`p-4 rounded-lg border-2 text-center transition ${
                offerType === "xch" 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">🪙</div>
              <div className="font-medium">XCH Only</div>
              <div className="text-xs text-gray-500">Pay with Chia</div>
            </button>
            
            <button
              type="button"
              onClick={() => setOfferType("mixed")}
              className={`p-4 rounded-lg border-2 text-center transition ${
                offerType === "mixed" 
                  ? "border-green-500 bg-green-50" 
                  : "border-gray-200 hover:border-gray-300"
              }`}
            >
              <div className="text-2xl mb-1">📦+🪙</div>
              <div className="font-medium">Mixed</div>
              <div className="text-xs text-gray-500">Item + XCH combo</div>
            </button>
          </div>
        </div>
        
        {/* Item Details (if item or mixed) */}
        {offerType !== "xch" && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">Your Item Details</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  placeholder="e.g., Nintendo Switch Console"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  placeholder="Describe your item in detail..."
                  rows={3}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  required
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="new">New</option>
                    <option value="like_new">Like New</option>
                    <option value="good">Good</option>
                    <option value="fair">Fair</option>
                    <option value="poor">Poor</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Value (USD Reference)
                  </label>
                  <input
                    type="number"
                    value={itemValueUsd}
                    onChange={(e) => setItemValueUsd(e.target.value)}
                    placeholder="0.00"
                    step="0.01"
                    min="0"
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  {itemValueUsd && (
                    <p className="text-sm text-green-600 mt-1">
                      ≈ {formatXch(itemXchEquivalent)} XCH
                    </p>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
        
        {/* XCH Amount (if xch or mixed) */}
        {offerType !== "item" && (
          <div className="card">
            <h2 className="font-semibold text-lg mb-4">XCH Amount</h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Amount in XCH *
              </label>
              <input
                type="text"
                inputMode="decimal"
                value={xchAmount}
                onChange={(e) => {
                  // Allow empty, digits, and one decimal point
                  const val = e.target.value;
                  if (val === '' || /^\d*\.?\d*$/.test(val)) {
                    setXchAmount(val);
                  }
                }}
                placeholder="0.01"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                required
              />
              {xchAmount && parseFloat(xchAmount) > 0 && (
                <p className="text-sm text-gray-500 mt-1">
                  ≈ ${xchUsdEquivalent.toFixed(2)} USD
                  {!priceLoading && xchRate && <span className="text-xs ml-1">@ ${xchRate.toFixed(2)}/XCH</span>}
                </p>
              )}
            </div>
          </div>
        )}
        
        {/* Submit */}
        <div className="flex gap-4">
          <Link
            to={`/trade/${trade.id}`}
            className="flex-1 py-3 px-6 border border-gray-300 rounded-lg text-center font-medium hover:bg-gray-50 transition"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={submitting || trade.status !== "proposal"}
            className="flex-1 btn-primary py-3 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? "Submitting..." : "Submit Offer"}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          By submitting, you agree to the DTREX trading terms. The proposer will review your offer.
        </p>
      </form>
    </div>
  );
}
