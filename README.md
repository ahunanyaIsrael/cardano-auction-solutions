# Cardano Auction Solution

A decentralized auction platform built on the Cardano blockchain using React and Vite. This application allows users to create, bid on, and manage auctions using Cardano native assets.

## Features

- **Create Auctions**: Users can create new auctions for Cardano native assets
- **Bid on Auctions**: Place bids on active auctions
- **My Auctions**: View and manage auctions you've created
- **Wallet Integration**: Connect with Lace wallet for seamless blockchain interaction
- **Real-time Updates**: Live auction status and bid tracking

## Tech Stack

- **Frontend**: React 19 with Vite
- **Blockchain**: Cardano (using Lucid library)
- **Routing**: React Router DOM
- **Styling**: CSS modules
- **HTTP Client**: Axios
- **Wallet**: Lace wallet integration

## Prerequisites

- Node.js (v16 or higher)
- Lace wallet extension installed in your browser
- Cardano testnet/mainnet access
- Blockfrost API key
- Pinata account for IPFS storage
- PHP backend server (for auction data management)

## Backend Setup

This application requires a PHP backend server to handle auction data. The backend should be running on `http://localhost/backend` and provide the following endpoints:

- `POST /create_auction.php` - Create new auctions
- `GET /get_auctions.php` - Retrieve auction listings
- `POST /update_bid.php` - Handle bid placements
- `POST /update_auction_status.php` - Update auction status

**Note**: The backend implementation is not included in this repository. You'll need to set up your own PHP server with these endpoints.

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
VITE_BLOCKFROST_API=your_blockfrost_api_key_here
VITE_PINATA_JWT=your_pinata_jwt_here
VITE_PINATA_API_KEY=your_pinata_api_key_here
VITE_PINATA_API_SECRET=your_pinata_api_secret_here
```

### Getting API Keys

1. **Blockfrost**: Sign up at [blockfrost.io](https://blockfrost.io) and get your API key for Cardano testnet or mainnet
2. **Pinata**: Create an account at [pinata.cloud](https://pinata.cloud) for IPFS file storage and NFT metadata

## Installation

1. Clone the repository:

```bash
git clone <repository-url>
cd cardano-auction-solution
```

2. Install dependencies:

```bash
npm install
```

3. Set up environment variables (see Environment Setup section)

4. Start your PHP backend server on `http://localhost/backend`

5. Start the development server:

```bash
npm run dev
```

6. Open your browser and navigate to `http://localhost:5173`

## Available Scripts

- `npm run dev` - Start the development server
- `npm run build` - Build the project for production
- `npm run preview` - Preview the production build locally
- `npm run lint` - Run ESLint for code quality checks

## Project Structure

```
src/
├── components/          # Reusable UI components
│   ├── AuctionCard/     # Auction display component
│   ├── BidModal/        # Bidding interface
│   ├── CloseAuctionModal/ # Auction closure component
│   └── NavBar/          # Navigation component
├── context/             # React context providers
│   └── LucidContext.jsx # Cardano/Lucid integration
├── pages/               # Main application pages
│   ├── Create/          # Auction creation page
│   ├── List/            # Auction listing page
│   └── MyAuctions/      # User's auctions page
├── utils/               # Utility functions
│   ├── function.jsx     # Helper functions
│   └── validator.js     # Input validation
└── assets/              # Static assets
    ├── data/            # Dummy data for development
    └── images/          # Image assets
```

## Usage

1. **Connect Wallet**: Click the connect button in the navigation to link your Lace wallet
2. **Create Auction**: Navigate to the Create page to set up a new auction
3. **Browse Auctions**: View all active auctions on the home page
4. **Place Bids**: Click on an auction card to open the bid modal
5. **Manage Auctions**: Check your created auctions in the My Auctions section

## Development

This project uses:

- **Vite** for fast development and building
- **ESLint** for code linting
- **React Fast Refresh** for hot module replacement

## Troubleshooting

### Common Issues

- **Backend Connection Failed**: Ensure your PHP backend is running on `http://localhost/backend`
- **Wallet Connection Issues**: Make sure Lace wallet extension is installed and unlocked
- **IPFS Upload Errors**: Check your Pinata API credentials in the `.env` file
- **Blockfrost API Errors**: Verify your Blockfrost API key is valid and has sufficient credits

### Development Server

If the dev server exits with code 1, this is normal behavior - the server is running in the background. The application will be available at `http://localhost:5173`.

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Run tests and linting
5. Submit a pull request

## License

This project is licensed under the MIT License.
