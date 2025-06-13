import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { communityService, offerService } from "../api/services";
import OfferForm from "../components/OfferForm";
import OfferList from "../components/OfferList";
import NegotiationForm from "../components/NegotiationForm";
import { useWebSocket } from "../contexts/WebSocketContext";

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
  const { refreshTriggers, markAsRead } = useWebSocket();

  const queryParams = new URLSearchParams(location.search);
  const showOfferParam = queryParams.get("offer");

  // Refresh post when WebSocket triggers an update
  useEffect(() => {
    if (refreshTriggers.community > 0) {
      fetchPostAndOffers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTriggers.community]);

  // Refresh offers when WebSocket triggers an update
  useEffect(() => {
    if (refreshTriggers.offers > 0) {
      fetchOffers();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTriggers.offers]);

  useEffect(() => {
    fetchPostAndOffers();
    // Mark post notifications as read when viewing
    markAsRead("post_created", id);
    markAsRead("post_updated", id);

    if (showOfferParam === "new") {
      // setShowOfferForm(true);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, showOfferParam, markAsRead]);

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

  const fetchOffers = async () => {
    try {
      // Fetch offers for this post
      const offersResponse = await offerService.getOffersForPost(id);
      setOffers(offersResponse.data);
    } catch (err) {
      console.error("Error fetching offers:", err);
    }
  };

  const handleSubscribe = async () => {
    try {
      if (post.is_subscribed) {
        await communityService.unsubscribeFromPost(id);
      } else {
        await communityService.subscribeToPost(id);
      }

      setPost((prev) => ({
        ...prev,
        is_subscribed: !prev.is_subscribed,
        subscription_count: prev.is_subscribed
          ? prev.subscription_count - 1
          : prev.subscription_count + 1,
      }));
    } catch (error) {
      console.error("Failed to update subscription:", error);
    }
  };

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
      <div className="p-8">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
          <p className="ml-4">Loading post...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8">
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
        <button
          onClick={() => navigate("/community")}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
        >
          Back to Community
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8">
        <div className="text-center py-8">Post not found</div>
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
    <div className="p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <button
            onClick={() => navigate("/community")}
            className="text-blue-500 hover:text-blue-700 flex items-center"
          >
            <svg
              className="w-4 h-4 mr-1"
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
            Back to Community
          </button>
          {post.subscription_count !== undefined && (
            <button
              onClick={handleSubscribe}
              className={`px-4 py-2 rounded-full text-sm ${
                post.is_subscribed
                  ? "bg-blue-500 text-white"
                  : "bg-gray-200 text-gray-800 hover:bg-gray-300"
              }`}
            >
              {post.is_subscribed ? "Subscribed" : "Subscribe"} (
              {post.subscription_count})
            </button>
          )}
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
              <div className="flex flex-col items-end space-y-2">
                <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm">
                  Product Request
                </span>
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
                  {post.request_status
                    .replace("_", " ")
                    .charAt(0)
                    .toUpperCase() +
                    post.request_status.replace("_", " ").slice(1)}
                </span>
              </div>
            )}
          </div>

          <div className="prose max-w-none mb-6">
            <p className="text-gray-700 text-lg leading-relaxed">
              {post.content}
            </p>
          </div>

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

          {post.price_range && (
            <div className="flex items-center text-gray-600 mb-4">
              <svg
                className="h-5 w-5 mr-2"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
              <span>Price Range: {post.price_range}</span>
            </div>
          )}

          {post.tags && post.tags.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-semibold mb-2">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm cursor-pointer hover:bg-gray-200"
                    onClick={() => navigate(`/community?tags=${tag}`)}
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Offer section */}
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Offers</h2>

            {canMakeOffer && (
              <div className="flex space-x-4">
                <button
                  onClick={() => setShowOfferForm(!showOfferForm)}
                  className="bg-blue-500 text-white px-6 py-2 rounded hover:bg-blue-600"
                >
                  {showOfferForm ? "Cancel" : "Make an Offer"}
                </button>
                <button
                  onClick={() =>
                    navigate(`/chats?new=true&user=${post.user_id}`)
                  }
                  className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600"
                >
                  Contact Seller
                </button>
              </div>
            )}
          </div>

          {showOfferForm && (
            <div className="mb-6">
              {/* Original OfferForm component as fallback */}
              <div className="mt-4">
                <OfferForm
                  postId={id}
                  onOfferCreated={handleOfferCreated}
                  onCancel={() => setShowOfferForm(false)}
                />
              </div>
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
    </div>
  );
};

export default PostDetail;
