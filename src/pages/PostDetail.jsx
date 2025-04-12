import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { communityService } from "../api/services";

const PostDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newStatus, setNewStatus] = useState("");

  useEffect(() => {
    const fetchPost = async () => {
      try {
        setLoading(true);
        const response = await communityService.getPostById(id);
        setPost(response.data);
      } catch (error) {
        console.error("Failed to fetch post:", error);
        setError(
          "Failed to load post. It may have been deleted or you don't have permission to view it."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchPost();
  }, [id]);

  const handleSubscribe = async () => {
    try {
      if (post.is_subscribed) {
        await communityService.unsubscribeFromPost(post.id);
      } else {
        await communityService.subscribeToPost(post.id);
      }

      // Update the post state
      setPost({
        ...post,
        is_subscribed: !post.is_subscribed,
        subscription_count: post.is_subscribed
          ? post.subscription_count - 1
          : post.subscription_count + 1,
      });
    } catch (error) {
      console.error("Failed to update subscription:", error);
    }
  };

  const handleUpdateStatus = async () => {
    if (!newStatus || newStatus === post.request_status) return;

    try {
      await communityService.updatePost(post.id, {
        request_status: newStatus,
      });

      // Update the post state
      setPost({
        ...post,
        request_status: newStatus,
      });

      setNewStatus("");
    } catch (error) {
      console.error("Failed to update post status:", error);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center">
        <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
        <p className="mt-2">Loading post...</p>
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
          className="text-blue-500 hover:text-blue-700"
        >
          &larr; Back to Community
        </button>
      </div>
    );
  }

  if (!post) {
    return (
      <div className="p-8">
        <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-6">
          <p>Post not found</p>
        </div>
        <button
          onClick={() => navigate("/community")}
          className="text-blue-500 hover:text-blue-700"
        >
          &larr; Back to Community
        </button>
      </div>
    );
  }

  return (
    <div className="p-8">
      <button
        onClick={() => navigate("/community")}
        className="text-blue-500 hover:text-blue-700 mb-6 flex items-center"
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

      <div className="bg-white p-6 rounded-lg shadow-md">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h1 className="text-2xl font-bold mb-1">
              {post.is_product_request ? "Product Request" : "Post"}
            </h1>
            <div className="flex items-center">
              <p className="font-semibold text-lg mr-2">{post.username}</p>
              <p className="text-sm text-gray-500">
                {new Date(post.created_at).toLocaleString()}
              </p>
            </div>
          </div>
          <button
            onClick={handleSubscribe}
            className={`px-3 py-1 rounded-full text-sm ${
              post.is_subscribed
                ? "bg-blue-500 text-white"
                : "bg-gray-200 text-gray-800 hover:bg-gray-300"
            }`}
          >
            {post.is_subscribed ? "Subscribed" : "Subscribe"} (
            {post.subscription_count})
          </button>
        </div>

        <div className="mb-6">
          <p className="text-gray-700 text-lg whitespace-pre-line">
            {post.content}
          </p>
        </div>

        {post.is_product_request && (
          <div className="mb-6">
            <div className="flex items-center mb-3">
              <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-sm mr-2">
                Product Request
              </span>
              <span
                className={`px-2 py-1 rounded-full text-sm ${
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

            {/* Status update form (only for post owner) */}
            {post.user_id === parseInt(localStorage.getItem("user_id")) && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h3 className="text-md font-semibold mb-2">
                  Update Request Status
                </h3>
                <div className="flex">
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="flex-1 p-2 border rounded-l"
                  >
                    <option value="">Select new status</option>
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    <option value="closed">Closed</option>
                    <option value="fulfilled">Fulfilled</option>
                  </select>
                  <button
                    onClick={handleUpdateStatus}
                    disabled={!newStatus || newStatus === post.request_status}
                    className={`px-4 py-2 rounded-r ${
                      !newStatus || newStatus === post.request_status
                        ? "bg-gray-300 cursor-not-allowed"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                    }`}
                  >
                    Update
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {post.price_range && (
          <div className="mb-4">
            <span className="font-semibold">Price Range:</span>{" "}
            {post.price_range}
          </div>
        )}

        {post.location && (
          <div className="flex items-center text-gray-600 mb-4">
            <svg
              className="h-5 w-5 mr-1"
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
            <span className="font-semibold mr-1">Location:</span>{" "}
            {post.location}
          </div>
        )}

        {post.tags && post.tags.length > 0 && (
          <div className="mb-4">
            <p className="font-semibold mb-2">Tags:</p>
            <div className="flex flex-wrap gap-2">
              {post.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-sm"
                >
                  #{tag}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PostDetail;
