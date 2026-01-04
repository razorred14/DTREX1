import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { initSignClient, restoreSession, disconnectWallet, type WalletInfo } from "../wallet/walletConnect";

interface WalletConnectorProps {
  onAutoFill?: (address: string) => void;
  onConnectionChange?: (connected: boolean, info?: WalletInfo) => void;
}

export default function WalletConnector({ onAutoFill, onConnectionChange }: WalletConnectorProps) {
  const [loading, setLoading] = useState(false);
  const [restoring, setRestoring] = useState(true); // Start true to check for existing session
  const [walletInfo, setWalletInfo] = useState<WalletInfo | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [qrUri, setQrUri] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [manualAddress, setManualAddress] = useState("");
  const [showManualEntry, setShowManualEntry] = useState(false);

  // Try to restore existing session on mount
  useEffect(() => {
    const tryRestoreSession = async () => {
      try {
        console.log("[Sage] Checking for existing session...");
        const restoredInfo = await restoreSession();
        
        if (restoredInfo) {
          console.log("[Sage] Session restored:", restoredInfo);
          setWalletInfo(restoredInfo);
          
          if (restoredInfo.address && restoredInfo.address.startsWith("xch")) {
            if (onAutoFill) onAutoFill(restoredInfo.address);
            if (onConnectionChange) onConnectionChange(true, restoredInfo);
          } else if (restoredInfo.fingerprint) {
            // Session exists but no address - show manual entry
            setShowManualEntry(true);
            if (onConnectionChange) onConnectionChange(true, restoredInfo);
          }
        }
      } catch (err) {
        console.error("[Sage] Failed to restore session:", err);
      } finally {
        setRestoring(false);
      }
    };
    
    tryRestoreSession();
  }, []); // Run once on mount

  const initiateConnection = async () => {
    setLoading(true);
    setError(null);
    setQrUri(null);
    setShowManualEntry(false);
    
    try {
      // Initialize the WalletConnect client
      const client = await initSignClient();
      
      // Create a WalletConnect session request for Sage wallet
      // Sage uses chia_getAddress to retrieve the receive address
      const { uri, approval } = await client.connect({
        optionalNamespaces: {
          chia: {
            // Sage wallet-specific methods
            methods: ["chia_getAddress", "chia_signMessageByAddress"],
            chains: ["chia:mainnet"],
            events: ["accountsChanged"],
          },
        },
      });

      // Show the QR code immediately once we have the URI
      if (uri) {
        setQrUri(uri);
        setLoading(false); // Stop loading, show QR
      }

      // Wait for the user to scan and approve
      const session = await approval();
      
      // Get fingerprint from session
      const accounts = session.namespaces.chia?.accounts || [];
      let fingerprint = "";
      if (accounts.length > 0) {
        const parts = accounts[0].split(":");
        fingerprint = parts.length >= 3 ? parts[2] : parts[parts.length - 1];
      }

      // Get receive address via Sage's chia_getAddress method
      // This returns the wallet's current receive address (not a new one)
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
        console.log("[Sage] chia_getAddress response:", response);
        address = response?.address || "";
      } catch (err) {
        console.log("[Sage] chia_getAddress failed:", err);
      }

      const info: WalletInfo = { address, fingerprint };
      setWalletInfo(info);
      setQrUri(null);
      
      // If we got an address, notify parent
      if (address && address.startsWith("xch")) {
        if (onAutoFill) onAutoFill(address);
        if (onConnectionChange) onConnectionChange(true, info);
      } else {
        // Only got fingerprint - show manual entry
        setShowManualEntry(true);
        if (onConnectionChange) onConnectionChange(true, info);
      }
    } catch (err: any) {
      console.error("Wallet Connection Error:", err);
      setError(err.message || "Failed to connect wallet. Please try again.");
      setQrUri(null);
      if (onConnectionChange) {
        onConnectionChange(false);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleManualAddressSubmit = () => {
    if (manualAddress && manualAddress.startsWith("xch1")) {
      const updatedInfo = { ...walletInfo, address: manualAddress } as WalletInfo;
      setWalletInfo(updatedInfo);
      setShowManualEntry(false);
      if (onAutoFill) onAutoFill(manualAddress);
      if (onConnectionChange) onConnectionChange(true, updatedInfo);
    } else {
      setError("Please enter a valid XCH address starting with 'xch1'");
    }
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

  const disconnect = async () => {
    // Properly disconnect WalletConnect session and clear persisted data
    await disconnectWallet();
    setWalletInfo(null);
    setQrUri(null);
    setError(null);
    setShowManualEntry(false);
    setManualAddress("");
    if (onConnectionChange) {
      onConnectionChange(false);
    }
  };

  // Show loading state while checking for existing session
  if (restoring) {
    return (
      <div className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 border-2 border-green-500 border-t-transparent rounded-full animate-spin"></div>
          <span className="text-xs text-slate-500">Checking for existing wallet session...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-sm">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-bold text-slate-700">
            <span className="text-green-600">Sage</span> Wallet Connection
          </h3>
          <p className="text-xs text-slate-500">
            {walletInfo ? "Connected via WalletConnect" : "Scan QR code with Sage wallet app"}
          </p>
        </div>
        {!walletInfo ? (
          <button
            type="button"
            onClick={initiateConnection}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
              loading 
                ? "bg-slate-100 text-slate-400 cursor-not-allowed" 
                : "bg-green-600 text-white hover:bg-green-700 active:scale-95"
            }`}
          >
            {loading ? "CONNECTING..." : "CONNECT WALLET"}
          </button>
        ) : (
          <button
            type="button"
            onClick={disconnect}
            className="px-4 py-2 rounded-lg font-bold text-xs bg-red-100 text-red-600 hover:bg-red-200 transition-all"
          >
            DISCONNECT
          </button>
        )}
      </div>

      {/* QR Code Display - Sage Wallet */}
      {qrUri && !walletInfo && (
        <div className="flex flex-col items-center gap-4 p-6 bg-slate-50 rounded-xl border border-slate-200">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-600">SAGE WALLET</span>
            <span className="text-xs text-slate-400">|</span>
            <span className="text-xs text-slate-500">WalletConnect</span>
          </div>
          <p className="text-xs text-slate-600 font-medium text-center">
            Scan this QR code with your Sage wallet app
          </p>
          <div className="p-4 bg-white rounded-xl shadow-sm">
            <QRCodeSVG 
              value={qrUri} 
              size={200}
              level="M"
              includeMargin={true}
            />
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={copyUri}
              className={`px-4 py-2 rounded-lg font-bold text-xs transition-all ${
                copied 
                  ? "bg-green-100 text-green-700" 
                  : "bg-slate-200 text-slate-700 hover:bg-slate-300"
              }`}
            >
              {copied ? "✓ COPIED!" : "COPY LINK"}
            </button>
            <button
              type="button"
              onClick={() => setQrUri(null)}
              className="px-4 py-2 rounded-lg font-bold text-xs bg-slate-200 text-slate-700 hover:bg-slate-300 transition-all"
            >
              CANCEL
            </button>
          </div>
          <p className="text-[10px] text-slate-400 text-center max-w-xs">
            Open Sage wallet → Settings → WalletConnect → Scan QR code
          </p>
        </div>
      )}

      {/* Manual Address Entry - shown when wallet only returns fingerprint */}
      {showManualEntry && walletInfo && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <span className="text-xs font-bold text-amber-700">Wallet Connected (Fingerprint: {walletInfo.fingerprint})</span>
          </div>
          <p className="text-[11px] text-amber-700 mb-3">
            Your wallet doesn't support automatic address retrieval. Please enter your XCH address manually:
          </p>
          <div className="flex gap-2">
            <input
              type="text"
              value={manualAddress}
              onChange={(e) => setManualAddress(e.target.value)}
              placeholder="xch1..."
              className="flex-1 p-2 border border-amber-300 rounded-lg text-xs font-mono focus:ring-2 focus:ring-amber-400 outline-none"
            />
            <button
              type="button"
              onClick={handleManualAddressSubmit}
              className="px-4 py-2 bg-amber-500 text-white rounded-lg font-bold text-xs hover:bg-amber-600 transition-all"
            >
              CONFIRM
            </button>
          </div>
          <p className="text-[10px] text-amber-600 mt-2">
            Find your address in the Chia GUI: Click on the wallet → Receive → Copy address
          </p>
        </div>
      )}

      {/* Connected State - Sage Wallet */}
      {walletInfo && !showManualEntry && (
        <div className="mt-2 p-3 bg-green-50 border border-green-100 rounded-lg">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-green-700 uppercase tracking-tighter">Sage Connected</span>
            {walletInfo.fingerprint && (
              <span className="text-[10px] text-green-600">(Fingerprint: {walletInfo.fingerprint})</span>
            )}
          </div>
          <p className="text-[11px] font-mono text-green-800 mt-1 break-all">
            {walletInfo.address}
          </p>
          <p className="text-[9px] text-green-600 mt-1 flex items-center gap-1">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Session persists across page reloads
          </p>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-100 rounded-lg">
          <p className="text-[11px] text-red-600 font-medium">{error}</p>
        </div>
      )}
    </div>
  );
}