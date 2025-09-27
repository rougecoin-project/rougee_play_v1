'use client';

import { useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { quickNodeService, MusicMetadata } from '@/lib/quicknode';
import { ModernAudioPlayer } from './ModernAudioPlayer';
import { WinampTrackList } from './WinampTrackList';
import { FuturisticLoader } from './FuturisticLoader';
import Link from 'next/link';

// Verified wallet addresses that can upload for FREE
const VERIFIED_WALLETS = [
  '0x5a12C4a5995F4585bDA7BE7ddda1A110e0b526Fc', // Add your verified addresses here
  '0x742d35Cc6481C4d0a3B346b5F57A6A9b8aF43e5F', // Example addresses
  '0x1234567890123456789012345678901234567890', // Add more as needed
];

// Launch Song fee (PumpFun style)
const LAUNCH_FEE = '0.001'; // 0.001 ETH on Base (~$2-3)

export function UploadPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'launch-song' | 'upload' | 'my-files' | 'all-files' | 'artist-signup'>('all-files');
  
  // Check if current wallet is verified for free uploads
  const isVerifiedWallet = address && VERIFIED_WALLETS.includes(address.toLowerCase());
  const [uploadTier, setUploadTier] = useState<'launch' | 'verified'>('launch');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedCover, setSelectedCover] = useState<File | null>(null);
  const [coverPreview, setCoverPreview] = useState<string | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<{
    hash: string;
    url: string;
    musicHash: string;
    musicUrl: string;
    coverHash?: string;
    coverUrl?: string;
  } | null>(null);
  const [userFiles, setUserFiles] = useState<any[]>([]);
  const [networkFiles, setNetworkFiles] = useState<any[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
  const [selectedNetworkTrack, setSelectedNetworkTrack] = useState<any | null>(null);
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number | null>(null);
  const [selectedUserTrack, setSelectedUserTrack] = useState<any | null>(null);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [isLoadingUserFiles, setIsLoadingUserFiles] = useState(false);
  
  // Launch Song state
  const [checkingCopyright, setCheckingCopyright] = useState(false);
  const [copyrightCheckPassed, setCopyrightCheckPassed] = useState(false);
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  
  // Artist Application Form state
  const [artistApplication, setArtistApplication] = useState({
    artistName: '',
    firstName: '',
    lastName: '',
    email: '',
    musicLinks: '',
    additionalInfo: ''
  });
  const [submittingApplication, setSubmittingApplication] = useState(false);
  
  // Form state
  const [metadata, setMetadata] = useState<MusicMetadata>({
    title: '',
    artist: '',
    ticker: '',
    description: '',
    album: '',
    genre: '',
    releaseDate: ''
  });
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const coverInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), `> ${message}`]);
  };

  // ACR Cloud copyright detection (placeholder - you'll need to implement this)
  const checkCopyright = async (audioFile: File): Promise<boolean> => {
    addLog('CHECKING COPYRIGHT WITH ACR CLOUD...');
    setCheckingCopyright(true);
    
    try {
      // Simulate ACR Cloud API call
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // For demo purposes, randomly pass/fail (90% pass rate)
      const isOriginal = Math.random() > 0.1;
      
      if (!isOriginal) {
        addLog('❌ COPYRIGHTED CONTENT DETECTED');
        addLog('UPLOAD BLOCKED - USE ORIGINAL MUSIC ONLY');
        return false;
      }
      
      addLog('✅ COPYRIGHT CHECK PASSED');
      addLog('ORIGINAL CONTENT VERIFIED');
      return true;
      
    } catch (error) {
      addLog('ERROR: COPYRIGHT CHECK FAILED');
      return false;
    } finally {
      setCheckingCopyright(false);
    }
  };

  // Payment processing for Launch Song
  const processLaunchPayment = async (): Promise<boolean> => {
    addLog(`PROCESSING LAUNCH FEE: ${LAUNCH_FEE} ETH`);
    setPaymentProcessing(true);
    
    try {
      // Here you would integrate with Base network payment
      // For now, simulate payment processing
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addLog('✅ PAYMENT CONFIRMED');
      addLog('LAUNCHING SONG TO NETWORK...');
      return true;
      
    } catch (error) {
      addLog('❌ PAYMENT FAILED');
      return false;
    } finally {
      setPaymentProcessing(false);
    }
  };

  const handleArtistApplicationSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isConnected) {
      addLog('ERROR: WALLET NOT CONNECTED');
      return;
    }

    // Validate required fields
    if (!artistApplication.artistName || !artistApplication.firstName || 
        !artistApplication.lastName || !artistApplication.email) {
      addLog('ERROR: REQUIRED FIELDS MISSING');
      return;
    }

    setSubmittingApplication(true);
    addLog('SUBMITTING ARTIST APPLICATION...');

    try {
      // Here you would typically send to your backend/database
      // For now, we'll just log it and show success
      const applicationData = {
        ...artistApplication,
        walletAddress: address,
        submittedAt: new Date().toISOString()
      };
      
      console.log('Artist Application Submitted:', applicationData);
      
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      addLog('APPLICATION SUBMITTED SUCCESSFULLY!');
      addLog('YOU WILL BE CONTACTED WITHIN 24-48 HOURS');
      
      // Reset form
      setArtistApplication({
        artistName: '',
        firstName: '',
        lastName: '',
        email: '',
        musicLinks: '',
        additionalInfo: ''
      });
      
    } catch (error) {
      addLog('ERROR: FAILED TO SUBMIT APPLICATION');
      console.error('Application submission error:', error);
    } finally {
      setSubmittingApplication(false);
    }
  };

  const handleFileSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Only handle one file at a time
    
    if (!file.type.startsWith('audio/')) {
      addLog(`ERROR: ${file.name} - INVALID FILE TYPE`);
      return;
    }

    setSelectedFile(file);
    setShowMetadataForm(true);
    setCopyrightCheckPassed(false);
    addLog(`FILE SELECTED: ${file.name}`);
  };

  const handleCoverSelect = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0];
    
    if (!file.type.startsWith('image/')) {
      addLog(`ERROR: ${file.name} - INVALID IMAGE TYPE`);
      return;
    }

    setSelectedCover(file);
    
    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setCoverPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
    
    addLog(`COVER SELECTED: ${file.name}`);
  };

  const handleLaunchSongSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !isConnected) {
      addLog('ERROR: NO FILE OR WALLET NOT CONNECTED');
      return;
    }

    // Validate required fields
    if (!metadata.title || !metadata.artist || !metadata.ticker || !metadata.description) {
      addLog('ERROR: REQUIRED FIELDS MISSING');
      return;
    }

    setUploading(true);
    setUploadProgress(10);

    try {
      // Step 1: Copyright check
      const copyrightPassed = await checkCopyright(selectedFile);
      if (!copyrightPassed) {
        return;
      }
      setCopyrightCheckPassed(true);
      setUploadProgress(30);

      // Step 2: Process payment
      const paymentSuccess = await processLaunchPayment();
      if (!paymentSuccess) {
        return;
      }
      setUploadProgress(50);

      // Step 3: Upload to IPFS
      addLog('UPLOADING TO IPFS...');
      const result = await quickNodeService.uploadMusicFile(
        selectedFile,
        {
          ...metadata,
          owner: address || 'unknown',
          uploadedBy: address || 'unknown',
          tier: 'launch' // Mark as launch tier
        },
        selectedCover || undefined
      );

      setUploadProgress(100);
      addLog(`SUCCESS: SONG LAUNCHED!`);
      addLog(`MUSIC HASH: ${result.musicHash}`);
      setUploadResult(result);
      
    } catch (error) {
      addLog(`ERROR: LAUNCH FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const handleVerifiedUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !isConnected) {
      addLog('ERROR: NO FILE OR WALLET NOT CONNECTED');
      return;
    }

    if (!isVerifiedWallet) {
      addLog('ERROR: WALLET NOT VERIFIED FOR FREE UPLOADS');
      return;
    }

    // Validate required fields
    if (!metadata.title || !metadata.artist || !metadata.ticker || !metadata.description) {
      addLog('ERROR: REQUIRED FIELDS MISSING');
      return;
    }

    setUploading(true);
    setUploadProgress(25);
    addLog('INITIALIZING VERIFIED UPLOAD...');

    try {
      // Test QuickNode API connection first
      addLog('TESTING QUICKNODE IPFS API CONNECTION...');
      const connectionTest = await quickNodeService.testConnection();
      if (!connectionTest) {
        addLog('ERROR: QUICKNODE API CONNECTION FAILED');
        return;
      }
      addLog('QUICKNODE API CONNECTION OK');

      setUploadProgress(50);
      addLog('UPLOADING TO QUICKNODE IPFS...');

      const result = await quickNodeService.uploadMusicFile(
        selectedFile,
        {
          ...metadata,
          owner: address || 'unknown',
          uploadedBy: address || 'unknown',
          tier: 'verified' // Mark as verified tier
        },
        selectedCover || undefined
      );

      setUploadProgress(100);
      addLog(`SUCCESS: UPLOADED TO IPFS`);
      addLog(`METADATA HASH: ${result.hash}`);
      addLog(`MUSIC HASH: ${result.musicHash}`);
      if (result.coverHash) {
        addLog(`COVER HASH: ${result.coverHash}`);
      }
      setUploadResult(result);
      
    } catch (error) {
      addLog(`ERROR: UPLOAD FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCover(null);
    setCoverPreview(null);
    setShowMetadataForm(false);
    setUploadResult(null);
    setCopyrightCheckPassed(false);
    setMetadata({
      title: '',
      artist: '',
      ticker: '',
      description: '',
      album: '',
      genre: '',
      releaseDate: ''
    });
    addLog('FORM RESET');
  };

  // ... (continuing with the rest of the component - load functions, etc.)
  // This is a preview of the key changes needed for the Launch Song system

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-2xl font-bold text-green-400 glow-text">
              ROUGEE MUSIC PLATFORM
            </h1>
            <div className="text-xs text-gray-500 mt-1">
              DECENTRALIZED MUSIC DISTRIBUTION ON BASE
            </div>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm">
              <ConnectButton />
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-4">
            {[
              { key: 'all-files', label: 'NETWORK' },
              { key: 'my-files', label: 'MY_FILES' },
              { key: 'launch-song', label: 'LAUNCH_SONG' },
              { key: 'upload', label: 'VERIFIED_UPLOAD' },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActiveTab(key as typeof activeTab)}
                className={`px-4 py-2 text-xs font-mono border ${
                  activeTab === key
                    ? 'border-green-400 text-green-400 bg-green-400/10'
                    : 'border-gray-700 text-gray-500 hover:text-green-400 hover:border-green-400'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Content Area */}
        <div className="border border-gray-800 min-h-[400px]">
          {/* Launch Song Tab */}
          {activeTab === 'launch-song' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} LAUNCH SONG - PUMPFUN STYLE
              </div>
              
              <div className="bg-gradient-to-r from-green-400/10 via-green-300/10 to-green-400/10 border border-green-400/30 p-6 rounded-lg mb-6">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <div className="text-green-400 font-bold text-lg">🚀 LAUNCH YOUR SONG</div>
                    <div className="text-sm text-gray-300">Instant upload with copyright protection</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-400 font-bold text-xl">{LAUNCH_FEE} ETH</div>
                    <div className="text-xs text-gray-500">~$2-3 USD</div>
                  </div>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">✅</span>
                    <span>Instant Upload</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">🛡️</span>
                    <span>Copyright Protection</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-green-400">🌐</span>
                    <span>Immediate Distribution</span>
                  </div>
                </div>
              </div>

              {!showMetadataForm && !uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} SELECT AUDIO FILE TO LAUNCH
                  </div>
                  
                  <div
                    className="border-2 border-dashed border-green-400/50 p-12 text-center cursor-pointer hover:border-green-400 transition-colors mb-6 bg-green-400/5"
                    onClick={() => fileInputRef.current?.click()}
                  >
                    <div className="text-4xl mb-4">🚀</div>
                    <div className="text-sm text-green-400 mb-2 font-bold">LAUNCH YOUR SONG</div>
                    <div className="text-xs text-gray-600">MP3 | WAV | FLAC | AAC | OGG | M4A</div>
                    <div className="text-xs text-gray-500 mt-2">
                      Fee: {LAUNCH_FEE} ETH • Copyright checked • Instant live
                    </div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="audio/*"
                      className="hidden"
                      onChange={(e) => handleFileSelect(e.target.files)}
                    />
                  </div>
                </>
              )}

              {/* Launch Song Metadata Form */}
              {showMetadataForm && !uploading && !uploadResult && (
                <form onSubmit={handleLaunchSongSubmit} className="space-y-6">
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} LAUNCH: {selectedFile?.name}
                  </div>
                  
                  {/* Show copyright check status */}
                  {!copyrightCheckPassed && (
                    <div className="bg-yellow-900/20 border border-yellow-700 p-4 rounded">
                      <div className="text-yellow-400 text-sm font-mono mb-2">
                        ⚠️ COPYRIGHT CHECK REQUIRED
                      </div>
                      <div className="text-xs text-yellow-300">
                        Your song will be checked against copyrighted content before launch
                      </div>
                    </div>
                  )}

                  {copyrightCheckPassed && (
                    <div className="bg-green-900/20 border border-green-700 p-4 rounded">
                      <div className="text-green-400 text-sm font-mono mb-2">
                        ✅ COPYRIGHT CHECK PASSED
                      </div>
                      <div className="text-xs text-green-300">
                        Original content verified • Ready to launch
                      </div>
                    </div>
                  )}

                  {/* Metadata fields would go here - similar to current form */}
                  {/* ... */}

                  <button
                    type="submit"
                    disabled={!isConnected || uploading}
                    className="w-full bg-gradient-to-r from-green-400 via-green-300 to-green-400 text-black px-8 py-4 font-mono font-bold hover:from-green-300 hover:via-green-200 hover:to-green-300 disabled:from-gray-600 disabled:to-gray-500 disabled:text-gray-400 transition-all duration-200 shadow-lg shadow-green-400/30 hover:shadow-green-400/50 text-lg"
                  >
                    🚀 LAUNCH SONG ({LAUNCH_FEE} ETH)
                  </button>
                </form>
              )}

              {/* Launch processing states */}
              {(checkingCopyright || paymentProcessing || uploading) && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  {checkingCopyright && (
                    <FuturisticLoader text="CHECKING COPYRIGHT..." size="xl" variant="pulse" />
                  )}
                  {paymentProcessing && (
                    <FuturisticLoader text="PROCESSING PAYMENT..." size="xl" variant="bars" />
                  )}
                  {uploading && (
                    <FuturisticLoader text="LAUNCHING SONG..." size="xl" variant="circle" />
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verified Upload Tab (existing system) */}
          {activeTab === 'upload' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} VERIFIED ARTIST UPLOAD
              </div>
              
              {/* Wallet Verification Status */}
              <div className="mb-6 p-4 border rounded-lg border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-gray-300">VERIFIED STATUS:</span>
                  <span className={`text-sm font-mono font-bold ${
                    !isConnected 
                      ? 'text-gray-500' 
                      : isVerifiedWallet 
                        ? 'text-green-400' 
                        : 'text-red-400'
                  }`}>
                    {!isConnected 
                      ? '❌ NOT CONNECTED' 
                      : isVerifiedWallet 
                        ? '✅ VERIFIED - FREE UPLOADS' 
                        : '❌ NOT VERIFIED'
                    }
                  </span>
                </div>
                
                {isConnected && !isVerifiedWallet && (
                  <div className="text-xs text-blue-400 font-mono bg-blue-900/20 p-2 rounded border border-blue-800/30">
                    <div>💡 TIP: Use LAUNCH SONG for instant uploads with fee</div>
                    <div className="mt-1">Or apply below to become a verified RouGee artist</div>
                  </div>
                )}
                
                {isConnected && isVerifiedWallet && (
                  <div className="text-xs text-green-400 font-mono bg-green-900/20 p-2 rounded border border-green-800/30">
                    <div>🎵 VERIFIED ARTIST - UNLIMITED FREE UPLOADS</div>
                    <div className="mt-1">Connected: {address}</div>
                  </div>
                )}
              </div>

              {/* Rest of verified upload UI */}
              {/* ... */}
            </div>
          )}

          {/* Other tabs remain the same... */}
        </div>
      </div>
    </div>
  );
}
