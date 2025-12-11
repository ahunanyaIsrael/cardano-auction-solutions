<?php
// Allow from any origin
if (isset($_SERVER['HTTP_ORIGIN'])) {
    header("Access-Control-Allow-Origin: {$_SERVER['HTTP_ORIGIN']}");
    header('Access-Control-Allow-Credentials: true');
    header('Access-Control-Max-Age: 86400');    // cache for 1 day
}

// Access-Control headers are received during OPTIONS requests
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_METHOD']))
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
    
    if (isset($_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']))
        header("Access-Control-Allow-Headers: {$_SERVER['HTTP_ACCESS_CONTROL_REQUEST_HEADERS']}");
    
    exit(0);
}

header("Content-Type: application/json");

// Database connection
$host = "localhost";
$username = "root";
$password = "";
$database = "auction_database";

$conn = new mysqli($host, $username, $password, $database);

if ($conn->connect_error) {
    http_response_code(500);
    echo json_encode([
        "success" => false,
        "message" => "Database connection failed: " . $conn->connect_error
    ]);
    exit();
}

// Get the input data
$input = file_get_contents("php://input");
$data = json_decode($input, true);

if (!$data) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid JSON input'
    ]);
    exit;
}

if (!isset($data['auctionId']) || !isset($data['status'])) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Missing required fields: auctionId and status are required'
    ]);
    exit;
}

$auctionId = intval($data['auctionId']);
$status = trim($data['status']);
$closeTxHash = isset($data['closeTxHash']) ? trim($data['closeTxHash']) : null;

// Validate status
$allowedStatuses = ['open', 'closed', 'ended'];
if (!in_array($status, $allowedStatuses)) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'message' => 'Invalid status value. Must be: ' . implode(', ', $allowedStatuses)
    ]);
    exit;
}

try {
    // Update auction status
    $stmt = $conn->prepare("
        UPDATE auctions 
        SET status = ?, 
            closed_at = NOW(),
            close_tx_hash = ?
        WHERE id = ?
    ");
    
    if (!$stmt) {
        throw new Exception("Prepare failed: " . $conn->error);
    }
    
    $stmt->bind_param("ssi", $status, $closeTxHash, $auctionId);
    
    if ($stmt->execute()) {
        $affectedRows = $stmt->affected_rows;
        
        echo json_encode([
            'success' => true,
            'message' => 'Auction status updated successfully',
            'affectedRows' => $affectedRows,
            'auctionId' => $auctionId,
            'status' => $status
        ]);
    } else {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'message' => 'Failed to update auction: ' . $stmt->error
        ]);
    }
    
    $stmt->close();
} catch (Exception $e) {
    http_response_code(500);
    error_log("Error in update_auction_status.php: " . $e->getMessage());
    echo json_encode([
        'success' => false,
        'message' => 'Server error: ' . $e->getMessage()
    ]);
}

$conn->close();
?>