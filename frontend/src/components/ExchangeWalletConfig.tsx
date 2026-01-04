/**
 * Exchange Wallet Configuration Component
 * Allows setting the exchange wallet address where commitment fees are sent
 */

import { useState, useEffect } from "react";
import { rpcCall } from "../api/client";

interface ExchangeConfig {
  wallet_address: string | null;
  commitment_fee_mojos: number;
}

export default function ExchangeWalletConfig() {
  const [config, setConfig] = useState<ExchangeConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  // Form state
  const [walletAddress, setWalletAddress] = useState("");
  const [commitmentFeeXch, setCommitmentFeeXch] = useState("0.2");

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const result = await rpcCall<ExchangeConfig>("config_get_exchange_wallet", {});
      setConfig(result);
      
      if (result.wallet_address) {
        setWalletAddress(result.wallet_address);
      }
      
      // Convert mojos to XCH for display
      const xchAmount = result.commitment_fee_mojos / 1_000_000_000_000;
      setCommitmentFeeXch(xchAmount.toString());
      
    } catch (err: any) {
      // If config doesn't exist yet, that's okay
      if (err.message?.includes("not found") || err.message?.includes("Not found")) {
        setConfig({ wallet_address: null, commitment_fee_mojos: 200_000_000_000 });
        setCommitmentFeeXch("0.2");
      } else {
        setError(err.message || "Failed to load configuration");
      }
    } finally {
      setLoading(false);
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
    
    // Validate commitment fee
    const feeXch = parseFloat(commitmentFeeXch);
    if (isNaN(feeXch) || feeXch <= 0) {
      setError("Commitment fee must be a positive number");
      return;
    }
    
    if (feeXch < 0.001) {
      setError("Commitment fee must be at least 0.001 XCH");
      return;
    }
    
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);
      
      // Convert XCH to mojos
      const feeMojos = Math.floor(feeXch * 1_000_000_000_000);
      
      await rpcCall("config_set_exchange_wallet", {
        wallet_address: walletAddress.trim(),
        commitment_fee_mojos: feeMojos,
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
      <div className="card">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-gray-600">Loading configuration...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-2xl">💰</span>
        <h3 className="text-lg font-semibold">Exchange Wallet Configuration</h3>
      </div>
      
      <p className="text-sm text-gray-600 mb-4">
        Configure the exchange wallet address where commitment fees are collected. 
        Both parties must pay this fee to lock a trade.
      </p>
      
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}
      
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-lg p-3 mb-4">
          <p className="text-green-700 text-sm">{success}</p>
        </div>
      )}
      
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
            This is where all commitment fees will be sent
          </p>
        </div>
        
        {/* Commitment Fee */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Commitment Fee (XCH) *
          </label>
          <input
            type="text"
            inputMode="decimal"
            value={commitmentFeeXch}
            onChange={(e) => {
              const val = e.target.value;
              if (val === '' || /^\d*\.?\d*$/.test(val)) {
                setCommitmentFeeXch(val);
              }
            }}
            placeholder="0.2"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
          />
          <p className="text-xs text-gray-500 mt-1">
            Amount each party must pay to commit to a trade (recommended: 0.1-0.5 XCH)
          </p>
        </div>
        
        {/* Current Status */}
        {config && (
          <div className="bg-gray-50 rounded-lg p-3">
            <h4 className="text-sm font-medium text-gray-700 mb-2">Current Configuration</h4>
            <dl className="text-sm space-y-1">
              <div className="flex justify-between">
                <dt className="text-gray-500">Wallet Address:</dt>
                <dd className="font-mono text-xs text-gray-800 truncate max-w-[200px]" title={config.wallet_address || 'Not set'}>
                  {config.wallet_address 
                    ? `${config.wallet_address.slice(0, 10)}...${config.wallet_address.slice(-6)}`
                    : <span className="text-orange-600">Not configured</span>
                  }
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-gray-500">Commitment Fee:</dt>
                <dd className="text-gray-800">
                  {(config.commitment_fee_mojos / 1_000_000_000_000).toFixed(3)} XCH
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
          <strong>⚠️ Important:</strong> Make sure you control the exchange wallet address before saving. 
          All commitment fees will be irreversibly sent to this address.
        </p>
      </div>
    </div>
  );
}
