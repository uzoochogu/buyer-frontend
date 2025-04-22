import React, { useState } from "react";
import { offerService } from "../api/services";

const NegotiationForm = ({ offerId, currentPrice, onNegotiationComplete }) => {
  const [price, setPrice] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!price || isNaN(parseFloat(price))) {
      setError("Please enter a valid price");
      return;
    }

    try {
      setLoading(true);
      setError("");

      // Include offerId in the message for reference in chat
      // const messageWithOfferId = message
      //   ? `${message}\nofferId:${offerId}`
      //   : `offerId:${offerId}`;

      const response = await offerService.negotiateOffer(
        offerId,
        parseFloat(price),
        message || `offerId:${offerId}`
      );

      if (response.data.status === "success") {
        if (onNegotiationComplete) {
          onNegotiationComplete(response.data);
        }

        setPrice("");
        setMessage("");
      }
    } catch (error) {
      console.error("Error negotiating offer:", error);
      setError(error.response?.data?.error || "Failed to submit negotiation");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Negotiate Price</h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Price: ${currentPrice}
          </label>
          <div className="flex items-center">
            <span className="mr-2">$</span>
            <input
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Enter your offer"
              step="0.01"
              min="0"
              required
              disabled={loading}
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Explain your offer..."
            rows="3"
            disabled={loading}
          />
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
          {loading ? "Submitting..." : "Submit Offer"}
        </button>
      </form>
    </div>
  );
};

export default NegotiationForm;
