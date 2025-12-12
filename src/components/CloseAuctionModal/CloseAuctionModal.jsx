import { useState, useEffect } from "react";
import "./CloseAuctionModal.css";
import { useLucid } from "../../context/LucidContext";
import { closeAuction, fetchCurrentDatum } from "../../utils/function";

const CloseAuctionModal = ({ auction, onClose, onSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [currentDatum, setCurrentDatum] = useState(null);
  const { lucid, address } = useLucid();

  // Format ADA function
  const formatADA = (lovelace) => {
    if (!lovelace) return "0";

    // Convert BigInt to Number if it's a BigInt
    const amount =
      typeof lovelace === "bigint" ? Number(lovelace) : Number(lovelace);

    return (amount / 1_000_000).toFixed(2);
  };

  // Fetch current datum
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

  const handleCloseAuction = async () => {
    setError("");

    if (!lucid || !address) {
      setError("Please connect your wallet first");
      return;
    }

    // Verify the current user is the seller
    if (address !== auction.seller) {
      setError("Only the auction creator can close this auction");
      return;
    }

    // Check if auction has ended
    const now = new Date();
    const deadline = new Date(auction.deadline);
    if (now < deadline) {
      setError("Auction has not ended yet");
      return;
    }

    try {
      setLoading(true);

      // Call closeAuction function
      const txHash = await closeAuction(lucid, auction.id, {
        sellerPubKeyHash: currentDatum?.seller,
        deadline: currentDatum?.deadline,
        highestBid: currentDatum?.highestBid,
        highestBidder: currentDatum?.highestBidder,
      });

      // Success
      onSuccess({
        txHash,
        auctionId: auction.id,
        amountCollected: currentDatum?.highestBid || 0,
      });

      // Close modal after delay
      setTimeout(() => {
        onClose();
      }, 3000);

      
    } catch (err) {
      console.error("Close auction failed:", err);
      setError(err.message || "Failed to close auction. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const winningBid = currentDatum?.highestBid
    ? typeof currentDatum.highestBid === "bigint"
      ? Number(currentDatum.highestBid)
      : currentDatum.highestBid
    : auction.highestBid || 0;
  const hasBids = winningBid > 0;

  return (
    <div className="close-modal-overlay" onClick={onClose}>
      <div className="close-modal" onClick={(e) => e.stopPropagation()}>
        <div className="close-modal-header">
          <h2>Close Auction #{auction.id}</h2>
          <button className="close-btn" onClick={onClose} disabled={loading}>
            ×
          </button>
        </div>

        <div className="close-modal-body">
          <div className="auction-summary">
            <h3>{auction.title}</h3>
            <p className="description">{auction.description}</p>

            <div className="summary-stats">
              <div className="stat-row">
                <div className="stat">
                  <span className="label">Final Bid:</span>
                  <span className="value highlight">
                    {formatADA(winningBid)} ADA
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Status:</span>
                  <span className={`value status ${auction.status}`}>
                    {auction.status.toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="stat-row">
                <div className="stat">
                  <span className="label">Ended:</span>
                  <span className="value">
                    {auction.displayDeadline || "Unknown"}
                  </span>
                </div>
                <div className="stat">
                  <span className="label">Total Bidders:</span>
                  <span className="value">{hasBids ? "Multiple" : "None"}</span>
                </div>
              </div>

              <div className="stat">
                <span className="label">Winning Bidder:</span>
                <span className="value">
                  {currentDatum?.highestBidder
                    ? `${currentDatum.highestBidder.slice(
                        0,
                        8
                      )}...${currentDatum.highestBidder.slice(-8)}`
                    : "No bids"}
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

            <div className="payout-info">
              <h4>Payout Summary</h4>
              <div className="payout-details">
                <div className="payout-row">
                  <span>Amount to collect:</span>
                  <span className="amount">{formatADA(winningBid)} ADA</span>
                </div>
                <div className="payout-row">
                  <span>Transaction fee:</span>
                  <span className="fee">~0.2 ADA</span>
                </div>
                <div className="payout-row total">
                  <span>Net amount:</span>
                  <span className="total-amount">
                    {formatADA(Math.max(0, winningBid - 200000))} ADA
                  </span>
                </div>
              </div>

              {!hasBids && (
                <div className="no-bids-warning">
                  ⚠️ No bids were placed. You will only recover the minimum 2
                  ADA deposit.
                </div>
              )}
            </div>
          </div>

          {error && <div className="error-message">{error}</div>}

          <div className="close-actions">
            <button
              type="button"
              className="cancel-btn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="button"
              className="close-auction-btn"
              onClick={handleCloseAuction}
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner"></span>
                  Processing...
                </>
              ) : (
                `Close Auction & Collect ${formatADA(winningBid)} ADA`
              )}
            </button>
          </div>
        </div>

        <div className="close-modal-footer">
          <p className="disclaimer">
            Closing the auction will transfer the highest bid to your wallet.
            {!hasBids &&
              " Since no bids were placed, you'll recover your initial deposit."}
          </p>
        </div>
      </div>
    </div>
  );
};

export default CloseAuctionModal;
