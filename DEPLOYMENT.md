# Deployment Guide

## Quick Deploy to Vercel

1. **Push to GitHub:**
```bash
git init
git add .
git commit -m "Initial commit: Human Write Contract"
git branch -M main
git remote add origin your-repo-url
git push -u origin main
```

2. **Deploy to Vercel:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Import Project"
   - Select your GitHub repository
   - Vercel will auto-detect Next.js
   - Click "Deploy"

3. **Add Environment Variables (Optional but recommended):**
   - In Vercel dashboard → Settings → Environment Variables
   - Add your explorer API keys:
     - `NEXT_PUBLIC_ETHERSCAN_KEY`
     - `NEXT_PUBLIC_BASESCAN_KEY`
     - `NEXT_PUBLIC_ARBISCAN_KEY`
     - etc.
   - Redeploy after adding variables

## Deploy to Netlify

1. **Build settings:**
   - Build command: `npm run build`
   - Publish directory: `.next`

2. **Install Netlify Next.js plugin:**
```bash
npm install @netlify/plugin-nextjs
```

3. **Create `netlify.toml`:**
```toml
[build]
  command = "npm run build"
  publish = ".next"

[[plugins]]
  package = "@netlify/plugin-nextjs"
```

4. **Deploy:**
   - Push to GitHub
   - Connect repository in Netlify
   - Add environment variables in Netlify dashboard

## Self-Hosted (Docker)

1. **Create `Dockerfile`:**
```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
COPY --from=builder /app/next.config.js ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json

EXPOSE 3000
CMD ["npm", "start"]
```

2. **Build and run:**
```bash
docker build -t human-write-contract .
docker run -p 3000:3000 human-write-contract
```

## Environment Variables for Production

**Required:** None (app works with public RPCs)

**Recommended:**
- Block explorer API keys for higher rate limits
- Custom RPC endpoints for better reliability

**To add in production:**
1. Copy `.env.local.example` to `.env.local`
2. Fill in your keys
3. In Vercel/Netlify: Add in dashboard under Environment Variables

## Performance Optimization

### 1. Add Custom RPCs
Use dedicated RPC providers for better performance:
- [Alchemy](https://www.alchemy.com/)
- [Infura](https://www.infura.io/)
- [QuickNode](https://www.quicknode.com/)

### 2. Add Explorer API Keys
Get free keys from all block explorers to avoid rate limiting.

### 3. Enable Caching
The app uses React Query for client-side caching, which helps reduce API calls.

## Security Considerations

### What's Safe
- All wallet interactions use wagmi/viem (industry standard)
- No private keys are ever exposed to the app
- All transactions require wallet approval
- Simulation happens locally (no data sent to third parties)

### What to Monitor
- Users should verify contract addresses
- Users should test on testnets first
- Dangerous functions show extra warnings
- Always simulate before sending

### Rate Limiting
Without API keys:
- ~5 requests/second to block explorers
- May hit limits with heavy usage
- Add API keys in production

## Troubleshooting Deployment

### Build fails with BigInt error
- Ensure `tsconfig.json` has `"target": "ES2020"`

### Wagmi/Viem warnings
- Normal warnings about optional dependencies (MetaMask SDK, WalletConnect)
- These don't affect functionality

### Environment variables not working
- Must start with `NEXT_PUBLIC_` for client-side access
- Restart dev server after adding variables
- In production, add through platform dashboard

## Monitoring

### Vercel Analytics (Optional)
```bash
npm install @vercel/analytics
```

Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

## Updates

### To update dependencies:
```bash
npm update
npm run build  # Test build
```

### To update wagmi/viem:
```bash
npm install wagmi@latest viem@latest
```

## Support

- Check logs in Vercel/Netlify dashboard
- Test locally first: `npm run build && npm start`
- Verify environment variables are set correctly

