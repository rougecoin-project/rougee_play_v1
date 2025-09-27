'use client';

import { ConnectButton } from '@rainbow-me/rainbowkit';
import Image from 'next/image';
import Link from 'next/link';

export function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="mb-8">
            <h1 className="text-6xl font-black mb-4 retro-glow cursor">
              ROUGEE.PLAY
            </h1>
            <div className="text-sm text-gray-500 mb-8">
              {'>'} INITIALIZING WEB3 MUSIC PROTOCOL...
            </div>
            <div className="text-sm text-gray-500 mb-8">
              {'>'} CONNECTING TO DECENTRALIZED NETWORK...
            </div>
            <div className="text-sm text-gray-500 mb-8">
              {'>'} READY TO ACCEPT WALLET CONNECTION
            </div>
          </div>

          {/* Connect Button */}
          <div className="mb-16">
            <ConnectButton.Custom>
              {({ account, chain, openAccountModal, openChainModal, openConnectModal, mounted }) => {
                const ready = mounted;
                const connected = ready && account && chain;

                return (
                  <div
                    {...(!ready && {
                      'aria-hidden': true,
                      'style': {
                        opacity: 0,
                        pointerEvents: 'none',
                        userSelect: 'none',
                      },
                    })}
                  >
                    {(() => {
                      if (!connected) {
                        return (
                          <button
                            onClick={openConnectModal}
                            type="button"
                            className="bg-black border border-green-400 text-green-400 px-8 py-4 font-mono font-bold text-lg hover:bg-green-400 hover:text-black transition-colors duration-200 retro-border"
                          >
                            [CONNECT_WALLET]
                          </button>
                        );
                      }

                      return (
                        <div className="flex gap-3">
                          <Link 
                            href="/wallet" 
                            className="bg-black border border-green-400 text-green-400 px-4 py-2 font-mono text-sm hover:bg-green-400 hover:text-black transition-colors duration-200"
                          >
                            WALLET
                          </Link>
                          <button
                            onClick={openChainModal}
                            className="bg-black border border-green-400 text-green-400 px-4 py-2 font-mono text-sm retro-border"
                            type="button"
                          >
                            {chain.hasIcon && chain.iconUrl && (
                              <span className="inline-block w-3 h-3 mr-2">
                                {/* Using next/image with unoptimized to avoid remote domain config for ephemeral chain icons */}
                                <Image
                                  alt={chain.name ?? 'Chain icon'}
                                  src={chain.iconUrl}
                                  width={12}
                                  height={12}
                                  unoptimized
                                  className="w-3 h-3"
                                />
                              </span>
                            )}
                            {chain.name}
                          </button>

                          <button
                            onClick={openAccountModal}
                            type="button"
                            className="bg-black border border-green-400 text-green-400 px-4 py-2 font-mono text-sm retro-border"
                          >
                            {account.displayName}
                          </button>
                        </div>
                      );
                    })()}
                  </div>
                );
              }}
            </ConnectButton.Custom>
          </div>
        </div>

        {/* Features Grid */}
        <div className="grid md:grid-cols-3 gap-8 max-w-4xl mx-auto">
          <TerminalCard
            icon="[💰]"
            title="WEB3_NATIVE"
            lines={[
              "> METAMASK INTEGRATION",
              "> BASE WALLET SUPPORT",
              "> DECENTRALIZED AUTH"
            ]}
          />
          <TerminalCard
            icon="[🎵]"
            title="UPLOAD_MUSIC"
            lines={[
              "> HIGH QUALITY AUDIO",
              "> IPFS STORAGE",
              "> ON-CHAIN METADATA"
            ]}
          />
          <TerminalCard
            icon="[⚡]"
            title="DISCOVER_PLAY"
            lines={[
              "> STREAM DIRECT",
              "> NO INTERMEDIARIES", 
              "> ARTISTS FIRST"
            ]}
          />
        </div>

        {/* Footer */}
        <div className="text-center mt-16 text-xs text-gray-600">
          <div>{'>'} PROTOCOL_VERSION: 1.0.0</div>
          <div>{'>'} STATUS: ONLINE</div>
          <div>{'>'} NODES_CONNECTED: 1337</div>
        </div>
      </div>
    </div>
  );
}

function TerminalCard({ icon, title, lines }: { icon: string, title: string, lines: string[] }) {
  return (
    <div className="bg-black border border-gray-700 p-6 font-mono text-sm hover:border-green-400 transition-colors duration-300">
      <div className="text-pink-500 text-lg mb-2">{icon}</div>
      <div className="text-green-400 font-bold mb-4 text-xs">{title}</div>
      {lines.map((line, i) => (
        <div key={i} className="text-gray-400 text-xs mb-1">{line}</div>
      ))}
    </div>
  );
}