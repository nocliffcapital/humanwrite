# Quick Start Guide

## Installation & Setup

1. **Install dependencies:**
```bash
npm install
```

2. **Run the development server:**
```bash
npm run dev
```

3. **Open your browser:**
Navigate to [http://localhost:3000](http://localhost:3000)

## First Test

Try loading a verified contract:

### Example 1: DAI Token (Ethereum Mainnet)
- **Address:** `0x6B175474E89094C44Da98b954EedeAC495271d0F`
- **Network:** Ethereum
- **What to test:**
  - View `name()`, `symbol()`, `decimals()` in Key Reads
  - Try the `approve()` function with token decimals converter
  - Test the unit converter: enter "100" with "Token (18d)" selected, see it convert to raw value

### Example 2: Any ERC-20 on Base
- **Network:** Base
- **Find a verified token** on BaseScan
- **What to test:**
  - Load the contract
  - Connect your wallet
  - Simulate a transaction before sending

### Example 3: Test ENS Resolution (Ethereum/Sepolia)
- **Address:** `vitalik.eth`
- **Network:** Ethereum
- **What to test:**
  - ENS resolution to address
  - Load the resolved contract

## Key Features to Test

### 1. Unit Converters
- **Token amounts:** Try entering "100" for an ERC-20's `approve()` function
  - Switch between Raw / Wei / Gwei / Ether / Token decimals tabs
  - Watch the raw value update in real-time

### 2. Basis Points Converter
- If a contract has a `setFeeBps()` or similar:
  - Enter "1.25" in the % tab
  - See it convert to 125 in raw

### 3. Timestamp Converter
- For functions with `deadline` or `unlockTime` parameters:
  - Use the date/time picker
  - See Unix timestamp in raw value

### 4. Proxy Detection
- Load a proxy contract (e.g., USDC or USDT)
- Look for the yellow "Proxy Contract Detected" banner
- Verify it shows the implementation address

### 5. Dangerous Function Protection
- Try a contract with `transferOwnership()` or `upgradeTo()`
- Click "Send Transaction"
- You'll see a red confirmation modal requiring you to type "CONFIRM"

### 6. Simulation
- Connect your wallet
- Fill in parameters for any function
- Click "Simulate" to test before sending
- See success (with gas estimate) or failure (with error message)

## Common Issues

### "Contract ABI not verified"
- The contract must be verified on the block explorer
- Try a different contract or verify yours first

### "ENS not supported on this network"
- ENS only works on Ethereum mainnet and Sepolia
- Use a checksum address on other networks

### Wallet not connecting
- Make sure you have MetaMask or another Web3 wallet installed
- Check that your wallet supports the selected network

### Rate limiting
- Add explorer API keys in `.env.local` (see `.env.local.example`)
- Or wait a few seconds between requests

## Environment Variables (Optional)

Create `.env.local` for better performance:

```bash
# Recommended: Add explorer API keys for higher rate limits
NEXT_PUBLIC_ETHERSCAN_KEY=your_key_here
NEXT_PUBLIC_BASESCAN_KEY=your_key_here
# ... see .env.local.example for full list

# Optional: Custom RPC endpoints
NEXT_PUBLIC_ETH_RPC=https://your-rpc-url
```

## Next Steps

1. **Read the main [README.md](./README.md)** for full documentation
2. **Test with your own contracts**
3. **Try dangerous functions** (on testnets first!)
4. **Explore proxy detection** with upgradeable contracts

## Need Help?

- Check the [README.md](./README.md) for detailed architecture
- Look at the inline comments in `/lib` for utility functions
- Review component code in `/components` for UI logic

## Safety Reminders

- ⚠️ Always test on **testnets** first (Sepolia, Fuji)
- ⚠️ **Simulate** transactions before sending
- ⚠️ **Double-check** all parameters, especially for dangerous functions
- ⚠️ Be careful with **ownership** and **upgrade** functions

