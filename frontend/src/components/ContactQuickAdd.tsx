import { useEffect, useState } from "react";
import { contactApi, Contact } from "../api/client";

type Props = {
  onSelect: (publicKey: string) => void;
};

export default function ContactQuickAdd({ onSelect }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError("");
      try {
        const data = await contactApi.list();
        setContacts(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to load contacts");
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return <div className="text-xs text-gray-500">Loading contacts…</div>;
  }

  if (error) {
    return <div className="text-xs text-red-600">{error}</div>;
  }

  if (contacts.length === 0) {
    return <div className="text-xs text-gray-500">No saved contacts yet.</div>;
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-medium text-gray-700">Add from contacts</div>
      <div className="space-y-2 max-h-48 overflow-auto pr-1">
        {contacts.map((c) => (
          <div key={c.id} className="flex items-start justify-between gap-2 border border-gray-200 rounded p-2">
            <div className="flex-1">
              <div className="font-medium text-sm">{c.name}</div>
              <div className="text-xs text-gray-500">{c.email || "No email"}</div>
              <div className="mt-1 text-[11px] font-mono bg-gray-50 p-1 rounded break-all">{c.public_key}</div>
            </div>
            <button
              type="button"
              className="btn"
              onClick={() => onSelect(c.public_key)}
              title="Add this public key to participants"
            >
              Add
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
