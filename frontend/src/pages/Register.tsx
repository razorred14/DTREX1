import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const benefits = [
  {
    icon: "🔒",
    title: "Secure Trading",
    desc: "All trades secured by Chia blockchain escrow"
  },
  {
    icon: "🌍",
    title: "Trade Anything",
    desc: "Cards, collectibles, electronics — you name it"
  },
  {
    icon: "⭐",
    title: "Build Reputation",
    desc: "Earn trust through verified trade history"
  },
  {
    icon: "💰",
    title: "No Middleman",
    desc: "Direct peer-to-peer, only ~$1 commit fee"
  }
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);

    try {
      await register(username, password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      {/* Header */}
      <div className="text-center pt-8 pb-4">
        <h1 className="text-4xl font-bold text-gray-900">
          🔄 <span className="text-green-600">DTREX</span>
        </h1>
        <p className="mt-2 text-lg text-gray-600">
          Join the decentralized trading revolution
        </p>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8 grid lg:grid-cols-2 gap-12 items-start">
        
        {/* Left: Benefits */}
        <div className="space-y-6">
          <div className="text-center lg:text-left">
            <h2 className="text-2xl font-bold text-gray-900">Why Join DTREX?</h2>
            <p className="text-gray-600 mt-1">The smartest way to trade physical goods</p>
          </div>

          {/* Benefit cards */}
          <div className="grid sm:grid-cols-2 gap-4">
            {benefits.map((benefit) => (
              <div key={benefit.title} className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-3xl mb-3">{benefit.icon}</div>
                <h3 className="font-semibold text-gray-900">{benefit.title}</h3>
                <p className="text-sm text-gray-600 mt-1">{benefit.desc}</p>
              </div>
            ))}
          </div>

          {/* How it works summary */}
          <div className="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl p-6 border border-green-100">
            <h3 className="font-semibold text-green-800 text-lg">🎯 Simple 5-Step Process</h3>
            <div className="mt-4 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">1</span>
                <span className="text-green-800">List your item with a fair USD value</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">2</span>
                <span className="text-green-800">Match with someone offering a fair trade</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">3</span>
                <span className="text-green-800">Both commit with a small blockchain fee</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">4</span>
                <span className="text-green-800">Ship items during 30-day escrow period</span>
              </div>
              <div className="flex items-center gap-3">
                <span className="w-7 h-7 rounded-full bg-green-600 text-white text-sm font-bold flex items-center justify-center">5</span>
                <span className="text-green-800">Rate each other & build your reputation</span>
              </div>
            </div>
          </div>

          {/* Trust indicators */}
          <div className="flex items-center justify-center lg:justify-start gap-6 text-sm text-gray-500">
            <span>🔐 Your data is encrypted</span>
            <span>🚫 No spam, ever</span>
          </div>
        </div>

        {/* Right: Register Form */}
        <div className="lg:sticky lg:top-8">
          <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900">Create Your Account</h2>
              <p className="text-gray-600 mt-1">Start trading in minutes</p>
            </div>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {error && (
                <div className="rounded-lg bg-red-50 p-4 border border-red-100">
                  <div className="text-sm text-red-800">{error}</div>
                </div>
              )}

              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Choose a username"
                />
              </div>

              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="At least 6 characters"
                />
              </div>

              <div>
                <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                  Confirm Password
                </label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="Type password again"
                />
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 border border-transparent rounded-xl shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Creating account...
                  </span>
                ) : 'Create Account'}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                Already have an account?{' '}
                <Link to="/login" className="font-semibold text-green-600 hover:text-green-500">
                  Sign in
                </Link>
              </p>
            </div>

            {/* Terms notice */}
            <p className="mt-6 text-xs text-gray-400 text-center">
              By creating an account, you agree to trade responsibly and maintain honest descriptions of your items.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
