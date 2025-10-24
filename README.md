# Human Write Contract

A minimal, dark-mode one-page web app for interacting with smart contracts across multiple EVM chains with a human-readable interface.

## Features

- ✨ **Multi-chain Support**: Ethereum, Base, Arbitrum, Optimism, Polygon, BSC, Avalanche C-Chain, plus Sepolia and Fuji testnets
- 🔍 **Auto-fetch ABI**: Automatically fetches contract ABIs from Etherscan, BaseScan, Arbiscan, PolygonScan, BscScan, SnowTrace, and more
- 🔗 **Proxy Detection**: Detects EIP-1967 and EIP-1822 proxy contracts and uses implementation ABI
- 📝 **Human-readable Inputs**: Smart parameter inputs with unit converters:
  - Token amounts with decimals (raw ↔ human-readable)
  - Ether units (wei, gwei, ether)
  - Basis points ↔ percentage
  - Timestamps ↔ date/time picker
  - Text ↔ bytes32 encoding
- 🧪 **Free Simulation**: Simulate transactions before sending using viem (no paid services required)
- ⚠️ **Safety Features**: Extra confirmation for dangerous functions (ownership transfers, upgrades, etc.)
- 🔑 **Key Reads**: Quick view of common contract state (name, symbol, decimals, owner, etc.)
- 🌐 **ENS Support**: Resolve ENS names on Ethereum mainnet and Sepolia
- 🛡️ **Security Audit**: Built-in contract security analyzer with:
  - **Quick Scan** (free, instant): Detects dangerous patterns, ownership controls, upgrade mechanisms
  - **AI Deep Audit** (optional, requires OpenAI key): Comprehensive source code analysis using GPT-4
  - **Smart Context Detection**: Recognizes institutional tokens (USDC/USDT) and adjusts risk assessment accordingly
  - **Trust Model Analysis**: Identifies if contract is centralized, decentralized, or hybrid
- 🤖 **AI Transaction Analysis** (optional): Get human-readable explanations of what each transaction will do

## Tech Stack

- **Framework**: Next.js 15 + TypeScript
- **Styling**: Tailwind CSS (dark mode)
- **Web3**: wagmi v2 + viem
- **State**: Jotai
- **Validation**: Zod
- **Icons**: Lucide React

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. (Optional) Configure environment variables

Copy `.env.local.example` to `.env.local` and add your API keys:

```bash
# Optional RPC endpoints (uses public defaults if not set)
NEXT_PUBLIC_ETH_RPC=
NEXT_PUBLIC_BASE_RPC=
NEXT_PUBLIC_ARB_RPC=
NEXT_PUBLIC_OPT_RPC=
NEXT_PUBLIC_POLYGON_RPC=
NEXT_PUBLIC_BSC_RPC=
NEXT_PUBLIC_AVAX_RPC=
NEXT_PUBLIC_SEPOLIA_RPC=
NEXT_PUBLIC_FUJI_RPC=

# Optional API keys for block explorers (improves rate limits)
NEXT_PUBLIC_ETHERSCAN_KEY=
NEXT_PUBLIC_ARBISCAN_KEY=
NEXT_PUBLIC_OPTIMISTIC_ETHERSCAN_KEY=
NEXT_PUBLIC_POLYGONSCAN_KEY=
NEXT_PUBLIC_BSCSCAN_KEY=
NEXT_PUBLIC_BASESCAN_KEY=
NEXT_PUBLIC_SNOWTRACE_KEY=

# Optional WalletConnect project ID
NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID=
```

> **Note**: The app works without API keys using public RPCs and rate-limited explorer APIs.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.

## Usage

### Loading a Contract

1. Enter a contract address (or ENS name on supported networks)
2. Select the network
3. Click "Load Contract"

The app will:
- Fetch the ABI from the block explorer
- Detect if it's a proxy contract
- Display contract information
- Show available write functions

### Interacting with Functions

Each write function card includes:

1. **Parameter inputs** with smart type detection:
   - Addresses: Checksum validation, ENS support
   - Amounts: Multiple unit options (wei, gwei, ether, token decimals)
   - Fees: Basis points ↔ percentage converter
   - Timestamps: Date/time picker
   - Bytes32: Text encoder

2. **Calldata preview**: See the encoded transaction data

3. **Simulation**: Test the transaction before sending (free via viem)

4. **Send transaction**: Execute after connecting your wallet

### Safety Features

- **Network mismatch detection**: Automatically prompts to switch networks
- **Dangerous function warnings**: Extra confirmation for risky operations:
  - Ownership transfers
  - Upgrades
  - Pause/unpause
  - Emergency functions
- **Payable function alerts**: Explicit ETH value input with warnings

## Supported Networks

### Mainnets
- Ethereum (1)
- Base (8453)
- Arbitrum (42161)
- Optimism (10)
- Polygon (137)
- BSC (56)
- Avalanche C-Chain (43114)

### Testnets
- Sepolia (11155111)
- Avalanche Fuji (43113)

## Example Contracts for Testing

- **ERC-20 (18 decimals)**: DAI on Ethereum Mainnet
  - `0x6B175474E89094C44Da98b954EedeAC495271d0F`
- **Proxy (UUPS)**: Look for OpenZeppelin UUPS examples on Sepolia
- **Avalanche**: USDC.e on Avalanche C-Chain
  - `0xA7D7079b0FEaD91F3e65f86E8915Cb59c1a4C664`

## Architecture

```
/app
  page.tsx          # Main application page
  layout.tsx        # Root layout with providers
  providers.tsx     # Wagmi and React Query providers
  globals.css       # Global styles

/components
  AddressInput.tsx      # Address/ENS input with validation
  ChainSelect.tsx       # Network selector
  ContractSummary.tsx   # Contract info display
  KeyReads.tsx          # Common read functions
  FunctionCard.tsx      # Write function interface
  ParamField.tsx        # Smart parameter input
  UnitInput.tsx         # Unit converter (wei/ether/token/bps/timestamp)
  DangerConfirm.tsx     # Confirmation modal for dangerous functions

/lib
  chains.ts         # Chain configurations
  explorers.ts      # ABI fetching from block explorers
  proxy.ts          # Proxy detection (EIP-1967, EIP-1822)
  abi.ts            # ABI parsing and function filtering
  translate.ts      # Humanization rules and hints
  validation.ts     # Zod schemas for input validation
  viem.ts           # Viem client utilities
  wagmi-config.ts   # Wagmi configuration
```

## Key Features Explained

### Unit Converters

The app automatically detects parameter types and provides appropriate converters:

- **Token amounts**: If a contract has `decimals()`, amounts can be entered in human-readable format (e.g., "100.0" instead of "100000000000000000000")
- **Ether units**: Convert between wei, gwei, and ether
- **Basis points**: Enter percentages (e.g., "1.25%") which converts to 125 bps
- **Timestamps**: Use a date/time picker instead of Unix timestamps
- **Bytes32**: Enter plain text which gets encoded to bytes32

### Proxy Detection

The app detects several proxy patterns:
- **EIP-1967**: Standard transparent proxy pattern
- **EIP-1822**: UUPS (Universal Upgradeable Proxy Standard)
- **OpenZeppelin**: Classic OpenZeppelin proxy pattern
- **Beacon**: Beacon proxy pattern

When a proxy is detected, the app attempts to fetch and use the implementation contract's ABI.

### Simulation

Before sending a transaction, you can simulate it using viem's `simulateContract`:
- **Free**: No paid services required
- **Instant**: See if the transaction would succeed
- **Gas estimation**: Get estimated gas costs
- **Error messages**: See decoded revert reasons

## Troubleshooting

### "Contract ABI not verified"
The contract must be verified on the block explorer. Unverified contracts cannot be interacted with through this interface.

### "ENS not supported on this network"
ENS resolution only works on Ethereum mainnet and Sepolia. Use checksummed addresses on other networks.

### Rate limiting
Without API keys, you may hit rate limits on block explorer APIs. Add API keys in `.env.local` for higher limits.

### Transaction simulation fails
Some transactions require specific blockchain state or may have anti-bot protections. Simulation failure doesn't always mean the transaction would fail, but proceed with caution.

## License

MIT

## Contributing

Contributions welcome! This is a minimal MVP focused on core functionality. Priority areas for contribution:
- Additional chain support
- More parameter type heuristics
- UX improvements
- Bug fixes

## Security

⚠️ **Important**: 
- Always verify transaction details before signing
- Be extra careful with dangerous functions (ownership, upgrades)
- Use on testnets first when trying new contracts
- This tool is provided as-is with no warranties

