import { useAppConfiguration } from "../hooks/useAppConfiguration";

export default function ChiaWalletStatusCard() {
  const config = useAppConfiguration();
  const connected = config.backendReady;
  return (
    <div
      className={`p-4 rounded-lg border flex items-start gap-3 ${
        connected ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"
      }`}
    >
      <div
        className={`flex-shrink-0 w-5 h-5 rounded-full mt-0.5 ${
          connected ? "bg-green-500" : "bg-red-500"
        }`}
      />
      <div className="flex-1">
        <h4
          className={`font-semibold ${
            connected ? "text-green-900" : "text-red-900"
          }`}
        >
          Chia Wallet Connection
        </h4>
        <p className={`text-sm ${connected ? "text-green-700" : "text-red-700"}`}>
          {connected ? "\u2713 Connected" : "Not connected"}
        </p>
        {connected && (
          <div className="mt-2">
            <a
              href="/wallet-view"
              className="inline-block px-3 py-1 text-xs font-semibold rounded bg-green-600 text-white hover:bg-green-700 transition"
            >
              Wallet View
            </a>
          </div>
        )}
      </div>
    </div>
  );
}