import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { offerService, communityService, chatService } from "../api/services";
import NegotiationForm from "../components/NegotiationForm";
import NegotiationHistory from "../components/NegotiationHistory";

// Upcoming features
// import ProofOfProductRequest from "../components/ProofOfProductRequest";
// import ProofOfProductSubmission from "../components/ProofOfProductSubmission";
// import ProofList from "../components/ProofList";
// import EscrowForm from "../components/EscrowForm";
// import EscrowDetails from "../components/EscrowDetails";

const OfferDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const [offer, setOffer] = useState(null);
  const [post, setPost] = useState(null);
  const [negotiations, setNegotiations] = useState([]);

  // upcoming features
  // eslint-disable-next-line no-unused-vars
  const [proofs, setProofs] = useState([]);
  // eslint-disable-next-line no-unused-vars
  const [escrow, setEscrow] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [hasEscrow, setHasEscrow] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  // eslint-disable-next-line no-unused-vars
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [selectedProofId, setSelectedProofId] = useState(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isPostOwner, setIsPostOwner] = useState(false);
  const [isOfferCreator, setIsOfferCreator] = useState(false);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);

  useEffect(() => {
    const fetchOfferDetails = async () => {
      try {
        setLoading(true);

        // Fetch offer details
        const offerResponse = await offerService.getOffer(id);
        setOffer(offerResponse.data);

        // Fetch post details
        const postResponse = await communityService.getPostById(
          offerResponse.data.post_id
        );
        setPost(postResponse.data);

        // Determine if current user is post owner or offer creator
        const currentUserId = parseInt(localStorage.getItem("user_id"));
        setIsPostOwner(offerResponse.data.is_post_owner);
        setIsOfferCreator(offerResponse.data.user_id === currentUserId);

        // Fetch negotiations
        const negotiationsResponse = await offerService.getNegotiations(id);
        setNegotiations(negotiationsResponse.data.negotiations || []);

        // Upcoming features
        // Fetch proofs
        const proofsResponse = await offerService.getProofs(id);
        setProofs(proofsResponse.data.proofs || []);

        // Fetch escrow
        const escrowResponse = await offerService.getEscrow(id);
        setHasEscrow(escrowResponse.data.has_escrow);
        if (escrowResponse.data.has_escrow) {
          setEscrow(escrowResponse.data.escrow);
        }
      } catch (err) {
        console.error("Error fetching offer details:", err);
        setError("Failed to load offer details. Please try again.");
      } finally {
        setLoading(false);
      }
    };

    fetchOfferDetails();
  }, [id]);

  const handleNegotiationComplete = async () => {
    // Refresh negotiations
    try {
      const response = await offerService.getNegotiations(id);
      setNegotiations(response.data.negotiations || []);
      setShowNegotiationForm(false);
    } catch (err) {
      console.error("Error refreshing negotiations:", err);
    }
  };

  const handleAcceptCounterOffer = async (newPrice) => {
    try {
      setLoading(true);

      // Update the offer with the new price
      await offerService.updateOffer(id, {
        price: newPrice,
      });

      // Accept the offer
      await offerService.acceptCounterOffer(id);

      // Refresh the offer
      const refreshResponse = await offerService.getOffer(id);
      setOffer(refreshResponse.data);

      // Refresh negotiations
      const negotiationsResponse = await offerService.getNegotiations(id);
      setNegotiations(negotiationsResponse.data.negotiations || []);

      // Show success message
      alert("Counter-offer accepted successfully!");

      // Navigate to chat
      handleContactSeller();
    } catch (err) {
      console.error("Error accepting counter-offer:", err);
      setError("Failed to accept counter-offer. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleProofRequestSent = async (data) => {
    // Navigate to chat
    if (data.conversation_id) {
      navigate(`/chats?conversation=${data.conversation_id}`);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleProofSubmitted = async (data) => {
    // Refresh proofs
    try {
      const response = await offerService.getProofs(id);
      setProofs(response.data.proofs || []);

      // Navigate to chat if conversation was created
      if (data.conversation_id) {
        navigate(`/chats?conversation=${data.conversation_id}`);
      }
    } catch (err) {
      console.error("Error refreshing proofs:", err);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleApproveProof = async (proofId) => {
    try {
      await offerService.approveProof(id, proofId);

      // Refresh proofs
      const response = await offerService.getProofs(id);
      setProofs(response.data.proofs || []);
    } catch (err) {
      console.error("Error approving proof:", err);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const handleRejectProof = async () => {
    if (!selectedProofId) return;

    try {
      await offerService.rejectProof(id, selectedProofId, rejectReason);

      // Refresh proofs
      const response = await offerService.getProofs(id);
      setProofs(response.data.proofs || []);

      // Close modal
      setShowRejectModal(false);
      setSelectedProofId(null);
      setRejectReason("");
    } catch (err) {
      console.error("Error rejecting proof:", err);
    }
  };

  // eslint-disable-next-line no-unused-vars
  const openRejectModal = (proofId) => {
    setSelectedProofId(proofId);
    setShowRejectModal(true);
  };

  // eslint-disable-next-line no-unused-vars
  const handleEscrowCreated = async (data) => {
    // Refresh escrow
    try {
      const response = await offerService.getEscrow(id);
      setHasEscrow(response.data.has_escrow);
      if (response.data.has_escrow) {
        setEscrow(response.data.escrow);
      }
    } catch (err) {
      console.error("Error refreshing escrow:", err);
    }
  };

  const handleAcceptOffer = async () => {
    try {
      await offerService.acceptOffer(id);

      // Refresh offer
      const refreshResponse = await offerService.getOffer(id);
      setOffer(refreshResponse.data);

      // Redirect to chat with this user
      handleContactSeller();
    } catch (err) {
      console.error("Error accepting offer:", err);
    }
  };

  const handleRejectOffer = async () => {
    try {
      await offerService.rejectOffer(id);

      // Refresh offer
      const response = await offerService.getOffer(id);
      setOffer(response.data);
    } catch (err) {
      console.error("Error rejecting offer:", err);
    }
  };

  const handleContactSeller = async () => {
    try {
      // Get or create conversation for this offer
      const response = await chatService.getConversationByOffer(id);

      if (response.data.status === "success") {
        navigate(`/chats?conversation=${response.data.conversation_id}`);
      }
    } catch (err) {
      console.error("Error getting conversation:", err);
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
      </div>
    );
  }

  if (!offer) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <p className="text-gray-500">Offer not found</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4">
      <div className="mb-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center text-blue-500 hover:text-blue-700"
        >
          <svg
            className="w-5 h-5 mr-1"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 19l-7-7 7-7"
            />
          </svg>
          Back
        </button>
      </div>

      {/* Offer Details */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold">{offer.title}</h1>
            <p className="text-gray-600">
              <span className="font-medium">{offer.description} </span>{" "}
            </p>
          </div>
          <div>
            <span
              className={`px-3 py-1 rounded-full text-sm ${
                offer.status === "pending"
                  ? "bg-yellow-100 text-yellow-800"
                  : offer.status === "accepted"
                  ? "bg-green-100 text-green-800"
                  : "bg-red-100 text-red-800"
              }`}
            >
              {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h2 className="text-lg font-semibold mb-2">Offer Details</h2>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-600">Price:</span>
                <span className="font-medium text-green-600">
                  ${offer.price.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">From:</span>
                <span>{offer.username}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Created:</span>
                <span>{new Date(offer.created_at).toLocaleString()}</span>
              </div>
              {offer.message && (
                <div className="mt-3">
                  <span className="text-gray-600 block mb-1">Message:</span>
                  <p className="bg-gray-50 p-3 rounded">{offer.message}</p>
                </div>
              )}
            </div>
          </div>

          <div>
            <h2 className="text-lg font-semibold mb-2">Related Post 👇🏾</h2>
            <div className="bg-gray-50 p-4 rounded-lg">
              <p className="font-medium mb-2">
                {post.content.length > 150
                  ? `${post.content.substring(0, 150)}...`
                  : post.content}
              </p>
              {post.content && (
                <p className="text-gray-700 text-sm mb-3">
                  by {post.username || "Unknown"}
                </p>
              )}
              <button
                onClick={() => navigate(`/community/post/${offer.post_id}`)}
                className="text-blue-500 text-sm hover:underline"
              >
                View Full Post
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Negotiation History */}
      {negotiations.length > 0 && (
        <div className="mb-6">
          <NegotiationHistory
            negotiations={negotiations}
            originalPrice={offer.original_price}
            originalDate={offer.created_at}
            onAcceptOffer={
              // Only pass the callback if the user is allowed to accept offers
              (isPostOwner || isOfferCreator) && offer.status === "pending"
                ? handleAcceptCounterOffer
                : undefined
            }
          />
        </div>
      )}

      {/* Actions */}
      {(isPostOwner || isOfferCreator) && offer.status === "pending" && (
        <div className="bg-white p-6 rounded-lg shadow-md mb-6">
          <div className="space-y-3">
            <h2 className="text-lg font-semibold mb-2">Actions</h2>

            {isPostOwner && (
              <>
                <button
                  onClick={handleAcceptOffer}
                  disabled={loading}
                  className={`w-full p-2 ${
                    loading
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-green-500 hover:bg-green-600 text-white"
                  } rounded`}
                >
                  {loading ? "Processing..." : "Accept Offer"}
                </button>

                <button
                  onClick={() => setShowNegotiationForm(true)}
                  disabled={loading}
                  className={`w-full p-2 ${
                    loading
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-blue-500 hover:bg-blue-600 text-white"
                  } rounded`}
                >
                  Negotiate Price
                </button>

                <button
                  onClick={handleRejectOffer}
                  disabled={loading}
                  className={`w-full p-2 ${
                    loading
                      ? "bg-gray-300 cursor-not-allowed"
                      : "bg-red-500 hover:bg-red-600 text-white"
                  } rounded`}
                >
                  Reject Offer
                </button>
              </>
            )}

            {isOfferCreator && (
              <button
                onClick={() => setShowNegotiationForm(true)}
                disabled={loading}
                className={`w-full p-2 ${
                  loading
                    ? "bg-gray-300 cursor-not-allowed"
                    : "bg-blue-500 hover:bg-blue-600 text-white"
                } rounded`}
              >
                Update Offer
              </button>
            )}

            <button
              onClick={handleContactSeller}
              disabled={loading}
              className={`w-full p-2 ${
                loading
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-gray-500 hover:bg-gray-600 text-white"
              } rounded`}
            >
              Contact {isPostOwner ? "Buyer" : "Seller"}
            </button>
          </div>
        </div>
      )}

      {/* Negotiation Form Modal */}
      {showNegotiationForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md">
            <h3 className="text-lg font-semibold mb-4">
              {isPostOwner ? "Counter Offer" : "Update Your Offer"}
            </h3>

            <NegotiationForm
              offerId={id}
              currentPrice={offer.price}
              onNegotiationComplete={handleNegotiationComplete}
            />

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowNegotiationForm(false)}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfferDetail;
