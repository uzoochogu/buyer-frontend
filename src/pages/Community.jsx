import { useState, useEffect } from "react";
import { communityService } from "../api/services";
import InfiniteScroll from "react-infinite-scroll-component";
import { useNavigate, useLocation } from "react-router-dom";
import { useWebSocket } from "../contexts/WebSocketContext";
import MediaUpload from "../components/MediaUpload";
import MediaDisplay from "../components/MediaDisplay";

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [popularTags, setPopularTags] = useState([]);
  const [selectedTags, setSelectedTags] = useState([]);
  const [location, setLocation] = useState("");
  const [status, setStatus] = useState("");
  const [isProductRequest, setIsProductRequest] = useState(false);
  const [priceRange, setPriceRange] = useState("");
  const [isFiltering, setIsFiltering] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [customTag, setCustomTag] = useState("");
  const [postMediaFiles, setPostMediaFiles] = useState([]);
  const [showPostMediaUpload, setShowPostMediaUpload] = useState(false);

  const navigate = useNavigate();
  const locationHook = useLocation();
  const { refreshTriggers } = useWebSocket();

  // Refresh posts when WebSocket triggers a community update
  useEffect(() => {
    if (refreshTriggers.community > 0) {
      // Reset and refetch posts
      setPosts([]);
      setPage(1);
      setHasMore(true);
      setError(null);

      // Fetch fresh data
      setTimeout(() => {
        fetchPosts();
      }, 100);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshTriggers.community]);

  // Get query parameters
  useEffect(() => {
    const params = new URLSearchParams(locationHook.search);
    const tagsParam = params.get("tags");
    const locationParam = params.get("location");
    const statusParam = params.get("status");
    const isProductRequestParam = params.get("is_product_request");

    if (tagsParam) setSelectedTags(tagsParam.split(","));
    if (locationParam) setLocation(locationParam);
    if (statusParam) setStatus(statusParam);
    if (isProductRequestParam)
      setIsProductRequest(isProductRequestParam === "true");

    if (tagsParam || locationParam || statusParam || isProductRequestParam) {
      setIsFiltering(true);
    }
  }, [locationHook.search]);

  // Fetch popular tags
  useEffect(() => {
    const fetchPopularTags = async () => {
      try {
        const response = await communityService.getPopularTags();
        setPopularTags(response.data);
      } catch (error) {
        console.error("Failed to fetch popular tags:", error);
      }
    };

    fetchPopularTags();
  }, []);

  const fetchPosts = async (isRefresh = false) => {
    if (loading) return;

    try {
      setLoading(true);
      if (isRefresh) {
        setError(null);
      }

      let response;

      if (isFiltering) {
        // Build filter parameters
        const filterParams = new URLSearchParams();
        if (selectedTags.length > 0)
          filterParams.append("tags", selectedTags.join(","));
        if (location) filterParams.append("location", location);
        if (status) filterParams.append("status", status);
        if (isProductRequest) filterParams.append("is_public", "true");

        // Use filter API with proper parameters
        response = await communityService.filterPosts(filterParams.toString());
      } else {
        // Use regular posts API with current page
        const currentPage = isRefresh ? 1 : page;
        response = await communityService.getPosts(currentPage);
      }

      const newPosts = response.data;

      if (!newPosts || newPosts.length === 0) {
        setHasMore(false);
        if (isRefresh || page === 1) {
          // Only show "no posts" message on first page or refresh
          setPosts([]);
          if (isFiltering) {
            setError(
              "No posts found matching your filters. Try different filters or create a new post!"
            );
          } else if (isRefresh) {
            // Don't show error on refresh if there are no posts, just show empty state
            setError(null);
          }
        }
      } else {
        if (isRefresh || page === 1) {
          // Replace posts on refresh or first page
          setPosts(newPosts);
        } else {
          // Append posts for subsequent pages
          setPosts((prev) => {
            // Check for duplicates (can happen with race conditions)
            const existingIds = new Set(prev.map((post) => post.id));
            const uniqueNewPosts = newPosts.filter(
              (post) => !existingIds.has(post.id)
            );
            return [...prev, ...uniqueNewPosts];
          });
        }

        // Only increment page if this wasn't a refresh and we got posts
        if (!isRefresh) {
          setPage((prev) => prev + 1);
        } else if (isRefresh) {
          // If this was a refresh, set page to 2 for next load
          setPage(2);
        }

        // Only set hasMore if we got a full page of posts (assuming page size is 10)
        setHasMore(newPosts.length >= 10);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      if (isRefresh || page === 1) {
        setError("Failed to load posts. Please try again later.");
      }
      setHasMore(false);
    } finally {
      setLoading(false);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim() && postMediaFiles.length === 0) return;

    try {
      setLoading(true);
      setError(null);

      const postData = {
        content: newPost,
        tags: selectedTags,
        location: location,
        is_product_request: isProductRequest,
        price_range: priceRange,
        media: postMediaFiles.map((file) => ({
          objectKey: file.objectKey,
          name: file.name,
          type: file.type,
        })),
      };

      await communityService.createPost(postData);

      // Reset form
      setNewPost("");
      setSelectedTags([]);
      setLocation("");
      setPriceRange("");
      setIsProductRequest(false);
      setPostMediaFiles([]);
      setShowPostMediaUpload(false);

      // Reset pagination and posts state
      setPosts([]);
      setPage(1);
      setHasMore(true);
      setIsFiltering(false);

      // Update URL to remove filters
      navigate("/community");

      // Wait a moment before fetching posts
      setTimeout(() => {
        fetchPosts(true); // refresh
      }, 300);
    } catch (error) {
      console.error("Failed to create post:", error);
      setError("Failed to create post. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleTagSelect = (tag) => {
    let newTags;

    // If tag is already selected, remove it
    if (selectedTags.includes(tag)) {
      newTags = selectedTags.filter((t) => t !== tag);
    } else {
      // Otherwise add it to the existing tags
      newTags = [...selectedTags, tag];
    }

    setSelectedTags(newTags);

    // Don't apply filters immediately - let the user decide
    // when to apply by clicking the Apply Filters button
  };

  const handleAddCustomTag = () => {
    if (customTag && !selectedTags.includes(customTag)) {
      setSelectedTags([...selectedTags, customTag]);
      setCustomTag("");
    }
  };

  const handleSubscribe = async (postId, isSubscribed) => {
    try {
      if (isSubscribed) {
        await communityService.unsubscribeFromPost(postId);
      } else {
        await communityService.subscribeToPost(postId);
      }

      // Update the post in the list
      setPosts(
        posts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_subscribed: !isSubscribed,
                subscription_count: isSubscribed
                  ? post.subscription_count - 1
                  : post.subscription_count + 1,
              }
            : post
        )
      );
    } catch (error) {
      console.error("Failed to update subscription:", error);
    }
  };

  const applyFilters = () => {
    // Determine if we have any filters
    const hasFilters =
      selectedTags.length > 0 || location || status || isProductRequest;

    // Set filtering state
    setIsFiltering(hasFilters);

    // Update URL with filter parameters
    const params = new URLSearchParams();
    if (selectedTags.length > 0) params.append("tags", selectedTags.join(","));
    if (location) params.append("location", location);
    if (status) params.append("status", status);
    if (isProductRequest) params.append("is_product_request", "true");

    navigate(`/community?${params.toString()}`);

    // Fetch filtered posts immediately
    if (hasFilters) {
      setLoading(true);
      setError(null);
      console.log(`Fetching filtered posts...>${params.toString()}<`);
      communityService
        .filterPosts(params)
        .then((response) => {
          console.log("Filter response:", response.data);
          // Even if we get an empty array, we should set it
          setPosts(response.data || []);
          setHasMore(response.data && response.data.length >= 10);
          setPage(1); // Reset page to 1

          // Show a message if no results found
          if (!response.data || response.data.length === 0) {
            setError(
              "No posts found matching your filters. Try different filters or create a new post!"
            );
          }
        })
        .catch((error) => {
          console.error("Failed to fetch filtered posts:", error);
          setError("Failed to load posts. Please try again later.");
          // Don't clear posts on error
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      // If no filters, fetch regular posts
      clearFilters();
    }
  };

  const clearFilters = () => {
    // Clear all filter states
    setSelectedTags([]);
    setLocation("");
    setStatus("");
    setIsProductRequest(false);
    setPriceRange("");
    setIsFiltering(false);

    // Clear the error state
    setError(null);

    // Update URL to remove filters
    navigate("/community");

    // Reset page but keep posts until new ones load
    setPage(1);
    setHasMore(true);

    // Fetch posts without filters
    setLoading(true);
    communityService
      .getPosts(1)
      .then((response) => {
        setPosts(response.data);
        setHasMore(response.data.length >= 10);
      })
      .catch((error) => {
        console.error("Failed to fetch posts:", error);
        setError("Failed to load posts. Please try again later.");
      })
      .finally(() => {
        setLoading(false);
      });
  };

  // Only run once on component mount if there are no URL parameters
  useEffect(() => {
    // Only fetch posts if there are no URL parameters
    if (!locationHook.search) {
      fetchPosts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Community</h1>

      {/* Post creation form */}
      <div className="mb-8 bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Create a Post</h2>

        <div className="mb-4">
          <textarea
            value={newPost}
            onChange={(e) => setNewPost(e.target.value)}
            className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="What's on your mind?"
          />
        </div>
        {/* Media Upload */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Media (optional)
            </label>
            <button
              type="button"
              onClick={() => setShowPostMediaUpload(!showPostMediaUpload)}
              className="text-blue-500 hover:text-blue-700 text-sm"
            >
              {showPostMediaUpload ? "Cancel" : "Add Media"}
            </button>
          </div>

          {showPostMediaUpload && (
            <div className="mb-4">
              <MediaUpload
                onUploadComplete={(files) => {
                  setPostMediaFiles([...postMediaFiles, ...files]);
                  setShowPostMediaUpload(false);
                }}
                allowMultiple={true}
              />
            </div>
          )}

          {/* Preview of media to be posted */}
          {postMediaFiles.length > 0 && (
            <div className="mb-3">
              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-600">
                  Media to post ({postMediaFiles.length}):
                </p>
                <button
                  onClick={() => setPostMediaFiles([])}
                  className="text-red-500 text-xs hover:text-red-700"
                >
                  Clear All
                </button>
              </div>
              <div className="flex flex-wrap gap-2">
                {postMediaFiles.map((file, index) => (
                  <div key={index} className="relative">
                    {file.type.startsWith("image/") ? (
                      <img
                        src={file.preview}
                        alt={file.name}
                        className="w-16 h-16 object-cover rounded border border-gray-200"
                      />
                    ) : file.type.startsWith("video/") ? (
                      <div className="relative w-16 h-16 bg-black rounded border border-gray-200 overflow-hidden">
                        <video
                          src={file.preview}
                          className="w-full h-full object-cover"
                          muted
                        />
                        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-30">
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            className="h-6 w-6 text-white"
                            fill="none"
                            viewBox="0 0 24 24"
                            stroke="currentColor"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                            />
                          </svg>
                        </div>
                      </div>
                    ) : (
                      <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                        <span className="text-xs text-gray-500 p-1 text-center overflow-hidden">
                          {file.name}
                        </span>
                      </div>
                    )}
                    <button
                      onClick={() =>
                        setPostMediaFiles(
                          postMediaFiles.filter((_, i) => i !== index)
                        )
                      }
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs"
                    >
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Tags
          </label>
          <div className="flex flex-wrap gap-2 mb-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
              >
                {tag}
                <button
                  onClick={() => handleTagSelect(tag)}
                  className="ml-1 text-blue-500 hover:text-blue-700"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
          <div className="flex">
            <input
              type="text"
              value={customTag}
              onChange={(e) => setCustomTag(e.target.value)}
              className="flex-1 p-2 border rounded-l"
              placeholder="Add a custom tag"
            />
            <button
              onClick={handleAddCustomTag}
              className="bg-gray-200 text-gray-800 p-2 rounded-r"
            >
              Add
            </button>
          </div>
          <div className="mt-2">
            <p className="text-sm text-gray-600 mb-1">Popular tags:</p>
            <div className="flex flex-wrap gap-2">
              {popularTags.slice(0, 10).map((tag) => (
                <button
                  key={tag.name}
                  onClick={() => handleTagSelect(tag.name)}
                  className={`px-2 py-1 rounded-full text-xs ${
                    selectedTags.includes(tag.name)
                      ? "bg-blue-500 text-white"
                      : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                  }`}
                >
                  {tag.name} ({tag.count})
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Location (optional)
          </label>
          <input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            className="w-full p-2 border rounded"
            placeholder="e.g., New York, Remote, etc."
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isProductRequest"
              checked={isProductRequest}
              onChange={(e) => setIsProductRequest(e.target.checked)}
              className="mr-2"
            />
            <label
              htmlFor="isProductRequest"
              className="text-sm font-medium text-gray-700"
            >
              This is a product request
            </label>
          </div>
        </div>

        {isProductRequest && (
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Price Range (optional)
            </label>
            <input
              type="text"
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              className="w-full p-2 border rounded"
              placeholder="e.g., $10-50, Under $100, etc."
            />
          </div>
        )}

        <div className="flex justify-between items-center mt-4">
          <p className="text-sm text-gray-500">
            {newPost.length} characters | {postMediaFiles.length} media files
          </p>
          <button
            onClick={handlePost}
            disabled={
              loading || (!newPost.trim() && postMediaFiles.length === 0)
            }
            className={`px-4 py-2 rounded ${
              loading || (!newPost.trim() && postMediaFiles.length === 0)
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {/* Filter section */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-md filters-section">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-lg font-semibold">Filters</h2>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="text-blue-500 hover:text-blue-700"
          >
            {showFilters ? "Hide Filters" : "Show Filters"}
          </button>
        </div>

        {showFilters && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tags
              </label>
              <div className="flex flex-wrap gap-2 mb-2">
                {selectedTags.map((tag) => (
                  <span
                    key={tag}
                    className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-sm flex items-center"
                  >
                    {tag}
                    <button
                      onClick={() => handleTagSelect(tag)}
                      className="ml-1 text-blue-500 hover:text-blue-700"
                    >
                      &times;
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex">
                <input
                  type="text"
                  value={customTag}
                  onChange={(e) => setCustomTag(e.target.value)}
                  className="flex-1 p-2 border rounded-l"
                  placeholder="Add a custom tag"
                />
                <button
                  onClick={handleAddCustomTag}
                  className="bg-gray-200 text-gray-800 p-2 rounded-r"
                >
                  Add
                </button>
              </div>
              <div className="mt-2">
                <p className="text-sm text-gray-600 mb-1">Popular tags:</p>
                <div className="flex flex-wrap gap-2">
                  {popularTags.slice(0, 10).map((tag) => (
                    <button
                      key={tag.name}
                      onClick={() => handleTagSelect(tag.name)}
                      className={`px-2 py-1 rounded-full text-xs ${
                        selectedTags.includes(tag.name)
                          ? "bg-blue-500 text-white"
                          : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                      }`}
                    >
                      {tag.name} ({tag.count})
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Location
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full p-2 border rounded"
                placeholder="e.g., New York, Remote, etc."
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Status
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full p-2 border rounded"
              >
                <option value="">All Statuses</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="closed">Closed</option>
                <option value="fulfilled">Fulfilled</option>
              </select>
            </div>

            <div>
              <div className="flex items-center">
                <input
                  type="checkbox"
                  id="filterProductRequest"
                  checked={isProductRequest}
                  onChange={(e) => setIsProductRequest(e.target.checked)}
                  className="mr-2"
                />
                <label
                  htmlFor="filterProductRequest"
                  className="text-sm font-medium text-gray-700"
                >
                  Show only product requests
                </label>
              </div>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <button
                onClick={clearFilters}
                className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
              >
                Clear Filters
              </button>
              <button
                onClick={applyFilters}
                className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
              >
                Apply Filters
              </button>
            </div>
          </div>
        )}

        {isFiltering && (
          <div className="mt-2 flex items-center flex-wrap">
            <span className="text-sm text-gray-600 mr-2">Active filters:</span>
            {selectedTags.length > 0 && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-1">
                Tags: {selectedTags.join(", ")}
              </span>
            )}
            {location && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-1">
                Location: {location}
              </span>
            )}
            {status && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-1">
                Status: {status}
              </span>
            )}
            {isProductRequest && (
              <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs mr-2 mb-1">
                Product Requests Only
              </span>
            )}
            <button
              onClick={clearFilters}
              className="text-red-500 hover:text-red-700 text-xs ml-2"
            >
              Clear All
            </button>
          </div>
        )}
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Posts list with infinite scroll */}
      {posts.length === 0 && !loading ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">
            {error ||
              (isFiltering
                ? "No posts found matching your filters. Try different filters or create a new post!"
                : "No posts found. Be the first to post!")}
          </p>
          {isFiltering && (
            <button
              onClick={clearFilters}
              className="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
            >
              Clear Filters
            </button>
          )}
        </div>
      ) : !loading ? (
        <InfiniteScroll
          dataLength={posts.length}
          next={fetchPosts}
          hasMore={hasMore}
          loader={
            <div className="text-center py-4">
              <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
              <p className="mt-2">Loading more posts...</p>
            </div>
          }
          endMessage={
            <p className="text-center py-4 text-gray-500">
              You've seen all posts!
            </p>
          }
        >
          {posts.map((post) => {
            return (
              <div
                key={post.id}
                className="bg-white p-6 rounded-lg shadow-md mb-4 cursor-pointer hover:shadow-lg transition-shadow"
                onClick={() => navigate(`/community/post/${post.id}`)}
              >
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <p className="font-semibold text-lg">{post.username}</p>
                    <p className="text-xs text-gray-500">
                      {new Date(post.created_at).toLocaleString()}
                    </p>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation(); // prevent post click event
                      handleSubscribe(post.id, post.is_subscribed);
                    }}
                    className={`px-3 py-1 rounded-full text-xs ${
                      post.is_subscribed
                        ? "bg-blue-500 text-white"
                        : "bg-gray-200 text-gray-800 hover:bg-gray-300"
                    }`}
                  >
                    {post.is_subscribed ? "Subscribed" : "Subscribe"} (
                    {post.subscription_count})
                  </button>
                </div>

                <p className="text-gray-700 mt-2 mb-3">{post.content}</p>

                {/* Media display */}
                {post.media && post.media.length > 0 && (
                  <MediaDisplay
                    mediaItems={post.media.map((item) => ({
                      url: item.presigned_url,
                      type: item.mime_type,
                      name: item.file_name,
                      objectKey: item.object_key,
                    }))}
                  />
                )}

                {/* product request badges*/}
                {post.is_product_request && (
                  <div className="mb-3">
                    <span className="bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full text-xs mr-2">
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

                    {post.price_range && (
                      <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs ml-2">
                        {post.price_range}
                      </span>
                    )}
                  </div>
                )}

                {/* Location */}
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

                {/* Tags */}
                {post.tags && post.tags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-3">
                    {post.tags.map((tag) => (
                      <span
                        key={tag}
                        className="bg-gray-100 text-gray-800 px-2 py-1 rounded-full text-xs cursor-pointer hover:bg-gray-200"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (!selectedTags.includes(tag)) {
                            const newTags = [...selectedTags, tag];
                            setSelectedTags(newTags);
                            setShowFilters(true);
                            const filtersSection =
                              document.querySelector(".filters-section");
                            if (filtersSection) {
                              filtersSection.scrollIntoView({
                                behavior: "smooth",
                              });
                            }
                          }
                        }}
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}

                {/* Make offer button */}
                {post.is_product_request &&
                  post.request_status === "open" &&
                  post.user_id !==
                    parseInt(localStorage.getItem("user_id")) && (
                    <div className="mt-3">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/community/post/${post.id}?offer=new`);
                        }}
                        className="bg-blue-500 text-white px-3 py-1 rounded-md hover:bg-blue-600 text-sm"
                      >
                        Make an Offer
                      </button>
                    </div>
                  )}
              </div>
            );
          })}
        </InfiniteScroll>
      ) : (
        <div className="text-center py-8">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-blue-500 border-r-transparent"></div>
          <p className="mt-2">Loading posts...</p>
        </div>
      )}
    </div>
  );
};

export default Community;
