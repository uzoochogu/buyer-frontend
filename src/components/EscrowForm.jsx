import React, { useState } from "react";
import { offerService } from "../api/services";

const EscrowForm = ({ offerId, price, onEscrowCreated }) => {
  const [amount, setAmount] = useState(price || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!amount || isNaN(parseFloat(amount))) {
      setError("Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await offerService.createEscrow(
        offerId,
        parseFloat(amount)
      );

      if (response.data.status === "success") {
        if (onEscrowCreated) {
          onEscrowCreated(response.data);
        }
      }
    } catch (error) {
      console.error("Error creating escrow:", error);
      setError(error.response?.data?.error || "Failed to create escrow");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Create Escrow Payment</h3>

      <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 text-yellow-800 rounded">
        <p className="text-sm">
          <strong>Note:</strong> This will create an escrow account where your
          funds will be held securely until you confirm receipt of the product.
        </p>
      </div>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Amount
          </label>
          <div className="flex items-center">
            <span className="mr-2">$</span>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter amount"
              step="0.01"
              min="0"
              required
              disabled={loading}
            />
          </div>
        </div>

        <button
          type="submit"
          className={`w-full p-2 rounded ${
            loading
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-blue-500 hover:bg-blue-600 text-white"
          }`}
          disabled={loading}
        >
          {loading ? "Creating Escrow..." : "Create Escrow"}
        </button>
      </form>
    </div>
  );
};

export default EscrowForm;
