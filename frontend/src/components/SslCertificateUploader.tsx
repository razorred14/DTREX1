import { useState, useEffect } from "react";
import { getSslStatus, uploadSslCertificates, deleteSslCertificates, setSslPaths, setSslIdentityPath, setSslCaPath, SslStatus } from "../api/client";


// --- Move all code inside the SslCertificateUploader function ---
function SslCertificateUploader() {
  const [certFile, setCertFile] = useState<File | null>(null);
  const [keyFile, setKeyFile] = useState<File | null>(null);
  const [caFile, setCaFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [status, setStatus] = useState<SslStatus | null>(null);

  const [mode, setMode] = useState<'wallet' | 'full_node'>('wallet');
  // Example usage for manual set (if you expose these in UI):
  // await setSslPaths(certPath, keyPath, mode);
  // await setSslIdentityPath(p12Path, p12Password, mode);
  // await setSslCaPath(caPath, mode);

  useEffect(() => {
    loadStatus();
    // eslint-disable-next-line
  }, [mode]);

  const loadStatus = async () => {
    try {
      const status = await getSslStatus(mode);
      setStatus(status);
    } catch (err) {
      console.error("Failed to load SSL status:", err);
    }
  };

  const handleUpload = async () => {
    if (!certFile || !keyFile || !caFile) {
      setError("Please select certificate, key, and CA files");
      return;
    }
    setUploading(true);
    setError("");
    setMessage("");
    try {
      const formData = new FormData();
      formData.append("cert", certFile);
      formData.append("key", keyFile);
      formData.append("ca", caFile);
      formData.append("type", mode);
      const response = await uploadSslCertificates(formData);
      if (response.success) {
        setMessage(response.message);
        setCertFile(null);
        setKeyFile(null);
        setCaFile(null);
        await loadStatus();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload certificates");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete the SSL certificates?")) {
      return;
    }
    try {
      const response = await deleteSslCertificates(mode);
      if (response.success) {
        setMessage(response.message);
        await loadStatus();
      } else {
        setError(response.message);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete certificates");
    }
  };

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-3">SSL Certificates</h3>
      <div className="mb-4 flex gap-4 items-center">
        <label className="font-medium text-sm">Mode:</label>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as 'wallet' | 'full_node')}
          className="border rounded px-2 py-1 text-sm"
        >
          <option value="wallet">Wallet</option>
          <option value="full_node">Full Node</option>
        </select>
      </div>
      <div className="mb-4">
        <div className="flex items-center gap-2 text-sm">
          <span className="font-medium">Status:</span>
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${status?.has_cert ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>Certificate {status?.has_cert ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${status?.has_key ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>Key {status?.has_key ? '✅' : '❌'}</span>
            </div>
            <div className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${status?.has_ca ? 'bg-green-500' : 'bg-gray-400'}`} />
              <span>CA {status?.has_ca ? '✅' : '❌'}</span>
            </div>
          </div>
        </div>
      </div>
      {message && (
        <div className="bg-green-50 p-3 rounded border border-green-200 mb-3">
          <p className="text-sm text-green-800">{message}</p>
        </div>
      )}
      {error && (
        <div className="bg-red-50 p-3 rounded border border-red-200 mb-3">
          <p className="text-sm text-red-800">{error}</p>
        </div>
      )}
      <div className="space-y-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Certificate File (public, <code>{mode === 'wallet' ? 'private_wallet.crt' : 'private_full_node.crt'}</code>)
          </label>
          <input
            type="file"
            accept=".crt,.pem"
            onChange={(e) => setCertFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Key File (private, <code>{mode === 'wallet' ? 'private_wallet.key' : 'private_full_node.key'}</code>)
          </label>
          <input
            type="file"
            accept=".key,.pem"
            onChange={(e) => setKeyFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            CA File (<code>chia_ca.crt</code>)
          </label>
          <input
            type="file"
            accept=".crt,.pem"
            onChange={(e) => setCaFile(e.target.files?.[0] || null)}
            className="w-full text-sm"
          />
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleUpload}
            disabled={uploading || !certFile || !keyFile || !caFile}
            className="btn-primary flex-1"
          >
            {uploading ? "Uploading..." : `Upload ${mode === 'wallet' ? 'Wallet' : 'Full Node'} Certificates`}
          </button>
          {(status?.has_cert || status?.has_key || status?.has_ca) && (
            <button
              onClick={handleDelete}
              className="btn-secondary"
            >
              Delete
            </button>
          )}
        </div>
      </div>
      <div className="mt-4 p-3 bg-blue-50 rounded border border-blue-200">
        <p className="text-xs font-semibold text-blue-800 mb-1">📖 How to find your SSL certificates and CA file:</p>
        <ol className="text-xs text-blue-700 space-y-1 list-decimal list-inside">
          <li>On the computer running Chia, go to:
            <ul className="list-disc ml-6">
              <li><code className="bg-white px-1 rounded">~/.chia/mainnet/config/ssl/wallet/</code> (for wallet)</li>
              <li><code className="bg-white px-1 rounded">~/.chia/mainnet/config/ssl/full_node/</code> (for full node)</li>
              <li><code className="bg-white px-1 rounded">~/.chia/mainnet/config/ssl/ca/</code> (for CA)</li>
            </ul>
          </li>
          <li>Copy the following files depending on your mode:
            <ul className="list-disc ml-6">
              <li><b>Wallet:</b> <code className="bg-white px-1 rounded">private_wallet.crt</code> <b>(public certificate)</b>, <code className="bg-white px-1 rounded">private_wallet.key</code> <b>(private key)</b></li>
              <li><b>Full Node:</b> <code className="bg-white px-1 rounded">private_full_node.crt</code> <b>(public certificate)</b>, <code className="bg-white px-1 rounded">private_full_node.key</code> <b>(private key)</b></li>
              <li><b>CA (both):</b> <code className="bg-white px-1 rounded">chia_ca.crt</code> (from <code>ssl/ca/</code>)</li>
            </ul>
          </li>
          <li>Upload all three files using the form above.</li>
        </ol>
        <p className="text-xs text-blue-700 mt-2">The CA file is required for secure connections to the Chia RPC. Use <code>chia_ca.crt</code> from your Chia install's <code>ssl/ca/</code> directory.</p>
      </div>
    </div>
  );
}

export default SslCertificateUploader;
