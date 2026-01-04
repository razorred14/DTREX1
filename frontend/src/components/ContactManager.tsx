import { useEffect, useMemo, useState } from "react";
import { contactApi, Contact, CreateContactRequest, UpdateContactRequest } from "../api/client";

type Props = {
  onUseContact?: (publicKey: string) => void;
};

type ContactForm = {
  name: string;
  public_key: string;
  xch_address: string;
  email: string;
  note: string;
};

const emptyForm: ContactForm = {
  name: "",
  public_key: "",
  xch_address: "",
  email: "",
  note: "",
};

function isValidPubKey(key: string) {
  return key.length === 96 && /^[0-9a-fA-F]+$/.test(key);
}

export default function ContactManager({ onUseContact }: Props) {
  const [contacts, setContacts] = useState<Contact[]>([]);
  const [form, setForm] = useState<ContactForm>(emptyForm);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string>("");
  const [editingId, setEditingId] = useState<string | null>(null);

  const title = useMemo(
    () => (editingId ? "Edit Contact" : "Add Contact"),
    [editingId]
  );

  const loadContacts = async () => {
    setLoading(true);
    setError("");
    try {
      const result = await contactApi.list();
      setContacts(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load contacts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadContacts();
  }, []);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingId(null);
  };

  const submit = async () => {
    if (!form.name.trim()) {
      setError("Name is required");
      return;
    }

    if (!isValidPubKey(form.public_key.trim())) {
      setError("Public key must be 96 hex characters (compressed BLS key)");
      return;
    }

    setSaving(true);
    setError("");

    const payload: CreateContactRequest | UpdateContactRequest = {
      name: form.name.trim(),
      public_key: form.public_key.trim(),
      xch_address: form.xch_address.trim() || undefined,
      email: form.email.trim() || undefined,
      note: form.note.trim() || undefined,
    };

    try {
      if (editingId) {
        await contactApi.update(editingId, payload as UpdateContactRequest);
      } else {
        await contactApi.create(payload as CreateContactRequest);
      }
      await loadContacts();
      resetForm();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save contact");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (contact: Contact) => {
    setEditingId(contact.id);
    setForm({
      name: contact.name,
      public_key: contact.public_key,
      xch_address: contact.xch_address ?? "",
      email: contact.email ?? "",
      note: contact.note ?? "",
    });
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this contact?")) return;
    try {
      await contactApi.remove(id);
      await loadContacts();
      if (editingId === id) {
        resetForm();
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete contact");
    }
  };

  const handleUse = (publicKey: string) => {
    if (onUseContact) {
      onUseContact(publicKey);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Contact Book</h2>
        {editingId && (
          <button className="btn-secondary" onClick={resetForm}>
            Cancel Edit
          </button>
        )}
      </div>

      <div className="card space-y-3">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-sm font-medium text-gray-700">Name</label>
            <input
              className="input-field"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              placeholder="Alice Doe"
            />
          </div>
          <div>
            <label className="text-sm font-medium text-gray-700">Email (optional)</label>
            <input
              className="input-field"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              placeholder="alice@example.com"
            />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            Public Key (96 hex)
          </label>
          <input
            className={`input-field ${form.public_key && !isValidPubKey(form.public_key.trim()) ? "border-red-400 focus:border-red-500" : ""}`}
            value={form.public_key}
            onChange={(e) => setForm({ ...form, public_key: e.target.value })}
            placeholder="Paste BLS public key"
          />
          {!isValidPubKey(form.public_key.trim()) && form.public_key && (
            <p className="text-xs text-red-600 mt-1">
              Expected 96 hex characters (compressed BLS pubkey)
            </p>
          )}
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">
            XCH Wallet Address (optional)
          </label>
          <input
            className="input-field"
            value={form.xch_address}
            onChange={(e) => setForm({ ...form, xch_address: e.target.value })}
            placeholder="xch1... (Chia wallet address for transfers)"
          />
          <p className="text-xs text-gray-500 mt-1">
            💡 Used for sending Chia tokens to this contact
          </p>
        </div>

        <div>
          <label className="text-sm font-medium text-gray-700">Notes (optional)</label>
          <textarea
            className="input-field"
            rows={2}
            value={form.note}
            onChange={(e) => setForm({ ...form, note: e.target.value })}
            placeholder="Relationship, purpose, etc."
          />
        </div>

        {error && (
          <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <button
          type="button"
          className="btn-primary w-full"
          onClick={submit}
          disabled={saving}
        >
          {saving ? "Saving..." : title}
        </button>
      </div>

      <div className="card">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Saved Contacts</h3>
          {loading && <span className="text-xs text-gray-500">Loading...</span>}
        </div>

        {contacts.length === 0 && !loading && (
          <p className="text-sm text-gray-500">No contacts yet. Add one above.</p>
        )}

        <div className="space-y-3">
          {contacts.map((contact) => (
            <div key={contact.id} className="border border-gray-200 rounded p-3">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                <div>
                  <div className="font-medium">{contact.name}</div>
                  <div className="text-xs text-gray-500">{contact.email || "No email"}</div>
                  {contact.xch_address && (
                    <div className="text-xs text-gray-600 mt-1 font-mono break-all">
                      XCH: {contact.xch_address}
                    </div>
                  )}
                  {contact.note && (
                    <div className="text-xs text-gray-600 mt-1">{contact.note}</div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {onUseContact && (
                    <button
                      className="btn"
                      onClick={() => handleUse(contact.public_key)}
                      title="Add to participants"
                    >
                      Use
                    </button>
                  )}
                  <button
                    className="btn-secondary"
                    onClick={() => handleEdit(contact)}
                  >
                    Edit
                  </button>
                  <button
                    className="btn-secondary"
                    onClick={() => handleDelete(contact.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              <div className="mt-2 text-xs font-mono bg-gray-50 p-2 rounded break-all">
                {contact.public_key}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
