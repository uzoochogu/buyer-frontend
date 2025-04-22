import React from "react";

const EscrowDetails = ({ escrow }) => {
  if (!escrow) {
    return null;
  }

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Escrow Details</h3>

      <div className="space-y-2">
        <div className="flex justify-between">
          <span className="text-gray-600">Amount:</span>
          <span className="font-medium">${escrow.amount.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Status:</span>
          <span
            className={`px-2 py-1 rounded-full text-xs ${
              escrow.status === "pending"
                ? "bg-yellow-100 text-yellow-800"
                : escrow.status === "completed"
                ? "bg-green-100 text-green-800"
                : escrow.status === "released"
                ? "bg-blue-100 text-blue-800"
                : "bg-red-100 text-red-800"
            }`}
          >
            {escrow.status.charAt(0).toUpperCase() + escrow.status.slice(1)}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Buyer:</span>
          <span>{escrow.buyer_username}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Seller:</span>
          <span>{escrow.seller_username}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Created:</span>
          <span>{new Date(escrow.created_at).toLocaleString()}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-600">Last Updated:</span>
          <span>{new Date(escrow.updated_at).toLocaleString()}</span>
        </div>
      </div>
    </div>
  );
};

export default EscrowDetails;
