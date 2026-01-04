import React, { useEffect, useState } from "react";
import { getSslStatus } from "../api/client";

export default function WalletConnectionStatus() {
  const [sslStatus, setSslStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getSslStatus("wallet")
      .then(setSslStatus)
      .catch((e) => setError(e.message || "Failed to fetch SSL status"))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <div className="text-red-600">{error}</div>;

  // Show green dot if wallet cert/key present, else red
  const connected = sslStatus?.has_cert && sslStatus?.has_key;
  return (
    <div className="flex items-center mb-2">
      <span
        className={`inline-block w-3 h-3 rounded-full mr-2 ${connected ? "bg-green-500" : "bg-red-500"}`}
        title={connected ? "Wallet connection secure" : "Wallet SSL missing"}
      ></span>
      <span className="text-sm">
        Wallet connection: {connected ? <span className="text-green-700 font-semibold">Secure</span> : <span className="text-red-700 font-semibold">Not configured</span>}
      </span>
    </div>
  );
}
