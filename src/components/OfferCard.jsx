import React from "react";
import { offerService, chatService } from "../api/services";
import { useNavigate } from "react-router-dom";
import MediaDisplay from "../components/MediaDisplay";

const OfferCard = ({
  offer,
  isPostOwner,
  onStatusChange,
  showPostDetails = false,
  onOfferClick = null,
}) => {
  const navigate = useNavigate();
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);

  const [localStatus, setLocalStatus] = React.useState(offer.status);

  const handleAccept = async () => {
    if (loading) return; // Prevent multiple clicks while loading

    try {
      setLoading(true);
      setError(null);

      // Immediately update local status to prevent double-clicks
      setLocalStatus("processing");

      const response = await offerService.acceptOffer(offer.id);

      if (response.data.status === "success") {
        setLocalStatus("accepted");
        if (onStatusChange) {
          onStatusChange(offer.id, "accepted");
        }
        // Redirect to chat with this user
        redirectToChat(offer.id);
      } else {
        // Revert status if there's an error
        setLocalStatus(offer.status);
        setError("Failed to accept offer. Please try again.");
      }
    } catch (err) {
      console.error("Error accepting offer:", err);
      // Revert status if there's an error
      setLocalStatus(offer.status);

      // Check for specific error messages
      if (err.response?.data?.error?.includes("not pending")) {
        setError("This offer is no longer pending. Please refresh the page.");
      } else {
        setError(
          err.response?.data?.error ||
            "Failed to accept offer. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleReject = async () => {
    if (loading) return; // Prevent multiple clicks while loading

    try {
      setLoading(true);
      setError(null);

      // Immediately update local status to prevent double-clicks
      setLocalStatus("processing");

      const response = await offerService.rejectOffer(offer.id);

      if (response.data.status === "success") {
        setLocalStatus("rejected");
        if (onStatusChange) {
          onStatusChange(offer.id, "rejected");
        }
      } else {
        // Revert status if there's an error
        setLocalStatus(offer.status);
        setError("Failed to reject offer. Please try again.");
      }
    } catch (err) {
      console.error("Error rejecting offer:", err);
      // Revert status if there's an error
      setLocalStatus(offer.status);

      // Check for specific error messages
      if (err.response?.data?.error?.includes("not pending")) {
        setError("This offer is no longer pending. Please refresh the page.");
      } else {
        setError(
          err.response?.data?.error ||
            "Failed to reject offer. Please try again."
        );
      }
    } finally {
      setLoading(false);
    }
  };

  const handleNegotiate = () => {
    // Show negotiation form or navigate to offer detail page for negotiation
    navigate(`/offers/${offer.id}?action=negotiate`);
  };

  const redirectToChat = async (offerId) => {
    try {
      // Get or create conversation for this offer
      const response = await chatService.getConversationByOffer(offerId);

      if (response.data.status === "success" && response.data.conversation_id) {
        navigate(`/chats?conversation=${response.data.conversation_id}`);
      } else {
        // If no specific conversation ID, just go to chats
        navigate("/chats");
      }
    } catch (err) {
      console.error("Error getting conversation:", err);
      // If there's an error, just go to chats page
      navigate("/chats");
    }
  };

  const getStatusBadge = (status) => {
    switch (status) {
      case "pending":
        return (
          <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs">
            Pending
          </span>
        );
      case "accepted":
        return (
          <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
            Accepted
          </span>
        );
      case "rejected":
        return (
          <span className="bg-red-100 text-red-800 px-2 py-1 rounded-full text-xs">
            Rejected
          </span>
        );
      case "expired":
        return (
          <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs">
            Expired
          </span>
        );
      case "negotiating":
        return (
          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
            Negotiating
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className={`bg-white p-4 rounded-lg shadow-md mb-4 border-l-4 border-blue-500 ${
        onOfferClick ? "cursor-pointer" : ""
      }`}
      onClick={onOfferClick ? () => onOfferClick(offer.id) : undefined}
    >
      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      <div className="flex justify-between items-start mb-2">
        <div>
          <h3 className="font-semibold text-lg">{offer.title}</h3>
          <p className="text-sm text-gray-500">
            By {offer.offer_username || "me"}
            {!offer.is_public && (
              <span className="ml-2 text-xs">(Private Offer)</span>
            )}
          </p>
        </div>
        <div className="flex items-center">
          {getStatusBadge(offer.status)}
          <p className="ml-2 text-lg font-bold text-green-600">
            ${offer.price.toFixed(2)}
          </p>
        </div>
      </div>

      {showPostDetails && offer.post_content && (
        <div className="mb-3 p-3 bg-gray-50 rounded">
          <p className="text-sm text-gray-700">
            <span className="font-semibold">Related to post:</span>{" "}
            {offer.post_content.length > 100
              ? `${offer.post_content.substring(0, 100)}...`
              : offer.post_content}
          </p>
          <button
            onClick={() => navigate(`/community/post/${offer.post_id}`)}
            className="text-blue-500 text-xs hover:underline mt-1"
          >
            View Post
          </button>
        </div>
      )}

      <p className="text-gray-700 mb-4">{offer.description}</p>

      {offer.media && offer.media.length > 0 && (
        <div className="mt-3">
          <MediaDisplay
            mediaItems={offer.media.map((item) => ({
              url: item.presigned_url,
              type: item.mime_type,
              name: item.file_name,
              objectKey: item.object_key,
            }))}
            compact={true}
          />
        </div>
      )}

      <div className="flex justify-between items-center">
        <p className="text-xs text-gray-500">
          {new Date(offer.created_at).toLocaleString()}
        </p>

        {isPostOwner && localStatus === "pending" && (
          <div className="flex space-x-2">
            <button
              onClick={handleReject}
              disabled={loading || localStatus !== "pending"}
              className={`px-3 py-1 rounded ${
                loading || localStatus !== "pending"
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-red-100 text-red-800 hover:bg-red-200"
              }`}
            >
              {loading ? "Processing..." : "Reject"}
            </button>
            <button
              onClick={handleNegotiate}
              disabled={loading || localStatus !== "pending"}
              className={`px-3 py-1 rounded ${
                loading || localStatus !== "pending"
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-blue-100 text-blue-800 hover:bg-blue-200"
              }`}
            >
              {loading ? "Processing..." : "Negotiate"}
            </button>
            <button
              onClick={handleAccept}
              disabled={loading || localStatus !== "pending"}
              className={`px-3 py-1 rounded ${
                loading || localStatus !== "pending"
                  ? "bg-gray-300 cursor-not-allowed"
                  : "bg-green-100 text-green-800 hover:bg-green-200"
              }`}
            >
              {loading ? "Processing..." : "Accept"}
            </button>
          </div>
        )}
        {/* Add these buttons for "My Offers" section */}
        {!isPostOwner && (
          <div className="mt-3 flex space-x-2">
            {localStatus === "pending" && (
              <button
                onClick={() => navigate(`/offers/${offer.id}`)}
                className="px-3 py-1 rounded bg-blue-100 text-blue-800 hover:bg-blue-200"
              >
                See Negotiations
              </button>
            )}
            {/* Chat button for accepted offers */}
            {localStatus === "accepted" && (
              <button
                onClick={() => redirectToChat(offer.id)}
                className="px-3 py-1 rounded bg-blue-500 text-white hover:bg-blue-600"
              >
                Chat with {isPostOwner ? "Buyer" : "Seller"}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default OfferCard;
