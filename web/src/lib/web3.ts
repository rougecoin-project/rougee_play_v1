import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';

const projectId = process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID;

// Only configure if we have a real project ID
export const config = getDefaultConfig({
  appName: 'Rougee Play',
  projectId: projectId || 'demo-project-id', // Fallback for development
  chains: [base, baseSepolia, mainnet, sepolia],
  ssr: true,
});