import React, { useState, useCallback } from "react";
import debounce from 'lodash/debounce';
import { searchService } from "../api/services";

const Search = () => {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]); // init to empty array
  const [loading, setLoading] = useState(false);

  // Create the debounced search function once
  const debouncedSearch = useCallback((searchQuery) => {
    const search = async () => {
      if (!searchQuery.trim()) {
        setResults([]);
        return;
      }
      
      try {
        setLoading(true);
        const response = await searchService.search();  // search(query) // =${encodeURIComponent(searchQuery)}`);
        // Ensure we always set an array, even if the response is null or undefined
        setResults(Array.isArray(response.data) ? response.data : []);
        console.log('Search response:', response.data); // Debug log
      } catch (error) {
        console.error('Search failed:', error);
        setResults([]); // Reset to empty array on error
      } finally {
        setLoading(false);
      }
    };
    
    debounce(search, 300)();
  }, []);

  const handleSearchInput = (e) => {
    const value = e.target.value;
    setQuery(value);
    debouncedSearch(value);
  };

  return (
    <div className="p-8">
      <h1 className="text-3xl font-bold mb-8">Search</h1>
      <div className="flex mb-8">
        <input
          type="text"
          value={query}
          onChange={handleSearchInput}
          className="flex-1 p-2 border rounded-l"
          placeholder="Search..."
        />
      </div>

      {loading && <div>Searching...</div>}

      <div>
        {/* Add a check to ensure results is an array before mapping */}
        {Array.isArray(results) && results.map((result, index) => (
          <div key={result.id || index} className="bg-white p-4 rounded-lg shadow-md mb-4">
            <p className="font-semibold">{result.type || 'Unknown'}</p>
            <p className="text-gray-700">{result.details || 'No details'}</p>
          </div>
        ))}
        {Array.isArray(results) && results.length === 0 && !loading && query && (
          <div>No results found</div>
        )}
      </div>
    </div>
  );
};
export default Search;
