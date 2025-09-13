# CharacatoCoin 🪙

**CharacatoCoin (CC)** is a complete DeFi ecosystem built on Ethereum, featuring an ERC20 token with staking capabilities and a modern Angular frontend.

## 🚀 Features

### Smart Contracts
- **ERC20 Token** - Fully compliant CharacatoCoin implementation
- **Staking Contract** - Earn rewards by staking CC tokens
- **Admin Functions** - Configurable reward rates and parameters

### Frontend Application
- **Modern Angular 17** interface
- **Web3 Integration** - Connect with MetaMask
- **Real-time Updates** - Live token balances and staking info
- **Responsive Design** - Works on desktop and mobile

### Key Capabilities
- ✅ Token transfers and approvals
- ✅ Stake tokens to earn rewards
- ✅ Unstake with lock period protection
- ✅ Admin panel for contract management
- ✅ Multi-network support (Localhost, Sepolia)

## 🛠 Technology Stack

- **Smart Contracts:** Solidity, Hardhat
- **Frontend:** Angular 17, TypeScript, SCSS
- **Web3:** Ethers.js v6, MetaMask integration
- **Testing:** Hardhat, Mocha/Chai
- **Networks:** Ethereum, Sepolia Testnet

## 📦 Installation

### Prerequisites
- Node.js (v18+)
- npm or yarn
- MetaMask browser extension

### Clone and Install
```bash
git clone https://github.com/[YOUR_USERNAME]/CharacatoCoin.git
cd CharacatoCoin
npm install
```

### Setup Environment
```bash
cp .env.example .env
# Edit .env with your configuration
```

## 🚀 Quick Start

### 1. Start Local Blockchain
```bash
npx hardhat node
```

### 2. Deploy Contracts
```bash
npx hardhat run scripts/deploy.js --network localhost
```

### 3. Start Frontend
```bash
cd frontend
npm install
npm start
```

### 4. Configure MetaMask
- Add localhost network (Chain ID: 1337)
- Import account using private key from Hardhat

## 🌐 Live Demo

- **Sepolia Testnet:** [Add your deployed URL here]
- **Contract Addresses:**
  - CharacatoCoin: `0x5FbDB2315678afecb367f032d93F642f64180aa3`
  - Staking: `0xe7f1725E7734CE288F8367e1Bb143E90bb3F0512`

## 📚 Documentation

- [User Tutorial](TUTORIAL_USUARIOS.md)
- [Deployment Guide](DESPLIEGUE_SEPOLIA.md)
- [Production Checklist](CHECKLIST_PRODUCCION.md)
- [Mainnet Plan](PLAN_MAINNET.md)

## 🧪 Testing

```bash
# Run all tests
npm test

# Run specific test files
npx hardhat test test/CharacatoCoin.test.js
npx hardhat test test/CharacatoStaking.test.js

# Generate coverage report
npm run coverage
```

## 📊 Contract Details

### CharacatoCoin Token
- **Name:** CharacatoCoin
- **Symbol:** CC
- **Decimals:** 18
- **Total Supply:** 1,000,000 CC

### Staking Features
- **Reward Rate:** Configurable APY
- **Minimum Stake:** 10 CC
- **Lock Period:** 7 days
- **Rewards:** Paid in CC tokens

## 🛡 Security

- ✅ OpenZeppelin contracts base
- ✅ Comprehensive test coverage
- ✅ Reentrancy protection
- ✅ Access controls implemented
- ✅ Pausable emergency functions

## 🤝 Contributing

1. Fork the repository
2. Create feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

## 🔗 Links

- [Ethereum](https://ethereum.org/)
- [Hardhat](https://hardhat.org/)
- [Angular](https://angular.io/)
- [OpenZeppelin](https://openzeppelin.com/)

## 👨‍💻 Author

**Fidel K. Salas Flores**
- GitHub: [@fidelk](https://github.com/fidelk)

---

⭐ **Star this repository** if you found it helpful!

## 🎯 Roadmap

- [ ] Deploy to Ethereum Mainnet
- [ ] Add governance features
- [ ] Implement liquidity pools
- [ ] Mobile application
- [ ] Multi-token staking support
