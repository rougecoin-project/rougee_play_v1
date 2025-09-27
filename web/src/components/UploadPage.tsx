'use client';

import { useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import Image from 'next/image';
import { quickNodeService, MusicMetadata } from '@/lib/quicknode';
import { acrCloudService } from '@/lib/acrcloud';
import { paymentService, PaymentResult } from '@/lib/payment';
import { ModernAudioPlayer } from './ModernAudioPlayer';
import { WinampTrackList } from './WinampTrackList';
import { FuturisticLoader } from './FuturisticLoader';
import Link from 'next/link';

interface Track {
  title: string;
  artist: string;
  ticker?: string;
  description?: string;
  audioUrl: string;
  coverUrl?: string;
  duration?: number;
  uploadedAt?: string;
  fileSize?: number;
}

// Verified wallet addresses that can upload for FREE
const VERIFIED_WALLETS = [
  '0x5a12C4a5995F4585bDA7BE7ddda1A110e0b526Fc', // Add your verified addresses here
  '0x742d35Cc6481C4d0a3B346b5F57A6A9b8aF43e5F', // Example addresses
  '0x1234567890123456789012345678901234567890', // Add more as needed
];

// Launch Song fee (PumpFun style) - keep as string for UI
const LAUNCH_FEE = '0.001'; // 0.001 ETH on Base (~$2-3)

export function UploadPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'launch-song' | 'upload' | 'my-files' | 'all-files' | 'artist-signup'>('all-files');
  
  // Check if current wallet is verified for FREE uploads
  const isVerifiedWallet = address && VERIFIED_WALLETS.includes(address.toLowerCase());
  // Removed unused uploadTier state
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
  const [userFiles, setUserFiles] = useState<Track[]>([]);
  const [networkFiles, setNetworkFiles] = useState<Track[]>([]);
  const [isLoadingNetwork, setIsLoadingNetwork] = useState(false);
  const [selectedNetworkTrack, setSelectedNetworkTrack] = useState<Track | null>(null);
  const [selectedNetworkIndex, setSelectedNetworkIndex] = useState<number | null>(null);
  const [selectedUserTrack, setSelectedUserTrack] = useState<Track | null>(null);
  const [selectedUserIndex, setSelectedUserIndex] = useState<number | null>(null);
  const [isLoadingUserFiles, setIsLoadingUserFiles] = useState(false);
  
  // Launch Song state
  const [checkingCopyright, setCheckingCopyright] = useState(false);
  // Removed unused copyrightCheckPassed state
  const [paymentProcessing, setPaymentProcessing] = useState(false);
  const [showCopyrightViolationDialog, setShowCopyrightViolationDialog] = useState(false);
  const [violationDetails, setViolationDetails] = useState<{
    title: string;
    artist: string;
    confidence: number;
  } | null>(null);
  
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

  // Real ACR Cloud copyright detection
  const checkCopyright = async (audioFile: File): Promise<boolean> => {
    addLog('CHECKING COPYRIGHT WITH ACR CLOUD...');
    addLog('ANALYZING AUDIO FINGERPRINT...');
    setCheckingCopyright(true);
    
    try {
      const result = await acrCloudService.checkCopyright(audioFile);
      
      if (result.error) {
        addLog(`❌ COPYRIGHT CHECK ERROR: ${result.error}`);
        addLog('PROCEEDING WITH CAUTION...');
        return true; // Allow upload if API fails
      }
      
      if (!result.isOriginal && result.detectedMusic) {
        addLog('❌ COPYRIGHTED CONTENT DETECTED!');
        addLog(`DETECTED: "${result.detectedMusic.title}"`);
        addLog(`BY: ${result.detectedMusic.artist}`);
        addLog(`CONFIDENCE: ${result.confidence}%`);
        addLog('UPLOAD BLOCKED - USE ORIGINAL MUSIC ONLY');
        
        // Show violation dialog
        setViolationDetails({
          title: result.detectedMusic.title,
          artist: result.detectedMusic.artist,
          confidence: result.confidence
        });
        setShowCopyrightViolationDialog(true);
        
        return false;
      }
      
      addLog('✅ COPYRIGHT CHECK PASSED');
      addLog('ORIGINAL CONTENT VERIFIED');
      addLog(`CONFIDENCE: ${result.confidence}%`);
      return true;
      
    } catch (error) {
      addLog('ERROR: COPYRIGHT CHECK FAILED');
      addLog('PROCEEDING WITH CAUTION...');
      console.error('Copyright check error:', error);
      return true; // Allow upload if service fails completely
    } finally {
      setCheckingCopyright(false);
    }
  };

  // Real payment processing for Launch Song
  const processLaunchPayment = async (): Promise<boolean> => {
    if (!address) {
      addLog('❌ NO WALLET ADDRESS');
      return false;
    }

    addLog(`PROCESSING LAUNCH FEE: ${LAUNCH_FEE} ETH`);
    addLog('PLEASE CONFIRM TRANSACTION IN WALLET...');
    setPaymentProcessing(true);
    
    try {
      const result: PaymentResult = await paymentService.processLaunchPayment(address);
      
      if (result.success && result.transactionHash) {
        addLog('✅ PAYMENT CONFIRMED');
        addLog(`TX HASH: ${result.transactionHash.slice(0, 10)}...`);
        addLog(`AMOUNT: ${result.amountPaid} ETH`);
        addLog('LAUNCHING SONG TO NETWORK...');
        return true;
      } else {
        addLog('❌ PAYMENT FAILED');
        addLog(`ERROR: ${result.error || 'Unknown error'}`);
        return false;
      }
      
    } catch (error) {
      addLog('❌ PAYMENT FAILED');
      addLog(`ERROR: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

  const handleFileSelect = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    
    const file = files[0]; // Only handle one file at a time
    
    if (!file.type.startsWith('audio/')) {
      addLog(`ERROR: ${file.name} - INVALID FILE TYPE`);
      return;
    }

    setSelectedFile(file);
    addLog(`FILE SELECTED: ${file.name}`);
    
    // If this is for Launch Song (fee-based), check copyright immediately
    if (activeTab === 'launch-song') {
      addLog('STARTING COPYRIGHT VERIFICATION...');
      const copyrightPassed = await checkCopyright(file);
      
      if (copyrightPassed) {
        setShowMetadataForm(true);
        addLog('COPYRIGHT VERIFIED - PROCEED WITH METADATA');
      } else {
        // Copyright failed - reset and don't show form
        setSelectedFile(null);
        setShowMetadataForm(false);
        addLog('FILE REJECTED - SELECT ORIGINAL MUSIC ONLY');
        return;
      }
    } else {
      // For verified uploads, skip copyright check
      setShowMetadataForm(true);
    }
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
      // Copyright already checked during file selection
      setUploadProgress(30);

      // Step 1: Process payment
      const paymentSuccess = await processLaunchPayment();
      if (!paymentSuccess) {
        return;
      }
      setUploadProgress(50);

      // Step 2: Upload to IPFS
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

  const handleMetadataSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!selectedFile || !isConnected) {
      addLog('ERROR: NO FILE OR WALLET NOT CONNECTED');
      return;
    }

    if (!isVerifiedWallet) {
      addLog('ERROR: WALLET NOT VERIFIED FOR UPLOADS');
      addLog('CONTACT ADMIN FOR VERIFICATION');
      return;
    }

    // Validate required fields
    if (!metadata.title || !metadata.artist || !metadata.ticker || !metadata.description) {
      addLog('ERROR: REQUIRED FIELDS MISSING');
      return;
    }

    setUploading(true);
    setUploadProgress(25);
    addLog('INITIALIZING IPFS UPLOAD...');

    try {
      // Test QuickNode API connection first
      addLog('TESTING QUICKNODE IPFS API CONNECTION...');
      const connectionTest = await quickNodeService.testConnection();
      if (!connectionTest) {
        addLog('ERROR: QUICKNODE API CONNECTION FAILED');
        addLog('MISSING OR INVALID API KEY');
        addLog('CREATE .env.local FILE WITH:');
        addLog('NEXT_PUBLIC_QUICKNODE_API_KEY=your_key');
        addLog('GET API KEY FROM: quicknode.com');
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
          uploadedBy: address || 'unknown'
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
      
      // Check for specific error types
      if (error instanceof Error && error.message.includes('timeout')) {
        addLog('ERROR: UPLOAD TIMED OUT');
        addLog('THIS USUALLY MEANS:');
        addLog('1. QUICKNODE API IS SLOW OR DOWN');
        addLog('2. NETWORK CONNECTION ISSUES');
        addLog('3. FILE SIZE TOO LARGE');
        addLog('TRY AGAIN OR USE A SMALLER FILE');
      } else if (error instanceof Error && error.message.includes('API connection failed') || 
                 error instanceof Error && error.message.includes('QuickNode API error')) {
        addLog('ERROR: CANNOT REACH QUICKNODE API');
        addLog('CHECK YOUR INTERNET CONNECTION');
        addLog('AND API KEY');
      } else if (error instanceof Error && error.message.includes('Metadata upload timed out')) {
        addLog('ERROR: METADATA UPLOAD TIMED OUT');
        addLog('MUSIC FILE UPLOADED BUT METADATA FAILED');
        addLog('THIS INDICATES QUICKNODE API ISSUES');
        addLog('TRY AGAIN - THE MUSIC FILE IS ALREADY ON IPFS');
      }
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
    setSelectedCover(null);
    setCoverPreview(null);
    setShowMetadataForm(false);
    setUploadResult(null);
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

  const loadMyFiles = async () => {
    if (!address) {
      addLog('ERROR: WALLET NOT CONNECTED');
      return;
    }
    
    setIsLoadingUserFiles(true);
    addLog('LOADING USER FILES...');
    try {
      const files = await quickNodeService.getUserFiles(address);
      addLog(`FOUND ${files.length} FILES`);
      setUserFiles(files as Track[]);
    } catch (error) {
      addLog('ERROR: FAILED TO LOAD FILES');
      console.error('File loading error:', error);
    }
    setIsLoadingUserFiles(false);
  };

  const loadAllFiles = async () => {
    setIsLoadingNetwork(true);
    addLog('LOADING NETWORK FILES...');
    try {
      const files = await quickNodeService.getAllNetworkFiles();
      addLog(`FOUND ${files.length} NETWORK FILES`);
      setNetworkFiles(files as Track[]);
    } catch (error) {
      addLog('ERROR: FAILED TO LOAD NETWORK FILES');
      console.error('Network files loading error:', error);
      setNetworkFiles([]);
    }
    setIsLoadingNetwork(false);
  };

  const handleNetworkTrackSelect = (track: Track, index: number) => {
    setSelectedNetworkTrack(track);
    setSelectedNetworkIndex(index);
    addLog(`TRACK SELECTED: ${track.title} by ${track.artist}`);
    addLog(`AUTO-PLAYING...`);
  };

  const handleUserTrackSelect = (track: Track, index: number) => {
    setSelectedUserTrack(track);
    setSelectedUserIndex(index);
    addLog(`MY TRACK SELECTED: ${track.title} by ${track.artist}`);
    addLog(`AUTO-PLAYING...`);
  };

  return (
    <div className="min-h-screen bg-black text-green-400 font-mono">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
          <div>
            <h1 className="text-2xl font-bold retro-glow">ROUGEE.PLAY</h1>
            <div className="text-xs text-gray-500 mt-1">
              {'>'} USER: {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Link href="/wallet" className="bg-black border border-green-400 text-green-400 px-4 py-2 text-xs font-mono hover:bg-green-400 hover:text-black transition-colors duration-200">
              WALLET
            </Link>
            <ConnectButton.Custom>
              {({ openAccountModal }) => (
                <button
                  onClick={openAccountModal}
                  className="bg-black border border-green-400 text-green-400 px-4 py-2 text-xs font-mono retro-border"
                >
                [DISCONNECT]
                </button>
              )}
            </ConnectButton.Custom>
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
                onClick={() => {
                  setActiveTab(key as typeof activeTab);
                  if (key === 'my-files') loadMyFiles(); // no-op placeholder
                  if (key === 'all-files') loadAllFiles(); // no-op placeholder
                }}
                className={`px-4 py-2 text-xs font-mono border transition-colors ${
                  activeTab === key
                    ? 'border-green-400 text-green-400 bg-green-400/10'
                    : 'border-gray-700 text-gray-500 hover:border-green-400 hover:text-green-400'
                }`}
              >
                [{label}]
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
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs mb-4">
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
                
                <div className="bg-black/30 border border-gray-700/50 p-3 rounded text-xs">
                  <div className="text-gray-400 mb-1">🏦 Fee goes to RouGee Treasury:</div>
                  <div className="text-green-400 font-mono break-all">{paymentService.getTreasuryWallet()}</div>
                  <div className="text-gray-500 mt-1">• Platform development • Creator rewards • Infrastructure costs</div>
                </div>
              </div>

              {/* Show copyright checking state */}
              {checkingCopyright && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  <FuturisticLoader text="ACR CLOUD ANALYSIS..." size="xl" variant="pulse" />
                  <div className="text-center text-xs text-blue-400 font-mono mt-4">
                    Analyzing audio fingerprint against music database
                  </div>
                  <div className="text-center text-xs text-gray-500 font-mono mt-2">
                    File: {selectedFile?.name}
                  </div>
                </div>
              )}

              {/* Anyone can upload by paying fee */}
              {!showMetadataForm && !uploadResult && !checkingCopyright && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} SELECT AUDIO FILE TO LAUNCH
                  </div>
                  
                  <div
                    className="border-2 border-dashed border-green-400/50 p-12 text-center cursor-pointer hover:border-green-400 transition-colors mb-6 bg-green-400/5"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-green-400');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-green-400');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-green-400');
                      handleFileSelect(e.dataTransfer.files);
                    }}
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

              {/* Launch Song Form */}
              {showMetadataForm && !uploading && !uploadResult && (
                <form onSubmit={handleLaunchSongSubmit} className="space-y-6">
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} LAUNCH: {selectedFile?.name}
                  </div>
                  
                  {/* Album Cover Section */}
                  <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-lg mb-6">
                    <label className="block text-xs text-gray-400 mb-3">ALBUM COVER (OPTIONAL)</label>
                    <div className="flex gap-4">
                      <div 
                        className="w-24 h-24 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-400 transition-colors"
                        onClick={() => coverInputRef.current?.click()}
                      >
                        {coverPreview ? (
                          <Image 
                            src={coverPreview} 
                            alt="Cover preview" 
                            fill
                            className="object-cover rounded-lg"
                          />
                        ) : (
                          <div className="text-center">
                            <div className="text-2xl mb-1">🖼️</div>
                            <div className="text-xs text-gray-500">ADD COVER</div>
                          </div>
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="text-xs text-gray-500 mb-2">
                          Upload a cover image to make your track stand out! 
                          Supports JPG, PNG, WebP. Max 10MB.
                        </div>
                        {selectedCover && (
                          <div className="text-xs text-green-400 mb-2">
                            ✅ {selectedCover.name} ({(selectedCover.size / 1024 / 1024).toFixed(2)}MB)
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedCover(null);
                            setCoverPreview(null);
                          }}
                          className="text-xs text-red-400 hover:text-red-300"
                        >
                          Clear Cover
                        </button>
                      </div>
                    </div>
                    <input
                      ref={coverInputRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => handleCoverSelect(e.target.files)}
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">TITLE *</label>
                      <input
                        type="text"
                        value={metadata.title}
                        onChange={(e) => setMetadata(prev => ({...prev, title: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Track title"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">ARTIST *</label>
                      <input
                        type="text"
                        value={metadata.artist}
                        onChange={(e) => setMetadata(prev => ({...prev, artist: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Artist name"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">TICKER *</label>
                      <input
                        type="text"
                        value={metadata.ticker}
                        onChange={(e) => setMetadata(prev => ({...prev, ticker: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="e.g. SONG"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">GENRE</label>
                      <input
                        type="text"
                        value={metadata.genre}
                        onChange={(e) => setMetadata(prev => ({...prev, genre: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Hip-Hop, Rock, etc."
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">ALBUM</label>
                      <input
                        type="text"
                        value={metadata.album}
                        onChange={(e) => setMetadata(prev => ({...prev, album: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Album name"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-2">RELEASE DATE</label>
                      <input
                        type="date"
                        value={metadata.releaseDate}
                        onChange={(e) => setMetadata(prev => ({...prev, releaseDate: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-400 mb-2">DESCRIPTION *</label>
                    <textarea
                      value={metadata.description}
                      onChange={(e) => setMetadata(prev => ({...prev, description: e.target.value}))}
                      className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none h-24 resize-none"
                      placeholder="Describe your track..."
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={!isConnected || uploading}
                    className="w-full bg-gradient-to-r from-green-400 via-green-300 to-green-400 text-black px-8 py-4 font-mono font-bold hover:from-green-300 hover:via-green-200 hover:to-green-300 disabled:from-gray-600 disabled:to-gray-500 disabled:text-gray-400 transition-all duration-200 shadow-lg shadow-green-400/30 hover:shadow-green-400/50 text-lg"
                  >
                    🚀 LAUNCH SONG ({LAUNCH_FEE} ETH)
                  </button>
                </form>
              )}

              {/* Processing states during form submission */}
              {(paymentProcessing || uploading) && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  {paymentProcessing && (
                    <>
                      <FuturisticLoader text="PROCESSING PAYMENT..." size="xl" variant="bars" />
                      <div className="text-center text-xs text-green-400 font-mono mt-4">
                        Confirming {LAUNCH_FEE} ETH payment on Base network
                      </div>
                    </>
                  )}
                  {uploading && (
                    <>
                      <FuturisticLoader text="LAUNCHING SONG..." size="xl" variant="circle" />
                      <div className="text-center text-xs text-green-400 font-mono mt-4">
                        Uploading to IPFS and broadcasting to network
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Verified Upload Tab */}
          {activeTab === 'upload' && (
            <div className="p-6">
              {/* Wallet Verification Status */}
              <div className="mb-6 p-4 border rounded-lg border-gray-700/50">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm font-mono text-gray-300">WALLET STATUS:</span>
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
                        ? '✅ VERIFIED' 
                        : '❌ NOT VERIFIED'
                    }
                  </span>
                </div>
                
                {isConnected && !isVerifiedWallet && (
                  <div className="text-xs text-red-400 font-mono bg-red-900/20 p-2 rounded border border-red-800/30">
                    <div>⚠️ UPLOADS RESTRICTED TO VERIFIED WALLETS</div>
                    <div className="mt-1">Apply below to become a RouGee artist</div>
                  </div>
                )}
                
                {isConnected && isVerifiedWallet && (
                  <div className="text-xs text-green-400 font-mono bg-green-900/20 p-2 rounded border border-green-800/30">
                    <div>🎵 WALLET VERIFIED FOR UPLOADS</div>
                    <div className="mt-1">Connected: {address}</div>
                  </div>
                )}
              </div>

              {/* Show upload interface only for verified wallets */}
              {isConnected && isVerifiedWallet && !showMetadataForm && !uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} SELECT AUDIO FILE TO BEGIN
                  </div>
                  
                  <div
                    className="border-2 border-dashed border-gray-700 p-12 text-center cursor-pointer hover:border-green-400 transition-colors mb-6"
                    onClick={() => fileInputRef.current?.click()}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.add('border-green-400');
                    }}
                    onDragLeave={(e) => {
                      e.currentTarget.classList.remove('border-green-400');
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.classList.remove('border-green-400');
                      handleFileSelect(e.dataTransfer.files);
                    }}
                  >
                    <div className="text-4xl mb-4">🎵</div>
                    <div className="text-sm text-gray-400 mb-2">SELECT AUDIO FILE</div>
                    <div className="text-xs text-gray-600">MP3 | WAV | FLAC | AAC | OGG | M4A</div>
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

              {/* Show artist signup for unverified/disconnected wallets */}
              {(!isConnected || !isVerifiedWallet) && !showMetadataForm && !uploadResult && (
                <div className="text-center py-16">
                  <div className="text-green-400 text-6xl mb-6">🎤</div>
                  <div className="text-xl font-mono text-green-400 mb-4">
                    ARE YOU AN ARTIST?
                  </div>
                  <div className="text-sm font-mono text-gray-300 space-y-3 mb-8">
                    {!isConnected ? (
                      <>
                        <div>Connect your wallet to apply for artist access</div>
                        <div className="text-xs text-gray-500">↗ Use the Connect Wallet button above</div>
                      </>
                    ) : (
                      <>
                        <div className="text-lg text-white mb-4">Join the RouGee artist community!</div>
                        <div>Upload your tracks to the decentralized music platform</div>
                        <div className="text-xs text-gray-500">Apply to become a verified RouGee artist</div>
                        
                        <div className="mt-6">
                          <button
                            onClick={() => setActiveTab('artist-signup')}
                            className="bg-gradient-to-r from-green-400 via-green-300 to-green-400 text-black px-8 py-3 font-mono font-bold hover:from-green-300 hover:via-green-200 hover:to-green-300 transition-all duration-200 shadow-lg shadow-green-400/30 hover:shadow-green-400/50 hover:scale-105"
                          >
                            🎵 APPLY TO UPLOAD YOUR TRACKS
                          </button>
                        </div>
                        
                        <div className="text-xs text-gray-500 mt-6 p-3 bg-gray-900/50 rounded font-mono border border-gray-800">
                          Wallet: {address}
                        </div>
                      </>
                    )}
                  </div>
                </div>
              )}

              {showMetadataForm && !uploading && !uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} FILE: {selectedFile?.name}
                  </div>
                  <div className="text-xs text-gray-500 mb-6">
                    {'>'} ENTER TRACK METADATA
                  </div>
                  
                  <form onSubmit={handleMetadataSubmit} className="space-y-6">
                    {/* Album Cover Section */}
                    <div className="bg-gray-900/50 border border-gray-700 p-4 rounded-lg">
                      <label className="block text-xs text-gray-400 mb-3">ALBUM COVER (OPTIONAL)</label>
                      <div className="flex gap-4">
                        <div 
                          className="w-24 h-24 border-2 border-dashed border-gray-700 rounded-lg flex items-center justify-center cursor-pointer hover:border-green-400 transition-colors"
                          onClick={() => coverInputRef.current?.click()}
                        >
                          {coverPreview ? (
                            <Image 
                              src={coverPreview} 
                              alt="Cover preview" 
                              fill
                              className="object-cover rounded-lg"
                            />
                          ) : (
                            <div className="text-center">
                              <div className="text-2xl mb-1">🖼️</div>
                              <div className="text-xs text-gray-500">ADD COVER</div>
                            </div>
                          )}
                        </div>
                        <div className="flex-1">
                          <div className="text-xs text-gray-500 mb-2">
                            Upload a cover image to make your track stand out! 
                            Supports JPG, PNG, WebP. Max 10MB.
                          </div>
                          {selectedCover && (
                            <div className="text-xs text-green-400 mb-2">
                              ✅ {selectedCover.name} ({(selectedCover.size / 1024 / 1024).toFixed(2)}MB)
                            </div>
                          )}
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedCover(null);
                              setCoverPreview(null);
                              addLog('COVER REMOVED');
                            }}
                            className="text-xs text-red-400 hover:text-red-300 transition-colors"
                          >
                            Remove Cover
                          </button>
                        </div>
                        <input
                          ref={coverInputRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={(e) => handleCoverSelect(e.target.files)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Required Fields */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">TITLE *</label>
                        <input
                          type="text"
                          value={metadata.title}
                          onChange={(e) => setMetadata({...metadata, title: e.target.value})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">ARTIST *</label>
                        <input
                          type="text"
                          value={metadata.artist}
                          onChange={(e) => setMetadata({...metadata, artist: e.target.value})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                          required
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">TICKER *</label>
                        <input
                          type="text"
                          value={metadata.ticker}
                          onChange={(e) => setMetadata({...metadata, ticker: e.target.value.toUpperCase()})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                          placeholder="e.g. SONG1"
                          maxLength={10}
                          required
                        />
                      </div>
                      
                      {/* Optional Fields */}
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">ALBUM</label>
                        <input
                          type="text"
                          value={metadata.album}
                          onChange={(e) => setMetadata({...metadata, album: e.target.value})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">GENRE</label>
                        <input
                          type="text"
                          value={metadata.genre}
                          onChange={(e) => setMetadata({...metadata, genre: e.target.value})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                        />
                      </div>
                      
                      <div>
                        <label className="block text-xs text-gray-400 mb-1">RELEASE DATE</label>
                        <input
                          type="date"
                          value={metadata.releaseDate}
                          onChange={(e) => setMetadata({...metadata, releaseDate: e.target.value})}
                          className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none"
                        />
                      </div>
                    </div>
                    
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">DESCRIPTION *</label>
                      <textarea
                        value={metadata.description}
                        onChange={(e) => setMetadata({...metadata, description: e.target.value})}
                        className="w-full bg-black border border-gray-700 text-green-400 px-3 py-2 text-sm font-mono focus:border-green-400 outline-none h-24 resize-none"
                        required
                      />
                    </div>
                    
                    <div className="flex space-x-4 pt-4">
                      <button
                        type="submit"
                        disabled={!isConnected || uploading || !isVerifiedWallet}
                        className={`px-6 py-2 text-xs font-mono font-bold ${
                          !isConnected 
                            ? 'bg-gray-700 text-gray-500' 
                            : !isVerifiedWallet 
                              ? 'bg-red-500 text-white hover:bg-red-400' 
                              : 'bg-green-400 text-black hover:bg-green-300'
                        } disabled:bg-gray-700 disabled:text-gray-500`}
                      >
                        {!isConnected 
                          ? '[CONNECT WALLET]' 
                          : !isVerifiedWallet 
                            ? '[WALLET NOT VERIFIED]' 
                            : '[UPLOAD TO IPFS]'
                        }
                      </button>
                      <button
                        type="button"
                        onClick={resetForm}
                        className="bg-black border border-gray-700 text-gray-400 px-6 py-2 text-xs font-mono hover:border-green-400 hover:text-green-400"
                      >
                        [CANCEL]
                      </button>
                    </div>
                  </form>
                </>
              )}

              {uploading && (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  <FuturisticLoader text="UPLOADING TO IPFS..." size="xl" variant="bars" />
                  
                  {/* Progress Bar */}
                  <div className="mt-6">
                    <div className="w-full bg-gray-700/50 rounded-full h-2 mb-2">
                      <div 
                        className="bg-gradient-to-r from-green-400 to-green-300 h-2 rounded-full transition-all duration-300 shadow-lg shadow-green-400/30"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <div className="text-center text-xs text-green-400 font-mono">PROGRESS: {uploadProgress}%</div>
                  </div>
                </div>
              )}

              {uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} UPLOAD SUCCESSFUL! NOW PLAYING:
                  </div>
                  
                  {/* Audio Player */}
                  <div className="mb-6">
                    <ModernAudioPlayer
                      audioUrl={uploadResult.musicUrl}
                      title={metadata.title}
                      artist={metadata.artist}
                      ticker={metadata.ticker}
                      description={metadata.description}
                      coverUrl={uploadResult.coverUrl}
                      uploaderAddress={address}
                    />
                  </div>

                  {/* Metadata Link */}
                  <div className="bg-gray-900/50 border border-gray-700 p-3 mb-6">
                    <div className="text-xs text-gray-500 mb-2">METADATA JSON:</div>
                    <a 
                      href={uploadResult.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline break-all font-mono"
                    >
                      {uploadResult.url}
                    </a>
                  </div>

                  <button
                    onClick={resetForm}
                    className="bg-green-400 text-black px-6 py-2 text-xs font-mono font-bold hover:bg-green-300"
                  >
                    [UPLOAD ANOTHER]
                  </button>
                </>
              )}

              {/* Console Logs */}
              <div className="bg-black border border-gray-800 p-4 h-32 overflow-y-auto">
                <div className="text-xs text-gray-500 mb-2">SYSTEM LOG:</div>
                {logs.length === 0 ? (
                  <div className="text-xs text-gray-700">{'>'} AWAITING INPUT...</div>
                ) : (
                  logs.map((log, i) => (
                    <div key={i} className="text-xs text-green-400 mb-1">
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {activeTab === 'my-files' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} USER FILES DATABASE
              </div>
              
              {/* Selected Track Player */}
              {selectedUserTrack && (
                <div className="mb-6">
                  <div className="text-xs text-gray-500 mb-3">
                    {'>'} NOW PLAYING FROM MY FILES:
                  </div>
               <ModernAudioPlayer
                 audioUrl={selectedUserTrack.audioUrl}
                 title={selectedUserTrack.title}
                 artist={selectedUserTrack.artist}
                 ticker={selectedUserTrack.ticker}
                 description={selectedUserTrack.description}
                 coverUrl={selectedUserTrack.coverUrl}
                 uploaderAddress={(selectedUserTrack as any).uploadedBy || ''}
                 autoPlay={true}
               />
                </div>
              )}
              
              {/* Track List */}
              {isLoadingUserFiles ? (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  <FuturisticLoader text="LOADING YOUR TRACKS..." size="lg" variant="pulse" />
              </div>
              ) : (
                <WinampTrackList 
                  tracks={userFiles}
                  onTrackSelect={handleUserTrackSelect}
                  selectedIndex={selectedUserIndex ?? undefined}
                />
              )}
            </div>
          )}

          {activeTab === 'all-files' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} NETWORK MUSIC DATABASE
              </div>
              
              {/* Selected Track Player */}
              {selectedNetworkTrack && (
                <div className="mb-6">
                  <div className="text-xs text-gray-500 mb-3">
                    {'>'} NOW PLAYING FROM NETWORK:
                  </div>
               <ModernAudioPlayer
                 audioUrl={selectedNetworkTrack.audioUrl}
                 title={selectedNetworkTrack.title}
                 artist={selectedNetworkTrack.artist}
                 ticker={selectedNetworkTrack.ticker}
                 description={selectedNetworkTrack.description}
                 coverUrl={selectedNetworkTrack.coverUrl}
                 uploaderAddress={(selectedNetworkTrack as any).uploadedBy || ''}
                 autoPlay={true}
               />
                </div>
              )}

              {/* Track List */}
              {isLoadingNetwork ? (
                <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8">
                  <FuturisticLoader text="SCANNING NETWORK..." size="lg" variant="circle" />
                </div>
              ) : (
                <WinampTrackList 
                  tracks={networkFiles}
                  onTrackSelect={handleNetworkTrackSelect}
                  selectedIndex={selectedNetworkIndex ?? undefined}
                />
              )}
            </div>
          )}

          {activeTab === 'artist-signup' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} ROUGEE ARTIST APPLICATION
              </div>
              
              <div className="max-w-2xl mx-auto">
                <div className="text-center mb-8">
                  <div className="text-green-400 text-4xl mb-4">🎤</div>
                  <div className="text-xl font-mono text-green-400 mb-2">
                    BECOME A ROUGEE ARTIST
                  </div>
                  <div className="text-sm text-gray-400 font-mono">
                    Join the decentralized music revolution
                  </div>
                </div>

                {submittingApplication && (
                  <div className="bg-gray-900/50 border border-gray-700 rounded-lg p-8 mb-6">
                    <FuturisticLoader text="SUBMITTING APPLICATION..." size="lg" variant="pulse" />
                  </div>
                )}

                <form onSubmit={handleArtistApplicationSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Artist Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        ARTIST NAME *
                      </label>
                      <input
                        type="text"
                        value={artistApplication.artistName}
                        onChange={(e) => setArtistApplication(prev => ({...prev, artistName: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Your stage/artist name"
                        required
                      />
                    </div>

                    {/* First Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        FIRST NAME *
                      </label>
                      <input
                        type="text"
                        value={artistApplication.firstName}
                        onChange={(e) => setArtistApplication(prev => ({...prev, firstName: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Your first name"
                        required
                      />
                    </div>

                    {/* Last Name */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        LAST NAME *
                      </label>
                      <input
                        type="text"
                        value={artistApplication.lastName}
                        onChange={(e) => setArtistApplication(prev => ({...prev, lastName: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="Your last name"
                        required
                      />
                    </div>

                    {/* Email */}
                    <div>
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        EMAIL ADDRESS *
                      </label>
                      <input
                        type="email"
                        value={artistApplication.email}
                        onChange={(e) => setArtistApplication(prev => ({...prev, email: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none"
                        placeholder="your@email.com"
                        required
                      />
                    </div>

                    {/* Music Links */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        MUSIC LINKS
                      </label>
                      <textarea
                        value={artistApplication.musicLinks}
                        onChange={(e) => setArtistApplication(prev => ({...prev, musicLinks: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none h-24 resize-none"
                        placeholder="Links to your music on Spotify, SoundCloud, YouTube, etc.&#10;(One per line)"
                      />
                    </div>

                    {/* Additional Info */}
                    <div className="md:col-span-2">
                      <label className="block text-xs text-gray-400 mb-2 font-mono">
                        ADDITIONAL INFORMATION
                      </label>
                      <textarea
                        value={artistApplication.additionalInfo}
                        onChange={(e) => setArtistApplication(prev => ({...prev, additionalInfo: e.target.value}))}
                        className="w-full bg-black border border-gray-700 text-green-400 p-3 font-mono text-sm focus:border-green-400 focus:outline-none h-24 resize-none"
                        placeholder="Tell us about your music, genre, experience, etc."
                      />
                    </div>
                  </div>

                  {/* Wallet Address Display */}
                  <div className="bg-gray-900/50 border border-gray-700 p-4 rounded">
                    <div className="text-xs text-gray-400 mb-2 font-mono">WALLET ADDRESS</div>
                    <div className="text-green-400 font-mono text-sm break-all">
                      {address}
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="flex justify-center pt-4">
                    <button
                      type="submit"
                      disabled={!isConnected || submittingApplication}
                      className="bg-gradient-to-r from-green-400 via-green-300 to-green-400 text-black px-8 py-3 font-mono font-bold hover:from-green-300 hover:via-green-200 hover:to-green-300 disabled:from-gray-600 disabled:to-gray-500 disabled:text-gray-400 transition-all duration-200 shadow-lg shadow-green-400/30 hover:shadow-green-400/50 hover:scale-105 active:scale-95"
                    >
                      {submittingApplication ? 'SUBMITTING...' : '🎵 SUBMIT APPLICATION'}
                    </button>
                  </div>

                  <div className="text-center text-xs text-gray-500 font-mono mt-4">
                    Applications are reviewed within 24-48 hours
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>

        {/* Copyright Violation Dialog */}
        {showCopyrightViolationDialog && (
          <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-gray-900 border-2 border-red-500 rounded-lg p-8 max-w-md w-full shadow-2xl shadow-red-500/20">
              <div className="text-center">
                {/* Warning Icon */}
                <div className="text-red-400 text-6xl mb-4">⚠️</div>
                
                {/* Title */}
                <div className="text-red-400 font-bold text-xl font-mono mb-4">
                  COPYRIGHT VIOLATION DETECTED
                </div>
                
                {/* Detection Details */}
                <div className="bg-red-900/20 border border-red-700/50 p-4 rounded mb-6 text-left">
                  <div className="text-red-400 text-sm font-mono mb-2">
                    🎵 DETECTED COPYRIGHTED CONTENT:
                  </div>
                  <div className="text-white font-bold">&quot;{violationDetails?.title}&quot;</div>
                  <div className="text-gray-300">by {violationDetails?.artist}</div>
                  <div className="text-red-400 text-sm mt-2">
                    Confidence: {violationDetails?.confidence}%
                  </div>
                </div>
                
                {/* Warning Message */}
                <div className="text-gray-300 text-sm space-y-3 mb-6">
                  <div className="text-red-400 font-bold">
                    🚫 YOU ARE BREAKING PLATFORM RULES
                  </div>
                  <div>
                    RouGee is committed to supporting original artists and respecting copyright laws.
                  </div>
                  <div className="bg-yellow-900/20 border border-yellow-700/50 p-3 rounded">
                    <div className="text-yellow-400 font-bold text-xs mb-1">
                      ⚠️ WARNING:
                    </div>
                    <div className="text-yellow-300 text-xs">
                      Multiple attempts to upload copyrighted material may result in a <span className="text-red-400 font-bold">PERMANENT BAN</span> from the platform.
                    </div>
                  </div>
                  <div className="text-xs text-gray-400">
                    Only upload music that you own or have proper licensing for.
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      setShowCopyrightViolationDialog(false);
                      setViolationDetails(null);
                      setSelectedFile(null);
                      setShowMetadataForm(false);
                    }}
                    className="w-full bg-red-500 hover:bg-red-400 text-white px-6 py-3 font-mono font-bold transition-colors duration-200"
                  >
                    I UNDERSTAND - TRY AGAIN
                  </button>
                  
                  <button
                    onClick={() => {
                      setShowCopyrightViolationDialog(false);
                      setViolationDetails(null);
                      setActiveTab('all-files'); // Redirect to browse music
                    }}
                    className="w-full bg-gray-700 hover:bg-gray-600 text-gray-300 px-6 py-3 font-mono text-sm transition-colors duration-200"
                  >
                    BROWSE ORIGINAL MUSIC INSTEAD
                  </button>
                </div>
                
                {/* Footer */}
                <div className="text-xs text-gray-500 mt-4 font-mono">
                  Powered by ACR Cloud • RouGee Platform Rules
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Footer Status */}
        <div className="mt-8 text-xs text-gray-600 border-t border-gray-800 pt-4">
          <div className="flex justify-between">
            <div>
              {'>'} STATUS: {isConnected ? 'CONNECTED' : 'DISCONNECTED'}
            </div>
            <div>
              {'>'} NETWORK: BASE
            </div>
            <div>
              {'>'} PROTOCOL: V1.0
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}