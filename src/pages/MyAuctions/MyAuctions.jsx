// src/pages/MyAuctions/MyAuctions.jsx
import React, { useEffect, useState } from "react";
import "./MyAuctions.css";
import AuctionCard from "../../components/AuctionCard/AuctionCard";
import { getAuctions } from "../../utils/function";
import { useLucid } from "../../context/LucidContext";
import CloseAuctionModal from "../../components/CloseAuctionModal/CloseAuctionModal";

const MyAuctions = () => {
  const { address, isConnected } = useLucid();
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedAuction, setSelectedAuction] = useState(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  const fetchMyAuctions = async () => {
    if (!address) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getAuctions();
      
      // Filter auctions created by the current wallet
      const myAuctions = (response.auctions || []).filter(
        auction => auction.seller && auction.seller === address
      );
      
      console.log("My auctions:", myAuctions);
      setAuctions(myAuctions);
    } catch (error) {
      console.error("Error fetching my auctions:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMyAuctions();
  }, [address]);

  const handleCloseAuction = (auction) => {
    setSelectedAuction(auction);
    setShowCloseModal(true);
  };

  const handleCloseSuccess = (result) => {
    console.log("Auction closed successfully:", result);
    // Refresh the list
    fetchMyAuctions();
    setShowCloseModal(false);
  };

  const handleModalClose = () => {
    setShowCloseModal(false);
    setSelectedAuction(null);
  };

  if (!isConnected) {
    return (
      <div className="my-auctions">
        <div className="not-connected">
          <h2>Please connect your wallet to view your auctions</h2>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="my-auctions">
        <div className="loading">Loading your auctions...</div>
      </div>
    );
  }

  return (
    <div className="my-auctions">
      <div className="my-auctions-header">
        <h2>My Auctions</h2>
        <p className="subtitle">Auctions created by your wallet</p>
      </div>

      {error && (
        <div className="error">
          Error: {error}
          <button onClick={fetchMyAuctions} className="retry-btn">
            Retry
          </button>
        </div>
      )}

      {auctions.length === 0 ? (
        <div className="no-auctions">
          <p>You haven't created any auctions yet.</p>
          <a href="/create" className="create-link">
            Create your first auction
          </a>
        </div>
      ) : (
        <div className="auctions-grid">
          {auctions.map((auction) => {
            // Check if auction is closed or can be closed
            const deadline = new Date(auction.deadline);
            const now = new Date();
            const isEnded = now >= deadline;
            const canClose = isEnded && auction.status === "open";

            return (
              <div className="my-auction-card" key={auction.id}>
                {/* <AuctionCard
                  {...auction}
                  onPlaceBid={() => {}} // Disable bidding on my auctions page
                /> */}
                
                <div className="auction-actions">
                  <div className="auction-status">
                    <span className={`status ${auction.status}`}>
                      {auction.status.toUpperCase()}
                    </span>
                    <span className="deadline">
                      Ends: {auction.displayDeadline}
                    </span>
                  </div>
                  
                  {canClose && (
                    <button
                      className="close-auction-btn"
                      onClick={() => handleCloseAuction(auction)}
                    >
                      Close Auction & Collect
                    </button>
                  )}
                  
                  {!canClose && isEnded && auction.status === "closed" && (
                    <div className="already-closed">
                      ✅ Auction closed and funds collected
                    </div>
                  )}
                  
                  {!canClose && !isEnded && (
                    <div className="waiting">
                      ⏳ Auction still running
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showCloseModal && selectedAuction && (
        <CloseAuctionModal
          auction={selectedAuction}
          onClose={handleModalClose}
          onSuccess={handleCloseSuccess}
        />
      )}
    </div>
  );
};

export default MyAuctions;