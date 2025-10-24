# API Keys Setup Guide

**Important:** Etherscan's v2 API requires API keys to function. Without them, you'll see "Missing/Invalid API Key" errors.

## Quick Setup

1. Create a `.env.local` file in the project root
2. Add your API keys (get them from the links below)
3. Restart the dev server

## Getting API Keys

All these APIs are **FREE** for basic usage:

### Ethereum Mainnet & Sepolia
- Visit: https://etherscan.io/myapikey
- Sign up for free account
- Copy your API key
- Add to `.env.local`: `ETHERSCAN_KEY=your_key_here`

### Base
- Visit: https://basescan.org/myapikey  
- Add to `.env.local`: `BASESCAN_KEY=your_key_here`

### Arbitrum
- Visit: https://arbiscan.io/myapikey
- Add to `.env.local`: `ARBISCAN_KEY=your_key_here`

### Optimism
- Visit: https://optimistic.etherscan.io/myapikey
- Add to `.env.local`: `OPTIMISTIC_ETHERSCAN_KEY=your_key_here`

### Polygon
- Visit: https://polygonscan.com/myapikey
- Add to `.env.local`: `POLYGONSCAN_KEY=your_key_here`

### BSC (Binance Smart Chain)
- Visit: https://bscscan.com/myapikey
- Add to `.env.local`: `BSCSCAN_KEY=your_key_here`

### Avalanche & Fuji Testnet
- Visit: https://snowtrace.io/myapikey
- Add to `.env.local`: `SNOWTRACE_KEY=your_key_here`

## Example `.env.local` File

```bash
# Etherscan v2 API Keys
ETHERSCAN_KEY=ABC123XYZ789
BASESCAN_KEY=ABC123XYZ789
ARBISCAN_KEY=ABC123XYZ789
OPTIMISTIC_ETHERSCAN_KEY=ABC123XYZ789
POLYGONSCAN_KEY=ABC123XYZ789
BSCSCAN_KEY=ABC123XYZ789
SNOWTRACE_KEY=ABC123XYZ789
```

**Tip:** Most of these explorers are run by the same company, so one API key often works across multiple chains! Try using your Etherscan key for all of them first.

## Rate Limits

Free API keys typically allow:
- **5 requests per second**
- **100,000 requests per day**

This is more than enough for development and personal use!

## After Setup

1. Save your `.env.local` file
2. Restart the dev server: Press `Ctrl+C` and run `npm run dev` again
3. Try loading a contract - it should work now! 🎉

## Test It

Try loading USDC on Ethereum:
- Address: `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Network: Ethereum Mainnet

