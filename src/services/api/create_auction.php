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
        "message" => "Invalid JSON input: " . json_last_error_msg(),
        "received" => $json
    ]);
    exit();
}

// Validate required fields
$required = ["title", "description", "minBid", "deadline", "seller", "onchain_utxo"];
foreach ($required as $field) {
    if (!isset($data[$field]) || empty($data[$field])) {
        echo json_encode([
            "success" => false,
            "message" => "Missing required field: " . $field,
            "data" => $data
        ]);
        exit();
    }
}

// Extract data
$title = $data["title"];
$description = $data["description"];
$minBid = intval($data["minBid"]);
$deadline = $data["deadline"];
$image = isset($data["image"]) ? $data["image"] : "";
$seller = $data["seller"];
$onchain_utxo = $data["onchain_utxo"];
$highest_bidder = $data["seller"]; // Seller is initial highest bidder
$highest_bid = 0;
$status = "open";

// Insert auction into database
$stmt = $conn->prepare("
    INSERT INTO auctions 
    (title, description, minBid, deadline, image, seller, onchain_utxo, highest_bidder, highest_bid, status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
");

if (!$stmt) {
    echo json_encode([
        "success" => false,
        "message" => "Prepare failed: " . $conn->error
    ]);
    exit();
}

$stmt->bind_param(
    "ssisssssis",
    $title,
    $description,
    $minBid,
    $deadline,
    $image,
    $seller,
    $onchain_utxo,
    $highest_bidder,
    $highest_bid,
    $status
);

if ($stmt->execute()) {
    $auction_id = $stmt->insert_id;
    
    echo json_encode([
        "success" => true,
        "message" => "Auction created successfully",
        "auction_id" => $auction_id,
        "data" => [
            "title" => $title,
            "description" => $description,
            "minBid" => $minBid,
            "deadline" => $deadline,
            "seller" => $seller,
            "onchain_utxo" => $onchain_utxo
        ]
    ]);
} else {
    echo json_encode([
        "success" => false,
        "message" => "Failed to create auction: " . $stmt->error
    ]);
}

$stmt->close();
$conn->close();
?>