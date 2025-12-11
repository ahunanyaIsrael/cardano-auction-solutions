import { useLucid } from "../context/LucidContext.jsx";
import { cbor } from "./validator.js";
import axios from "axios";

const API_URL = "http://localhost/backend";
const PINATA_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";

export const validator = {
  type: "PlutusV2",
  script: cbor.cborHex,
};

export const getValidatorScript = () => validator;

export const getValidatorAddress = async (lucid) => {
  if (!lucid) throw new Error("Lucid is not initialized yet!");
  return lucid.utils.validatorToAddress(validator);
};

// Upload to IPFS
export const uploadToIPFS = async (file) => {
  try {
    const formData = new FormData();
    formData.append("file", file);

    const response = await axios.post(PINATA_URL, formData, {
      headers: {
        Authorization: `Bearer ${import.meta.env.VITE_PINATA_JWT}`,
        "Content-Type": "multipart/form-data",
      },
      timeout: 30000,
    });

    if (!response.data.IpfsHash) {
      throw new Error("No IPFS hash returned");
    }

    return `https://gateway.pinata.cloud/ipfs/${response.data.IpfsHash}`;
  } catch (error) {
    console.error("Error uploading to IPFS:", error);
    throw new Error(`IPFS upload failed: ${error.message}`);
  }
};

// Create metadata in backend
export const createMetadata = async (auctionData) => {
  try {
    console.log("📤 Sending to backend:", auctionData);

    const response = await axios.post(
      `${API_URL}/create_auction.php`,
      auctionData,
      {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 10000,
      }
    );

    console.log("📥 Backend response:", response.data);

    if (response.data.success === false) {
      throw new Error(response.data.message || "Backend error");
    }

    return response.data;
  } catch (error) {
    console.error("PHP API error:", error);

    if (error.code === "ERR_NETWORK") {
      throw new Error(
        "Cannot connect to backend server. Make sure PHP is running."
      );
    } else if (error.response) {
      throw new Error(
        `Backend error (${error.response.status}): ${
          error.response.data?.message || error.message
        }`
      );
    } else {
      throw new Error(`Backend error: ${error.message}`);
    }
  }
};

// Get auctions from backend
export const getAuctions = async () => {
  try {
    console.log("🔍 Fetching auctions from:", `${API_URL}/get_auctions.php`);
    const response = await axios.get(`${API_URL}/get_auctions.php`, {
      timeout: 10000,
      headers: {
        Accept: "application/json",
      },
    });

    console.log("✅ API Response received");

    if (response.data.success === false) {
      throw new Error(response.data.message || "Failed to fetch auctions");
    }

    return response.data;
  } catch (error) {
    console.error("❌ Error fetching auctions:", error);

    if (error.response) {
      console.error("Response status:", error.response.status);
      console.error("Response data:", error.response.data);
      throw new Error(
        `Server error: ${error.response.status} - ${
          error.response.data?.message || "Unknown error"
        }`
      );
    } else if (error.request) {
      console.error("No response received");
      throw new Error(
        "No response from server. Check if backend is running at " + API_URL
      );
    } else {
      throw new Error(`Request error: ${error.message}`);
    }
  }
};

export const createAuction = async (
  lucid,
  address,
  setLoading,
  formData,
  setFormData
) => {
  if (!lucid || !address) {
    alert("Please connect your wallet first!");
    return;
  }

  try {
    setLoading(true);
    let imageUrl = "";

    // Upload image if exists
    if (formData.image) {
      try {
        imageUrl = await uploadToIPFS(formData.image);
        console.log("✅ Image uploaded to IPFS:", imageUrl);
      } catch (error) {
        console.warn("Image upload failed, continuing without image:", error);
      }
    }

    // Right after getting formData.deadline
    console.log("🔍 Raw deadline input:", formData.deadline);
    console.log("🔍 Parsed as Date:", new Date(formData.deadline));
    console.log("🔍 getTime():", new Date(formData.deadline).getTime());
    console.log(
      "🔍 In seconds:",
      Math.floor(new Date(formData.deadline).getTime() / 1000)
    );

    // Convert deadline to UNIX timestamp
    const deadlineInput = formData.deadline;
    const deadlineTimestamp = new Date(deadlineInput).getTime(); // ms

    console.log("📅 Deadline timestamp:", deadlineTimestamp);

    // Get validator address
    const validatorAddress = await getValidatorAddress(lucid);
    console.log("📝 Validator Address:", validatorAddress);

    // Get seller pubkeyHash
    const sellerAddress = await lucid.utils.getAddressDetails(address);
    const sellerPubKeyHash = sellerAddress.paymentCredential?.hash;

    if (!sellerPubKeyHash) {
      throw new Error("Could not extract public key hash from address");
    }
    console.log("👤 Seller PubKeyHash:", sellerPubKeyHash);

    // Import Data module
    const { Data } = await import(
      "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
    );

    // Define datum schema
    const AuctionDatumSchema = Data.Object({
      seller: Data.Bytes(),
      deadline: Data.Integer(),
      highestBid: Data.Integer(),
      highestBidder: Data.Bytes(),
    });

    // Create datum
    const datum = Data.to(
      {
        seller: sellerPubKeyHash,
        deadline: BigInt(deadlineTimestamp),
        highestBid: 0n,
        highestBidder: sellerPubKeyHash, // Seller is initial bidder
      },
      AuctionDatumSchema
    );

    console.log("📄 Datum created:", datum);

    // Convert minimum bid to lovelace
    const minBidLovelace = formData.minBid
      ? BigInt(Math.floor(parseFloat(formData.minBid) * 1_000_000))
      : 2_000_000n;

    // Build transaction
    const tx = await lucid
      .newTx()
      .payToContract(
        validatorAddress,
        { inline: datum },
        { lovelace: 2_000_000n }
      )
      .complete();

    console.log("📝 Transaction built");

    const signedTx = await tx.sign().complete();
    console.log("✍️ Transaction signed");

    const txHash = await signedTx.submit();
    console.log("✅ Transaction submitted:", txHash);

    // Create metadata for backend
    const metadata = {
      title: formData.title,
      description: formData.description,
      minBid: formData.minBid
        ? parseInt(formData.minBid) * 1_000_000
        : 2_000_000,
      deadline: deadlineInput,
      image: imageUrl,
      seller: address,
      onchain_utxo: `${txHash}#0`,
      status: "open",
      highest_bid: 0,
      highest_bidder: address,
    };

    console.log("📤 Sending to backend:", metadata);

    // Save to backend
    try {
      const backendResponse = await createMetadata(metadata);
      console.log("✅ Backend response:", backendResponse);

      alert(`Auction created successfully!\nTransaction: ${txHash}`);

      // Reset form
      setFormData({
        title: "",
        minBid: "",
        description: "",
        deadline: "",
        image: null,
      });
    } catch (backendError) {
      console.error("Backend save failed:", backendError);
      alert(
        `On-chain transaction successful but backend save failed: ${backendError.message}`
      );
    }
  } catch (error) {
    console.error("Error creating auction:", error);
    alert(`Error: ${error.message}`);
  } finally {
    setLoading(false);
  }
};

// Fetch current datum from blockchain
export const fetchCurrentDatum = async (lucid, utxo) => {
  try {
    console.log("🔍 Fetching datum for UTXO:", utxo);

    // Parse UTXO
    const [txHash, outputIndex] = utxo.split("#");

    if (!txHash || outputIndex === undefined) {
      throw new Error(
        `Invalid UTXO format: ${utxo}. Expected format: txHash#outputIndex`
      );
    }

    console.log("📋 Parsed UTXO:", {
      txHash,
      outputIndex: parseInt(outputIndex),
    });

    // Get validator address
    const validatorAddress = await getValidatorAddress(lucid);
    console.log("📍 Validator address:", validatorAddress);

    // Get UTXOs at validator address
    const utxos = await lucid.utxosAt(validatorAddress);
    console.log(utxos);
    console.log("📦 Found", utxos.length, "UTXOs at validator address");

    // Find the specific UTXO
    const targetUtxo = utxos.find((u) => {
      const matches =
        u.txHash === txHash && u.outputIndex === parseInt(outputIndex);
      if (matches) {
        console.log("✅ Found matching UTXO:", {
          txHash: u.txHash,
          outputIndex: u.outputIndex,
          hasDatum: !!u.datum,
          value: u.assets.lovelace,
        });
      }
      return matches;
    });

    if (!targetUtxo) {
      console.error(
        "❌ UTXO not found. Available UTXOs:",
        utxos.map((u) => ({
          txHash: u.txHash,
          outputIndex: u.outputIndex,
          hasDatum: !!u.datum,
        }))
      );
      throw new Error(
        `UTXO ${utxo} not found on chain. Transaction may not be confirmed yet.`
      );
    }

    if (!targetUtxo.datum) {
      throw new Error("UTXO does not have a datum");
    }

    // Decode datum
    const { Data } = await import(
      "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
    );

    const AuctionDatumSchema = Data.Object({
      seller: Data.Bytes(),
      deadline: Data.Integer(),
      highestBid: Data.Integer(),
      highestBidder: Data.Bytes(),
    });

    const datum = Data.from(targetUtxo.datum, AuctionDatumSchema);

    console.log("📊 Decoded datum:", {
      seller: datum.seller,
      deadline: Number(datum.deadline),
      highestBid: Number(datum.highestBid),
      highestBidder: datum.highestBidder,
      deadlineDate: new Date(Number(datum.deadline)).toISOString(),
    });

    return datum;
  } catch (error) {
    console.error("Error fetching datum:", error);
    throw error;
  }
};

// export const placeBid = async (lucid, auctionId, bidAmountADA, auctionData) => {
//   try {
//     if (!lucid) throw new Error("Wallet not connected");

//     // 1) CURRENT BIDDER INFO
//     const bidderAddress = await lucid.wallet.address();
//     const addressDetails = await lucid.utils.getAddressDetails(bidderAddress);
//     const bidderPubKeyHash = addressDetails.paymentCredential?.hash;

//     if (!bidderPubKeyHash) {
//       throw new Error("Could not extract public key hash from address");
//     }

//     // Convert bid amount to lovelace
//     const bidLovelace = BigInt(Math.floor(bidAmountADA * 1_000_000));
//     console.log("💰 Bid amount (lovelace):", bidLovelace.toString());

//     // 2) IMPORT Data + SCHEMAS
//     const { Data } = await import(
//       "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
//     );

//     const AuctionDatumSchema = Data.Object({
//       seller: Data.Bytes(),
//       deadline: Data.Integer(),
//       highestBid: Data.Integer(),
//       highestBidder: Data.Bytes(),
//     });

//     const AuctionRedeemerSchema = Data.Enum([
//       Data.Object({ PlaceBid: Data.Tuple([Data.Integer(), Data.Bytes()]) }),
//       Data.Literal("CloseAuction"),
//     ]);

//     // 3) LOAD AUCTION + CURRENT DATUM
//     const validatorAddress = await getValidatorAddress(lucid);

//     const response = await getAuctions();
//     const auction = response.auctions.find((a) => a.id === auctionId);

//     console.log("🎯 Found auction:", auction);

//     if (!auction) {
//       throw new Error("Auction not found in database");
//     }

//     if (!auction.onchain_utxo) {
//       throw new Error("Auction UTXO not found in database");
//     }

//     const utxoString = auction.onchain_utxo;
//     console.log("📄 Current auction UTXO:", utxoString);

//     // Fetch datum from on-chain UTXO
//     const currentDatum = await fetchCurrentDatum(lucid, utxoString);
//     console.log("📊 Current datum:", currentDatum);

//     // 4) TIME / DEADLINE CHECKS (ALL IN MILLISECONDS)
//     const deadlineMs = Number(currentDatum.deadline); // POSIXTime in ms (as stored in datum)
//     const currentTimeMs = Date.now();
//     const timeRemainingMs = deadlineMs - currentTimeMs;

//     console.log("⏰ Time Check:", {
//       deadlineMs,
//       currentTimeMs,
//       deadlineDate: new Date(deadlineMs).toISOString(),
//       currentDate: new Date(currentTimeMs).toISOString(),
//       timeRemainingSeconds: Math.floor(timeRemainingMs / 1000),
//       timeRemainingMinutes: timeRemainingMs / 60000,
//     });

//     // Auction still open? (compare ms with ms)
//     if (currentTimeMs >= deadlineMs) {
//       throw new Error(
//         `Auction ended on ${new Date(deadlineMs).toLocaleString()}`
//       );
//     }

//     // 5) BID VALIDATION (ON TOP OF CURRENT HIGHEST)
//     const currentHighestBid = BigInt(currentDatum.highestBid);
//     const minIncrement = 1_000_000n; // 1 ADA in lovelace

//     console.log("📈 Bid validation:", {
//       bidLovelace: Number(bidLovelace),
//       currentHighestBid: Number(currentHighestBid),
//       minIncrement: Number(minIncrement),
//       requiredMin: Number(currentHighestBid + minIncrement),
//     });

//     if (bidLovelace <= currentHighestBid + minIncrement) {
//       throw new Error(
//         `Bid must be at least ${
//           Number(currentHighestBid + minIncrement) / 1_000_000
//         } ADA (Current: ${Number(currentHighestBid) / 1_000_000} ADA)`
//       );
//     }

//     // 6) CREATE REDEEMER
//     const redeemer = Data.to(
//       {
//         PlaceBid: [bidLovelace, bidderPubKeyHash],
//       },
//       AuctionRedeemerSchema
//     );

//     // 7) BUILD NEW DATUM (UPDATE HIGHEST BID + BIDDER)
//     const newDatum = Data.to(
//       {
//         seller: currentDatum.seller,
//         deadline: BigInt(deadlineMs), // keep same deadline (ms)
//         highestBid: bidLovelace,
//         highestBidder: bidderPubKeyHash,
//       },
//       AuctionDatumSchema
//     );

//     console.log("📄 New datum:", newDatum);

//     // 8) FIND SCRIPT UTXO TO SPEND
//     const [txHash, outputIndex] = utxoString.split("#");
//     console.log("🔍 Parsing UTXO:", { txHash, outputIndex });

//     const utxos = await lucid.utxosAtWithUnit(validatorAddress, "");
//     console.log("🔍 All UTXOs at validator address:", utxos.length);

//     const currentUtxo = utxos.find(
//       (u) => u.txHash === txHash && u.outputIndex === parseInt(outputIndex)
//     );

//     if (!currentUtxo) {
//       console.error(
//         "❌ Could not find UTXO. Available UTXOs:",
//         utxos.map((u) => ({
//           txHash: u.txHash,
//           outputIndex: u.outputIndex,
//           assets: u.assets,
//         }))
//       );
//       throw new Error(
//         `Could not find UTXO ${utxoString} on chain. Make sure the transaction is confirmed.`
//       );
//     }

//     // Debug: UTXO being spent
//     console.log("🔍 UTXO we're spending:", {
//       txHash: currentUtxo.txHash,
//       outputIndex: currentUtxo.outputIndex,
//       datum: currentUtxo.datum,
//       datumHash: currentUtxo.datumHash,
//       value: currentUtxo.assets.lovelace,
//     });

//     console.log("🔍 Deadline verification:", {
//       deadlineFromFetch: Number(currentDatum.deadline),
//       deadlineInNewDatum: deadlineMs,
//       areTheyEqual: Number(currentDatum.deadline) === deadlineMs,
//     });

//     // 9) PREVIOUS BIDDER REFUND LOGIC
//     const previousBid = BigInt(currentDatum.highestBid);
//     const previousBidderPubKeyHash = currentDatum.highestBidder;
//     const sellerPubKeyHash = currentDatum.seller;

//     console.log("👤 Previous bidder pubkey hash:", previousBidderPubKeyHash);
//     console.log("💰 Previous bid amount:", Number(previousBid), "lovelace");

//     const isFirstBid = previousBid === 0n;
//     const isPreviousBidderSeller =
//       previousBidderPubKeyHash === sellerPubKeyHash;

//     // Derive address from previous bidder Pkh
//     let previousBidderAddress = null;
//     if (!isFirstBid && !isPreviousBidderSeller) {
//       const previousBidderCredential = lucid.utils.keyHashToCredential(
//         previousBidderPubKeyHash
//       );
//       previousBidderAddress = lucid.utils.credentialToAddress(
//         previousBidderCredential
//       );

//       console.log("📨 Previous bidder address:", previousBidderAddress);
//     } else {
//       console.log(
//         "⏭ No refund needed (first bid OR seller was previous bidder)"
//       );
//     }

//     const validFromMs = currentTimeMs - 5 * 60_000; // 5 minutes ago (safe margin)
//     const validToMs = Math.min(deadlineMs, currentTimeMs + 5 * 60_000); // but NEVER after deadline

//     console.log("⏱ Transaction Validity Range:", {
//       validFrom: new Date(validFromMs).toISOString(),
//       validTo: new Date(validToMs).toISOString(),
//       deadline: new Date(deadlineMs).toISOString(),
//     });

//     // 11) BUILD TX
//     let txBuilder = lucid
//       .newTx()
//       .collectFrom([currentUtxo], redeemer)
//       .attachSpendingValidator(validator)
//       .payToContract(
//         validatorAddress,
//         { inline: newDatum },
//         { lovelace: bidLovelace }
//       )
//       .addSigner(bidderAddress)
//       .validFrom(validFromMs)
//       .validTo(validToMs);

//     // Add refund output ONLY if needed and not seller
//     if (!isFirstBid && !isPreviousBidderSeller && previousBidderAddress) {
//       console.log("💸 Adding refund to previous bidder:", {
//         address: previousBidderAddress,
//         amount: Number(previousBid),
//         inADA: Number(previousBid) / 1_000_000,
//       });

//       txBuilder = txBuilder.payToAddress(previousBidderAddress, {
//         lovelace: previousBid,
//       });
//     }

//     const tx = await txBuilder.complete();

//     console.log("📝 Transaction built");

//     const signedTx = await tx.sign().complete();
//     console.log("✍ Transaction signed");

//     const newTxHash = await signedTx.submit();
//     console.log("✅ Transaction submitted:", newTxHash);

//     // 12) UPDATE BACKEND (store new highest bid + UTXO)
//     await updateAuctionBid(auctionId, bidAmountADA, bidderAddress, newTxHash);

//     return newTxHash;
//   } catch (error) {
//     console.error("Error placing bid:", error);
//     throw error;
//   }
// };

export const placeBid = async (lucid, auctionId, bidAmountADA, auctionData) => {
  try {
    if (!lucid) throw new Error("Wallet not connected");

    // 1) CURRENT BIDDER INFO
    const bidderAddress = await lucid.wallet.address();
    const addressDetails = await lucid.utils.getAddressDetails(bidderAddress);
    const bidderPubKeyHash = addressDetails.paymentCredential?.hash;

    if (!bidderPubKeyHash) {
      throw new Error("Could not extract public key hash from address");
    }

    // Convert bid amount to lovelace
    const bidLovelace = BigInt(Math.floor(bidAmountADA * 1_000_000));
    console.log("💰 Bid amount (lovelace):", bidLovelace.toString());

    // 2) IMPORT Data + SCHEMAS
    const { Data } = await import(
      "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
    );

    const AuctionDatumSchema = Data.Object({
      seller: Data.Bytes(),
      deadline: Data.Integer(),
      highestBid: Data.Integer(),
      highestBidder: Data.Bytes(),
    });

    const AuctionRedeemerSchema = Data.Enum([
      Data.Object({ PlaceBid: Data.Tuple([Data.Integer(), Data.Bytes()]) }),
      Data.Literal("CloseAuction"),
    ]);

    // 3) LOAD AUCTION + CURRENT DATUM
    const validatorAddress = await getValidatorAddress(lucid);

    const response = await getAuctions();
    const auction = response.auctions.find((a) => a.id === auctionId);

    console.log("🎯 Found auction:", auction);

    if (!auction) {
      throw new Error("Auction not found in database");
    }

    if (!auction.onchain_utxo) {
      throw new Error("Auction UTXO not found in database");
    }

    const utxoString = auction.onchain_utxo;
    console.log("📄 Current auction UTXO:", utxoString);

    // Fetch datum from on-chain UTXO
    const currentDatum = await fetchCurrentDatum(lucid, utxoString);
    console.log("📊 Current datum:", currentDatum);

    // 4) TIME / DEADLINE CHECKS (ALL IN MILLISECONDS)
    const deadlineMs = Number(currentDatum.deadline); // POSIXTime in ms (as stored in datum)
    const currentTimeMs = Date.now();
    const timeRemainingMs = deadlineMs - currentTimeMs;

    console.log("⏰ Time Check:", {
      deadlineMs,
      currentTimeMs,
      deadlineDate: new Date(deadlineMs).toISOString(),
      currentDate: new Date(currentTimeMs).toISOString(),
      timeRemainingSeconds: Math.floor(timeRemainingMs / 1000),
      timeRemainingMinutes: timeRemainingMs / 60000,
    });

    // Auction still open? (compare ms with ms)
    if (currentTimeMs >= deadlineMs) {
      throw new Error(
        `Auction ended on ${new Date(deadlineMs).toLocaleString()}`
      );
    }

    // 5) BID VALIDATION (ON TOP OF CURRENT HIGHEST)
    const currentHighestBid = BigInt(currentDatum.highestBid);
    const minIncrement = 1_000_000n; // 1 ADA in lovelace

    console.log("📈 Bid validation:", {
      bidLovelace: Number(bidLovelace),
      currentHighestBid: Number(currentHighestBid),
      minIncrement: Number(minIncrement),
      requiredMin: Number(currentHighestBid + minIncrement),
    });

    if (bidLovelace <= currentHighestBid + minIncrement) {
      throw new Error(
        `Bid must be at least ${
          Number(currentHighestBid + minIncrement) / 1_000_000
        } ADA (Current: ${Number(currentHighestBid) / 1_000_000} ADA)`
      );
    }

    // 6) CREATE REDEEMER
    const redeemer = Data.to(
      {
        PlaceBid: [bidLovelace, bidderPubKeyHash],
      },
      AuctionRedeemerSchema
    );

    // 7) BUILD NEW DATUM (UPDATE HIGHEST BID + BIDDER)
    const newDatum = Data.to(
      {
        seller: currentDatum.seller,
        deadline: BigInt(deadlineMs), // keep same deadline (ms)
        highestBid: bidLovelace,
        highestBidder: bidderPubKeyHash,
      },
      AuctionDatumSchema
    );

    console.log("📄 New datum:", newDatum);

    // 8) FIND SCRIPT UTXO TO SPEND
    const [txHash, outputIndex] = utxoString.split("#");
    console.log("🔍 Parsing UTXO:", { txHash, outputIndex });

    const utxos = await lucid.utxosAtWithUnit(validatorAddress, "");
    console.log("🔍 All UTXOs at validator address:", utxos.length);

    const currentUtxo = utxos.find(
      (u) => u.txHash === txHash && u.outputIndex === parseInt(outputIndex)
    );

    if (!currentUtxo) {
      console.error(
        "❌ Could not find UTXO. Available UTXOs:",
        utxos.map((u) => ({
          txHash: u.txHash,
          outputIndex: u.outputIndex,
          assets: u.assets,
        }))
      );
      throw new Error(
        `Could not find UTXO ${utxoString} on chain. Make sure the transaction is confirmed.`
      );
    }

    // Debug: UTXO being spent
    console.log("🔍 UTXO we're spending:", {
      txHash: currentUtxo.txHash,
      outputIndex: currentUtxo.outputIndex,
      datum: currentUtxo.datum,
      datumHash: currentUtxo.datumHash,
      value: currentUtxo.assets.lovelace,
    });

    console.log("🔍 Deadline verification:", {
      deadlineFromFetch: Number(currentDatum.deadline),
      deadlineInNewDatum: deadlineMs,
      areTheyEqual: Number(currentDatum.deadline) === deadlineMs,
    });

    // 9) PREVIOUS BIDDER REFUND LOGIC - UPDATED
    const previousBid = BigInt(currentDatum.highestBid);
    const previousBidderPubKeyHash = currentDatum.highestBidder;
    const sellerPubKeyHash = currentDatum.seller;

    console.log("👤 Previous bidder pubkey hash:", previousBidderPubKeyHash);
    console.log("💰 Previous bid amount:", Number(previousBid), "lovelace");

    const isFirstBid = previousBid === 0n;
    const isPreviousBidderSeller =
      previousBidderPubKeyHash === sellerPubKeyHash;

    // NEW APPROACH: Try to get the previous bidder's address from backend
    let previousBidderAddress = null;

    if (!isFirstBid && !isPreviousBidderSeller) {
      // Method 1: Try to get from auction data first
      if (auction.highestBidder) {
        previousBidderAddress = auction.highestBidder;
        console.log(
          "📨 Using address from auction data:",
          previousBidderAddress
        );
      }
      // Method 2: Try to reconstruct from pubkey hash (as fallback)
      else {
        try {
          // Convert hex string pubkey hash to bytes
          const previousBidderCredential = lucid.utils.keyHashToCredential(
            previousBidderPubKeyHash
          );

          // Create a payment-only address (most common for wallets)
          previousBidderAddress = lucid.utils.credentialToAddress(
            previousBidderCredential
          );

          console.log(
            "📨 Reconstructed address from pubkey hash:",
            previousBidderAddress
          );
        } catch (error) {
          console.error("Failed to reconstruct address:", error);
          // If we can't reconstruct, we can't refund - this should be handled
          throw new Error(
            "Cannot refund previous bidder: unable to determine their address"
          );
        }
      }
    } else {
      console.log(
        "⏭ No refund needed (first bid OR seller was previous bidder)"
      );
    }

    const validFromMs = currentTimeMs - 5 * 60_000; // 5 minutes ago (safe margin)
    const validToMs = Math.min(deadlineMs, currentTimeMs + 5 * 60_000); // but NEVER after deadline
    // const validToMs = Math.min(deadlineMs, currentTimeMs + 5 * 60_000); // but NEVER after deadline

    console.log("⏱ Transaction Validity Range:", {
      validFrom: new Date(validFromMs).toISOString(),
      validTo: new Date(validToMs).toISOString(),
      deadline: new Date(deadlineMs).toISOString(),
    });

    // 11) BUILD TX
    let txBuilder = lucid
      .newTx()
      .collectFrom([currentUtxo], redeemer)
      .attachSpendingValidator(validator)
      .payToContract(
        validatorAddress,
        { inline: newDatum },
        { lovelace: bidLovelace }
      )
      .addSigner(bidderAddress)
      .validFrom(validFromMs)
      .validTo(validToMs);

    // Add refund output ONLY if needed and not seller
    if (!isFirstBid && !isPreviousBidderSeller && previousBidderAddress) {
      console.log("💸 Adding refund to previous bidder:", {
        address: previousBidderAddress,
        amount: Number(previousBid),
        inADA: Number(previousBid) / 1_000_000,
      });

      txBuilder = txBuilder.payToAddress(previousBidderAddress, {
        lovelace: previousBid,
      });
    }

    const tx = await txBuilder.complete();

    console.log("📝 Transaction built");

    const signedTx = await tx.sign().complete();
    console.log("✍ Transaction signed");

    const newTxHash = await signedTx.submit();
    console.log("✅ Transaction submitted:", newTxHash);

    // 12) UPDATE BACKEND (store new highest bid + UTXO)
    await updateAuctionBid(auctionId, bidAmountADA, bidderAddress, newTxHash);
    alert(newTxHash);

    return newTxHash;
  } catch (error) {
    console.error("Error placing bid:", error);
    throw error;
  }
};
// Update auction bid in backend
export const updateAuctionBid = async (
  auctionId,
  bidAmountADA,
  bidderAddress,
  txHash
) => {
  try {
    const response = await axios.post(`${API_URL}/update_bid.php`, {
      auctionId,
      bidAmount: Math.floor(bidAmountADA * 1_000_000), // Convert to lovelace
      bidderAddress,
      txHash,
      newUtxo: `${txHash}#0`,
    });

    if (!response.data.success) {
      throw new Error(response.data.message || "Failed to update bid");
    }

    return response.data;
  } catch (error) {
    console.error("Error updating bid:", error);
    throw error;
  }
};

export const closeAuction = async (lucid, auctionId) => {
  try {
    console.log("🚀 Starting closeAuction for auction ID:", auctionId);

    if (!lucid) throw new Error("Wallet not connected");

    // 1) Get seller info
    const sellerAddress = await lucid.wallet.address();
    console.log("👤 Seller:", sellerAddress);

    // 2) Load auction
    const response = await getAuctions();
    const auction = response.auctions.find((a) => a.id === auctionId);
    if (!auction) throw new Error("Auction not found");
    if (!auction.onchain_utxo) throw new Error("Auction UTXO not found");

    // 3) Verify seller
    if (sellerAddress !== auction.seller) {
      throw new Error("Only auction creator can close");
    }

    // 4) Fetch datum
    const currentDatum = await fetchCurrentDatum(lucid, auction.onchain_utxo);

    // 5) Check deadline
    const deadlineMs = Number(currentDatum.deadline);
    if (Date.now() < deadlineMs) {
      throw new Error(
        `Auction not ended. Ends: ${new Date(deadlineMs).toLocaleString()}`
      );
    }

    // 6) Create redeemer
    const { Data } = await import(
      "https://unpkg.com/lucid-cardano@0.10.11/web/mod.js"
    );
    const AuctionRedeemerSchema = Data.Enum([
      Data.Object({ PlaceBid: Data.Tuple([Data.Integer(), Data.Bytes()]) }),
      Data.Literal("CloseAuction"),
    ]);
    const redeemer = Data.to("CloseAuction", AuctionRedeemerSchema);

    // 7) Find UTXO
    const validatorAddress = await getValidatorAddress(lucid);
    const [txHash, outputIndex] = auction.onchain_utxo.split("#");
    const utxos = await lucid.utxosAt(validatorAddress);
    const currentUtxo = utxos.find(
      (u) => u.txHash === txHash && u.outputIndex === parseInt(outputIndex)
    );
    if (!currentUtxo) throw new Error("UTXO not found on chain");

    // 8) Build and submit transaction
    const tx = await lucid
      .newTx()
      .collectFrom([currentUtxo], redeemer)
      .attachSpendingValidator(validator)
      .payToAddress(sellerAddress, {
        lovelace: BigInt(currentUtxo.assets.lovelace),
      })
      .addSigner(sellerAddress)
      .complete();

    const signedTx = await tx.sign().complete();
    const txHashResult = await signedTx.submit();

    console.log("✅ Transaction submitted! Hash:", txHashResult);

    // 9) Try to update database, but don't fail if it doesn't work
    try {
      await updateAuctionStatus(auctionId, "closed", txHashResult);
      console.log("✅ Database updated successfully");
    } catch (dbError) {
      console.warn(
        "⚠️ Database update failed, but transaction was successful:",
        dbError.message
      );
      console.log("ℹ️ You can manually update the database later");
    }

    console.log("🎉 Auction closed successfully on blockchain!");
    return {
      success: true,
      txHash: txHashResult,
      auctionId: auctionId,
      message:
        "Auction closed successfully. Database update may need manual intervention.",
    };
  } catch (error) {
    console.error("❌ Close auction failed:", error);
    throw error;
  }
};
// Add updateAuctionStatus function
export const updateAuctionStatus = async (auctionId, status, txHash) => {
  try {
    console.log("🔄 Updating auction status in database...");

    const response = await axios.post(
      `${API_URL}/update_auction_status.php`,
      {
        auctionId,
        status,
        closeTxHash: txHash,
      },
      {
        timeout: 5000, // 5 second timeout
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.data.success) {
      throw new Error(
        response.data.message || "Failed to update auction status"
      );
    }

    console.log("✅ Database update response:", response.data);
    return response.data;
  } catch (error) {
    console.error("❌ Error updating auction status:", {
      message: error.message,
      code: error.code,
      isNetworkError: error.message?.includes("Network Error"),
    });

    // Re-throw with a more helpful message
    if (
      error.message?.includes("Network Error") ||
      error.code === "ERR_NETWORK"
    ) {
      throw new Error(
        "Cannot connect to backend server. " +
          "The blockchain transaction succeeded, but database update failed. " +
          "Transaction hash: " +
          txHash
      );
    }

    throw error;
  }
};
