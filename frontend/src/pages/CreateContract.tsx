import React, { useState, useRef } from "react";
import WalletConnector from "../components/WalletConnector";
import { api } from "../api/client";

interface Participant {
  address: string;
  publicKey: string;
}

export default function CreateContract() {
  const [contractName, setContractName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState<number>(0);
  const [terms, setTerms] = useState("");
  
  // Dynamic participants list - starts with 2 empty participants
  const [participants, setParticipants] = useState<Participant[]>([
    { address: "", publicKey: "" },
    { address: "", publicKey: "" }
  ]);
  
  const [files, setFiles] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addParticipant = () => {
    setParticipants([...participants, { address: "", publicKey: "" }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length > 2) {
      setParticipants(participants.filter((_, i) => i !== index));
    }
  };

  const updateParticipant = (index: number, field: keyof Participant, value: string) => {
    const updated = [...participants];
    updated[index] = { ...updated[index], [field]: value };
    setParticipants(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validate at least 2 participants have addresses
    const validParticipants = participants.filter(p => p.address.trim() !== "");
    if (validParticipants.length < 2) {
      alert("At least 2 participant addresses are required.");
      return;
    }

    try {
      // 1. Create the Contract
      const response = await api.post("/api/rpc", {
        id: Date.now().toString(),
        method: "contract_create",
        params: {
          name: contractName,
          description,
          terms,
          amount: Number(amount),
          // For backward compatibility, send first two as party1/party2
          party1_xch_address: participants[0]?.address || "",
          party2_xch_address: participants[1]?.address || "",
          party1_public_key: participants[0]?.publicKey || "",
          party2_public_key: participants[1]?.publicKey || "",
          // Also send full participants array for future multi-party support
          participants: validParticipants
        }
      });

      const contractId = response.data.result.contract_id;

      // 2. Handle File Uploads (Optional: if your backend supports file_create)
      if (files.length > 0 && contractId) {
        for (const file of files) {
          // This assumes an endpoint or RPC method for file attachment exists
          console.log(`Uploading ${file.name} for contract ${contractId}`);
          // Add your file upload logic here
        }
      }

      alert("Contract Initialized Successfully!");
    } catch (err) {
      console.error("Contract creation failed:", err);
      alert("Failed to save contract. Check backend connection.");
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-10 space-y-12 bg-white rounded-3xl shadow-2xl my-8">
      <header className="border-b border-slate-100 pb-6">
        <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Create Multi-sig Contract</h1>
        <p className="text-slate-500 font-medium mt-1">Initialize your agreement with secure XCH addresses.</p>
      </header>

      <section className="bg-slate-50 p-6 rounded-2xl border border-slate-200">
        <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Step 1: Connect Your Wallet</h2>
        <WalletConnector onAutoFill={(addr) => updateParticipant(0, "address", addr)} />
      </section>

      <form className="space-y-10" onSubmit={handleSubmit}>
        <section className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest border-l-4 border-green-500 pl-3">
              Contract Parties ({participants.length})
            </h2>
            <button
              type="button"
              onClick={addParticipant}
              className="flex items-center gap-2 px-4 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-xs hover:bg-green-200 transition-all active:scale-95"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              ADD PARTICIPANT
            </button>
          </div>
          
          <div className="space-y-4">
            {participants.map((participant, index) => (
              <div key={index} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-400 uppercase">
                    {index === 0 ? "Party 1 (You)" : `Party ${index + 1}`}
                  </span>
                  {participants.length > 2 && (
                    <button
                      type="button"
                      onClick={() => removeParticipant(index)}
                      className="text-red-500 hover:text-red-700 p-1 rounded hover:bg-red-50 transition-all"
                      title="Remove participant"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">XCH Address</label>
                    <input 
                      value={participant.address} 
                      onChange={(e) => updateParticipant(index, "address", e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-green-500 outline-none" 
                      placeholder={index === 0 ? "xch1... (Auto-filled by Wallet)" : "Enter xch1 address..."} 
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">Public Key (Optional)</label>
                    <input 
                      value={participant.publicKey} 
                      onChange={(e) => updateParticipant(index, "publicKey", e.target.value)}
                      className="w-full p-3 border border-slate-200 rounded-lg font-mono text-xs bg-white focus:ring-2 focus:ring-green-500 outline-none" 
                      placeholder="Enter public key..." 
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-6">
          <h2 className="text-sm font-black text-slate-500 uppercase tracking-widest border-l-4 border-green-500 pl-3">Agreement Terms</h2>
          <div className="space-y-4">
            <label className="text-xs font-black text-slate-500 uppercase">Contract Title</label>
            <input 
              value={contractName} 
              onChange={(e) => setContractName(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none" 
              placeholder="e.g. Escrow for Digital Assets" 
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Amount (in Mojos)</label>
              <input 
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value === "" ? 0 : Number(e.target.value))}
                className="w-full p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-xs font-black text-slate-500 uppercase">Terms Overview</label>
              <input 
                value={terms}
                onChange={(e) => setTerms(e.target.value)}
                placeholder="e.g. Milestone 1"
                className="w-full p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-xs font-black text-slate-500 uppercase">Full Description</label>
            <textarea 
              value={description} 
              onChange={(e) => setDescription(e.target.value)}
              className="w-full p-4 border border-slate-200 rounded-xl shadow-sm focus:ring-2 focus:ring-green-500 outline-none" 
              rows={4} 
              placeholder="Detail the conditions of this multi-sig arrangement..." 
            />
          </div>
        </section>

        <section className="space-y-4">
          <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Supporting Documentation</label>
          <div 
            onClick={() => fileInputRef.current?.click()} 
            className="border-2 border-dashed border-slate-200 rounded-2xl p-10 text-center cursor-pointer hover:bg-green-50 transition-all bg-slate-50/50"
          >
            <input 
              type="file" 
              multiple 
              ref={fileInputRef} 
              className="hidden" 
              onChange={(e) => e.target.files && setFiles([...files, ...Array.from(e.target.files)])} 
            />
            <p className="text-sm text-slate-600 font-semibold italic">Drop signed PDFs or evidence files here</p>
            {files.length > 0 && (
              <div className="mt-4 flex flex-wrap justify-center gap-2">
                {files.map((f, i) => (
                  <span key={i} className="text-[10px] bg-green-100 text-green-700 px-2 py-1 rounded-full font-bold">{f.name}</span>
                ))}
              </div>
            )}
          </div>
        </section>

        <button 
          type="submit" 
          className="w-full bg-green-600 text-white py-6 rounded-2xl font-black text-xl shadow-xl uppercase tracking-widest hover:bg-green-700 active:scale-95 transition-all"
        >
          Initialize Contract
        </button>
      </form>
    </div>
  );
}