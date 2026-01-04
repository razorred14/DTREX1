import { useState, useEffect } from "react";
import { contractApi, type Contract } from "../api/client";

export default function ViewContracts() {
  const [contracts, setContracts] = useState<Contract[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedContract, setSelectedContract] = useState<Contract | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [deleting, setDeleting] = useState<number | null>(null);

  useEffect(() => {
    loadContracts();
  }, []);

  const loadContracts = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await contractApi.list();
      setContracts(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contracts");
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateString;
    }
  };

  const viewContractDetails = async (id: number) => {
    try {
      const detail = await contractApi.get(id);
      setSelectedContract(detail);
      setShowDetails(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contract details");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Are you sure you want to delete this contract? This action cannot be undone.")) {
      return;
    }

    try {
      setDeleting(id);
      await contractApi.delete(id);
      await loadContracts();
      if (selectedContract?.id === id) {
        setShowDetails(false);
        setSelectedContract(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contract");
    } finally {
      setDeleting(null);
    }
  };

  if (showDetails && selectedContract) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-4xl mx-auto">
          <div className="mb-6">
            <button
              onClick={() => {
                setShowDetails(false);
                setSelectedContract(null);
              }}
              className="btn-secondary mb-4"
            >
              ← Back to Contracts
            </button>
            <h1 className="text-3xl font-bold">{selectedContract.title}</h1>
            <p className="text-gray-600 mt-2">Created: {formatDate(selectedContract.created_at)}</p>
            {selectedContract.updated_at !== selectedContract.created_at && (
              <p className="text-gray-600">Updated: {formatDate(selectedContract.updated_at)}</p>
            )}
          </div>

          <div className="space-y-4">
            {/* Contract Info */}
            <div className="card">
              <h3 className="font-semibold mb-3">Contract Information</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Contract ID</p>
                  <p className="text-sm text-gray-600">{selectedContract.id}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Status</p>
                  <p className="text-sm text-gray-600 capitalize">{selectedContract.status}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Amount</p>
                  <p className="text-sm text-gray-600">{selectedContract.amount.toLocaleString()} mojos</p>
                </div>
                {selectedContract.description && (
                  <div>
                    <p className="text-sm font-semibold text-gray-700">Description</p>
                    <p className="text-sm text-gray-600">{selectedContract.description}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Participants */}
            <div className="card">
              <h3 className="font-semibold mb-3">Participants</h3>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-gray-700">Party 1</p>
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedContract.party1_public_key}</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-700">Party 2</p>
                  <p className="text-xs font-mono text-gray-600 break-all">{selectedContract.party2_public_key}</p>
                </div>
              </div>
            </div>

            {/* Contract Content */}
            <div className="card">
              <h3 className="font-semibold mb-3">Contract Content</h3>
              <div className="p-4 bg-gray-50 rounded border border-gray-200">
                <pre className="text-sm whitespace-pre-wrap font-mono">{selectedContract.content}</pre>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-3">
              <button
                onClick={() => handleDelete(selectedContract.id)}
                disabled={deleting === selectedContract.id}
                className="btn-secondary flex-1 bg-red-100 text-red-700 hover:bg-red-200"
              >
                {deleting === selectedContract.id ? "Deleting..." : "Delete Contract"}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">My Contracts</h1>
          <a href="/create" className="btn-primary">
            + Create New
          </a>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200 mb-4">
            <p className="text-red-700">{error}</p>
            <button onClick={() => setError("")} className="text-red-600 text-sm mt-2">
              Dismiss
            </button>
          </div>
        )}

        {loading ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-4xl mb-4">⏳</div>
              <p className="text-gray-600">Loading contracts...</p>
            </div>
          </div>
        ) : contracts.length === 0 ? (
          <div className="card">
            <div className="text-center py-12">
              <div className="text-6xl mb-4">📋</div>
              <h3 className="text-xl font-semibold text-gray-700 mb-2">
                No Contracts Yet
              </h3>
              <p className="text-gray-500 mb-6">
                Create your first contract to get started
              </p>
              <a href="/create" className="btn-primary">
                Create Contract
              </a>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {contracts.map((contract) => (
              <div
                key={contract.id}
                className="card hover:shadow-xl transition-shadow"
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-lg text-gray-900">
                      {contract.title}
                    </h3>
                    {contract.description && (
                      <p className="text-sm text-gray-600 mt-1">{contract.description}</p>
                    )}
                    <p className="text-xs text-gray-500 mt-2">
                      Created: {formatDate(contract.created_at)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => viewContractDetails(contract.id)}
                      className="btn-primary text-sm"
                    >
                      View
                    </button>
                    <button
                      onClick={() => handleDelete(contract.id)}
                      disabled={deleting === contract.id}
                      className="btn-secondary text-sm bg-red-100 text-red-700 hover:bg-red-200"
                    >
                      {deleting === contract.id ? "..." : "Delete"}
                    </button>
                  </div>
                </div>

                <div className="text-sm text-gray-600">
                  <p className="truncate">{contract.content.substring(0, 150)}...</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
