'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { WagmiProvider } from 'wagmi';
import { wagmiConfig } from '@/lib/wagmi-config';
import { useState } from 'react';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <WagmiProvider config={wagmiConfig}>
      <QueryClientProvider client={queryClient}>
        {children}
        <Toaster 
          position="top-right" 
          theme="dark"
          richColors
          closeButton
          toastOptions={{
            style: {
              background: 'rgb(17 24 39)',
              border: '1px solid rgb(55 65 81)',
              color: 'rgb(229 231 235)',
            },
          }}
        />
      </QueryClientProvider>
    </WagmiProvider>
  );
}

