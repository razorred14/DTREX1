/**
 * Admin Dashboard Page
 * Only accessible to users with is_admin = true
 */

import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { rpcCall } from "../api/client";
import { useAuth } from "../contexts/AuthContext";
import { useXchPrice, formatXch } from "../hooks/useXchPrice";

interface UserInfo {
  id: number;
  username: string;
  is_admin: boolean;
}

interface ExchangeConfig {
  wallet_address: string | null;
  commitment_fee_usd: number;
}

interface AdminUser {
  id: number;
  username: string;
  is_admin: boolean;
  created_at: string;
}

interface PlatformStats {
  total_users: number;
  total_trades: number;
  active_trades: number;
  completed_trades: number;
}

interface AdminTrade {
  id: number;
  proposer_id: number;
  item_title: string;
  item_description: string;
  trade_type: string;
  item_value_usd: number;
  status: string;
  created_at: string;
}

export default function Admin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const { price: xchPrice, loading: priceLoading } = useXchPrice();
  
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null);
  const [config, setConfig] = useState<ExchangeConfig | null>(null);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [trades, setTrades] = useState<AdminTrade[]>([]);
  const [tradeStatusFilter, setTradeStatusFilter] = useState<string>('all');
  const [cancellingTrade, setCancellingTrade] = useState<number | null>(null);
  const [deletingTrade, setDeletingTrade] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [updatingUser, setUpdatingUser] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'config' | 'users' | 'trades' | 'stats'>('config');
  
  // Form state
  const [walletAddress, setWalletAddress] = useState("");
  const [commitmentFeeUsd, setCommitmentFeeUsd] = useState("1.00");
  
  // Calculate XCH equivalent for display
  const feeUsd = parseFloat(commitmentFeeUsd) || 0;
  const feeXch = xchPrice > 0 ? feeUsd / xchPrice : 0;

  useEffect(() => {
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }
    checkAdminAccess();
  }, [isAuthenticated, navigate]);

  const checkAdminAccess = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Check if user is admin
      const response = await rpcCall<{ user: UserInfo }>("user_me", {});
      setUserInfo(response.user);
      
      if (!response.user.is_admin) {
        setError("Access denied. Admin privileges required.");
        return;
      }
      
      // Load current config
      await loadConfig();
      await loadUsers();
      await loadStats();
      await loadTrades();
      
    } catch (err: any) {
      setError(err.message || "Failed to verify admin access");
    } finally {
      setLoading(false);
    }
  };

  const loadConfig = async () => {
    try {
      const result = await rpcCall<ExchangeConfig>("config_get_exchange_wallet", {});
      setConfig(result);
      
      if (result.wallet_address) {
        setWalletAddress(result.wallet_address);
      }
      
      setCommitmentFeeUsd(result.commitment_fee_usd.toFixed(2));
      
    } catch (err: any) {
      // Config might not exist yet, that's okay
      if (err.message?.includes("Admin access required")) {
        setError("Access denied. Admin privileges required.");
      } else {
        setConfig({ wallet_address: null, commitment_fee_usd: 1.0 });
        setCommitmentFeeUsd("1.00");
      }
    }
  };

  const loadUsers = async () => {
    try {
      const result = await rpcCall<{ users: AdminUser[] }>("admin_list_users", {});
      setUsers(result.users);
    } catch (err: any) {
      console.error("Failed to load users:", err);
    }
  };

  const loadStats = async () => {
    try {
      const result = await rpcCall<PlatformStats>("admin_get_platform_stats", {});
      setStats(result);
    } catch (err: any) {
      console.error("Failed to load stats:", err);
    }
  };

  const loadTrades = async (status?: string) => {
    try {
      const params: any = { limit: 100 };
      if (status && status !== 'all') {
        params.status = status;
      }
      const result = await rpcCall<{ trades: AdminTrade[] }>("admin_list_trades", params);
      setTrades(result.trades);
    } catch (err: any) {
      console.error("Failed to load trades:", err);
    }
  };

  const handleCancelTrade = async (tradeId: number) => {
    if (!window.confirm("Are you sure you want to cancel this trade? This action cannot be undone.")) {
      return;
    }
    
    try {
      setCancellingTrade(tradeId);
      await rpcCall("admin_cancel_trade", { id: tradeId });
      setSuccess("Trade cancelled successfully");
      await loadTrades(tradeStatusFilter);
      await loadStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to cancel trade");
    } finally {
      setCancellingTrade(null);
    }
  };

  const handleDeleteTrade = async (tradeId: number) => {
    if (!window.confirm("Are you sure you want to permanently delete this trade? This action cannot be undone.")) {
      return;
    }
    
    try {
      setDeletingTrade(tradeId);
      await rpcCall("admin_delete_trade", { id: tradeId });
      setSuccess("Trade deleted successfully");
      await loadTrades(tradeStatusFilter);
      await loadStats();
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to delete trade");
    } finally {
      setDeletingTrade(null);
    }
  };

  const toggleUserAdmin = async (userId: number, currentStatus: boolean) => {
    if (userId === userInfo?.id) {
      setError("Cannot modify your own admin status");
      return;
    }
    
    try {
      setUpdatingUser(userId);
      await rpcCall("admin_set_user_admin", {
        user_id: userId,
        is_admin: !currentStatus,
      });
      
      // Refresh user list
      await loadUsers();
      setSuccess(`User ${currentStatus ? 'demoted from' : 'promoted to'} admin`);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message || "Failed to update user");
    } finally {
      setUpdatingUser(null);
    }
  };

  const handleSave = async () => {
    // Validate wallet address
    if (!walletAddress.trim()) {
      setError("Wallet address is required");
      return;
    }
    
    if (!walletAddress.startsWith("xch1")) {
      setError("Invalid wallet address. Must start with 'xch1'");
      return;
    }
    
    if (walletAddress.length !== 62) {
      setError("Invalid wallet address length. Chia addresses are 62 characters.");
      return;
    }
    
    // Validate commitment fee in USD
    const feeValue = parseFloat(commitmentFeeUsd);
    if (isNaN(feeValue) || feeValue <= 0) {
      setError("Commitment fee must be a positive number");
      return;
    }
    
    if (feeValue < 0.01) {
      setError("Commitment fee must be at least $0.01 USD");
      return;
    }
    
    if (feeValue > 100) {
      setError("Commitment fee cannot exceed $100 USD");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      await rpcCall("config_set_exchange_wallet", {
        wallet_address: walletAddress.trim(),
        commitment_fee_usd: feeValue,
      });
      
      setSuccess("Exchange wallet configuration saved successfully!");
      
      // Reload config
      await loadConfig();
      
    } catch (err: any) {
      setError(err.message || "Failed to save configuration");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="ml-3 text-gray-600">Verifying admin access...</span>
        </div>
      </div>
    );
  }

  if (!userInfo?.is_admin) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <div className="card bg-red-50 border border-red-200">
            <div className="flex items-center gap-3 mb-4">
              <span className="text-3xl">🚫</span>
              <h1 className="text-xl font-bold text-red-700">Access Denied</h1>
            </div>
            <p className="text-red-600 mb-4">
              You don't have administrator privileges. This page is restricted to platform administrators only.
            </p>
            <button
              onClick={() => navigate("/")}
              className="btn-primary w-full"
            >
              Return to Home
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⚙️</span>
            <h1 className="text-2xl font-bold">Admin Dashboard</h1>
          </div>
          <p className="text-gray-600">
            Platform administration and configuration
          </p>
          <div className="mt-2 inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-sm">
            <span>👑</span>
            Logged in as {userInfo.username} (Admin)
          </div>
        </div>

        {/* Tabs */}
        <div className="mb-6 border-b border-gray-200">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('config')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'config'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              💰 Exchange Config
            </button>
            <button
              onClick={() => setActiveTab('users')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'users'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              👥 User Management
            </button>
            <button
              onClick={() => { setActiveTab('trades'); loadTrades(tradeStatusFilter); }}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'trades'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📦 Trade Management
            </button>
            <button
              onClick={() => setActiveTab('stats')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'stats'
                  ? 'border-green-500 text-green-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              📊 Platform Stats
            </button>
          </nav>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <p className="text-green-700">{success}</p>
          </div>
        )}

        {/* Tab Content */}
        {activeTab === 'config' && (
          <div className="grid md:grid-cols-2 gap-6">
          {/* Exchange Wallet Configuration */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">💰</span>
              <h2 className="text-lg font-semibold">Exchange Wallet</h2>
            </div>
            
            <p className="text-sm text-gray-600 mb-4">
              Configure the exchange wallet where commitment fees are collected.
              Both parties must pay this fee to lock a trade.
            </p>
            
            <div className="space-y-4">
              {/* Wallet Address */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Exchange Wallet Address *
                </label>
                <input
                  type="text"
                  value={walletAddress}
                  onChange={(e) => setWalletAddress(e.target.value)}
                  placeholder="xch1..."
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                />
                <p className="text-xs text-gray-500 mt-1">
                  All commitment fees will be sent here
                </p>
              </div>
              
              {/* Commitment Fee */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Commitment Fee (USD) *
                </label>
                
                {/* Dynamic XCH Display */}
                <div className="mb-2 p-3 bg-green-50 border border-green-200 rounded-lg">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-green-800 font-medium">
                        💱 Dynamic XCH Conversion
                      </p>
                      <p className="text-xs text-green-600 mt-1">
                        {priceLoading ? (
                          "Loading XCH price..."
                        ) : (
                          <>
                            ${feeUsd.toFixed(2)} USD = <strong>{formatXch(feeXch)} XCH</strong> @ ${xchPrice.toFixed(2)}/XCH
                          </>
                        )}
                      </p>
                    </div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-gray-500">$</span>
                  <input
                    type="text"
                    inputMode="decimal"
                    value={commitmentFeeUsd}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val === '' || /^\d*\.?\d*$/.test(val)) {
                        setCommitmentFeeUsd(val);
                      }
                    }}
                    placeholder="1.00"
                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                  <span className="text-gray-500 text-sm">USD</span>
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Each party pays this fee (converted to XCH at current price) to commit to a trade
                </p>
              </div>
              
              {/* Current Status */}
              {config && (
                <div className="bg-gray-50 rounded-lg p-3">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
                  <dl className="text-sm space-y-1">
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Wallet:</dt>
                      <dd className="font-mono text-xs text-gray-800 truncate max-w-[180px]" title={config.wallet_address || 'Not set'}>
                        {config.wallet_address 
                          ? `${config.wallet_address.slice(0, 8)}...${config.wallet_address.slice(-6)}`
                          : <span className="text-orange-600 font-sans">Not configured</span>
                        }
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-gray-500">Fee:</dt>
                      <dd className="text-gray-800">
                        ${config.commitment_fee_usd.toFixed(2)} USD
                        <span className="text-gray-500 ml-1">
                          (≈ {formatXch(config.commitment_fee_usd / xchPrice)} XCH)
                        </span>
                      </dd>
                    </div>
                  </dl>
                </div>
              )}
              
              {/* Save Button */}
              <button
                onClick={handleSave}
                disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:bg-green-400 text-white font-medium py-2 px-4 rounded-lg transition flex items-center justify-center gap-2"
              >
                {saving ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <span>💾</span>
                    Save Configuration
                  </>
                )}
              </button>
            </div>
            
            {/* Warning */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-xs text-yellow-800">
                <strong>⚠️ Important:</strong> Ensure you control this wallet.
                All commitment fees are irreversibly sent to this address.
              </p>
            </div>
          </div>

          {/* Quick Stats in Config Tab */}
          <div className="card">
            <div className="flex items-center gap-2 mb-4">
              <span className="text-2xl">📊</span>
              <h2 className="text-lg font-semibold">Quick Stats</h2>
            </div>
            
            {stats ? (
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.total_users}</div>
                  <div className="text-xs text-gray-500">Total Users</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-green-600">{stats.total_trades}</div>
                  <div className="text-xs text-gray-500">Total Trades</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-blue-600">{stats.active_trades}</div>
                  <div className="text-xs text-gray-500">Active Trades</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 text-center">
                  <div className="text-2xl font-bold text-emerald-600">{stats.completed_trades}</div>
                  <div className="text-xs text-gray-500">Completed</div>
                </div>
              </div>
            ) : (
              <div className="text-gray-400 text-center py-4">Loading stats...</div>
            )}
          </div>
        </div>
        )}

        {/* User Management Tab */}
        {activeTab === 'users' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">👥</span>
                <h2 className="text-lg font-semibold">User Management</h2>
              </div>
              <button
                onClick={loadUsers}
                className="text-sm text-gray-500 hover:text-gray-700"
              >
                🔄 Refresh
              </button>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">ID</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Username</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Joined</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Role</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">#{user.id}</td>
                      <td className="py-3 px-2">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-gray-900">{user.username}</span>
                          {user.id === userInfo?.id && (
                            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">You</span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-500">
                        {new Date(user.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2">
                        {user.is_admin ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium bg-purple-100 text-purple-700 px-2 py-1 rounded-full">
                            👑 Admin
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">User</span>
                        )}
                      </td>
                      <td className="py-3 px-2 text-right">
                        {user.id !== userInfo?.id ? (
                          <button
                            onClick={() => toggleUserAdmin(user.id, user.is_admin)}
                            disabled={updatingUser === user.id}
                            className={`text-xs px-3 py-1.5 rounded-lg font-medium transition ${
                              user.is_admin
                                ? 'bg-red-50 text-red-600 hover:bg-red-100'
                                : 'bg-purple-50 text-purple-600 hover:bg-purple-100'
                            } disabled:opacity-50`}
                          >
                            {updatingUser === user.id ? (
                              '...'
                            ) : user.is_admin ? (
                              'Remove Admin'
                            ) : (
                              'Make Admin'
                            )}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-400">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {users.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No users found
              </div>
            )}
            
            <div className="mt-4 text-xs text-gray-500 border-t pt-4">
              <p><strong>Note:</strong> Admin users can access this dashboard and configure platform settings. Only grant admin access to trusted users.</p>
            </div>
          </div>
        )}

        {/* Trade Management Tab */}
        {activeTab === 'trades' && (
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-2xl">📦</span>
                <h2 className="text-lg font-semibold">Trade Management</h2>
              </div>
              <div className="flex items-center gap-3">
                <select
                  value={tradeStatusFilter}
                  onChange={(e) => {
                    setTradeStatusFilter(e.target.value);
                    loadTrades(e.target.value);
                  }}
                  className="text-sm border border-gray-300 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-green-500 focus:border-green-500"
                >
                  <option value="all">All Statuses</option>
                  <option value="proposal">Proposals</option>
                  <option value="matched">Matched</option>
                  <option value="committed">Committed</option>
                  <option value="escrow">In Escrow</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <button
                  onClick={() => loadTrades(tradeStatusFilter)}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  🔄 Refresh
                </button>
              </div>
            </div>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-3 px-2 font-medium text-gray-500">ID</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Item</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Value</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Type</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Status</th>
                    <th className="text-left py-3 px-2 font-medium text-gray-500">Created</th>
                    <th className="text-right py-3 px-2 font-medium text-gray-500">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {trades.map((trade) => (
                    <tr key={trade.id} className="hover:bg-gray-50">
                      <td className="py-3 px-2 text-gray-600">#{trade.id}</td>
                      <td className="py-3 px-2">
                        <div className="max-w-[200px]">
                          <div className="font-medium text-gray-900 truncate">{trade.item_title}</div>
                          <div className="text-xs text-gray-500 truncate">{trade.item_description}</div>
                        </div>
                      </td>
                      <td className="py-3 px-2 text-gray-600">${trade.item_value_usd.toFixed(2)}</td>
                      <td className="py-3 px-2">
                        <span className="text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                          {trade.trade_type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-3 px-2">
                        <span className={`inline-flex items-center text-xs font-medium px-2 py-1 rounded-full ${
                          trade.status === 'proposal' ? 'bg-blue-100 text-blue-700' :
                          trade.status === 'matched' ? 'bg-yellow-100 text-yellow-700' :
                          trade.status === 'committed' ? 'bg-purple-100 text-purple-700' :
                          trade.status === 'escrow' ? 'bg-orange-100 text-orange-700' :
                          trade.status === 'completed' ? 'bg-green-100 text-green-700' :
                          trade.status === 'cancelled' ? 'bg-red-100 text-red-700' :
                          'bg-gray-100 text-gray-700'
                        }`}>
                          {trade.status}
                        </span>
                      </td>
                      <td className="py-3 px-2 text-gray-500">
                        {new Date(trade.created_at).toLocaleDateString()}
                      </td>
                      <td className="py-3 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          {/* Cancel button - available for proposal, matched, committed */}
                          {['proposal', 'matched', 'committed'].includes(trade.status) && (
                            <button
                              onClick={() => handleCancelTrade(trade.id)}
                              disabled={cancellingTrade === trade.id}
                              className="text-xs px-2 py-1 rounded bg-orange-50 text-orange-600 hover:bg-orange-100 disabled:opacity-50"
                              title="Cancel this trade"
                            >
                              {cancellingTrade === trade.id ? '...' : '✕ Cancel'}
                            </button>
                          )}
                          {/* Delete button - available for proposal, cancelled */}
                          {['proposal', 'cancelled'].includes(trade.status) && (
                            <button
                              onClick={() => handleDeleteTrade(trade.id)}
                              disabled={deletingTrade === trade.id}
                              className="text-xs px-2 py-1 rounded bg-red-50 text-red-600 hover:bg-red-100 disabled:opacity-50"
                              title="Permanently delete this trade"
                            >
                              {deletingTrade === trade.id ? '...' : '🗑 Delete'}
                            </button>
                          )}
                          {/* No actions for escrow or completed */}
                          {['escrow', 'completed'].includes(trade.status) && (
                            <span className="text-xs text-gray-400">—</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            
            {trades.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                No trades found {tradeStatusFilter !== 'all' && `with status "${tradeStatusFilter}"`}
              </div>
            )}
            
            <div className="mt-4 text-xs text-gray-500 border-t pt-4">
              <p><strong>Admin Actions:</strong></p>
              <ul className="list-disc ml-4 mt-1 space-y-1">
                <li><strong>Cancel</strong> - Marks a trade as cancelled. Available for proposals, matched, and committed trades.</li>
                <li><strong>Delete</strong> - Permanently removes a trade from the database. Only available for proposals and cancelled trades.</li>
              </ul>
            </div>
          </div>
        )}

        {/* Platform Stats Tab */}
        {activeTab === 'stats' && (
          <div className="space-y-6">
            <div className="card">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">📊</span>
                  <h2 className="text-lg font-semibold">Platform Statistics</h2>
                </div>
                <button
                  onClick={loadStats}
                  className="text-sm text-gray-500 hover:text-gray-700"
                >
                  🔄 Refresh
                </button>
              </div>
              
              {stats ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-green-600">{stats.total_users}</div>
                    <div className="text-sm text-green-700 mt-1">Total Users</div>
                  </div>
                  <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-blue-600">{stats.total_trades}</div>
                    <div className="text-sm text-blue-700 mt-1">Total Trades</div>
                  </div>
                  <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-amber-600">{stats.active_trades}</div>
                    <div className="text-sm text-amber-700 mt-1">Active Trades</div>
                  </div>
                  <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-xl p-6 text-center">
                    <div className="text-3xl font-bold text-emerald-600">{stats.completed_trades}</div>
                    <div className="text-sm text-emerald-700 mt-1">Completed</div>
                  </div>
                </div>
              ) : (
                <div className="text-gray-400 text-center py-8">Loading stats...</div>
              )}
            </div>
            
            {/* User Breakdown */}
            <div className="card">
              <div className="flex items-center gap-2 mb-4">
                <span className="text-2xl">👥</span>
                <h2 className="text-lg font-semibold">User Breakdown</h2>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-700">
                    {users.filter(u => u.is_admin).length}
                  </div>
                  <div className="text-sm text-gray-500">Admin Users</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4">
                  <div className="text-2xl font-bold text-gray-700">
                    {users.filter(u => !u.is_admin).length}
                  </div>
                  <div className="text-sm text-gray-500">Regular Users</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
