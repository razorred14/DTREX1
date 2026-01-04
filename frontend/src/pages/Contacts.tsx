import ContactManager from "../components/ContactManager";

export default function ContactsPage() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-6xl mx-auto space-y-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Contacts</h1>
          <p className="text-gray-600">
            Save participant public keys once and reuse them when creating contracts.
          </p>
        </div>
        <ContactManager />
      </div>
    </div>
  );
}
