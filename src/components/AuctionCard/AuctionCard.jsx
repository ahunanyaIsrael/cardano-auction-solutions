import React, { useState } from "react";
import "./AuctionCard.css";
import BidModal from "../BidModal/BidModal";

const AuctionCard = ({
  id,
  image,
  title,
  highestBid,
  minBid,
  description,
  onPlaceBid,
  timeRemaining,
  deadline,
  displayDeadline,
  currentBid,
  seller,
  onchain_utxo, // Add this prop
  highestBidder,
  status,
}) => {
  const isActuallyEnded = Date.now() > new Date(deadline).getTime();
  const displayStatus = isActuallyEnded ? "ended" : status;
  const displayText = isActuallyEnded ? "ENDED" : status.toUpperCase();
  const [showBidModal, setShowBidModal] = useState(false);
  // Format seller address
  const formatAddress = (addr) => {
    if (!addr) return "Unknown";
    return `${addr.slice(0, 6)}...${addr.slice(-6)}`;
  };
  // Format ADA
  const formatADA = (lovelace) => {
    if (!lovelace) return "0";
    return (lovelace / 1_000_000).toFixed(2);
  };

  const handleBidClick = () => {
    setShowBidModal(true);
  };

  const handleBidSuccess = (result) => {
    console.log("Bid successful:", result);
    // Refresh auction data or show success message
    if (onPlaceBid) onPlaceBid(result);
    setShowBidModal(false);
  };

  const handleBidModalClose = () => {
    setShowBidModal(false);
  };

  return (
    <>
      <div className="auction-card">
        <img
          src={image || "https://via.placeholder.com/300x200?text=No+Image"}
          alt={title}
          className="auction-image"
        />

        <div className="info">
          <div className="auction-header">
            <span className="auction-id">Auction #{id}</span>
            <span className={`status-badge ${displayStatus}`}>
              {displayText}
            </span>
          </div>

          <h3 className="auction-title">{title}</h3>
          <p className="value small-text">{description}</p>

          <div className="detail-row">
            <span className="label">Current Bid:</span>
            <span className="value highlight">{formatADA(highestBid)} ADA</span>
          </div>

          <div className="detail-row">
            <span className="label">Minimum Bid:</span>
            <span className="value">{formatADA(minBid)} ADA</span>
          </div>

          <div className="detail-row">
            <span className="label">Deadline: </span>
            <span className="value small-text">
              {displayDeadline || "Unknown"}
            </span>
          </div>

          <div className="detail-row">
            <span className="label">Seller: </span>
            <span className="value small-text">{formatAddress(seller)}</span>
          </div>

          <div className="detail-row">
            <span className="label">Current Bidder: </span>
            <span className="value small-text">
              {formatAddress(highestBidder)}
            </span>
          </div>

          <button
            onClick={handleBidClick}
            className="bid-button"
            disabled={status !== "open"}
          >
            Place Bid
          </button>
        </div>
      </div>

      {showBidModal && (
        <BidModal
          auction={{
            id,
            title,
            description,
            image,
            highestBid,
            minBid,
            deadline,
            displayDeadline,
            seller,
            onchain_utxo,
            highestBidder,
            status,
          }}
          onClose={handleBidModalClose}
          onSuccess={handleBidSuccess}
        />
      )}
    </>
  );
};

export default AuctionCard;
