import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { tradeApi, type Trade } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useXchPrice, formatXch } from "../hooks/useXchPrice";
import CommitmentFlow from "../components/CommitmentFlow";

export default function TradeDetail() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, user } = useAuth();
  const [trade, setTrade] = useState<Trade | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  
  // Real-time XCH price - must be called before any returns
  const { price: xchRate, loading: priceLoading } = useXchPrice();

  useEffect(() => {
    const fetchTrade = async () => {
      if (!id) return;
      
      try {
        setLoading(true);
        // Try authenticated endpoint first, fall back to public
        let tradeData: Trade;
        if (isAuthenticated) {
          try {
            tradeData = await tradeApi.get(parseInt(id));
          } catch {
            tradeData = await tradeApi.getPublic(parseInt(id));
          }
        } else {
          tradeData = await tradeApi.getPublic(parseInt(id));
        }
        setTrade(tradeData);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load trade");
      } finally {
        setLoading(false);
      }
    };

    fetchTrade();
  }, [id, isAuthenticated]);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Loading trade...</span>
        </div>
      </div>
    );
  }

  if (error || !trade) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-red-50 border border-red-200">
          <h2 className="text-xl font-bold text-red-700 mb-2">Trade Not Found</h2>
          <p className="text-red-600">{error || "This trade does not exist or you don't have access to it."}</p>
          <Link to="/trades" className="btn-primary mt-4 inline-block">
            ← Back to Browse Trades
          </Link>
        </div>
      </div>
    );
  }

  const isProposer = user?.id === trade.proposer_id;
  const isAcceptor = user?.id === trade.acceptor_id;
  const isParticipant = isProposer || isAcceptor;

  const xchEquivalent = formatXch(trade.proposer_item_value_usd / xchRate);

  const getStatusBadge = (status: string) => {
    const styles: Record<string, string> = {
      proposal: "bg-blue-100 text-blue-700",
      matched: "bg-purple-100 text-purple-700",
      committed: "bg-yellow-100 text-yellow-700",
      escrow: "bg-orange-100 text-orange-700",
      completed: "bg-green-100 text-green-700",
      disputed: "bg-red-100 text-red-700",
      cancelled: "bg-gray-100 text-gray-700",
    };
    return styles[status] || "bg-gray-100 text-gray-700";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      proposal: "Open Proposal",
      matched: "Matched",
      committed: "Committed",
      escrow: "In Escrow",
      completed: "Completed",
      disputed: "Disputed",
      cancelled: "Cancelled",
    };
    return labels[status] || status;
  };

  // Verification badge component
  const VerificationBadge = ({ status, showLabel = true }: { status?: string; showLabel?: boolean }) => {
    const isVerified = status === 'verified' || status === 'email' || status === 'phone';
    
    if (isVerified) {
      return (
        <span className="inline-flex items-center" title="Verified account">
          <svg className="w-5 h-5 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          {showLabel && <span className="ml-1 text-xs text-blue-600 font-medium">Verified</span>}
        </span>
      );
    }
    
    return (
      <span className="inline-flex items-center" title="Unverified account">
        <svg className="w-5 h-5 text-red-400" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        {showLabel && <span className="ml-1 text-xs text-red-500">Unverified</span>}
      </span>
    );
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <Link to="/trades" className="text-green-600 hover:text-green-700 text-sm mb-2 inline-block">
              ← Back to Browse
            </Link>
            <h1 className="text-3xl font-bold">{trade.proposer_item_title}</h1>
            <div className="flex items-center gap-3 mt-2">
              <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusBadge(trade.status)}`}>
                {getStatusLabel(trade.status)}
              </span>
              <span className="text-gray-500 text-sm">
                Trade #{trade.id}
              </span>
            </div>
            {/* Proposer Info */}
            <div className="flex items-center gap-2 mt-3 flex-wrap">
              <span className="text-gray-600">Listed by</span>
              <span className="font-semibold text-gray-800">
                {trade.proposer?.username || `User #${trade.proposer_id}`}
              </span>
              <VerificationBadge status={trade.proposer?.verification_status} />
              {trade.proposer && (
                <span className="text-sm text-gray-500 flex items-center gap-1">
                  • ⭐ {trade.proposer.reputation_score.toFixed(1)}
                  <span className="text-gray-400">|</span>
                  {trade.proposer.total_trades} trade{trade.proposer.total_trades !== 1 ? 's' : ''} completed
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="md:col-span-2 space-y-6">
            {/* Item Details */}
            <div className="card">
              <h2 className="text-xl font-semibold mb-4">📦 Item Details</h2>
              <div className="space-y-4">
                <div>
                  <label className="text-sm text-gray-500">Description</label>
                  <p className="text-gray-800 mt-1">{trade.proposer_item_description}</p>
                </div>
                
                {trade.proposer_item_condition && (
                  <div>
                    <label className="text-sm text-gray-500">Condition</label>
                    <p className="text-gray-800 mt-1 capitalize">{trade.proposer_item_condition.replace("_", " ")}</p>
                  </div>
                )}

                {trade.proposer_item_category && (
                  <div>
                    <label className="text-sm text-gray-500">Category</label>
                    <p className="text-gray-800 mt-1">{trade.proposer_item_category}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Trade Progress - Only for participants */}
            {isParticipant && trade.status !== "proposal" && (
              <div className="card">
                <h2 className="text-xl font-semibold mb-4">📊 Trade Progress</h2>
                <div className="flex items-center justify-between">
                  {["matched", "committed", "escrow", "completed"].map((step, index) => {
                    const steps = ["matched", "committed", "escrow", "completed"];
                    const currentIndex = steps.indexOf(trade.status);
                    const isActive = index <= currentIndex;
                    const isCurrent = step === trade.status;
                    
                    return (
                      <div key={step} className="flex-1 text-center relative">
                        {index > 0 && (
                          <div className={`absolute left-0 top-4 w-full h-1 -translate-x-1/2 ${
                            index <= currentIndex ? "bg-green-500" : "bg-gray-200"
                          }`} />
                        )}
                        <div className={`relative z-10 w-8 h-8 mx-auto rounded-full flex items-center justify-center ${
                          isActive ? "bg-green-500 text-white" : "bg-gray-200 text-gray-500"
                        } ${isCurrent ? "ring-4 ring-green-200" : ""}`}>
                          {index + 1}
                        </div>
                        <p className={`text-xs mt-2 ${isActive ? "text-green-700 font-medium" : "text-gray-500"}`}>
                          {step.charAt(0).toUpperCase() + step.slice(1)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Commitment Fee Section - Show when trade is matched and user is participant */}
            {isParticipant && trade.status === "matched" && (
              <CommitmentFlow 
                tradeId={trade.id}
                onSuccess={() => {
                  // Refresh trade data after successful commitment
                  window.location.reload();
                }}
                onError={(error) => {
                  setError(error);
                }}
              />
            )}

            {/* Acceptor's Offer - if matched */}
            {trade.acceptor_item_title && (
              <div className="card bg-purple-50 border border-purple-200">
                <h2 className="text-xl font-semibold mb-4 text-purple-800">🤝 Accepted Offer</h2>
                <div className="space-y-3">
                  <div>
                    <label className="text-sm text-purple-600">Item Offered</label>
                    <p className="text-purple-900 font-medium mt-1">{trade.acceptor_item_title}</p>
                  </div>
                  {trade.acceptor_item_description && (
                    <div>
                      <label className="text-sm text-purple-600">Description</label>
                      <p className="text-purple-800 mt-1">{trade.acceptor_item_description}</p>
                    </div>
                  )}
                  {trade.acceptor_item_value_usd && (
                    <div>
                      <label className="text-sm text-purple-600">Value</label>
                      <p className="text-purple-900 font-semibold mt-1">
                        {formatXch(trade.acceptor_item_value_usd / xchRate)} XCH
                      </p>
                      <p className="text-xs text-purple-500">
                        ≈ ${trade.acceptor_item_value_usd.toFixed(2)} USD ref
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Value Card */}
            <div className="card bg-green-50 border border-green-200">
              <h3 className="font-semibold text-green-800 mb-3">💰 Trade Value</h3>
              <div className="text-3xl font-bold text-green-700">
                {xchEquivalent} XCH
              </div>
              <div className="text-sm text-gray-500 mt-1">
                ≈ ${trade.proposer_item_value_usd.toFixed(2)} USD reference
              </div>
              <p className="text-xs text-gray-400 mt-3">
                {priceLoading ? "Loading..." : `$${xchRate.toFixed(2)}/XCH`} via CoinGecko
              </p>
            </div>

            {/* Actions */}
            {trade.status === "proposal" && !isProposer && isAuthenticated && (
              <div className="card">
                <h3 className="font-semibold mb-3">Make an Offer</h3>
                <Link 
                  to={`/trade/${trade.id}/offer`}
                  className="btn-primary w-full text-center block"
                >
                  Submit Offer
                </Link>
              </div>
            )}

            {!isAuthenticated && trade.status === "proposal" && (
              <div className="card bg-blue-50 border border-blue-200">
                <h3 className="font-semibold text-blue-800 mb-2">Want to Trade?</h3>
                <p className="text-sm text-blue-700 mb-3">
                  Sign in or create an account to make an offer on this item.
                </p>
                <Link to="/login" className="btn-primary w-full text-center block">
                  Login to Offer
                </Link>
              </div>
            )}

            {/* Trade Info */}
            <div className="card">
              <h3 className="font-semibold mb-3">Trade Info</h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <dt className="text-gray-500">Created</dt>
                  <dd className="text-gray-800">
                    {new Date(trade.created_at).toLocaleDateString()}
                  </dd>
                </div>
                <div className="flex justify-between">
                  <dt className="text-gray-500">Trade Type</dt>
                  <dd className="text-gray-800 capitalize">
                    {trade.trade_type?.replace(/_/g, " ") || "Item for Item"}
                  </dd>
                </div>
                {trade.committed_at && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Committed</dt>
                    <dd className="text-gray-800">
                      {new Date(trade.committed_at).toLocaleDateString()}
                    </dd>
                  </div>
                )}
                {trade.escrow_end_date && (
                  <div className="flex justify-between">
                    <dt className="text-gray-500">Escrow Ends</dt>
                    <dd className="text-gray-800">
                      {new Date(trade.escrow_end_date).toLocaleDateString()}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
