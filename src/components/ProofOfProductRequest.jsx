import React, { useState } from "react";
import { offerService } from "../api/services";

const ProofOfProductRequest = ({ offerId, onRequestSent }) => {
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      setLoading(true);
      setError("");

      const response = await offerService.requestProof(offerId, message);

      if (response.data.status === "success") {
        if (onRequestSent) {
          onRequestSent(response.data);
        }
        setMessage("");
      }
    } catch (error) {
      console.error("Error requesting proof:", error);
      setError(error.response?.data?.error || "Failed to request proof");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Request Proof of Product</h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Message (optional)
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Specify what kind of proof you need..."
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
          {loading ? "Sending Request..." : "Request Proof"}
        </button>
      </form>
    </div>
  );
};

export default ProofOfProductRequest;
