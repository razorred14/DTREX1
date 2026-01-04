import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { initSignClient, restoreSession, disconnectWallet, type WalletInfo } from "../wallet/walletConnect";

interface WalletConnectStatusProps {
  compact?: boolean;
}

export default function WalletConnectStatus({ compact = true }: WalletConnectStatusProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true);
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Try to restore existing session on mount
  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        console.log("[WalletConnect] Checking for existing session...");
        const restoredInfo = await restoreSession();
        
        if (restoredInfo) {
          console.log("[WalletConnect] Session restored:", restoredInfo);
          setWalletInfo(restoredInfo);
        }
      } catch (err) {
        console.error("[WalletConnect] Failed to restore session:", err);
      } finally {
        setRestoring(false);
      }
    };
    
    tryRestoreSession();
  }, []);

  const initiateConnection = async () => {
    setLoading(true);
    setError(null);
    setQrUri(null);
    
    try {
      const client = await initSignClient();
      
      const { uri, approval } = await client.connect({
        optionalNamespaces: {
          chia: {
            methods: ["chia_getAddress", "chia_signMessageByAddress"],
            chains: ["chia:mainnet"],
            events: ["accountsChanged"],
          },
        },
      });

      if (uri) {
        setQrUri(uri);
        setLoading(false);
      }

      const session = await approval();
      
      // Get fingerprint from session
      const accounts = session.namespaces.chia?.accounts || [];
      let fingerprint = "";
      if (accounts.length > 0) {
        const parts = accounts[0].split(":");
        fingerprint = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
      }

      // Get receive address
      let address = "";
      try {
        const response = await client.request<{ address: string }>({
          topic: session.topic,
          chainId: "chia:mainnet",
          request: { 
            method: "chia_getAddress",
            params: {}
          },
        });
        address = response?.address || "";
      } catch (err) {
        console.log("[WalletConnect] chia_getAddress failed:", err);
      }

      const info: WalletInfo = { address, fingerprint };
      setWalletInfo(info);
      setQrUri(null);
      setShowDropdown(false);
    } catch (err: any) {
      console.error("Wallet Connection Error:", err);
      setError(err.message || "Failed to connect wallet");
      setQrUri(null);
    } finally {
      setLoading(false);
    }
  };

  const disconnect = async () => {
    await disconnectWallet();
    setWalletInfo(null);
    setQrUri(null);
    setError(null);
    setShowDropdown(false);
  };

  const copyUri = async () => {
    if (qrUri) {
      try {
        await navigator.clipboard.writeText(qrUri);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (err) {
        console.error("Failed to copy:", err);
      }
    }
  };

  // Loading state while restoring
  if (restoring) {
    return (
      <div className="flex items-center space-x-2">
        <div className="w-2 h-2 rounded-full bg-gray-400 animate-pulse" />
        <span className="text-sm text-gray-500">Wallet...</span>
      </div>
    );
  }

  const isConnected = !!walletInfo?.address;
  const truncatedAddress = walletInfo?.address 
    ? `${walletInfo.address.slice(0, 8)}...${walletInfo.address.slice(-6)}`
    : null;

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Status Indicator Button */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className="flex items-center space-x-2 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition-colors"
      >
        <div
          className={`w-2.5 h-2.5 rounded-full ${
            isConnected ? "bg-green-500" : "bg-orange-400"
          }`}
        />
        <span className="text-sm text-gray-700">
          {isConnected ? (
            <span className="font-medium text-green-700">
              {truncatedAddress}
            </span>
          ) : (
            <span className="text-orange-600">Connect Wallet</span>
          )}
        </span>
        <svg 
          className={`w-4 h-4 text-gray-400 transition-transform ${showDropdown ? 'rotate-180' : ''}`} 
          fill="none" 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Dropdown Panel */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl shadow-xl border border-gray-200 z-50 overflow-hidden">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-bold text-gray-800 flex items-center gap-2">
                <span className="text-green-600">🌿</span> Sage Wallet
              </h3>
              {isConnected && (
                <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs font-bold rounded-full">
                  CONNECTED
                </span>
              )}
            </div>

            {/* Not Connected - Show Connect Button */}
            {!isConnected && !qrUri && (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">
                  Connect your Sage wallet to enable trades and escrow.
                </p>
                <button
                  onClick={initiateConnection}
                  disabled={loading}
                  className={`w-full py-2.5 rounded-lg font-bold text-sm transition-all ${
                    loading
                      ? "bg-gray-100 text-gray-400 cursor-not-allowed"
                      : "bg-green-600 text-white hover:bg-green-700 active:scale-[0.98]"
                  }`}
                >
                  {loading ? (
                    <span className="flex items-center justify-center gap-2">
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Connecting...
                    </span>
                  ) : (
                    "Connect with QR Code"
                  )}
                </button>
              </div>
            )}

            {/* QR Code Display */}
            {qrUri && !isConnected && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600 text-center">
                  Scan with your Sage wallet app
                </p>
                <div className="flex justify-center">
                  <div className="p-3 bg-white rounded-lg border border-gray-200 shadow-sm">
                    <QRCodeSVG value={qrUri} size={180} level="M" includeMargin />
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={copyUri}
                    className={`flex-1 py-2 rounded-lg font-medium text-sm transition-all ${
                      copied
                        ? "bg-green-100 text-green-700"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {copied ? "✓ Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => { setQrUri(null); setLoading(false); }}
                    className="flex-1 py-2 rounded-lg font-medium text-sm bg-gray-100 text-gray-700 hover:bg-gray-200 transition-all"
                  >
                    Cancel
                  </button>
                </div>
                <p className="text-xs text-gray-400 text-center">
                  Sage → Settings → WalletConnect → Scan
                </p>
              </div>
            )}

            {/* Connected State */}
            {isConnected && (
              <div className="space-y-3">
                <div className="p-3 bg-green-50 rounded-lg border border-green-100">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
                    <span className="text-xs font-bold text-green-700 uppercase">
                      Connected via WalletConnect
                    </span>
                  </div>
                  <p className="text-xs font-mono text-green-800 break-all">
                    {walletInfo?.address}
                  </p>
                  {walletInfo?.fingerprint && (
                    <p className="text-xs text-green-600 mt-1">
                      Fingerprint: {walletInfo.fingerprint}
                    </p>
                  )}
                </div>
                <button
                  onClick={disconnect}
                  className="w-full py-2 rounded-lg font-medium text-sm bg-red-50 text-red-600 hover:bg-red-100 transition-all"
                >
                  Disconnect Wallet
                </button>
              </div>
            )}

            {/* Error Display */}
            {error && (
              <div className="mt-3 p-3 bg-red-50 rounded-lg border border-red-100">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
