import React from "react";
import OfferCard from "./OfferCard";

const OfferList = ({
  offers,
  isPostOwner,
  onStatusChange,
  showPostDetails = false,
}) => {
  // Group offers by status
  const pendingOffers = offers.filter((offer) => offer.status === "pending");
  const acceptedOffers = offers.filter((offer) => offer.status === "accepted");
  const rejectedOffers = offers.filter((offer) => offer.status === "rejected");

  return (
    <div>
      {pendingOffers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Pending Offers ({pendingOffers.length})
          </h3>
          {pendingOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isPostOwner={isPostOwner}
              onStatusChange={onStatusChange}
              showPostDetails={showPostDetails}
            />
          ))}
        </div>
      )}

      {acceptedOffers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Accepted Offers ({acceptedOffers.length})
          </h3>
          {acceptedOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isPostOwner={isPostOwner}
              onStatusChange={onStatusChange}
              showPostDetails={showPostDetails}
            />
          ))}
        </div>
      )}

      {rejectedOffers.length > 0 && (
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">
            Rejected Offers ({rejectedOffers.length})
          </h3>
          {rejectedOffers.map((offer) => (
            <OfferCard
              key={offer.id}
              offer={offer}
              isPostOwner={isPostOwner}
              onStatusChange={onStatusChange}
              showPostDetails={showPostDetails}
            />
          ))}
        </div>
      )}

      {offers.length === 0 && (
        <div className="text-center py-8 bg-gray-50 rounded-lg">
          <p className="text-gray-500">No offers available</p>
        </div>
      )}
    </div>
  );
};

export default OfferList;
