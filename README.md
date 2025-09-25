# 🎵 Rougee Play - Web3 Music Platform

A decentralized music platform built with Next.js 15, Web3 wallet integration, and a retro terminal aesthetic.

## 🚀 Features

- **Web3 Native**: Connect with MetaMask, Base Wallet, and other wallets
- **Music Upload**: Upload audio files with progress tracking
- **Decentralized**: Built on Base blockchain with IPFS integration ready
- **Retro Terminal UI**: Minimal black theme with green text and scan lines
- **Real-time Feedback**: Console-style logging and status updates

## 🛠 Tech Stack

### Frontend (Next.js)
- **Next.js 15** with Turbopack
- **TypeScript** for type safety
- **Tailwind CSS** for styling
- **RainbowKit** for wallet connections
- **Wagmi** for Ethereum interactions
- **Viem** for blockchain utilities

### Backend (API)
- **Fastify** server with TypeScript
- **JWT Authentication** 
- **File Upload** with multipart support
- **CORS** configuration
- **Rate limiting** and security

### Web3 Integration
- **Base Network** support
- **Multiple Wallets** (MetaMask, Base Wallet, WalletConnect)
- **Chain Switching** capabilities
- **Account Management**

## 📁 Project Structure

```
rougee_play_v1/
├── api/                    # Fastify backend server
│   ├── src/
│   │   ├── auth.ts        # JWT authentication
│   │   ├── config.ts      # Environment configuration
│   │   └── server.ts      # Main server file
│   ├── uploads/           # Music file storage
│   └── .env               # Environment variables
├── web/                   # Next.js frontend
│   ├── src/
│   │   ├── app/
│   │   │   ├── globals.css    # Global styles
│   │   │   ├── layout.tsx     # Root layout
│   │   │   └── page.tsx       # Home page
│   │   ├── components/
│   │   │   ├── providers/
│   │   │   │   └── Web3Provider.tsx
│   │   │   ├── LandingPage.tsx
│   │   │   └── UploadPage.tsx
│   │   └── lib/
│   │       └── web3.ts        # Web3 configuration
│   └── .env.local             # Environment variables
└── index.html                 # Legacy frontend (replaced by Next.js)
```

## � Setup & Installation

### Prerequisites
- Node.js 18+ 
- npm or yarn
- Git

### 1. Clone Repository
```bash
git clone https://github.com/rougecoin-project/rougee_play_v1.git
cd rougee_play_v1
```

### 2. Setup Backend API
```bash
cd api
npm install
cp env.example .env
# Edit .env with your configuration
npm run dev
```

### 3. Setup Frontend
```bash
cd ../web
npm install
cp .env.local.example .env.local
# Edit .env.local with your WalletConnect Project ID
npm run dev
```

### 4. Access Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:3001

## 🔐 Environment Variables

### Backend (.env)
```env
PORT=3001
NODE_ENV=development
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production
BCRYPT_ROUNDS=12
RATE_LIMIT_MAX=100
RATE_LIMIT_TIME_WINDOW=60000
CORS_ORIGIN=http://localhost:3000
```

### Frontend (.env.local)
```env
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=your-walletconnect-project-id
NEXT_PUBLIC_API_URL=http://localhost:3001
```

## 🎨 Design System

### Color Palette
- **Background**: `#000000` (Pure Black)
- **Text**: `#00ff00` (Terminal Green)
- **Accent**: `#ff0080` (Neon Pink)
- **Borders**: `#333333` (Dark Gray)
- **Muted**: `#888888` (Gray)

### Typography
- **Font**: JetBrains Mono (Monospace)
- **Style**: Terminal/Console aesthetic
- **Effects**: Text glow, blinking cursor

## 🌐 Supported Networks

- **Base Mainnet**
- **Base Sepolia** (Testnet)
- **Ethereum Mainnet**
- **Sepolia** (Testnet)

## � API Endpoints

### Authentication
- `POST /auth/register` - User registration
- `POST /auth/login` - User login
- `GET /auth/me` - Get current user

### Music Upload
- `POST /upload/music` - Upload music file
- `GET /music/my-files` - Get user's files
- `GET /music/files` - Get all files
- `GET /music/stream/:fileId` - Stream music file

### Health
- `GET /` - API info
- `GET /health` - Health check

## 🚀 Deployment

### Frontend (Vercel)
```bash
cd web
npm run build
```

### Backend (Railway/Heroku)
```bash
cd api
npm run build
npm start
```

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/new-feature`)
3. Commit changes (`git commit -am 'Add new feature'`)
4. Push branch (`git push origin feature/new-feature`)
5. Open Pull Request

## � License

MIT License - see LICENSE file for details

## 🔮 Roadmap

- [ ] IPFS integration for decentralized storage
- [ ] Music NFT minting
- [ ] Token-gated access
- [ ] Artist royalty smart contracts
- [ ] Mobile app (React Native)
- [ ] Playlist functionality
- [ ] Social features

## 💬 Community

- **GitHub**: [rougecoin-project/rougee_play_v1](https://github.com/rougecoin-project/rougee_play_v1)
- **Discord**: Coming soon
- **Twitter**: Coming soon

---

Built with ❤️ for the decentralized music revolution
