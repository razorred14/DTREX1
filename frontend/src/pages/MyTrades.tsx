import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { tradeApi, type Trade } from "../api/client";

export default function MyTrades() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<string>("all");

  useEffect(() => {
    loadTrades();
  }, []);

  const loadTrades = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await tradeApi.myTrades();
      setTrades(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load trades");
    } finally {
      setLoading(false);
    }
  };

  const filteredTrades = trades.filter(trade => {
    if (filter === "all") return true;
    return trade.status === filter;
  });

  const getStatusBadge = (status: string) => {
    const badges: Record<string, { bg: string; text: string; label: string }> = {
      proposal: { bg: "bg-blue-100", text: "text-blue-800", label: "Open Proposal" },
      matched: { bg: "bg-yellow-100", text: "text-yellow-800", label: "Matched" },
      committed: { bg: "bg-purple-100", text: "text-purple-800", label: "Committed" },
      escrow: { bg: "bg-orange-100", text: "text-orange-800", label: "In Escrow" },
      completed: { bg: "bg-green-100", text: "text-green-800", label: "Completed" },
      disputed: { bg: "bg-red-100", text: "text-red-800", label: "Disputed" },
      cancelled: { bg: "bg-gray-100", text: "text-gray-800", label: "Cancelled" },
    };
    const badge = badges[status] || { bg: "bg-gray-100", text: "text-gray-800", label: status };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${badge.bg} ${badge.text}`}>
        {badge.label}
      </span>
    );
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatValue = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(value);
  };

  const handleCancel = async (tradeId: number) => {
    if (!confirm("Are you sure you want to cancel this trade proposal?")) return;
    try {
      await tradeApi.cancel(tradeId);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to cancel trade");
    }
  };

  const handleDelete = async (tradeId: number) => {
    if (!confirm("Are you sure you want to delete this trade proposal? This cannot be undone.")) return;
    try {
      await tradeApi.delete(tradeId);
      await loadTrades();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete trade");
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold">My Trades</h1>
            <p className="text-gray-600 mt-1">Manage your trade proposals and active trades</p>
          </div>
          <Link to="/create" className="btn-primary">
            + New Trade
          </Link>
        </div>

        {/* Filter tabs */}
        <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
          {[
            { value: "all", label: "All" },
            { value: "proposal", label: "Open" },
            { value: "matched", label: "Matched" },
            { value: "committed", label: "Committed" },
            { value: "escrow", label: "In Escrow" },
            { value: "completed", label: "Completed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilter(tab.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                filter === tab.value
                  ? "bg-chia-green text-white"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              {tab.label}
            </button>
          ))}
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
              <p className="text-gray-600">Loading your trades...</p>
            </div>
          </div>
        ) : filteredTrades.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📭</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                {filter === "all" ? "No Trades Yet" : `No ${filter} trades`}
              </h3>
              <p className="text-gray-500 mb-6">
                {filter === "all" 
                  ? "Create your first trade proposal to start trading"
                  : "No trades match this filter"
                }
              </p>
              {filter === "all" && (
                <Link to="/create" className="btn-primary">
                  Create Trade Proposal
                </Link>
              )}
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredTrades.map((trade) => (
              <div key={trade.id} className="card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-lg font-semibold">{trade.proposer_item_title}</h3>
                      {getStatusBadge(trade.status)}
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-3 line-clamp-2">
                      {trade.proposer_item_description}
                    </p>

                    <div className="flex items-center gap-6 text-sm">
                      <div>
                        <span className="text-gray-500">Value: </span>
                        <span className="font-semibold text-chia-green">
                          {formatValue(trade.proposer_item_value_usd)}
                        </span>
                      </div>
                      <div>
                        <span className="text-gray-500">Created: </span>
                        <span>{formatDate(trade.created_at)}</span>
                      </div>
                      {trade.acceptor_id && (
                        <div>
                          <span className="text-gray-500">Matched with: </span>
                          <span>User #{trade.acceptor_id}</span>
                        </div>
                      )}
                    </div>

                    {/* Trade progress for active trades */}
                    {["committed", "escrow"].includes(trade.status) && (
                      <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-4 text-sm">
                          <div className="flex items-center gap-2">
                            {trade.proposer_tracking_number ? (
                              <span className="text-green-600">✓ You shipped</span>
                            ) : (
                              <span className="text-orange-600">⏳ Ship your item</span>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {trade.acceptor_tracking_number ? (
                              <span className="text-green-600">✓ Partner shipped</span>
                            ) : (
                              <span className="text-gray-400">⏳ Awaiting shipment</span>
                            )}
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex flex-col gap-2 ml-4">
                    <Link
                      to={`/trade/${trade.id}`}
                      className="btn-secondary text-sm px-4 py-2"
                    >
                      View
                    </Link>
                    {/* Cancel available for proposal and matched */}
                    {["proposal", "matched"].includes(trade.status) && (
                      <button
                        onClick={() => handleCancel(trade.id)}
                        className="text-sm px-4 py-2 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                      >
                        Cancel
                      </button>
                    )}
                    {/* Delete only for proposals */}
                    {trade.status === "proposal" && (
                      <button
                        onClick={() => handleDelete(trade.id)}
                        className="text-sm px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Stats summary */}
        {trades.length > 0 && (
          <div className="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card text-center">
              <div className="text-2xl font-bold text-blue-600">
                {trades.filter(t => t.status === "proposal").length}
              </div>
              <div className="text-sm text-gray-500">Open</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {trades.filter(t => ["matched", "committed", "escrow"].includes(t.status)).length}
              </div>
              <div className="text-sm text-gray-500">Active</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-green-600">
                {trades.filter(t => t.status === "completed").length}
              </div>
              <div className="text-sm text-gray-500">Completed</div>
            </div>
            <div className="card text-center">
              <div className="text-2xl font-bold text-gray-600">
                {trades.length}
              </div>
              <div className="text-sm text-gray-500">Total</div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
