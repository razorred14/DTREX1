import React, { useState, useEffect } from "react";
import { contractApi, getChiaNodeStatus, setChiaRpcConfig, clearChiaConfig } from "../api/client";

type Props = {
  onConnectionChange?: (connected: boolean, network?: string) => void;
};

type ConnectionMode = "node" | "wallet";

export default function ChiaNodeConnector({ onConnectionChange }: Props) {
  const [connectionMode, setConnectionMode] = useState<ConnectionMode>(() => {
    return (localStorage.getItem("chia_connection_mode") as ConnectionMode) || "node";
  });
  const [rpcUrl, setRpcUrl] = useState(() => {
    return localStorage.getItem("chia_rpc_url") || "http://localhost:8555";
  });
  const [tempUrl, setTempUrl] = useState(rpcUrl);
  const [isConnected, setIsConnected] = useState(false);
  const [network, setNetwork] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [nodeResponse, setNodeResponse] = useState<Record<string, any> | null>(null);
  const [connectionType, setConnectionType] = useState<string | null>(null);


  // Test and save connection only on user action
  const handleConnect = async () => {
    if (!tempUrl.trim()) {
      setError("RPC URL cannot be empty");
      return;
    }

    setIsLoading(true);
    setError(null);
    setNodeResponse(null);

    try {
      // Test connection through the backend (do not persist yet)
      const status = await getChiaNodeStatus(connectionMode, tempUrl, true);

      if (status.connected) {
        // Persist desired RPC URL to backend (node or wallet)
        await setChiaRpcConfig(tempUrl, connectionMode);
        // Save the connection info only if test passes
        localStorage.setItem("chia_rpc_url", tempUrl);
        localStorage.setItem("chia_connection_mode", connectionMode);
        setRpcUrl(tempUrl);
        setNodeResponse(status);
        setConnectionType(connectionMode === "wallet" ? "Wallet RPC" : "Full Node RPC");
        setNetwork(status.network || "unknown");
        setIsConnected(true);
        setIsEditing(false);
        onConnectionChange?.(true, status.network);
      } else {
        throw new Error(status.error || "Node not connected");
      }
    } catch (err) {
      setError(`Failed to connect: ${err instanceof Error ? err.message : "Unknown error"}`);
      setIsConnected(false);
      setConnectionType(null);
      onConnectionChange?.(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = async () => {
    // Clear backend state
    try {
      await clearChiaConfig();
    } catch (e) {
      // Optionally show error
    }
    // Clear frontend state
    localStorage.removeItem("chia_rpc_url");
    localStorage.removeItem("chia_connection_mode");
    setRpcUrl("http://localhost:8555");
    setTempUrl("http://localhost:8555");
    setConnectionMode("node");
    setIsConnected(false);
    setNetwork(null);
    setError(null);
    setNodeResponse(null);
    setConnectionType(null);
    onConnectionChange?.(false);
  };

  return (
    <div className="card bg-blue-50 border border-blue-200">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-800">
          Chia Connection
        </h3>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
            title={isConnected ? "Connected" : "Disconnected"}
          />
          <span className="text-xs font-medium text-gray-600">
            {isConnected ? "Connected" : "Disconnected"}
          </span>
        </div>
      </div>

      {isConnected && (network || connectionType) && (
        <div className="mb-3 space-y-2">
          <div className="text-xs text-gray-600 space-y-1">
            {connectionType && (
              <p>
                <strong>Type:</strong> {connectionType}
              </p>
            )}
            {network && (
              <p>
                <strong>Network:</strong> {network}
              </p>
            )}
            {nodeResponse?.rpc_url && (
              <p>
                <strong>RPC URL:</strong> {nodeResponse.rpc_url}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Always show response box if we have data or are loading */}
      {(nodeResponse || isLoading) && (
        <div className="mb-3 bg-white p-2 rounded border border-gray-300 text-xs">
          <p className="font-semibold text-gray-700 mb-1">
            {isLoading ? "Testing Connection..." : "Connection Response:"}
          </p>
          {isLoading ? (
            <div className="bg-gray-50 p-2 rounded text-gray-600">
              <p>Sending request to {connectionMode === "wallet" ? "Wallet RPC" : "Full Node"}...</p>
            </div>
          ) : (
            <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-64 text-gray-800 font-mono text-xs">
              {JSON.stringify(nodeResponse, null, 2)}
            </pre>
          )}
        </div>
      )}

      {isEditing ? (
        <div className="space-y-3">
          {/* Connection Mode Selector */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Connection Type
            </label>
            <div className="flex gap-2">
              <button
                type="button"
                className={`flex-1 px-3 py-2 text-xs rounded border ${
                  connectionMode === "node"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setConnectionMode("node");
                  setTempUrl("https://localhost:8555");
                }}
              >
                Full Node
              </button>
              <button
                type="button"
                className={`flex-1 px-3 py-2 text-xs rounded border ${
                  connectionMode === "wallet"
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                }`}
                onClick={() => {
                  setConnectionMode("wallet");
                  setTempUrl("https://localhost:9256");
                }}
              >
                Wallet RPC
              </button>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              {connectionMode === "node"
                ? "Connect to a Chia full node (port 8555)"
                : "Connect to a Chia wallet RPC (port 9256)"}
            </p>
          </div>

          {/* URL Input */}
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              RPC URL
            </label>
            <input
              type="text"
              className="input-field w-full"
              placeholder={connectionMode === "node" ? "https://localhost:8555" : "https://localhost:9256"}
              value={tempUrl}
              onChange={(e) => setTempUrl(e.target.value)}
              title="Enter the full URL to your Chia RPC endpoint"
            />
            <p className="text-xs text-gray-600 bg-gray-50 p-2 rounded mt-2 border border-gray-200">
              The URL you enter here will be sent to the backend and used for all Chia RPC calls.
            </p>
          </div>

          {error && <p className="text-xs text-red-600">{error}</p>}

          <div className="flex gap-2">
            <button
              className="btn flex-1 text-sm"
              onClick={handleConnect}
              disabled={isLoading}
              title="Test connection via backend"
            >
              {isLoading ? "Testing..." : "Test Connection"}
            </button>
            <button
              className="btn-secondary flex-1 text-sm"
              onClick={() => {
                setIsEditing(false);
                setTempUrl(rpcUrl);
                setError(null);
              }}
              title="Cancel editing"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="space-y-1">
            <div className="text-xs font-semibold text-gray-600">
              {connectionMode === "node" ? "Full Node RPC" : "Wallet RPC"}
            </div>
            <div className="text-xs font-mono text-gray-700 p-2 bg-white rounded border border-gray-200 break-all">
              {rpcUrl}
            </div>
          </div>
          {error && (
            <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
              <p className="font-semibold mb-1">Connection Error:</p>
              <p>{error}</p>
            </div>
          )}
          {nodeResponse && !isEditing && (
            <div className="bg-white p-2 rounded border border-gray-300 text-xs">
              <p className="font-semibold text-gray-700 mb-1">Last Connection Response:</p>
              <pre className="bg-gray-50 p-2 rounded overflow-auto max-h-64 text-gray-800 font-mono text-xs">
                {JSON.stringify(nodeResponse, null, 2)}
              </pre>
            </div>
          )}
          <div className="flex gap-2">
            <button
              className="btn flex-1 text-sm"
              onClick={() => {
                setTempUrl(rpcUrl);
                setIsEditing(true);
                setError(null);
              }}
              title="Edit connection settings"
            >
              Edit
            </button>
            <button
              className="btn-secondary flex-1 text-sm"
              onClick={handleClear}
              title="Clear saved connection"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-gray-500 mt-3">
        💡 Choose Full Node for mainnet deployment or Wallet RPC for quick balance checks.
        Connection is saved locally.
      </p>

      {/* Help/Instructions */}
      <details className="mt-4 text-xs text-gray-600">
        <summary className="cursor-pointer font-semibold hover:text-gray-800">
          How to connect to Chia mainnet
        </summary>
        <div className="mt-3 space-y-3 text-gray-700 bg-white p-3 rounded border border-gray-200">
          <div>
            <p className="font-semibold text-gray-800">Full Node (Recommended for Deployment)</p>
            <p>Default port: 8555</p>
            <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
              <li>Best for deploying and spending contracts</li>
              <li>Requires full blockchain sync (~100GB+)</li>
              <li>URL: <code className="bg-gray-100 px-1 rounded">https://localhost:8555</code></li>
              <li>Needs TLS certificates for production</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-800">Wallet RPC (Lighter Alternative)</p>
            <p>Default port: 9256</p>
            <ul className="list-disc list-inside space-y-1 mt-1 text-xs">
              <li>Faster setup, connects to Chia's network</li>
              <li>Good for balance checks and wallet operations</li>
              <li>URL: <code className="bg-gray-100 px-1 rounded">https://localhost:9256</code></li>
              <li>May not support all contract operations</li>
            </ul>
          </div>

          <div>
            <p className="font-semibold text-gray-800">Starting Chia Services</p>
            <code className="block bg-gray-100 p-2 rounded mt-1 overflow-auto text-xs">
              # Full node<br/>
              chia start node<br/><br/>
              # Wallet only<br/>
              chia start wallet
            </code>
          </div>

          <div>
            <p className="font-semibold text-gray-800">🔐 SSL/TLS Certificates Setup</p>
            <div className="space-y-2 mt-2">
              <p className="text-xs">Production connections require SSL certificates. Here's how to get and use them:</p>
              
              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold text-xs mb-1">1. Locate Chia Certificates</p>
                <p className="text-xs mb-1">Chia automatically generates certificates when you install it:</p>
                <code className="block bg-gray-100 p-2 rounded text-xs overflow-auto">
                  ~/.chia/mainnet/config/ssl/
                </code>
                <p className="text-xs mt-1">Key files needed:</p>
                <ul className="list-disc list-inside text-xs ml-2">
                  <li><code className="bg-gray-100 px-1">full_node/private_full_node.crt</code> - Client cert</li>
                  <li><code className="bg-gray-100 px-1">full_node/private_full_node.key</code> - Client key</li>
                  <li><code className="bg-gray-100 px-1">ca/chia_ca.crt</code> - CA certificate</li>
                </ul>
              </div>

              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold text-xs mb-1">2. Configure Backend Environment</p>
                <p className="text-xs mb-1">Add these to your <code className="bg-gray-100 px-1">backend/.env</code> file:</p>
                <code className="block bg-gray-100 p-2 rounded text-xs overflow-auto">
                  CHIA_RPC_URL=https://localhost:8555<br/>
                  CHIA_SSL_CERT_PATH=~/.chia/mainnet/config/ssl/full_node/private_full_node.crt<br/>
                  CHIA_SSL_KEY_PATH=~/.chia/mainnet/config/ssl/full_node/private_full_node.key<br/>
                  CHIA_SSL_CA_PATH=~/.chia/mainnet/config/ssl/ca/chia_ca.crt
                </code>
              </div>

              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold text-xs mb-1">3. Verify Certificate Paths</p>
                <code className="block bg-gray-100 p-2 rounded text-xs overflow-auto">
                  # Check if certificates exist<br/>
                  ls -la ~/.chia/mainnet/config/ssl/full_node/<br/>
                  ls -la ~/.chia/mainnet/config/ssl/ca/
                </code>
              </div>

              <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
                <p className="font-semibold text-xs text-yellow-800 mb-1">⚠️ Current Limitation</p>
                <p className="text-xs text-yellow-700">
                  The backend currently uses basic HTTP client. TLS certificate support needs to be added to 
                  <code className="bg-yellow-100 px-1">backend/src/rpc/client.rs</code> for production use.
                </p>
              </div>

              <div className="bg-gray-50 p-2 rounded">
                <p className="font-semibold text-xs mb-1">4. For Development/Testing</p>
                <p className="text-xs">You can bypass TLS for local testing:</p>
                <ul className="list-disc list-inside text-xs ml-2">
                  <li>Use <code className="bg-gray-100 px-1">http://localhost:8555</code> (if configured)</li>
                  <li>Or run Chia node with <code className="bg-gray-100 px-1">--insecure</code> flag (not recommended)</li>
                  <li>Focus on contract creation first (no node needed)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="bg-blue-50 p-2 rounded border border-blue-200">
            <p className="font-semibold text-xs text-blue-800 mb-1">💡 Recommended Workflow</p>
            <ol className="list-decimal list-inside text-xs text-blue-700 space-y-1">
              <li>Start by creating contracts (no node connection needed)</li>
              <li>Test locally with Chia simulator or testnet</li>
              <li>Set up SSL certificates when ready for mainnet deployment</li>
              <li>Update backend code to use TLS client before production</li>
            </ol>
          </div>
        </div>
      </details>
    </div>
  );
}

