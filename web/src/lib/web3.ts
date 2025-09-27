import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';
import { http } from 'wagmi';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// QuickNode Base RPC endpoint
const quickNodeBaseRpc = process.env.NEXT_PUBLIC_QUICKNODE_BASE_RPC || 'https://base-mainnet.g.alchemy.com/v2/demo';

// Configure with proper Base transport
export const config = getDefaultConfig({
  appName: 'Rougee Play',
  projectId: projectId || 'demo-project-id',
  chains: [base, baseSepolia, mainnet, sepolia],
  transports: {
    [base.id]: http(quickNodeBaseRpc),
    [baseSepolia.id]: http(),
    [mainnet.id]: http(),
    [sepolia.id]: http(),
  },
  ssr: true,
});