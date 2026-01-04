import { Link } from "react-router-dom";
import ChiaNodeConnector from "../components/ChiaNodeConnector";
import ConfigurationStatus from "../components/ConfigurationStatus";

export default function Home() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Configuration Status */}
        <ConfigurationStatus />

        {/* Chia Node Connection */}
        <div className="mb-8">
          <ChiaNodeConnector />
        </div>

        {/* Hero Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-bold text-gray-900 mb-4">
            Smart Contracts on Chia
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            Create, manage, and execute blockchain-based contracts with
            verifiable on-chain enforcement
          </p>
          <Link to="/create" className="btn-primary text-lg px-8 py-3">
            Create Your First Contract
          </Link>
        </div>

        {/* Features */}
        <div className="grid md:grid-cols-3 gap-6 mb-12">
          <div className="card">
            <div className="text-3xl mb-3">📝</div>
            <h3 className="text-lg font-semibold mb-2">
              Human-Readable Contracts
            </h3>
            <p className="text-gray-600 text-sm">
              Write contracts in plain language with PDF/text support and
              automatic cryptographic hashing
            </p>
          </div>

          <div className="card">
            <div className="text-3xl mb-3">🔐</div>
            <h3 className="text-lg font-semibold mb-2">
              Multi-Signature Security
            </h3>
            <p className="text-gray-600 text-sm">
              Require multiple parties to sign before execution using BLS
              signature aggregation
            </p>
          </div>

          <div className="card">
            <div className="text-3xl mb-3">⛓️</div>
            <h3 className="text-lg font-semibold mb-2">On-Chain Enforcement</h3>
            <p className="text-gray-600 text-sm">
              Contract terms enforced by CLVM puzzles on the Chia blockchain
            </p>
          </div>
        </div>

        {/* How it works */}
        <div className="card">
          <h2 className="text-2xl font-bold mb-6">How It Works</h2>
          <div className="space-y-4">
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-chia-green text-white rounded-full flex items-center justify-center font-bold">
                1
              </div>
              <div>
                <h4 className="font-semibold">Create Contract</h4>
                <p className="text-gray-600 text-sm">
                  Write your contract terms and add participant public keys
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-chia-green text-white rounded-full flex items-center justify-center font-bold">
                2
              </div>
              <div>
                <h4 className="font-semibold">Generate Puzzle</h4>
                <p className="text-gray-600 text-sm">
                  System compiles contract into CLVM puzzle with embedded terms
                  hash
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-chia-green text-white rounded-full flex items-center justify-center font-bold">
                3
              </div>
              <div>
                <h4 className="font-semibold">Deploy On-Chain</h4>
                <p className="text-gray-600 text-sm">
                  Contract coin created on Chia blockchain with locked funds
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 w-8 h-8 bg-chia-green text-white rounded-full flex items-center justify-center font-bold">
                4
              </div>
              <div>
                <h4 className="font-semibold">Sign & Execute</h4>
                <p className="text-gray-600 text-sm">
                  Participants sign, and funds release when conditions are met
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
