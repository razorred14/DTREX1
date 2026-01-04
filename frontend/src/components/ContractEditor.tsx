import { useState } from "react";
import { contractApi } from "../api/client";

export default function ContractEditor() {
  const [file, setFile] = useState<File | null>(null);
  const [termsText, setTermsText] = useState("");
  const [hash, setHash] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function uploadAndHash() {
    if (!file && !termsText) {
      setError("Please provide either a file or contract text");
      return;
    }

    setLoading(true);
    setError("");

    try {
      const result = await contractApi.hash({
        content: termsText || undefined,
        path: file?.name,
      });

      setHash(result.terms_hash);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to hash contract");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h3 className="text-lg font-semibold mb-4">Contract Terms</h3>

      <div className="space-y-4">
        {/* File upload */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Upload Contract File
          </label>
          <input
            type="file"
            className="input-field"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
            accept=".pdf,.txt,.doc,.docx"
          />
        </div>

        <div className="text-center text-gray-500">OR</div>

        {/* Text input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Enter Contract Terms
          </label>
          <textarea
            className="input-field"
            rows={6}
            value={termsText}
            onChange={(e) => setTermsText(e.target.value)}
            placeholder="Enter your contract terms here..."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          className="btn-primary w-full"
          onClick={uploadAndHash}
          disabled={loading}
        >
          {loading ? "Processing..." : "Generate Terms Hash"}
        </button>

        {hash && (
          <div className="mt-4 p-4 bg-green-50 border border-green-200 rounded">
            <p className="text-sm font-medium text-green-800 mb-2">
              Terms Hash Generated:
            </p>
            <p className="font-mono text-xs bg-white p-2 rounded border break-all">
              {hash}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
