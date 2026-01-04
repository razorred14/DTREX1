
import ConfigurationStatus from "../components/ConfigurationStatus";
import ChiaNodeConnector from "../components/ChiaNodeConnector";
import ChiaWalletStatusCard from "../components/ChiaWalletStatusCard";
import SslCertificateUploader from "../components/SslCertificateUploader";

export default function Settings() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="mb-4">
          <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
          <p className="text-sm text-gray-600">Configure your Chia node or wallet RPC connection and upload SSL certificates for secure blockchain operations.</p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h2 className="text-lg font-semibold mb-2">1. Connection</h2>
            {/* Connection testing component */}
            <ChiaNodeConnector />
            {/* Chia Wallet Connection status card (green, like Backend Service) */}
            <div className="mt-4">
              <ChiaWalletStatusCard />
              <div className="mt-4">
                <ConfigurationStatus />
              </div>
            </div>
          </div>
          <div>
            <h2 className="text-lg font-semibold mb-2">2. SSL Certificates</h2>
            <SslCertificateUploader />
          </div>
        </div>
      </div>
    </div>
  );
}
