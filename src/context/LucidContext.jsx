import { createContext, useContext, useEffect, useState } from "react";
import {
  Lucid,
  Blockfrost,
} from "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js";

const LucidContext = createContext(null);

export const useLucid = () => {
  const context = useContext(LucidContext);
  if (!context) {
    throw new Error("useLucid must be used within a LucidProvider");
  }
  return context;
};

export const LucidProvider = (props) => {
  const [lucid, setLucid] = useState(null);
  const [address, setAddress] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const checkExistingConnection = async () => {
      const savedAddress = localStorage.getItem("walletAddress");
      if (savedAddress && window.cardano?.lace) {
        try {
          setLoading(true);
          await connectWallet("lace");
        } catch (error) {
          console.log("No existing wallet connection", error);
          localStorage.removeItem("walletAddress");
        } finally {
          setLoading(false);
        }
      }
    };
    checkExistingConnection();
  }, []);

  const connectWallet = async (wallet = "lace") => {
    if (!window.cardano || !window.cardano[wallet]) {
      alert(`${wallet} wallet not found`);
      return;
    }

    try {
      setLoading(true);
      const api = await window.cardano[wallet].enable();

      // Initialize Lucid first
      const lucidInstance = await Lucid.new(
        new Blockfrost(
          "https://cardano-preprod.blockfrost.io/api/v0",
          import.meta.env.VITE_BLOCKFROST_API
        ),
        "Preprod"
      );

      lucidInstance.selectWallet(api);

      // Get wallet address AFTER setting the wallet
      const walletAddress = await lucidInstance.wallet.address();

      setLucid(lucidInstance);
      setAddress(walletAddress);
      setIsConnected(true);

      // Save to localStorage for persistence
      localStorage.setItem("walletAddress", walletAddress);

      console.log("✅ Wallet connected:", walletAddress);
    } catch (error) {
      console.error("Failed to connect wallet:", error);
      alert("Failed to connect wallet. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const disconnectWallet = () => {
    setLucid(null);
    setAddress(null);
    setIsConnected(false);
    localStorage.removeItem("walletAddress");
    console.log("Wallet disconnected");
  };

  return (
    <LucidContext.Provider
      value={{
        lucid,
        address,
        isConnected,
        disconnectWallet,
        loading,
        connectWallet,
      }}
    >
      {props.children}
    </LucidContext.Provider>
  );
};
