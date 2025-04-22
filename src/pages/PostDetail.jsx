import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { communityService, offerService } from "../api/services";
import OfferForm from "../components/OfferForm";
import OfferList from "../components/OfferList";
import NegotiationForm from "../components/NegotiationForm";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [offers, setOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showOfferForm, setShowOfferForm] = useState(false);
  const [showNegotiationForm, setShowNegotiationForm] = useState(false);
  const [selectedOfferId, setSelectedOfferId] = useState(null);
  const queryParams = new URLSearchParams(location.search);
  const showOfferParam = queryParams.get("offer");

  useEffect(() => {
    const fetchPostAndOffers = async () => {
      try {
        setLoading(true);
        setError(null);

        // Fetch post details
        const postResponse = await communityService.getPostById(id);
        setPost(postResponse.data);

        // Fetch offers for this post
        const offersResponse = await offerService.getOffersForPost(id);
        setOffers(offersResponse.data);
      } catch (err) {
        console.error("Error fetching post details:", err);
        setError("Failed to load post details. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchPostAndOffers();

    if (showOfferParam === "new") {
      setShowOfferForm(true);
    }
  }, [id, showOfferParam]);

  const handleOfferClick = (offerId) => {
    navigate(`/offers/${offerId}`);
  };

  const handleOfferCreated = () => {
    // Refresh offers list
    offerService
      .getOffersForPost(id)
      .then((response) => {
        setOffers(response.data);
        setShowOfferForm(false);
      })
      .catch((err) => {
        console.error("Error refreshing offers:", err);
      });
  };

  const handleAcceptOffer = async (offerId) => {
    try {
      // Accept the offer
      const response = await offerService.acceptOffer(offerId);

      // Update the local state
      setOffers(
        offers.map((offer) =>
          offer.id === offerId
            ? { ...offer, status: "accepted" }
            : offer.id !== offerId && offer.status === "pending"
            ? { ...offer, status: "rejected" }
            : offer
        )
      );

      // If the post is a product request, update its status
      if (post.is_product_request) {
        setPost({ ...post, request_status: "fulfilled" });
      }

      // If the response includes a conversation ID, redirect to chat
      if (response.data.conversation_id) {
        navigate(`/chats/${response.data.conversation_id}`);
      }
    } catch (error) {
      console.error("Error accepting offer:", error);
    }
  };

  const handleRejectOffer = async (offerId) => {
    try {
      // Reject the offer
      await offerService.rejectOffer(offerId);

      // Update the local state
      setOffers(
        offers.map((offer) =>
          offer.id === offerId ? { ...offer, status: "rejected" } : offer
        )
      );
    } catch (error) {
      console.error("Error rejecting offer:", error);
    }
  };

  const handleStartNegotiation = (offerId) => {
    setSelectedOfferId(offerId);
    setShowNegotiationForm(true);
  };

  // Function to handle negotiation completion
  const handleNegotiationComplete = (data) => {
    // Update the offer status in the UI
    setOffers(
      offers.map((offer) =>
        offer.id === selectedOfferId
          ? { ...offer, status: "negotiating" }
          : offer
      )
    );

    // Close the negotiation form
    setShowNegotiationForm(false);
    setSelectedOfferId(null);

    // If the response includes a conversation ID, redirect to chat
    if (data.conversation_id) {
      navigate(`/chats/${data.conversation_id}`);
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
          onClick={() => navigate("/community")}
          className="mt-2 text-blue-500 hover:underline"
        >
          Back to Community
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500">Post not found</p>
        <button
          onClick={() => navigate("/community")}
          className="mt-2 text-blue-500 hover:underline"
        >
          Back to Community
        </button>
      </div>
    );
  }

  const isPostOwner =
    post.user_id === parseInt(localStorage.getItem("user_id"));
  const canMakeOffer =
    !isPostOwner &&
    post.is_product_request &&
    post.request_status !== "fulfilled";

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <button
          onClick={() => navigate("/community")}
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
          Back to Community
        </button>
      </div>

      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex justify-between items-start mb-2">
          <div>
            <p className="font-semibold text-lg">{post.username}</p>
            <p className="text-xs text-gray-500">
              {new Date(post.created_at).toLocaleString()}
            </p>
          </div>
          {post.is_product_request && (
            <div>
              <span
                className={`px-2 py-1 rounded-full text-xs ${
                  post.request_status === "open"
                    ? "bg-green-100 text-green-800"
                    : post.request_status === "in_progress"
                    ? "bg-blue-100 text-blue-800"
                    : post.request_status === "closed"
                    ? "bg-red-100 text-red-800"
                    : post.request_status === "fulfilled"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-gray-100 text-gray-800"
                }`}
              >
                {post.request_status.replace("_", " ").charAt(0).toUpperCase() +
                  post.request_status.replace("_", " ").slice(1)}
              </span>
            </div>
          )}
        </div>

        <p className="text-gray-700 mt-2 mb-3">{post.content}</p>

        {post.is_product_request && (
          <div className="mb-3">
            <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs mr-2">
              Product Request
            </span>

            {post.price_range && (
              <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs ml-2">
                {post.price_range}
              </span>
            )}
          </div>
        )}

        {post.location && (
          <div className="flex items-center text-sm text-gray-600 mb-3">
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
                d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"
              />
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
              />
            </svg>
            {post.location}
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs"
              >
                #{tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Offer section */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl font-semibold">Offers</h2>

          {canMakeOffer && (
            <button
              onClick={() => setShowOfferForm(!showOfferForm)}
              className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              {showOfferForm ? "Cancel" : "Make an Offer"}
            </button>
          )}
        </div>
        {showOfferForm && (
          <div className="mb-6">
            <OfferForm
              postId={id}
              onOfferCreated={handleOfferCreated}
              onCancel={() => setShowOfferForm(false)}
            />
          </div>
        )}

        {showNegotiationForm && selectedOfferId && (
          <div className="mb-6">
            <NegotiationForm
              offerId={selectedOfferId}
              currentPrice={
                offers.find((o) => o.id === selectedOfferId)?.price || 0
              }
              onNegotiationComplete={handleNegotiationComplete}
            />
            <button
              onClick={() => {
                setShowNegotiationForm(false);
                setSelectedOfferId(null);
              }}
              className="mt-2 text-gray-500 hover:text-gray-700"
            >
              Cancel
            </button>
          </div>
        )}

        <OfferList
          offers={offers}
          isPostOwner={isPostOwner}
          onAccept={handleAcceptOffer}
          onReject={handleRejectOffer}
          onNegotiate={handleStartNegotiation}
          onOfferClick={handleOfferClick}
        />
      </div>
    </div>
  );
};

export default PostDetail;
