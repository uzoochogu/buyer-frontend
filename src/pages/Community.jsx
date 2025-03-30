import React, { useState, useEffect } from "react";
import { communityService } from "../api/services";
import InfiniteScroll from "react-infinite-scroll-component";

const Community = () => {
  const [posts, setPosts] = useState([]);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [newPost, setNewPost] = useState("");

  const fetchPosts = async () => {
    try {
      const response = await communityService.getPosts(page);
      const newPosts = response.data;
      setPosts((prev) => [...prev, ...newPosts]);
      setHasMore(newPosts.length > 0);
      setPage((prev) => prev + 1);
    } catch (error) {
      console.error("Failed to fetch posts:", error);
    }
  };

  const handlePost = async () => {
    if (!newPost.trim()) return;

    try {
      await communityService.createPost(newPost);
      setPosts((prev) => [
        {
          id: Date.now(),
          user: "CurrentUser",
          content: newPost,
        },
        ...prev,
      ]);
      setNewPost("");
    } catch (error) {
      console.error("Failed to create post:", error);
    }
  };

  useEffect(() => {
    fetchPosts();
  });

  return (
    <div className="p-8">
      {/* Post creation form */}
      <div className="mb-8">
        <textarea
          value={newPost}
          onChange={(e) => setNewPost(e.target.value)}
          className="w-full p-2 border rounded"
          rows="4"
        />
        <button
          onClick={handlePost}
          className="bg-blue-500 text-white p-2 rounded mt-2"
        >
          Post
        </button>
      </div>

      <InfiniteScroll
        dataLength={posts.length}
        next={fetchPosts}
        hasMore={hasMore}
        loader={<h4>Loading...</h4>}
      >
        {posts.map((post) => (
          <div key={post.id} className="bg-white p-4 rounded-lg shadow-md mb-4">
            <p className="font-semibold">{post.user}</p>
            <p className="text-gray-700">{post.content}</p>
          </div>
        ))}
      </InfiniteScroll>
    </div>
  );
};
export default Community;
