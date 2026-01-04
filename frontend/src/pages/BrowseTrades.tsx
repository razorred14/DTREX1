import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { tradeApi, type Trade } from "../api/client";
import { useXchPrice, formatXch } from "../hooks/useXchPrice";

export default function BrowseTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Real-time XCH price
  const { price: xchRate, loading: priceLoading } = useXchPrice();

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await tradeApi.listProposals();
      setTrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      });
    } catch {
      return dateString;
    }
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const getConditionBadge = (condition?: string) => {
    const colors: Record<string, string> = {
      mint: "bg-green-100 text-green-800",
      near_mint: "bg-green-100 text-green-700",
      excellent: "bg-blue-100 text-blue-800",
      good: "bg-yellow-100 text-yellow-800",
      fair: "bg-orange-100 text-orange-800",
      poor: "bg-red-100 text-red-800",
    };
    const labels: Record<string, string> = {
      mint: "Mint",
      near_mint: "Near Mint",
      excellent: "Excellent",
      good: "Good",
      fair: "Fair",
      poor: "Poor",
    };
    if (!condition) return null;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[condition] || "bg-gray-100 text-gray-800"}`}>
        {labels[condition] || condition}
      </span>
    );
  };

  // Verification badge component
  const VerificationBadge = ({ status }: { status?: string }) => {
    const isVerified = status === 'verified' || status === 'email' || status === 'phone';
    
    if (isVerified) {
      return (
        <span className="inline-flex items-center" title="Verified account">
          <svg className="w-4 h-4 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center group relative" title="Unverified account">
        <svg className="w-4 h-4 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span className="ml-1 text-xs text-red-500">unverified</span>
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">Trade Proposals</h1>
            <p className="text-gray-600 mt-1">Browse open trade proposals from verified traders</p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right text-sm">
              <span className="text-gray-500">XCH Price: </span>
              <span className="font-semibold text-chia-green">
                {priceLoading ? "..." : `$${xchRate.toFixed(2)}`}
              </span>
              <a 
                href="https://coinmarketcap.com/currencies/chia-network/" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-xs text-gray-400 block hover:text-blue-500"
              >
                via CoinGecko
              </a>
            </div>
            <Link to="/create" className="btn-primary">
              + Create Proposal
            </Link>
          </div>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200 mb-4">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError("")} className="text-red-600 text-sm mt-2">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading trade proposals...</p>
            </div>
          </div>
        ) : trades.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">🔄</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Trade Proposals Yet
              </h3>
              <p className="text-gray-500 mb-6">
                Be the first to create a trade proposal
              </p>
              <Link to="/create" className="btn-primary">
                Create Trade Proposal
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {trades.map((trade) => (
              <div key={trade.id} className="card hover:shadow-lg transition-shadow">
                {/* Trade Image Placeholder */}
                <div className="bg-gray-100 rounded-lg h-48 flex items-center justify-center mb-4">
                  <span className="text-6xl">📦</span>
                </div>

                {/* Trade Info */}
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 line-clamp-2">
                      {trade.proposer_item_title}
                    </h3>
                    {getConditionBadge(trade.proposer_item_condition)}
                  </div>

                  {/* Proposer Info with Verification Badge */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm text-gray-600">by</span>
                    <span className="text-sm font-medium text-gray-800">
                      {trade.proposer?.username || `User #${trade.proposer_id}`}
                    </span>
                    <VerificationBadge status={trade.proposer?.verification_status} />
                    {trade.proposer && (
                      <span className="text-xs text-gray-500 flex items-center gap-1">
                        • ⭐ {trade.proposer.reputation_score.toFixed(1)}
                        <span className="text-gray-400">|</span>
                        {trade.proposer.total_trades} completed
                      </span>
                    )}
                  </div>

                  <p className="text-gray-600 text-sm line-clamp-2">
                    {trade.proposer_item_description}
                  </p>

                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs text-gray-400 uppercase">Value</p>
                      <p className="text-xl font-bold text-chia-green">
                        {formatXch(trade.proposer_item_value_usd / xchRate)} XCH
                      </p>
                      <p className="text-xs text-gray-400">
                        ≈ {formatValue(trade.proposer_item_value_usd)} USD ref
                      </p>
                    </div>
                    {trade.proposer_item_category && (
                      <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {trade.proposer_item_category}
                      </span>
                    )}
                  </div>

                  <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
                    <span className="text-xs text-gray-500">
                      Posted {formatDate(trade.created_at)}
                    </span>
                    <Link 
                      to={`/trade/${trade.id}`}
                      className="text-chia-green font-medium text-sm hover:underline"
                    >
                      View Details →
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Info Panel */}
        <div className="mt-12 card bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 How Trading Works</h3>
          <div className="text-sm text-blue-800 space-y-1">
            <p>1. Browse proposals and find items you want</p>
            <p>2. Make an offer with your item or XCH</p>
            <p>3. Both parties pay a small commitment fee (~$1 in XCH)</p>
            <p>4. Ship items during the 30-day escrow period</p>
            <p>5. Confirm receipt and leave a review</p>
          </div>
        </div>
      </div>
    </div>
  );
}
