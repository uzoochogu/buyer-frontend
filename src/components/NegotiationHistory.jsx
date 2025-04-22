import React from "react";

const NegotiationHistory = ({
  negotiations,
  originalPrice,
  originalDate,
  onAcceptOffer,
}) => {
  if (!negotiations || negotiations.length === 0) {
    return (
      <div className="bg-white p-4 rounded-lg shadow-md">
        <p className="text-gray-500 text-center">No negotiations yet</p>
      </div>
    );
  }

  // Get the current user ID from localStorage
  const currentUserId = localStorage.getItem("user_id");

  return (
    <div className="bg-white p-4 rounded-lg shadow-md">
      <h3 className="text-lg font-semibold mb-3">Negotiation Timeline</h3>

      <div className="relative">
        {/* Timeline line */}
        <div className="absolute left-4 top-0 bottom-0 w-0.5 bg-blue-200"></div>

        <div className="space-y-6 pl-12">
          {negotiations.map((negotiation, index) => {
            // Check if this negotiation was proposed by the current user
            const isCurrentUserProposer =
              negotiation.user_id.toString() === currentUserId;

            return (
              <div key={negotiation.id} className="relative">
                {/* Timeline dot */}
                <div className="absolute left-[-32px] top-0 w-4 h-4 rounded-full bg-blue-500 border-2 border-white"></div>

                <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium text-blue-800">
                        {negotiation.username} proposed:
                      </p>
                      <p className="text-xl font-bold text-green-600">
                        ${negotiation.proposed_price.toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <span
                        className={`px-2 py-1 rounded-full text-xs ${
                          negotiation.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : negotiation.status === "accepted"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {negotiation.status.charAt(0).toUpperCase() +
                          negotiation.status.slice(1)}
                      </span>
                    </div>
                  </div>

                  {negotiation.message && (
                    <p className="text-sm mt-2 text-gray-700 bg-white p-3 rounded border border-gray-100">
                      "{negotiation.message}"
                    </p>
                  )}

                  <p className="text-xs text-gray-500 mt-3">
                    {new Date(negotiation.created_at).toLocaleString()}
                  </p>

                  {/* Add accept button for the latest negotiation if:
                      1. It's pending
                      2. It was NOT proposed by the current user
                      3. onAcceptOffer callback is provided */}
                  {index === 0 &&
                    negotiation.status === "pending" &&
                    !isCurrentUserProposer &&
                    onAcceptOffer && (
                      <div className="mt-3 flex justify-end space-x-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onAcceptOffer(negotiation.proposed_price);
                          }}
                          className="px-3 py-1 rounded bg-green-500 text-white hover:bg-green-600 text-sm"
                        >
                          Accept This Price
                        </button>
                      </div>
                    )}
                </div>
              </div>
            );
          })}

          {/* Original offer at the bottom of the timeline */}
          <div className="relative">
            <div className="absolute left-[-32px] top-0 w-4 h-4 rounded-full bg-gray-400 border-2 border-white"></div>
            <div className="bg-gray-50 p-4 rounded-lg border border-gray-200">
              <p className="font-medium text-gray-700">Original Offer</p>
              <p className="text-xl font-bold text-green-600">
                ${originalPrice ? originalPrice.toFixed(2) : "0.00"}
              </p>
              <p className="text-xs text-gray-500 mt-3">
                {originalDate
                  ? new Date(originalDate).toLocaleString()
                  : "Unknown date"}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default NegotiationHistory;
