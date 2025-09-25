import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import { base, baseSepolia, mainnet, sepolia } from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Rougee Play',
  projectId: process.env.NEXT_PUBLIC_WALLETCONNECT_PROJECT_ID || 'your-project-id',
  chains: [base, baseSepolia, mainnet, sepolia],
  ssr: true,
});