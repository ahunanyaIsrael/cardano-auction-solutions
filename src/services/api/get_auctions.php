<?php
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

// Database connection
$host = "localhost";
$username = "root"; // Change as needed
$password = ""; // Change as needed
$database = "auction_database"; // Your database name

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit();
}

// Get all auctions
$sql = "SELECT * FROM auctions WHERE status = 'open' ORDER BY created_at DESC";
$result = $conn->query($sql);

$auctions = [];
if ($result->num_rows > 0) {
    while($row = $result->fetch_assoc()) {
        $auctions[] = [
            "id" => $row["id"],
            "title" => $row["title"],
            "description" => $row["description"],
            "minBid" => intval($row["minBid"]),
            "highestBid" => intval($row["highest_bid"]),
            "deadline" => $row["deadline"],
            "displayDeadline" => date("M d, Y H:i", strtotime($row["deadline"])),
            "image" => $row["image"],
            "seller" => $row["seller"],
            "highestBidder" => $row["highest_bidder"],
            "status" => $row["status"],
            "onchain_utxo" => $row["onchain_utxo"]
        ];
    }
}

echo json_encode([
    "success" => true,
    "auctions" => $auctions
]);

$conn->close();
?>