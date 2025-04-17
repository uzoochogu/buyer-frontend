import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { offerService } from "../api/services";

const OfferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [offer, setOffer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    const fetchOffer = async () => {
      try {
        setLoading(true);
        setError(null);

        const response = await offerService.getOffer(id);
        setOffer(response.data);
      } catch (err) {
        console.error("Error fetching offer details:", err);
        setError("Failed to load offer details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchOffer();
  }, [id]);

  const handleAccept = async () => {
    try {
      setActionLoading(true);
      await offerService.acceptOffer(id);
      setOffer({ ...offer, status: "accepted" });
    } catch (err) {
      console.error("Error accepting offer:", err);
      setError("Failed to accept offer. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    try {
      setActionLoading(true);
      await offerService.rejectOffer(id);
      setOffer({ ...offer, status: "rejected" });
    } catch (err) {
      console.error("Error rejecting offer:", err);
      setError("Failed to reject offer. Please try again.");
    } finally {
      setActionLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
        <p>{error}</p>
        <button
          onClick={() => navigate("/offers")}
          className="mt-2 text-blue-500 hover:underline"
        >
          Back to Offers
        </button>
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Offer not found</p>
        <button
          onClick={() => navigate("/offers")}
          className="mt-2 text-blue-500 hover:underline"
        >
          Back to Offers
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate("/offers")}
          className="flex items-center text-blue-500 hover:underline"
        >
          <svg
            className="h-4 w-4 mr-1"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Back to Offers
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start mb-4">
          <h1 className="text-2xl font-bold">{offer.title}</h1>
          <div className="flex items-center">
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                offer.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : offer.status === "accepted"
                  ? "bg-green-100 text-green-800"
                  : offer.status === "rejected"
                  ? "bg-red-100 text-red-800"
                  : "bg-gray-100 text-gray-800"
              }`}
            >
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </span>
            <p className="ml-3 text-xl font-bold text-green-600">
              ${offer.price.toFixed(2)}
            </p>
          </div>
        </div>

        <div className="mb-6">
          <p className="text-sm text-gray-500">
            Offered by <span className="font-semibold">{offer.username}</span>{" "}
            on {new Date(offer.created_at).toLocaleString()}
          </p>
          {!offer.is_public && (
            <p className="text-sm text-gray-500 italic">
              This is a private offer
            </p>
          )}
        </div>

        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h2 className="text-lg font-semibold mb-2">Description</h2>
          <p className="text-gray-700 whitespace-pre-line">
            {offer.description}
          </p>
        </div>

        <div className="mb-6">
          <button
            onClick={() => navigate(`/community/post/${offer.post_id}`)}
            className="text-blue-500 hover:underline"
          >
            View Related Post
          </button>
        </div>

        {offer.is_post_owner && offer.status === "pending" && (
          <div className="flex justify-end space-x-3">
            <button
              onClick={handleReject}
              disabled={actionLoading}
              className={`px-4 py-2 rounded ${
                actionLoading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-red-500 text-white hover:bg-red-600"
              }`}
            >
              {actionLoading ? "Processing..." : "Reject Offer"}
            </button>
            <button
              onClick={handleAccept}
              disabled={actionLoading}
              className={`px-4 py-2 rounded ${
                actionLoading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-500 text-white hover:bg-green-600"
              }`}
            >
              {actionLoading ? "Processing..." : "Accept Offer"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferDetail;
