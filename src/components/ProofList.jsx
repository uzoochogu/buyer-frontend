import React from "react";

// eslint-disable-next-line no-unused-vars
const ProofList = ({ proofs, offerId, isPostOwner, onApprove, onReject }) => {
  if (!proofs || proofs.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">No proofs submitted yet</p>
      </div>
    );
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Product Proofs</h3>

      <div className="space-y-4">
        {proofs.map((proof) => (
          <div key={proof.id} className="border rounded-lg overflow-hidden">
            <div className="p-3 border-b bg-gray-50">
              <div className="flex justify-between items-center">
                <div>
                  <p className="font-medium">Proof #{proof.id}</p>
                  <p className="text-sm text-gray-600">
                    Submitted by {proof.username}
                  </p>
                </div>
                <div>
                  <span
                    className={`px-2 py-1 rounded-full text-xs ${
                      proof.status === "pending"
                        ? "bg-yellow-100 text-yellow-800"
                        : proof.status === "approved"
                        ? "bg-green-100 text-green-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {proof.status.charAt(0).toUpperCase() +
                      proof.status.slice(1)}
                  </span>
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {new Date(proof.created_at).toLocaleString()}
              </p>
            </div>

            <div className="p-3">
              <div className="mb-3">
                <img
                  src={proof.image_url}
                  alt="Product Proof"
                  className="w-full h-auto rounded"
                  onError={(e) => {
                    e.target.onerror = null;
                    e.target.src =
                      "https://via.placeholder.com/400x300?text=Image+Not+Available";
                  }}
                />
              </div>

              {proof.description && (
                <div className="mb-3">
                  <p className="text-sm text-gray-700">{proof.description}</p>
                </div>
              )}

              {isPostOwner && proof.status === "pending" && (
                <div className="flex space-x-2">
                  <button
                    onClick={() => onApprove(proof.id)}
                    className="flex-1 p-2 bg-green-500 hover:bg-green-600 text-white rounded"
                  >
                    Approve
                  </button>
                  <button
                    onClick={() => onReject(proof.id)}
                    className="flex-1 p-2 bg-red-500 hover:bg-red-600 text-white rounded"
                  >
                    Reject
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProofList;
