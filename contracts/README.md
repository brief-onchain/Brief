# BRIEF NFA (BAP578 Compatible)

ERC-721 NFT Smart Contract for AI Agents with structured metadata and built-in features on BNB Chain.
Default app-level contract name: `BriefAgentNFA` (inherits protocol base `BAP578`).

## Features

- **Contract Name (default deployment)**: BriefAgentNFA
- **Token Name (default deployment)**: Brief Agent
- **Symbol (default deployment)**: BRIEF
- **3 Free Mints Per User** - Every user gets 3 free mints automatically
- **0.01 BNB Fee** - After free mints are exhausted
- **Structured Agent Metadata** - Persona, experience, voice, animations, and vault data
- **Agent Fund Management** - Each agent can hold and manage BNB
- **UUPS Upgradeable** - Future-proof contract architecture
- **Emergency Controls** - Pause functionality and emergency withdrawals

## Quick Start

> Recommended runtime: Node.js 22 LTS.
> Hardhat 2.x is not stable on Node 23 in this project setup.

### Installation
```bash
npm install
```

### Compile Contracts
```bash
npm run compile
```

### Run Tests
```bash
npm test
```

### Deploy

```bash
# Local development
npm run deploy

# BSC Testnet
npm run deploy:testnet

# BSC Mainnet  
npm run deploy:mainnet
```

### Upgrade Proxy Implementation

```bash
# Use deployment record (deployments/<network>_deployment.json)
npm run upgrade:testnet

# Optional override
BRIEF_UPGRADE_CONTRACT_NAME=BriefAgentNFA npm run upgrade:mainnet
```

### Interact with Contract

```bash
# Interactive CLI
npm run interact:testnet
```

### Verify on BSCScan

```bash
# Automatic verification
npm run verify:testnet

# Manual verification guide
npm run verify:manual:testnet
```

## Contract Structure

### AgentMetadata
```solidity
struct AgentMetadata {
    string persona;       // JSON traits/style
    string experience;    // Agent's role/expertise
    string voiceHash;     // Voice identifier
    string animationURI;  // Animation resource
    string vaultURI;      // Vault resource
    bytes32 vaultHash;    // Vault identifier
}
```

### Key Functions

- `createAgent()` - Mint new agent NFT (free for first 3, then 0.01 BNB)
- `fundAgent()` - Send BNB to an agent
- `withdrawFromAgent()` - Withdraw BNB from your agent
- `setAgentStatus()` - Activate/deactivate agent
- `setLogicAddress()` - Set agent's logic contract
- `updateAgentMetadata()` - Update agent's metadata

## Environment Setup

Create a `.env` file:

```env
DEPLOYER_PRIVATE_KEY=your_private_key_here
TESTNET_RPC_URL=https://data-seed-prebsc-1-s1.binance.org:8545/
MAINNET_RPC_URL=https://bsc-dataseed.binance.org/
BSCSCAN_API_KEY=your_bscscan_api_key_here
```

## Network Configuration

- **BSC Testnet:** Chain ID 97
- **BSC Mainnet:** Chain ID 56
- **Local:** Hardhat Network

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm test` | Run test suite |
| `npm run compile` | Compile contracts |
| `npm run deploy` | Deploy to local network |
| `npm run deploy:testnet` | Deploy to BSC testnet |
| `npm run deploy:mainnet` | Deploy to BSC mainnet |
| `npm run upgrade:testnet` | Upgrade proxy on BSC testnet |
| `npm run upgrade:mainnet` | Upgrade proxy on BSC mainnet |
| `npm run interact` | Interactive CLI |
| `npm run verify:testnet` | Verify on testnet BSCScan |
| `npm run clean` | Clean artifacts |
| `npm run coverage` | Generate test coverage |

## License

MIT
