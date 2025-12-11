import React, { useEffect, useState } from "react";
import "./List.css";
import { dummyAuctions } from "../../assets/data/dummyAuctions";
import AuctionCard from "../../components/AuctionCard/AuctionCard";
import { getAuctions } from "../../utils/function";

const List = () => {
  const [auctions, setAuctions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchAuctions = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getAuctions();
      console.log("Fetched auctions:", response.auctions);
      setAuctions(response.auctions || []);
    } catch (error) {
      console.error("Error fetching auctions:", error);
      setError(error.message);
      setAuctions([
        {
          id: 1,
          title: "Digital Art NFT",
          description: "Exclusive digital artwork",
          image: "https://via.placeholder.com/300x200?text=Art+NFT",
          minBid: 10_000_000,
          highestBid: 15_000_000,
          deadline: "2024-12-31T23:59:59",
          displayDeadline: "Dec 31, 2024 23:59",
          seller: "addr_test1qzs...xyz",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuctions();
  }, []);
  const handlePlaceBid = (auctionId) => {
    // Implement bid placement logic here
    console.log("Place bid for auction:", auctionId);
    alert(`Placing bid for auction #${auctionId}`);
  };

  if (loading) {
    return (
      <div className="auction-list">
        <div className="loading">Loading auctions...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="auction-list">
        <div className="error">
          Error: {error}
          <button onClick={fetchAuctions} className="retry-btn">
            Retry
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="auction-list">
      <div className="auction-list-header">
        <h2>Ongoing Auctions</h2>
      </div>
      {auctions.length === 0 ? (
        <div className="no-auctions">
          <p>No ongoing auctions found. Create one!</p>
        </div>
      ) : (
        <div className="list">
          {auctions.map((auction) => (
            <div className="card" key={auction.id}>
              <AuctionCard
                key={auction.id}
                id={auction.id}
                title={auction.title}
                description={auction.description}
                image={auction.image}
                highestBid={auction.highestBid}
                minBid={auction.minBid}
                seller={auction.seller}
                deadline={auction.deadline}
                displayDeadline={auction.displayDeadline}
                onchain_utxo={auction.onchain_utxo} // Pass this
                highestBidder={auction.highestBidder} // Pass this
                status={auction.status} // Pass this
              />
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default List;
