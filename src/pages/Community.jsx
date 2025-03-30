import React, { useState, useEffect, useRef } from "react";
import { communityService } from "../api/services";
import InfiniteScroll from "react-infinite-scroll-component";

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPost, setNewPost] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Use a ref to track if a fetch is in progress to prevent duplicate requests
  const fetchingRef = useRef(false);

  const fetchPosts = async () => {
    // Don't fetch if already fetching or if we know there are no more posts
    if (fetchingRef.current || !hasMore) return;

    try {
      fetchingRef.current = true;
      setLoading(true);

      console.log(`Fetching posts for page ${page}`);
      const response = await communityService.getPosts(page);
      const newPosts = response.data;

      // If we received no posts, there are no more to load
      if (!newPosts || newPosts.length === 0) {
        console.log("No more posts to load");
        setHasMore(false);
      } else {
        console.log(`Received ${newPosts.length} posts`);

        // Add new posts, ensuring no duplicates
        setPosts((prev) => {
          // Create a Set of existing post IDs for quick lookup
          const existingIds = new Set(prev.map((post) => post.id));

          // Filter out any posts that already exist in our state
          const uniqueNewPosts = newPosts.filter(
            (post) => !existingIds.has(post.id)
          );

          return [...prev, ...uniqueNewPosts];
        });

        // Only increment page if we got posts
        setPage((prev) => prev + 1);
      }
    } catch (error) {
      console.error("Failed to fetch posts:", error);
      setError("Failed to load posts. Please try again later.");
    } finally {
      setLoading(false);
      fetchingRef.current = false;
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;

    try {
      setLoading(true);

      // Create a temporary post object to add to the UI immediately
      const tempPost = {
        id: `temp-${Date.now()}`, // Temporary unique ID with prefix
        user: "1", // Current user ID
        content: newPost,
        created_at: new Date().toISOString(),
        isTemp: true, // Flag to identify temporary posts
      };

      // Add the new post to the beginning of the list
      setPosts((prev) => [tempPost, ...prev]);

      // Send the post to the server
      await communityService.createPost(newPost);
      setNewPost("");

      // Instead of clearing all posts and refetching, just fetch the first page
      // and merge it with existing posts (excluding the temporary one)
      try {
        const response = await communityService.getPosts(1);
        const newPosts = response.data;

        if (newPosts && newPosts.length > 0) {
          setPosts((prev) => {
            // Remove the temporary post
            const filteredPosts = prev.filter((post) => !post.isTemp);

            // Create a Set of existing post IDs for quick lookup
            const existingIds = new Set(filteredPosts.map((post) => post.id));

            // Filter out any posts that already exist in our state
            const uniqueNewPosts = newPosts.filter(
              (post) => !existingIds.has(post.id)
            );

            // Combine the new posts with existing posts
            return [...uniqueNewPosts, ...filteredPosts];
          });
        }
      } catch (error) {
        console.error("Failed to refresh posts:", error);
        // If refresh fails, at least remove the temporary flag
        setPosts((prev) =>
          prev.map((post) => (post.isTemp ? { ...post, isTemp: false } : post))
        );
      }
    } catch (error) {
      console.error("Failed to create post:", error);
      setError("Failed to create post. Please try again.");

      // Remove the temporary post if creation failed
      setPosts((prev) => prev.filter((post) => !post.isTemp));
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch on component mount
  useEffect(() => {
    fetchPosts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-6">Community</h1>

      {/* Post creation form */}
      <div className="mb-8 bg-white p-4 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-3">Create a Post</h2>
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="w-full p-3 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows="4"
          placeholder="What's on your mind?"
        />
        <div className="flex justify-end mt-3">
          <button
            onClick={handlePost}
            disabled={loading || !newPost.trim()}
            className={`px-4 py-2 rounded ${
              loading || !newPost.trim()
                ? "bg-gray-300 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
          >
            {loading ? "Posting..." : "Post"}
          </button>
        </div>
      </div>

      {/* Error message */}
      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {/* Posts list with infinite scroll */}
      {posts.length > 0 ? (
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
          scrollThreshold={0.8} // Only trigger when user is 80% down the list
        >
          {posts.map((post) => (
            <div
              key={post.id}
              className="bg-white p-4 rounded-lg shadow-md mb-4"
            >
              <div className="flex justify-between items-start">
                <p className="font-semibold text-lg">User {post.user}</p>
                <p className="text-xs text-gray-500">
                  {new Date(post.created_at).toLocaleString()}
                </p>
              </div>
              <p className="text-gray-700 mt-2">{post.content}</p>
            </div>
          ))}
        </InfiniteScroll>
      ) : !loading ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <p className="text-gray-500">No posts yet. Be the first to post!</p>
        </div>
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
