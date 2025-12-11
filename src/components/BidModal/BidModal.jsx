// import React from "react";

// const BidModal = ({ auction, onClose, onSuccess }) => {
//   const [loading, setLoading] = useState(false);
//   const currentBid = auction.highestBid || auction.minBid || 0;
//   const minBidADA = Number(currentBid) / 1_000_000 + 1;
//   const [bidAmount, setBidAmount] = useState("");
//   const [currentDatum, setCurrentDatum] = useState(null);
//   return (
//     <div className="bid-maodal-overlay">
//       <div className="bid-modal">
//         <div className="bid-modal-header">
//           <h2>Place Bid - Auction #{auction.id}</h2>
//           <button> x</button>
//         </div>
//         <div className="modal-body">
//           <div className="auction-info">
//             <h3>{auction.title}</h3>
//             <p className="description">{auction.description}</p>

//             <div className="bid-stats">
//               <div className="stat">
//                 <span className="label">Auction ID:</span>
//                 <span className="value">#{auction.id}</span>
//               </div>
//             </div>
//             <div className="stat">
//               <span className="label">Current Bid:</span>
//               <span className="value">{formatADA(currentBid)} ADA</span>
//             </div>
//             <div className="stat">
//               <span className="label">Ends:</span>
//               <span className="value">
//                 {currentDatum && currentDatum.deadline
//                   ? new Date(
//                       Number(currentDatum.deadline) * 1000
//                     ).toLocaleString()
//                   : "Unknown"}
//               </span>
//             </div>
//             <div className="stat">
//               <span className="label">On-chain TX:</span>
//               <span className="value small">
//                 {auction.onchain_utxo
//                   ? `${auction.onchain_utxo.slice(0, 10)}...`
//                   : "Not found"}
//               </span>
//             </div>
//           </div>
//         </div>
//         <div className="bid-input-section">
//           <label htmlFor="bidAmount">
//             <strong>Your Bid Amount (ADA):</strong>
//           </label>
//           <div className="bid-input-group">
//             <input
//               type="number"
//               min={minBidADA}
//               placeholder={`Enter at least ${minBidADA.toFixed(2)} ADA`}
//             />
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// };

// export default BidModal;
import React, { useState, useEffect } from "react";
import "./BidModal.css";
import { useLucid } from "../../context/LucidContext";
import { placeBid, fetchCurrentDatum } from "../../utils/function";

const BidModal = ({ auction, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [bidAmount, setBidAmount] = useState("");
  const [currentDatum, setCurrentDatum] = useState(null);
  const [error, setError] = useState("");
  const { lucid, address } = useLucid();

  // Format ADA function
  const formatADA = (lovelace) => {
    return (lovelace / 1_000_000).toFixed(2);
  };

  // Calculate minimum bid
  const currentBid = auction.highestBid || auction.minBid || 0;
  const minBidADA = Number(currentBid) / 1_000_000 + 1; // Must be at least 1 ADA higher

  // Fetch current datum from blockchain
  useEffect(() => {
    const fetchDatum = async () => {
      if (auction.onchain_utxo && lucid) {
        try {
          const datum = await fetchCurrentDatum(lucid, auction.onchain_utxo);
          setCurrentDatum(datum);
        } catch (err) {
          console.warn("Could not fetch datum:", err);
        }
      }
    };
    fetchDatum();
  }, [auction, lucid]);

  const handleBidSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!lucid || !address) {
      setError("Please connect your wallet first");
      return;
    }

    const bidADA = parseFloat(bidAmount);
    if (isNaN(bidADA) || bidADA <= 0) {
      setError("Please enter a valid bid amount");
      return;
    }

    if (bidADA < minBidADA) {
      setError(`Bid must be at least ${minBidADA.toFixed(2)} ADA`);
      return;
    }

    try {
      setLoading(true);
      // Call the placeBid function
      const txHash = await placeBid(lucid, auction.id, bidADA, {
        sellerPubKeyHash: auction.sellerPubKeyHash,
        deadline: currentDatum?.deadline,
        currentHighestBid: currentBid,
        currentHighestBidder: auction.highestBidder || auction.seller,
      });

      // Success
      onSuccess({
        txHash,
        bidAmount: bidADA,
        auctionId: auction.id,
      });

      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 2000);
    } catch (err) {
      console.error("Bid failed:", err);
      setError(err.message || "Failed to place bid. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bid-modal-overlay" onClick={onClose}>
      <div className="bid-modal" onClick={(e) => e.stopPropagation()}>
        <div className="bid-modal-header">
          <h2>Place Bid - Auction #{auction.id}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="modal-body">
          <div className="auction-info">
            {auction.image && (
              <img
                src={auction.image}
                alt={auction.title}
                className="auction-modal-image"
              />
            )}

            <h3>{auction.title}</h3>
            <p className="description">{auction.description}</p>

            <div className="bid-stats">
              <div className="stat-row">
                <div className="stat">
                  <span className="label">Auction ID:</span>
                  <span className="value">#{auction.id}</span>
                </div>

                <div className="stat">
                  <span className="label">Current Bid:</span>
                  <span className="value highlight">
                    {formatADA(currentBid)} ADA
                  </span>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat">
                  <span className="label">Minimum Bid:</span>
                  <span className="value highlight">
                    {minBidADA.toFixed(2)} ADA
                  </span>
                </div>

                <div className="stat">
                  <span className="label">Ends:</span>
                  <span className="value">
                    {currentDatum && currentDatum.deadline
                      ? new Date(Number(currentDatum.deadline)).toLocaleString()
                      : auction.displayDeadline || "Unknown"}
                  </span>
                </div>
              </div>

              <div className="stat">
                <span className="label">Seller:</span>
                <span className="value">
                  {auction.seller?.slice(0, 8)}...{auction.seller?.slice(-8)}
                </span>
              </div>

              <div className="stat">
                <span className="label">On-chain UTXO:</span>
                <span className="value small">
                  {auction.onchain_utxo
                    ? `${auction.onchain_utxo.split("#")[0]?.slice(0, 10)}...`
                    : "Not found"}
                </span>
              </div>
            </div>
          </div>

          <form onSubmit={handleBidSubmit} className="bid-form">
            <div className="bid-input-section">
              <label htmlFor="bidAmount">
                <strong>Your Bid Amount (ADA):</strong>
              </label>

              <div className="bid-input-group">
                <input
                  id="bidAmount"
                  type="number"
                  step="0.1"
                  min={minBidADA}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Enter at least ${minBidADA.toFixed(2)} ADA`}
                  disabled={loading}
                  required
                />
                <span className="ada-symbol">ADA</span>
              </div>

              <div className="bid-hint">
                <p>Note: Your wallet must have enough ADA to cover:</p>
                <ul>
                  <li>
                    Bid amount: <strong>{bidAmount || "0"} ADA</strong>
                  </li>
                  <li>Transaction fee: ~0.2 ADA</li>
                  <li>
                    Refund to previous bidder: {formatADA(currentBid)} ADA
                  </li>
                </ul>
              </div>
            </div>

            {error && <div className="error-message">{error}</div>}

            <div className="modal-actions">
              <button
                type="button"
                className="cancel-btn"
                onClick={onClose}
                disabled={loading}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-bid-btn"
                disabled={loading || !bidAmount}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    Processing...
                  </>
                ) : (
                  `Place Bid (${bidAmount || "0"} ADA)`
                )}
              </button>
            </div>
          </form>
        </div>

        <div className="modal-footer">
          <p className="disclaimer">
            By placing a bid, you agree to the auction terms. If you win, you'll
            need to claim the auction after it ends.
          </p>
        </div>
      </div>
    </div>
  );
};

export default BidModal;
