import { NextRequest, NextResponse } from 'next/server';
import { getExplorerApiKey } from '@/lib/chains';

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  let url = searchParams.get('url');

  if (!url) {
    return NextResponse.json(
      { error: 'Missing url parameter' },
      { status: 400 }
    );
  }

  try {
    // Parse the URL to extract chainId and inject API key server-side
    const urlObj = new URL(url);
    const chainIdParam = urlObj.searchParams.get('chainid');
    
    // Determine chain ID from URL or default to Ethereum mainnet
    let chainId = 1; // Default to Ethereum
    if (chainIdParam) {
      chainId = parseInt(chainIdParam, 10);
    } else if (url.includes('etherscan.io')) {
      chainId = 1;
    } else if (url.includes('basescan.org')) {
      chainId = 8453;
    } else if (url.includes('arbiscan.io')) {
      chainId = 42161;
    } else if (url.includes('optimistic.etherscan.io')) {
      chainId = 10;
    } else if (url.includes('polygonscan.com')) {
      chainId = 137;
    } else if (url.includes('bscscan.com')) {
      chainId = 56;
    } else if (url.includes('snowtrace.io')) {
      chainId = 43114;
    }
    
    // Get API key server-side (secure!)
    const apiKey = getExplorerApiKey(chainId);
    
    if (apiKey && !urlObj.searchParams.has('apikey')) {
      // Inject API key server-side
      urlObj.searchParams.set('apikey', apiKey);
      url = urlObj.toString();
      console.log(`[API Route] Injected server-side API key for chain ${chainId}`);
    }

    // Fetch from the explorer API server-side (no CORS issues)
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });

    // Check if response is OK
    if (!response.ok) {
      return NextResponse.json(
        { 
          error: `Explorer API returned ${response.status}: ${response.statusText}` 
        },
        { status: response.status }
      );
    }

    // Check content type
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      const text = await response.text();
      if (text.includes('<!DOCTYPE') || text.includes('<html')) {
        return NextResponse.json(
          { 
            error: 'Explorer API returned HTML instead of JSON. The API may be under maintenance or the endpoint may be incorrect.' 
          },
          { status: 500 }
        );
      }
      return NextResponse.json(
        { error: `Explorer API returned unexpected content type: ${contentType}` },
        { status: 500 }
      );
    }

    const data = await response.json();
    
    // Return the data with proper headers
    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      },
    });
  } catch (error) {
    console.error('API Proxy Error:', error);
    return NextResponse.json(
      { 
        error: error instanceof Error ? error.message : 'Failed to fetch from explorer API' 
      },
      { status: 500 }
    );
  }
}

