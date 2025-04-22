import React, { useState } from "react";
import { offerService } from "../api/services";

const ProofOfProductSubmission = ({ offerId, onProofSubmitted }) => {
  const [imageUrl, setImageUrl] = useState("");
  const [description, setDescription] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!imageUrl.trim()) {
      setError("Please provide an image URL");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const response = await offerService.submitProof(
        offerId,
        imageUrl,
        description
      );

      if (response.data.status === "success") {
        if (onProofSubmitted) {
          onProofSubmitted(response.data);
        }
        setImageUrl("");
        setDescription("");
      }
    } catch (error) {
      console.error("Error submitting proof:", error);
      setError(error.response?.data?.error || "Failed to submit proof");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Submit Proof of Product</h3>

      {error && (
        <div className="mb-4 p-2 bg-red-100 border border-red-400 text-red-700 rounded">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Image URL *
          </label>
          <input
            type="url"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="https://example.com/image.jpg"
            required
            disabled={loading}
          />
        </div>

        <div className="mb-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description (optional)
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Describe the product..."
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
          {loading ? "Submitting..." : "Submit Proof"}
        </button>
      </form>
    </div>
  );
};

export default ProofOfProductSubmission;
