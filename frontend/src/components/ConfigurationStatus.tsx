import { useAppConfiguration } from "../hooks/useAppConfiguration";

export default function ConfigurationStatus() {
  const config = useAppConfiguration();

  if (config.backendReady && config.chiaNodeConnected) {
    // Everything is ready - don't show anything
    return null;
  }

  return (
    <div className="mb-6 space-y-3">
      {/* Backend Status */}
      <div
        className={`p-4 rounded-lg border flex items-start gap-3 ${
          config.backendReady
            ? "bg-green-50 border-green-200"
            : "bg-red-50 border-red-200"
        }`}
      >
        <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${
          config.backendReady ? "bg-green-500" : "bg-red-500"
        }`} />
        <div className="flex-1">
          <h4 className={`font-semibold ${
            config.backendReady ? "text-green-900" : "text-red-900"
          }`}>
            Backend Service
          </h4>
          <p className={`text-sm ${
            config.backendReady ? "text-green-700" : "text-red-700"
          }`}>
            {config.backendReady
              ? "✓ Connected"
              : config.backendError || "Not responding"}
          </p>
          {!config.backendReady && (
            <p className="text-xs text-red-600 mt-1">
              💡 Make sure to run: <code className="bg-red-100 px-1 rounded">cd backend && cargo run</code>
            </p>
          )}
        </div>
      </div>

      {/* Chia Node Status */}
      {config.backendReady && (
        <div
          className={`p-4 rounded-lg border flex items-start gap-3 ${
            config.chiaNodeConnected
              ? "bg-green-50 border-green-200"
              : "bg-yellow-50 border-yellow-200"
          }`}
        >
          <div className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${
            config.chiaNodeConnected ? "bg-green-500" : "bg-yellow-500"
          }`} />
          <div className="flex-1">
            <h4 className={`font-semibold ${
              config.chiaNodeConnected ? "text-green-900" : "text-yellow-900"
            }`}>
              Chia Node Connection
            </h4>
            <p className={`text-sm ${
              config.chiaNodeConnected ? "text-green-700" : "text-yellow-700"
            }`}>
              {config.chiaNodeConnected
                ? "✓ Connected"
                : config.chiaNodeError || "Not configured (optional)"}
            </p>
            {/* Wallet View button removed from Chia Node Connection card */}
            {!config.chiaNodeConnected && (
              <p className="text-xs text-yellow-600 mt-1">
                💡 You can still create contracts without a Chia node connection. Use the &quot;Chia Connection&quot; card below to configure it.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Wallet Connection Readiness */}
      {!config.walletConnectable && (
        <div className="p-4 rounded-lg border bg-blue-50 border-blue-200 flex items-start gap-3">
          <div className="flex-shrink-0 w-5 h-5 rounded-full mt-0.5 bg-blue-500" />
          <div className="flex-1">
            <h4 className="font-semibold text-blue-900">
              Wallet Connection Limited
            </h4>
            <p className="text-sm text-blue-700">
              Please ensure the backend service is running before connecting your wallet.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
