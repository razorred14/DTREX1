import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { tradeApi, type WishlistItem } from "../api/client";
import { useXchPrice, formatXch } from "../hooks/useXchPrice";

const ITEM_CONDITIONS = [
  { value: "mint", label: "Mint - Perfect, never used" },
  { value: "near_mint", label: "Near Mint - Minimal wear" },
  { value: "excellent", label: "Excellent - Light wear" },
  { value: "good", label: "Good - Moderate wear" },
  { value: "fair", label: "Fair - Heavy wear" },
  { value: "poor", label: "Poor - Significant damage" },
];

const CATEGORIES = [
  "Trading Cards",
  "Electronics",
  "Sneakers",
  "Collectibles",
  "Clothing",
  "Toys & Games",
  "Art",
  "NFTs",
  "Other",
];

export default function CreateTrade() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Item details
  const [itemTitle, setItemTitle] = useState("");
  const [itemDescription, setItemDescription] = useState("");
  const [itemCondition, setItemCondition] = useState("");
  const [itemValueUsd, setItemValueUsd] = useState("");
  const [itemCategory, setItemCategory] = useState("");

  // Wishlist
  const [wishlist, setWishlist] = useState<WishlistItem[]>([
    { wishlist_type: "item", item_description: "", item_min_value_usd: 0 }
  ]);

  const addWishlistItem = () => {
    setWishlist([
      ...wishlist,
      { wishlist_type: "item", item_description: "", item_min_value_usd: 0 }
    ]);
  };

  const removeWishlistItem = (index: number) => {
    if (wishlist.length > 1) {
      setWishlist(wishlist.filter((_, i) => i !== index));
    }
  };

  const updateWishlistItem = (index: number, field: keyof WishlistItem, value: any) => {
    const updated = [...wishlist];
    updated[index] = { ...updated[index], [field]: value };
    setWishlist(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!itemTitle.trim() || !itemDescription.trim() || !itemValueUsd) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const tradeId = await tradeApi.create({
        item_title: itemTitle.trim(),
        item_description: itemDescription.trim(),
        item_condition: itemCondition || undefined,
        item_value_usd: parseFloat(itemValueUsd),
        item_category: itemCategory || undefined,
        wishlist: wishlist.filter(w => 
          w.item_description?.trim() || w.xch_amount
        ),
      });

      navigate(`/trade/${tradeId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create trade proposal");
    } finally {
      setLoading(false);
    }
  };

  // Real-time XCH price from CoinGecko
  const { price: xchRate, loading: priceLoading, error: priceError } = useXchPrice();
  const xchEquivalent = itemValueUsd ? formatXch(parseFloat(itemValueUsd) / xchRate) : "0";

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Create Trade Proposal</h1>
          <p className="text-gray-600 mt-1">
            List your item and specify what you're willing to accept in trade
          </p>
        </div>

        {error && (
          <div className="card bg-red-50 border border-red-200 mb-6">
            <p className="text-red-700">{error}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Item Details Section */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">📦 Your Item</h2>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Item Title *
                </label>
                <input
                  type="text"
                  value={itemTitle}
                  onChange={(e) => setItemTitle(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-chia-green outline-none"
                  placeholder="e.g., Near-Mint Pikachu (Base Set, 1st Edition)"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description *
                </label>
                <textarea
                  value={itemDescription}
                  onChange={(e) => setItemDescription(e.target.value)}
                  className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-chia-green outline-none"
                  rows={4}
                  placeholder="Describe your item in detail. Include any flaws, history, or notable features."
                  required
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Condition
                  </label>
                  <select
                    value={itemCondition}
                    onChange={(e) => setItemCondition(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-chia-green outline-none"
                  >
                    <option value="">Select condition...</option>
                    {ITEM_CONDITIONS.map((c) => (
                      <option key={c.value} value={c.value}>{c.label}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={itemCategory}
                    onChange={(e) => setItemCategory(e.target.value)}
                    className="w-full p-3 border border-gray-200 rounded-lg focus:ring-2 focus:ring-chia-green outline-none"
                  >
                    <option value="">Select category...</option>
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Value Section */}
          <div className="card">
            <h2 className="text-xl font-semibold mb-4">💰 Trade Value</h2>
            <p className="text-gray-600 text-sm mb-4">
              Enter a USD reference to calculate the XCH trade value.
              <span className="font-medium text-green-700"> All trades settle in XCH or physical items.</span>
            </p>

            <div className="flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  XCH Value
                </label>
                <div className="p-3 bg-green-50 border-2 border-green-300 rounded-lg">
                  <span className="text-2xl font-bold text-chia-green">{xchEquivalent} XCH</span>
                </div>
                <p className="text-xs text-gray-400 mt-1">
                  {priceLoading ? "Loading..." : `$${xchRate.toFixed(2)}/XCH`}
                  {" "}
                  <a href="https://coinmarketcap.com/currencies/chia-network/" target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                    via CoinGecko
                  </a>
                </p>
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  USD Reference *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">$</span>
                  <input
                    type="number"
                    value={itemValueUsd}
                    onChange={(e) => setItemValueUsd(e.target.value)}
                    className="w-full p-3 pl-8 border border-gray-200 rounded-lg focus:ring-2 focus:ring-chia-green outline-none text-gray-600"
                    placeholder="50.00"
                    min="0"
                    step="0.01"
                    required
                  />
                </div>
                <p className="text-xs text-gray-400 mt-1">For price calculation only</p>
              </div>
            </div>
          </div>

          {/* Wishlist Section */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-xl font-semibold">📋 Wishlist</h2>
                <p className="text-gray-600 text-sm">What will you accept in trade?</p>
              </div>
              <button
                type="button"
                onClick={addWishlistItem}
                className="px-4 py-2 bg-green-100 text-green-700 rounded-lg font-medium text-sm hover:bg-green-200 transition-all"
              >
                + Add Option
              </button>
            </div>

            <div className="space-y-4">
              {wishlist.map((item, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-sm font-medium text-gray-500">Option {index + 1}</span>
                    {wishlist.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeWishlistItem(index)}
                        className="text-red-500 hover:text-red-700 text-sm"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 mb-1">
                        Trade Type
                      </label>
                      <select
                        value={item.wishlist_type}
                        onChange={(e) => updateWishlistItem(index, "wishlist_type", e.target.value)}
                        className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                      >
                        <option value="item">Item for Item</option>
                        <option value="xch">XCH Only</option>
                        <option value="mixed">Item + XCH</option>
                      </select>
                    </div>

                    {item.wishlist_type !== "xch" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Item Description
                        </label>
                        <input
                          type="text"
                          value={item.item_description || ""}
                          onChange={(e) => updateWishlistItem(index, "item_description", e.target.value)}
                          className="w-full p-2 border border-gray-200 rounded-lg text-sm"
                          placeholder="e.g., Any Base Set Holo card"
                        />
                      </div>
                    )}

                    {item.wishlist_type !== "xch" && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          Minimum Value
                        </label>
                        <div className="flex gap-2">
                          <div className="flex-1 p-2 bg-green-50 border border-green-200 rounded-lg text-sm text-green-700 font-semibold text-center">
                            {item.item_min_value_usd ? formatXch(item.item_min_value_usd / xchRate) : "0"} XCH
                          </div>
                          <div className="flex-1 relative">
                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-gray-400 text-sm">$</span>
                            <input
                              type="number"
                              value={item.item_min_value_usd || ""}
                              onChange={(e) => updateWishlistItem(index, "item_min_value_usd", parseFloat(e.target.value) || 0)}
                              className="w-full p-2 pl-6 border border-gray-200 rounded-lg text-sm text-gray-500"
                              placeholder="USD ref"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    {(item.wishlist_type === "xch" || item.wishlist_type === "mixed") && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">
                          XCH Amount
                        </label>
                        <div className="relative">
                          <input
                            type="number"
                            value={item.xch_amount ? item.xch_amount / 1_000_000_000_000 : ""}
                            onChange={(e) => {
                              const xch = parseFloat(e.target.value) || 0;
                              const mojos = Math.round(xch * 1_000_000_000_000);
                              updateWishlistItem(index, "xch_amount", mojos);
                            }}
                            className="w-full p-2 pr-14 border border-gray-200 rounded-lg text-sm"
                            placeholder="1.25"
                            min="0"
                            step="0.000000000001"
                          />
                          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 text-sm font-medium">XCH</span>
                        </div>
                        {item.xch_amount ? (
                          <p className="text-xs text-gray-400 mt-1">≈ ${((item.xch_amount / 1_000_000_000_000) * xchRate).toFixed(2)} USD</p>
                        ) : null}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Submit */}
          <div className="flex gap-4">
            <button
              type="button"
              onClick={() => navigate(-1)}
              className="flex-1 btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 btn-primary"
            >
              {loading ? "Creating..." : "Create Trade Proposal"}
            </button>
          </div>
        </form>

        {/* Info */}
        <div className="mt-8 card bg-blue-50 border border-blue-200">
          <h3 className="font-semibold text-blue-900 mb-2">💡 Tips for a Successful Trade</h3>
          <ul className="text-sm text-blue-800 space-y-1 list-disc list-inside">
            <li>Be specific and honest in your item description</li>
            <li>Set a fair market value based on recent sales</li>
            <li>Include multiple wishlist options to attract more offers</li>
            <li>Photos will be added in the next step (coming soon)</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
