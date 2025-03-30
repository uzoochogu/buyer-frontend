import React, { useState, useEffect } from "react";
import { useDebounce } from "use-debounce";
import { searchService } from "../api/services";

const Search = () => {
  const [query, setQuery] = useState("");
  const [debouncedQuery] = useDebounce(query, 300);
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  // Effect that runs when the debounced query changes
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
                className="bg-white p-4 rounded-lg shadow-md mb-4"
              >
                <p className="font-semibold">{result.type || "Unknown"}</p>
                <p className="text-gray-700">
                  {result.details || "No details"}
                </p>
              </div>
            ))
          : !loading && query.trim() && <div>No results found</div>}
      </div>
    </div>
  );
};

export default Search;
