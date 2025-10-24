import { type PublicClient, type Address, getAddress } from 'viem';

// EIP-1967 storage slots
const EIP1967_IMPLEMENTATION_SLOT =
  '0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc';
const EIP1967_BEACON_SLOT =
  '0xa3f0ad74e5423aebfd80d3ef4346578335a9a72aeaee59ff6cb3582b35133d50';

// EIP-1822 UUPS storage slot
const EIP1822_IMPLEMENTATION_SLOT =
  '0xc5f16f0fcc639fa48a6947836d9850f504798523bf8c9a3a87d5876cf622bcf7';

// OpenZeppelin pattern (keccak256("org.zeppelinos.proxy.implementation") - 1)
const OZ_IMPLEMENTATION_SLOT =
  '0x7050c9e0f4ca769c69bd3a8ef740bc37934f8e2c036e5a723fd8ee048ed3f8c3';

export interface ProxyInfo {
  isProxy: boolean;
  implementation?: Address;
  proxyType?: 'EIP-1967' | 'EIP-1822' | 'OpenZeppelin' | 'Beacon' | 'Unknown';
}

// Try to detect proxy pattern by reading storage slots
export async function detectProxy(
  client: PublicClient,
  address: Address
): Promise<ProxyInfo> {
  try {
    // Try EIP-1967 implementation slot
    const eip1967Impl = await client.getStorageAt({
      address,
      slot: EIP1967_IMPLEMENTATION_SLOT as `0x${string}`,
    });

    if (eip1967Impl && eip1967Impl !== '0x' && BigInt(eip1967Impl) !== 0n) {
      const implAddress = getAddress(`0x${eip1967Impl.slice(-40)}`);
      return {
        isProxy: true,
        implementation: implAddress,
        proxyType: 'EIP-1967',
      };
    }

    // Try EIP-1822 UUPS slot
    const eip1822Impl = await client.getStorageAt({
      address,
      slot: EIP1822_IMPLEMENTATION_SLOT as `0x${string}`,
    });

    if (eip1822Impl && eip1822Impl !== '0x' && BigInt(eip1822Impl) !== 0n) {
      const implAddress = getAddress(`0x${eip1822Impl.slice(-40)}`);
      return {
        isProxy: true,
        implementation: implAddress,
        proxyType: 'EIP-1822',
      };
    }

    // Try OpenZeppelin pattern
    const ozImpl = await client.getStorageAt({
      address,
      slot: OZ_IMPLEMENTATION_SLOT as `0x${string}`,
    });

    if (ozImpl && ozImpl !== '0x' && BigInt(ozImpl) !== 0n) {
      const implAddress = getAddress(`0x${ozImpl.slice(-40)}`);
      return {
        isProxy: true,
        implementation: implAddress,
        proxyType: 'OpenZeppelin',
      };
    }

    // Try EIP-1967 Beacon slot
    const beaconSlot = await client.getStorageAt({
      address,
      slot: EIP1967_BEACON_SLOT as `0x${string}`,
    });

    if (beaconSlot && beaconSlot !== '0x' && BigInt(beaconSlot) !== 0n) {
      const beaconAddress = getAddress(`0x${beaconSlot.slice(-40)}`);
      // For beacon proxies, we'd need to call implementation() on the beacon
      // For now, just mark as beacon proxy
      return {
        isProxy: true,
        implementation: beaconAddress,
        proxyType: 'Beacon',
      };
    }

    return { isProxy: false };
  } catch (error) {
    console.error('Error detecting proxy:', error);
    return { isProxy: false };
  }
}

// Try to get implementation via implementation() function call
export async function getImplementationViaFunction(
  client: PublicClient,
  address: Address
): Promise<Address | null> {
  try {
    // Try calling implementation()
    const data = await client.call({
      to: address,
      data: '0x5c60da1b', // implementation() selector
    });

    if (data.data && data.data !== '0x' && data.data.length >= 66) {
      const implAddress = getAddress(`0x${data.data.slice(-40)}`);
      return implAddress;
    }
  } catch {
    // Ignore errors
  }

  return null;
}

// Main function to detect proxy with multiple strategies
export async function detectProxyFull(
  client: PublicClient,
  address: Address
): Promise<ProxyInfo> {
  // First try storage slots
  const storageResult = await detectProxy(client, address);
  if (storageResult.isProxy) {
    return storageResult;
  }

  // Try function call
  const implAddress = await getImplementationViaFunction(client, address);
  if (implAddress) {
    return {
      isProxy: true,
      implementation: implAddress,
      proxyType: 'Unknown',
    };
  }

  return { isProxy: false };
}

