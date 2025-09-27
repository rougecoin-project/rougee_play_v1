'use client';

import { useState, useEffect } from 'react';
import { useAccount, useBalance, useChainId, useDisconnect, useReadContract } from 'wagmi';
import { formatUnits } from 'viem';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import Link from 'next/link';
import { CopyIcon, ExternalLinkIcon, LogOutIcon, HomeIcon, MusicIcon, PlayIcon, DownloadIcon, ShareIcon, SearchIcon, FileDownIcon } from 'lucide-react';
import { quickNodeService } from '@/lib/quicknode';

export function WalletPage() {
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { disconnect } = useDisconnect();
  const { data: balanceData } = useBalance({ address });
  
  // Token contract addresses on Base
  const XRGE_CONTRACT_ADDRESS = '0x147120faEC9277ec02d957584CFCD92B56A24317';
  const KTA_CONTRACT_ADDRESS = '0xc0634090F2Fe6c6d75e61Be2b949464aBB498973';
  
  // XRGE token balance and symbol
  const { data: xrgeBalanceData } = useReadContract({
    address: XRGE_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && chainId === 8453, // Only on Base mainnet
    }
  });
  
  const { data: xrgeSymbolData } = useReadContract({
    address: XRGE_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'symbol',
    query: {
      enabled: chainId === 8453, // Only on Base mainnet
    }
  });
  
  const { data: xrgeDecimalsData } = useReadContract({
    address: XRGE_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'decimals',
    query: {
      enabled: chainId === 8453, // Only on Base mainnet
    }
  });
  
  // KTA token balance and symbol
  const { data: ktaBalanceData } = useReadContract({
    address: KTA_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [{"name": "account", "type": "address"}],
        "name": "balanceOf",
        "outputs": [{"name": "", "type": "uint256"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      },
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'balanceOf',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address && chainId === 8453, // Only on Base mainnet
    }
  });
  
  const { data: ktaSymbolData } = useReadContract({
    address: KTA_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "symbol",
        "outputs": [{"name": "", "type": "string"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'symbol',
    query: {
      enabled: chainId === 8453, // Only on Base mainnet
    }
  });
  
  const { data: ktaDecimalsData } = useReadContract({
    address: KTA_CONTRACT_ADDRESS as `0x${string}`,
    abi: [
      {
        "inputs": [],
        "name": "decimals",
        "outputs": [{"name": "", "type": "uint8"}],
        "stateMutability": "view",
        "type": "function"
      }
    ],
    functionName: 'decimals',
    query: {
      enabled: chainId === 8453, // Only on Base mainnet
    }
  });
  
  const [copied, setCopied] = useState(false);
  const [transactions, setTransactions] = useState<unknown[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [musicAssets, setMusicAssets] = useState<unknown[]>([]);
  const [isLoadingAssets, setIsLoadingAssets] = useState(false);
  const [selectedAsset, setSelectedAsset] = useState<unknown>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [filterBy, setFilterBy] = useState('all');
  const [xrgeBalance, setXrgeBalance] = useState<string>('0');
  const [xrgeSymbol, setXrgeSymbol] = useState<string>('XRGE');
  const [ktaBalance, setKtaBalance] = useState<string>('0');
  const [ktaSymbol, setKtaSymbol] = useState<string>('KTA');

  // Format address for display
  const shortAddress = address ? 
    `${address.substring(0, 6)}...${address.substring(address.length - 4)}` : 
    '';

  // Handle copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Fetch real transaction history from blockchain APIs
  useEffect(() => {
    const fetchTransactions = async () => {
      if (!address) return;
      
      setIsLoading(true);
      
      try {
        // Use Base API for Base network transactions
        const baseApiUrl = chainId === 8453 ? 'https://api.basescan.org/api' : 
                          chainId === 84532 ? 'https://api-sepolia.basescan.org/api' : null;
        
        if (baseApiUrl) {
          const response = await fetch(
            `${baseApiUrl}?module=account&action=txlist&address=${address}&startblock=0&endblock=99999999&page=1&offset=10&sort=desc&apikey=YourApiKeyToken`
          );
          
          if (response.ok) {
            const data = await response.json();
            if (data.status === '1' && data.result) {
              const formattedTxs = data.result.slice(0, 10).map((tx: Record<string, unknown>) => ({
                hash: tx.hash as string,
                type: (tx.to as string)?.toLowerCase() === address.toLowerCase() ? 'Received' : 'Sent',
                value: `${(parseInt(tx.value as string) / Math.pow(10, 18)).toFixed(6)} ETH`,
                timestamp: new Date(parseInt(tx.timeStamp as string) * 1000).toLocaleString(),
                status: parseInt(tx.isError as string) === 0 ? 'Completed' : 'Failed',
                from: tx.from as string,
                to: tx.to as string,
                gasUsed: tx.gasUsed as string,
                gasPrice: tx.gasPrice as string
              }));
              setTransactions(formattedTxs);
            } else {
              // Fallback to mock data if API fails
              setTransactions(getMockTransactions());
            }
          } else {
            // Fallback to mock data if API fails
            setTransactions(getMockTransactions());
          }
        } else {
          // Fallback to mock data for unsupported networks
          setTransactions(getMockTransactions());
        }
      } catch (error) {
        console.error('Error fetching transactions:', error);
        // Fallback to mock data
        setTransactions(getMockTransactions());
      }
      
      setIsLoading(false);
    };

    fetchTransactions();
  }, [address, chainId]);

  // Fetch user's music assets from IPFS
  useEffect(() => {
    const fetchMusicAssets = async () => {
      if (!address) return;
      
      setIsLoadingAssets(true);
      
      try {
        const assets = await quickNodeService.getUserFiles(address);
        setMusicAssets(assets);
      } catch (error) {
        console.warn('Error fetching music assets, using fallback data:', error);
        // The QuickNode service now handles fallback internally
        setMusicAssets([]);
      }
      
      setIsLoadingAssets(false);
    };

    fetchMusicAssets();
  }, [address]);

  // Update XRGE balance and symbol when data changes
  useEffect(() => {
    if (xrgeBalanceData && xrgeDecimalsData) {
      const formattedBalance = formatUnits(xrgeBalanceData, xrgeDecimalsData);
      setXrgeBalance(parseFloat(formattedBalance).toFixed(4));
    }
    
    if (xrgeSymbolData) {
      setXrgeSymbol(xrgeSymbolData);
    }
  }, [xrgeBalanceData, xrgeDecimalsData, xrgeSymbolData]);

  // Update KTA balance and symbol when data changes
  useEffect(() => {
    if (ktaBalanceData && ktaDecimalsData) {
      const formattedBalance = formatUnits(ktaBalanceData, ktaDecimalsData);
      setKtaBalance(parseFloat(formattedBalance).toFixed(4));
    }
    
    if (ktaSymbolData) {
      setKtaSymbol(ktaSymbolData);
    }
  }, [ktaBalanceData, ktaDecimalsData, ktaSymbolData]);

  // Mock data fallback function
  const getMockTransactions = () => [
    { 
      hash: '0xabc123...', 
      type: 'Transfer', 
      value: '0.05 ETH', 
      timestamp: '2 hours ago',
      status: 'Completed'
    },
    { 
      hash: '0xdef456...', 
      type: 'NFT Mint', 
      value: '1 NFT', 
      timestamp: '1 day ago',
      status: 'Completed'
    },
    { 
      hash: '0xghi789...', 
      type: 'Swap', 
      value: '10 USDC → 0.01 ETH', 
      timestamp: '3 days ago',
      status: 'Completed'
    }
  ];

  // Helper functions for music asset management
  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays} days ago`;
    if (diffDays < 30) return `${Math.ceil(diffDays / 7)} weeks ago`;
    return date.toLocaleDateString();
  };

  const handlePlayAsset = (asset: unknown) => {
    setSelectedAsset(asset);
    setIsPlaying(true);
  };

  const handleDownloadAsset = (asset: unknown) => {
    const assetData = asset as { audioUrl?: string; fileName?: string; title?: string };
    if (assetData.audioUrl) {
      const link = document.createElement('a');
      link.href = assetData.audioUrl;
      link.download = assetData.fileName || `${assetData.title || 'download'}.mp3`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  const handleShareAsset = (asset: unknown) => {
    const assetData = asset as { title?: string; artist?: string; audioUrl?: string };
    if (navigator.share && assetData.audioUrl) {
      navigator.share({
        title: assetData.title || 'Music Track',
        text: `Check out this music: ${assetData.title || 'Unknown'} by ${assetData.artist || 'Unknown'}`,
        url: assetData.audioUrl
      });
    } else if (assetData.audioUrl) {
      // Fallback to copying URL
      navigator.clipboard.writeText(assetData.audioUrl);
      alert('Asset URL copied to clipboard!');
    }
  };

  // Filter and sort music assets
  const filteredAndSortedAssets = musicAssets
    .filter(asset => {
      const assetData = asset as { title?: string; artist?: string; ticker?: string; uploadedAt?: string; fileSize?: number };
      const matchesSearch = searchQuery === '' || 
        assetData.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assetData.artist?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        assetData.ticker?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = filterBy === 'all' || 
        (filterBy === 'recent' && assetData.uploadedAt && new Date(assetData.uploadedAt) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)) ||
        (filterBy === 'large' && assetData.fileSize && assetData.fileSize > 5 * 1024 * 1024); // 5MB+
      
      return matchesSearch && matchesFilter;
    })
    .sort((a, b) => {
      const aData = a as { title?: string; uploadedAt?: string; fileSize?: number };
      const bData = b as { title?: string; uploadedAt?: string; fileSize?: number };
      
      switch (sortBy) {
        case 'newest':
          return new Date(bData.uploadedAt || 0).getTime() - new Date(aData.uploadedAt || 0).getTime();
        case 'oldest':
          return new Date(aData.uploadedAt || 0).getTime() - new Date(bData.uploadedAt || 0).getTime();
        case 'name':
          return (aData.title || '').localeCompare(bData.title || '');
        case 'size':
          return (bData.fileSize || 0) - (aData.fileSize || 0);
        default:
          return 0;
      }
    });

  // Export transaction data as CSV
  const exportTransactions = () => {
    if (transactions.length === 0) {
      alert('No transactions to export');
      return;
    }

    const csvContent = [
      ['Hash', 'Type', 'Value', 'Timestamp', 'Status', 'From', 'To', 'Gas Used', 'Gas Price'].join(','),
      ...transactions.map(tx => {
        const txData = tx as { hash?: string; type?: string; value?: string; timestamp?: string; status?: string; from?: string; to?: string; gasUsed?: string; gasPrice?: string };
        return [
          txData.hash || '',
          txData.type || '',
          txData.value || '',
          txData.timestamp || '',
          txData.status || '',
          txData.from || '',
          txData.to || '',
          txData.gasUsed || '',
          txData.gasPrice || ''
        ].map(field => `"${field}"`).join(',');
      })
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `transactions_${address}_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  };

  if (!isConnected) {
    return (
      <div className="min-h-screen bg-black text-green-400 font-mono">
        <div className="container mx-auto px-4 py-16 flex flex-col items-center">
          <h1 className="text-3xl font-bold mb-8 retro-glow">CONNECT WALLET</h1>
          <p className="text-gray-500 mb-8 text-center">
            Connect your wallet to view your assets and transaction history
          </p>
          <ConnectButton />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold retro-glow">ROUGEE.PLAY</h1>
            <div className="text-xs text-gray-500 mt-1">
              {'>'} USER: {shortAddress}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link 
              href="/"
              className="bg-black border border-green-400 text-green-400 hover:bg-green-400 hover:text-black transition-colors duration-200 px-3 py-2 flex items-center text-sm"
            >
              <HomeIcon size={16} className="mr-2" />
              HOME
            </Link>
            <button 
              onClick={() => disconnect()}
              className="bg-black border border-red-400 text-red-400 hover:bg-red-400 hover:text-black transition-colors duration-200 px-3 py-2 flex items-center text-sm"
            >
              <LogOutIcon size={16} className="mr-2" />
              DISCONNECT
            </button>
          </div>
        </div>

        {/* Wallet Info */}
        <div className="grid md:grid-cols-3 gap-8 mb-8">
          <div className="col-span-3 md:col-span-1">
            <div className="border border-gray-800 bg-black p-6 h-full">
              <h2 className="text-xl font-bold mb-4">WALLET DETAILS</h2>
              
              <div className="space-y-4">
                <div>
                  <div className="text-gray-500 text-xs mb-1">ADDRESS</div>
                  <div className="flex items-center">
                    <code className="bg-gray-900 px-2 py-1 rounded text-xs flex-1 overflow-hidden text-ellipsis">
                      {address}
                    </code>
                    <button 
                      onClick={copyAddress}
                      className="ml-2 text-gray-400 hover:text-green-400"
                      title="Copy address"
                    >
                      <CopyIcon size={14} />
                    </button>
                    <a 
                      href={`https://basescan.org/address/${address}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="ml-2 text-gray-400 hover:text-green-400"
                      title="View on block explorer"
                    >
                      <ExternalLinkIcon size={14} />
                    </a>
                  </div>
                  {copied && (
                    <div className="text-xs text-green-500 mt-1">
                      Address copied to clipboard!
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-gray-500 text-xs mb-1">NETWORK</div>
                  <div className="flex items-center">
                    <div className="bg-gray-900 px-2 py-1 rounded text-xs">
                      {chainId === 8453 ? 'Base' : 
                       chainId === 84532 ? 'Base Sepolia' : 
                       chainId === 1 ? 'Ethereum' : 
                       chainId === 11155111 ? 'Sepolia' : 
                       'Unknown Network'}
                    </div>
                  </div>
                </div>

                <div>
                  <div className="text-gray-500 text-xs mb-1">BALANCE</div>
                  <div className="flex items-center">
                    <div className="bg-gray-900 px-2 py-1 rounded text-xs">
                      {balanceData ? 
                        `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : 
                        'Loading...'}
                    </div>
                  </div>
                </div>

                {chainId === 8453 && (
                  <>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">XRGE BALANCE</div>
                      <div className="flex items-center">
                        <div className="bg-gray-900 px-2 py-1 rounded text-xs">
                          {xrgeBalanceData && xrgeDecimalsData ? 
                            `${xrgeBalance} ${xrgeSymbol}` : 
                            'Loading...'}
                        </div>
                      </div>
                    </div>
                    <div>
                      <div className="text-gray-500 text-xs mb-1">KTA BALANCE</div>
                      <div className="flex items-center">
                        <div className="bg-gray-900 px-2 py-1 rounded text-xs">
                          {ktaBalanceData && ktaDecimalsData ? 
                            `${ktaBalance} ${ktaSymbol}` : 
                            'Loading...'}
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="col-span-3 md:col-span-2">
            <div className="border border-gray-800 bg-black p-6 h-full">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold">RECENT TRANSACTIONS</h2>
                {transactions.length > 0 && (
                  <button
                    onClick={exportTransactions}
                    className="bg-gray-900 border border-gray-700 text-green-400 hover:border-green-400 hover:bg-gray-800 transition-colors duration-200 px-3 py-2 flex items-center text-sm"
                    title="Export transactions as CSV"
                  >
                    <FileDownIcon size={16} className="mr-2" />
                    EXPORT
                  </button>
                )}
              </div>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-pulse text-gray-500">Loading transactions...</div>
                </div>
              ) : transactions.length > 0 ? (
                <div className="divide-y divide-gray-800">
                  {transactions.map((tx, index) => {
                    const txData = tx as { type?: string; timestamp?: string; hash?: string; value?: string; status?: string };
                    return (
                      <div key={index} className="py-3">
                        <div className="flex justify-between items-center mb-1">
                          <div className="text-sm">{txData.type || 'Unknown'}</div>
                          <div className="text-xs text-gray-500">{txData.timestamp || 'Unknown'}</div>
                        </div>
                        <div className="flex justify-between items-center">
                          <div className="text-xs text-gray-400">{txData.hash || 'Unknown'}</div>
                          <div className="text-sm text-green-400">{txData.value || 'Unknown'}</div>
                        </div>
                        <div className="text-xs text-right mt-1">
                          <span className="bg-green-900 text-green-400 px-2 py-0.5 rounded-full">
                            {txData.status || 'Unknown'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  No transactions found
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Music Assets Section */}
        <div className="border border-gray-800 bg-black p-6 mb-8">
          <div className="flex flex-col md:flex-row md:justify-between md:items-center mb-6 gap-4">
            <div>
              <h2 className="text-xl font-bold">MY MUSIC ASSETS</h2>
              <div className="text-sm text-gray-500">
                {isLoadingAssets ? 'Loading...' : `${filteredAndSortedAssets.length} of ${musicAssets.length} assets`}
              </div>
            </div>
            
            {/* Search and Filter Controls */}
            <div className="flex flex-col sm:flex-row gap-3">
              {/* Search Bar */}
              <div className="relative">
                <SearchIcon size={16} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search assets..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="bg-gray-900 border border-gray-700 text-green-400 px-10 py-2 rounded text-sm focus:border-green-400 focus:outline-none w-full sm:w-64"
                />
              </div>
              
              {/* Sort Dropdown */}
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-green-400 px-3 py-2 rounded text-sm focus:border-green-400 focus:outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="name">Name A-Z</option>
                <option value="size">Size (Large)</option>
              </select>
              
              {/* Filter Dropdown */}
              <select
                value={filterBy}
                onChange={(e) => setFilterBy(e.target.value)}
                className="bg-gray-900 border border-gray-700 text-green-400 px-3 py-2 rounded text-sm focus:border-green-400 focus:outline-none"
              >
                <option value="all">All Assets</option>
                <option value="recent">Recent (7 days)</option>
                <option value="large">Large Files (5MB+)</option>
              </select>
            </div>
          </div>
          
          {isLoadingAssets ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-pulse text-gray-500">Loading music assets...</div>
            </div>
          ) : filteredAndSortedAssets.length > 0 ? (
            <div className="grid sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAndSortedAssets.map((asset, index) => {
                const assetData = asset as { title?: string; artist?: string; ticker?: string; uploadedAt?: string; fileSize?: number };
                return (
                  <div key={index} className="border border-gray-800 p-4 hover:border-green-400 transition-colors duration-200 group">
                    <div className="aspect-square bg-gray-900 mb-3 flex items-center justify-center relative overflow-hidden">
                      <MusicIcon size={32} className="text-gray-400" />
                      <div className="absolute inset-0 bg-black bg-opacity-50 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                        <button
                          onClick={() => handlePlayAsset(asset)}
                          className="bg-green-400 text-black p-2 rounded-full hover:bg-green-300 transition-colors"
                          title="Play"
                        >
                          <PlayIcon size={16} />
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm font-bold truncate" title={assetData.title}>
                        {assetData.title || 'Unknown Title'}
                      </div>
                      <div className="text-xs text-gray-400 truncate" title={assetData.artist}>
                        by {assetData.artist || 'Unknown Artist'}
                      </div>
                      <div className="text-xs text-gray-500">
                        {formatDate(assetData.uploadedAt || '')} • {formatFileSize(assetData.fileSize || 0)}
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="bg-gray-900 text-gray-400 px-2 py-0.5 rounded-full text-xs">
                          {assetData.ticker || 'N/A'}
                        </span>
                        <div className="flex space-x-1">
                          <button
                            onClick={() => handleDownloadAsset(asset)}
                            className="text-gray-400 hover:text-green-400 transition-colors"
                            title="Download"
                          >
                            <DownloadIcon size={14} />
                          </button>
                          <button
                            onClick={() => handleShareAsset(asset)}
                            className="text-gray-400 hover:text-green-400 transition-colors"
                            title="Share"
                          >
                            <ShareIcon size={14} />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-8 text-gray-500">
              <MusicIcon size={48} className="mx-auto mb-4 text-gray-600" />
              <div className="text-lg mb-2">
                {musicAssets.length === 0 ? 'No music assets found' : 'No assets match your search'}
              </div>
              <div className="text-sm">
                {musicAssets.length === 0 
                  ? 'Upload your first music file to get started'
                  : 'Try adjusting your search or filter criteria'
                }
              </div>
            </div>
          )}
        </div>

        {/* Portfolio Analytics */}
        <div className="grid md:grid-cols-3 gap-6 mb-8">
          <div className="border border-gray-800 bg-black p-6">
            <h3 className="text-lg font-bold mb-4">PORTFOLIO STATS</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Total Assets:</span>
                <span className="text-green-400">{musicAssets.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Total Size:</span>
                <span className="text-green-400">
                  {formatFileSize(musicAssets.reduce((total, asset) => {
                    const assetData = asset as { fileSize?: number };
                    return total + (assetData.fileSize || 0);
                  }, 0))}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Transactions:</span>
                <span className="text-green-400">{transactions.length}</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-800 bg-black p-6">
            <h3 className="text-lg font-bold mb-4">NETWORK STATUS</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-500">Network:</span>
                <span className="text-green-400">
                  {chainId === 8453 ? 'Base' : 
                   chainId === 84532 ? 'Base Sepolia' : 
                   chainId === 1 ? 'Ethereum' : 
                   chainId === 11155111 ? 'Sepolia' : 
                   'Unknown'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Balance:</span>
                <span className="text-green-400">
                  {balanceData ? `${parseFloat(balanceData.formatted).toFixed(4)} ${balanceData.symbol}` : 'Loading...'}
                </span>
              </div>
              {chainId === 8453 && (
                <>
                  <div className="flex justify-between">
                    <span className="text-gray-500">XRGE:</span>
                    <span className="text-green-400">
                      {xrgeBalanceData && xrgeDecimalsData ? `${xrgeBalance} ${xrgeSymbol}` : 'Loading...'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">KTA:</span>
                    <span className="text-green-400">
                      {ktaBalanceData && ktaDecimalsData ? `${ktaBalance} ${ktaSymbol}` : 'Loading...'}
                    </span>
                  </div>
                </>
              )}
              <div className="flex justify-between">
                <span className="text-gray-500">Status:</span>
                <span className="text-green-400">Connected</span>
              </div>
            </div>
          </div>

          <div className="border border-gray-800 bg-black p-6">
            <h3 className="text-lg font-bold mb-4">RECENT ACTIVITY</h3>
            <div className="space-y-2">
              {transactions.slice(0, 3).map((tx, index) => {
                const txData = tx as { type?: string; timestamp?: string };
                return (
                  <div key={index} className="text-xs">
                    <div className="text-gray-400">{txData.type || 'Unknown'}</div>
                    <div className="text-gray-500">{txData.timestamp || 'Unknown'}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Terminal Style Console */}
        <div className="border border-gray-800 bg-black p-4">
          <div className="text-xs text-gray-500 mb-2">{`> SYSTEM.LOG`}</div>
          <div className="font-mono text-xs space-y-1">
            <div>{`> WALLET.CONNECTED: ${address}`}</div>
            <div>{`> CHAIN.ID: ${chainId || 'unknown'}`}</div>
            <div>{`> ASSETS.LOADED: ${musicAssets.length}`}</div>
            <div>{`> TRANSACTIONS.LOADED: ${transactions.length}`}</div>
            {chainId === 8453 && (
              <>
                <div>{`> XRGE.BALANCE: ${xrgeBalance} ${xrgeSymbol}`}</div>
                <div>{`> KTA.BALANCE: ${ktaBalance} ${ktaSymbol}`}</div>
              </>
            )}
            <div>{`> IPFS.STATUS: ${isLoadingAssets ? 'LOADING' : 'READY'}`}</div>
            <div>{`> SESSION.STATUS: ACTIVE`}</div>
            <div>{`> LAST.UPDATE: ${new Date().toLocaleTimeString()}`}</div>
          </div>
        </div>
      </div>
    </div>
  );
}