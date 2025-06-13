import { useState, useEffect } from "react";
import { offerService } from "../api/services";
import { Tab } from "@headlessui/react";
import OfferList from "../components/OfferList";
import { useNavigate } from "react-router-dom";
import { useWebSocket } from "../contexts/WebSocketContext";

function classNames(...classes) {
  return classes.filter(Boolean).join(" ");
}

const Offers = () => {
  const navigate = useNavigate();
  const [myOffers, setMyOffers] = useState([]);
  const [receivedOffers, setReceivedOffers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { refreshTriggers } = useWebSocket();

  const fetchOffers = async () => {
    try {
      setLoading(true);
      setError(null);

      // Fetch offers made by the current user
      const myOffersResponse = await offerService.getMyOffers();
      setMyOffers(myOffersResponse.data);

      // Fetch offers received for the current user's posts
      const receivedOffersResponse = await offerService.getReceivedOffers();
      setReceivedOffers(receivedOffersResponse.data);
    } catch (err) {
      console.error("Error fetching offers:", err);
      setError("Failed to load offers. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch offers on initial mount
  useEffect(() => {
    fetchOffers();
  }, []);

  // Refetch offers when WebSocket triggers refresh
  useEffect(() => {
    if (refreshTriggers.offers > 0) {
      fetchOffers();
    }
  }, [refreshTriggers.offers]);

  const handleStatusChange = (offerId, newStatus) => {
    // Update the status of the offer in the local state
    setReceivedOffers(
      receivedOffers.map((offer) =>
        offer.id === offerId ? { ...offer, status: newStatus } : offer
      )
    );

    // If an offer was accepted, update all other offers for the same post to rejected
    if (newStatus === "accepted") {
      const acceptedOffer = receivedOffers.find(
        (offer) => offer.id === offerId
      );
      if (acceptedOffer) {
        setReceivedOffers(
          receivedOffers.map((offer) =>
            offer.post_id === acceptedOffer.post_id &&
            offer.id !== offerId &&
            offer.status === "pending"
              ? { ...offer, status: "rejected" }
              : offer
          )
        );
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Offers</h1>

      {error && (
        <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-6">
          <p>{error}</p>
        </div>
      )}

      {loading ? (
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
        </div>
      ) : (
        <Tab.Group>
          <Tab.List className="flex space-x-1 rounded-xl bg-blue-900/20 p-1 mb-6">
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white shadow text-blue-700"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                )
              }
            >
              Received Offers ({receivedOffers.length})
            </Tab>
            <Tab
              className={({ selected }) =>
                classNames(
                  "w-full rounded-lg py-2.5 text-sm font-medium leading-5",
                  "ring-white ring-opacity-60 ring-offset-2 ring-offset-blue-400 focus:outline-none focus:ring-2",
                  selected
                    ? "bg-white shadow text-blue-700"
                    : "text-blue-100 hover:bg-white/[0.12] hover:text-white"
                )
              }
            >
              My Offers ({myOffers.length})
            </Tab>
          </Tab.List>
          <Tab.Panels>
            <Tab.Panel>
              <OfferList
                offers={receivedOffers}
                isPostOwner={true}
                onStatusChange={handleStatusChange}
                showPostDetails={true}
                onOfferClick={(offerId) => navigate(`/offers/${offerId}`)}
              />
            </Tab.Panel>
            <Tab.Panel>
              <OfferList
                offers={myOffers}
                isPostOwner={false}
                showPostDetails={true}
                onOfferClick={(offerId) => navigate(`/offers/${offerId}`)}
              />
            </Tab.Panel>
          </Tab.Panels>
        </Tab.Group>
      )}
    </div>
  );
};

export default Offers;
