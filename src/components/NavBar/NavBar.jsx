import React, { useEffect, useState } from "react";
import "./NavBar.css";
import logo from "../../assets/images/auction_logo.png";
import { Link } from "react-router-dom";
import { getValidatorAddress } from "../../utils/function";
import { useLucid } from "../../context/LucidContext";

const NavBar = () => {
  const {
    lucid,
    address,
    isConnected,
    connectWallet,
    disconnectWallet,
    loading,
  } = useLucid();
  const [validatorAddress, setValidatorAddress] = useState(null);

  useEffect(() => {
    const fetchValidatorAddress = async () => {
      if (lucid) {
        try {
          const address = await getValidatorAddress(lucid);
          setValidatorAddress(address);
          console.log("Validator Address:", address);
        } catch (error) {
          console.error("Failed to get validator address:", error);
        }
      }
    };

    fetchValidatorAddress();
  }, [lucid]); // Run whenever lucid changes
  const handleConnect = async () => {
    try {
      await connectWallet("lace");
    } catch (error) {
      console.error("Failed to connect:", error);
    }
  };

  const handleDisconnect = () => {
    disconnectWallet();
  };
  return (
    <div className="navbar">
      <div className="nav-left">
        <img src={logo} alt="" />
      </div>
      <div className="nav-middle">
        <Link to={"/"}>
          <p>List</p>
        </Link>
        <Link to={"/create"}>
          <p>Create Auction</p>
        </Link>
        <Link to={"/my-auctions"}>
          <p>My Auctions</p>
        </Link>
      </div>
      <div className="nav-right">
        {!isConnected ? (
          <button onClick={handleConnect}>
            {loading ? "connecting..." : "Connect"}
          </button>
        ) : (
          <div className="wallet-info">
            <button className="disconnect-btn" onClick={handleDisconnect}>
              {/* <span>
          {address?.slice(0, 6)}...{address?.slice(-6)}
        </span> */}
              Disconnect
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default NavBar;
