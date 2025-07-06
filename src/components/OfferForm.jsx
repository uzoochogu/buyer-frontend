import { useState } from "react";
import { offerService } from "../api/services";
import MediaUpload from "../components/MediaUpload";

const OfferForm = ({ postId, onOfferCreated, onCancel }) => {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showMediaUpload, setShowMediaUpload] = useState(false);
  const [mediaFiles, setMediaFiles] = useState([]);

  const handleMediaUpload = (files) => {
    setMediaFiles([...mediaFiles, ...files]);
    setShowMediaUpload(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim() || !description.trim() || !price) {
      setError("Please fill in all required fields");
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const offerData = {
        title,
        description,
        price: parseFloat(price),
        is_public: isPublic,
        // Add media files to the offer data
        // media: mediaFiles.map(file => ({
        //   objectKey: file.objectKey,
        //   type: file.type,
        //   name: file.name
        // }))
        media: mediaFiles.map((file) => file.objectKey),
      };

      const response = await offerService.createOffer(postId, offerData);

      if (response.data.status === "success") {
        setTitle("");
        setDescription("");
        setPrice("");
        setIsPublic(true);

        if (onOfferCreated) {
          onOfferCreated(response.data);
        }
      }
    } catch (err) {
      console.error("Error creating offer:", err);
      setError(
        err.response?.data?.error || "Failed to create offer. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold mb-4">Make an Offer</h2>

      {error && (
        <div className="mb-4 bg-red-100 border-l-4 border-red-500 text-red-700 p-4">
          <p>{error}</p>
        </div>
      )}

      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <label className="block text-sm font-medium text-gray-700">
            Media (Optional)
          </label>
          <button
            type="button"
            onClick={() => setShowMediaUpload(!showMediaUpload)}
            className="text-sm text-blue-500 hover:text-blue-700"
          >
            {showMediaUpload ? "Cancel" : "Add Media"}
          </button>
        </div>

        {showMediaUpload && (
          <MediaUpload
            onUploadComplete={handleMediaUpload}
            allowMultiple={true}
          />
        )}

        {/* Media Preview */}
        {mediaFiles.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">
              Selected media ({mediaFiles.length}):
            </p>
            <div className="flex flex-wrap gap-2">
              {mediaFiles.map((file, index) => (
                <div key={index} className="relative">
                  {file.type.startsWith("image/") ? (
                    <img
                      src={file.preview}
                      alt={file.name}
                      className="w-16 h-16 object-cover rounded border border-gray-200"
                    />
                  ) : file.type.startsWith("video/") ? (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                      <svg
                        xmlns="http://www.w3.org/2000/svg"
                        className="h-8 w-8 text-gray-400"
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
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-gray-100 rounded border border-gray-200">
                      <span className="text-xs text-gray-500 truncate p-1">
                        {file.name}
                      </span>
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setMediaFiles(mediaFiles.filter((_, i) => i !== index))
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

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Title*
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="e.g., Premium Smartphone Offer"
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Description*
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            rows="4"
            placeholder="Describe your offer in detail..."
            required
          />
        </div>

        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Price ($)*
          </label>
          <input
            type="number"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            className="w-full p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="0.00"
            min="0"
            step="0.01"
            required
          />
        </div>

        <div className="mb-4">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="isPublic"
              checked={isPublic}
              onChange={(e) => setIsPublic(e.target.checked)}
              className="mr-2"
            />
            <label
              htmlFor="isPublic"
              className="text-sm font-medium text-gray-700"
            >
              Make this offer public (visible to other users)
            </label>
          </div>
          <p className="text-xs text-gray-500 mt-1">
            Private offers are only visible to you and the post owner.
          </p>
        </div>

        <div className="flex justify-end space-x-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-gray-300 rounded text-gray-700 hover:bg-gray-100"
            disabled={loading}
          >
            Cancel
          </button>
          <button
            type="submit"
            className={`px-4 py-2 rounded ${
              !price.trim() || loading || !title.trim()
                ? "bg-gray-400 cursor-not-allowed"
                : "bg-blue-500 hover:bg-blue-600 text-white"
            }`}
            disabled={!price.trim() || loading || !title.trim()}
          >
            {loading ? "Submitting..." : "Submit Offer"}
          </button>
        </div>
      </form>
    </div>
  );
};

export default OfferForm;
