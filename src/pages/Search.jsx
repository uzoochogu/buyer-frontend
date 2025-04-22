import React, { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { searchService } from "../api/services";
import { useNavigate } from "react-router-dom";

const Search = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  // When the debounced query changes
  useEffect(() => {
    const searchWithQuery = async () => {
      if (!debouncedQuery.trim()) {
        setResults([]);
        return;
      }

      try {
        setLoading(true);
        console.log("Searching for:", debouncedQuery);
        const response = await searchService.search(debouncedQuery);
        // Ensure we always set an array, even if the response is null or undefined
        setResults(Array.isArray(response.data) ? response.data : []);
      } catch (error) {
        console.error("Search failed:", error);
        setResults([]);
      } finally {
        setLoading(false);
      }
    };

    searchWithQuery();
  }, [debouncedQuery]);

  const handleSearchInput = (e) => {
    setQuery(e.target.value);
  };

  // Handle click on a search result
  const handleResultClick = (result) => {
    if (!result || !result.type) return;

    if (result.type.toLowerCase() === "post") {
      navigate(`/community/post/${result.id}`);
    } else if (result.type.toLowerCase() === "order") {
      navigate(`/orders/${result.id}`);
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Search</h1>
      <div className="flex mb-8">
        <input
          type="text"
          value={query}
          onChange={handleSearchInput}
          className="flex-1 p-2 border rounded"
          placeholder="Search for orders or posts..."
        />
      </div>

      {loading && <div>Searching...</div>}

      <div>
        {/* Add a check to ensure results is an array before mapping */}
        {Array.isArray(results) && results.length > 0
          ? results.map((result, index) => (
              <div
                key={result.id || index}
                className="bg-white p-4 rounded-lg shadow-md mb-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => handleResultClick(result)}
              >
                <div className="flex justify-between items-center">
                  <p className="font-semibold">
                    {result.type || "Unknown"}
                    {result.id && (
                      <span className="text-gray-500 text-sm ml-2">
                        #{result.id}
                      </span>
                    )}
                  </p>
                  {result.type && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        result.type.toLowerCase() === "post"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-green-100 text-green-800"
                      }`}
                    >
                      {result.type}
                    </span>
                  )}
                </div>
                <p className="text-gray-700 mt-2">
                  {result.details || "No details"}
                </p>
                <div className="mt-2 text-right">
                  <span className="text-blue-500 text-sm">
                    Click to view {result.type?.toLowerCase() || "item"}
                  </span>
                </div>
              </div>
            ))
          : !loading && query.trim() && <div>No results found</div>}
      </div>
    </div>
  );
};

export default Search;
