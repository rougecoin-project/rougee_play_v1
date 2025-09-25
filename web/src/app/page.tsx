'use client';

import { useAccount } from 'wagmi';
import { UploadPage } from '@/components/UploadPage';
import { LandingPage } from '@/components/LandingPage';

export default function Home() {
  const { isConnected } = useAccount();

  return (
    <main className="min-h-screen bg-black">
      <div className="relative">
        {isConnected ? <UploadPage /> : <LandingPage />}
      </div>
    </main>
  );
}
