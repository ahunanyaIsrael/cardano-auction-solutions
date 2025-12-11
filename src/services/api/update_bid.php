<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

// Database connection
$host = "localhost";
$username = "root";
$password = "";
$database = "auction_database";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit();
}

// Get JSON input
$json = file_get_contents("php://input");
$data = json_decode($json, true);

if (!$data || json_last_error() !== JSON_ERROR_NONE) {
    echo json_encode([
        "success" => false,
        "message" => "Invalid JSON input"
    ]);
    exit();
}

// Validate required fields
$required = ["auctionId", "bidAmount", "bidderAddress", "txHash", "newUtxo"];
foreach ($required as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required field: " . $field
        ]);
        exit();
    }
}

$auctionId = intval($data["auctionId"]);
$bidAmount = intval($data["bidAmount"]);
$bidderAddress = $data["bidderAddress"];
$txHash = $data["txHash"];
$newUtxo = $data["newUtxo"];

// Check if auction exists and is open
$checkStmt = $conn->prepare("SELECT status, highest_bid FROM auctions WHERE id = ?");
$checkStmt->bind_param("i", $auctionId);
$checkStmt->execute();
$result = $checkStmt->get_result();

if ($result->num_rows === 0) {
    echo json_encode([
        "success" => false,
        "message" => "Auction not found"
    ]);
    $checkStmt->close();
    exit();
}

$auction = $result->fetch_assoc();
$checkStmt->close();

if ($auction["status"] !== "open") {
    echo json_encode([
        "success" => false,
        "message" => "Auction is not open"
    ]);
    exit();
}

// Check if bid is higher than current highest bid
if ($bidAmount <= $auction["highest_bid"]) {
    echo json_encode([
        "success" => false,
        "message" => "Bid must be higher than current highest bid"
    ]);
    exit();
}

// Update auction with new bid
$updateStmt = $conn->prepare("
    UPDATE auctions 
    SET highest_bid = ?, 
        highest_bidder = ?, 
        onchain_utxo = ?,
        last_bid_time = NOW()
    WHERE id = ?
");

if (!$updateStmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit();
}

$updateStmt->bind_param(
    "issi",
    $bidAmount,
    $bidderAddress,
    $newUtxo,
    $auctionId
);

if ($updateStmt->execute()) {
    echo json_encode([
        "success" => true,
        "message" => "Bid updated successfully",
        "data" => [
            "auctionId" => $auctionId,
            "newBid" => $bidAmount,
            "bidder" => $bidderAddress,
            "txHash" => $txHash
        ]
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to update bid: " . $updateStmt->error
    ]);
}

$updateStmt->close();
$conn->close();
?>