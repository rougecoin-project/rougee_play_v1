'use client';

import { useState, useRef, useEffect } from 'react';
import Image from 'next/image';
import { FuturisticLoader } from './FuturisticLoader';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  artist: string;
  ticker?: string;
  description?: string;
  coverUrl?: string;
  autoPlay?: boolean;
  uploaderAddress?: string;
}

export function ModernAudioPlayer({ audioUrl, title, artist, ticker, description, coverUrl, autoPlay = false, uploaderAddress }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);
  const currentAudioElementRef = useRef<HTMLAudioElement | null>(null);
  const mediaSourceRef = useRef<any>(null);
  const audioContextRef = useRef<any>(null);
  const [audioContext, setAudioContext] = useState(null);
  const [analyser, setAnalyser] = useState<any>(null);
  const [frequencyData, setFrequencyData] = useState(null);

  // Convert any IPFS URL to use primary gateway
  const getPrimaryGatewayUrl = (url: string) => {
    const hashMatch = url.match(/\/ipfs\/([^\/\?]+)/);
    if (hashMatch) {
      const hash = hashMatch[1];
      return `https://ipfs.io/ipfs/${hash}`;
    }
    return url;
  };

  // Available backup gateways for fallback (ordered by reliability)
  const backupGateways = [
    'https://ipfs.io/ipfs/',
    'https://gateway.ipfs.io/ipfs/',
    'https://gateway.pinata.cloud/ipfs/',
    'https://dweb.link/ipfs/',
    'https://4everland.io/ipfs/',
    'https://cf-ipfs.com/ipfs/', // More reliable Cloudflare gateway
    'https://w3s.link/ipfs/', // Web3.Storage gateway
    'https://nftstorage.link/ipfs/' // NFT.Storage gateway
  ];

  const [currentUrl, setCurrentUrl] = useState(getPrimaryGatewayUrl(audioUrl));
  const [gatewayIndex, setGatewayIndex] = useState(0);

  // Reset gateway index and cleanup audio analysis when audio URL changes
  useEffect(() => {
    // Reset URL and error state
    setCurrentUrl(getPrimaryGatewayUrl(audioUrl));
    setGatewayIndex(0);
    setError(false);
    
    // Immediately cleanup existing audio context and media source for new track
    const cleanupAudioResources = () => {
      console.log('🔄 Cleaning up audio resources for new track');
      
      // Mark audio element as disconnected
      if (currentAudioElementRef.current) {
        (currentAudioElementRef.current as any).connectedToAudioContext = false;
      }
      
      // Disconnect and cleanup media source first
      if (mediaSourceRef.current) {
        try {
          mediaSourceRef.current.disconnect();
          console.log('✅ Media source disconnected');
        } catch (e) {
          console.log('Media source already disconnected');
        }
        mediaSourceRef.current = null;
        currentAudioElementRef.current = null;
      }
      
      // Close existing audio context
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
          console.log('✅ Audio context closed');
        } catch (e) {
          console.log('Audio context already closed');
        }
      }
      audioContextRef.current = null;
    };
    
    // Cleanup immediately when URL changes
    cleanupAudioResources();
    
    // Reset audio analysis state after cleanup
    setAudioContext(null);
    setAnalyser(null);
    setFrequencyData(null);
    
    // Small delay to allow cleanup to complete before potential new setup
    const timeoutId = setTimeout(() => {
      console.log('🔄 Audio resources cleanup completed');
    }, 50);
    
    // Cleanup function for component unmount or next URL change
    return () => {
      clearTimeout(timeoutId);
      cleanupAudioResources();
    };
  }, [audioUrl]);

  // Auto-play when track changes (if autoPlay is enabled)
  useEffect(() => {
    if (autoPlay && audioRef.current && !loading && !error) {
      const attemptAutoPlay = async () => {
        try {
          setLoading(true);
          console.log('🎵 Auto-playing track:', title);
          await audioRef.current!.play();
          setIsPlaying(true);
          setLoading(false);
        } catch (err) {
          console.error('Auto-play failed:', err);
          setLoading(false);
          setError(false); // Don't show error for auto-play failures
        }
      };

      // Small delay to ensure audio element is ready
      const timer = setTimeout(attemptAutoPlay, 100);
      return () => clearTimeout(timer);
    }
    // autoPlay, audioRef, loading, error, title are all dependencies
  }, [audioUrl, autoPlay, title, loading, error]);
  
  // Audio analysis state - moved up to avoid reference errors
  const [waveformData, setWaveformData] = useState<number[]>([]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  // Audio analysis and visualizer logic removed for stability

  // Generate static waveform data only
  useEffect(() => {
    const generateStaticWaveform = () => {
      const data: number[] = [];
      for (let i = 0; i < 100; i++) {
        // Simple sine wave for visual interest
        const value = Math.abs(Math.sin(i * 0.15) * 0.7 + 0.3 + (Math.random() - 0.5) * 0.1);
        data.push(Math.min(1, Math.max(0.1, value)));
      }
      setWaveformData(data);
    };
    generateStaticWaveform();
  }, [audioUrl]);

  // Draw static waveform only
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { width, height } = canvas;
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);
    const progress = duration > 0 ? currentTime / duration : 0;
    const barCount = 100;
    const barWidth = width / barCount;
    waveformData.forEach((amplitude, index) => {
      const barHeight = Math.max(2, amplitude * height * 0.6);
      const x = index * barWidth;
      const y = (height - barHeight) / 2;
      const isPlayed = index < progress * barCount;
      ctx.fillStyle = isPlayed ? '#10b981' : '#374151';
      ctx.fillRect(x, y, barWidth - 1, barHeight);
    });
    // Progress line
    if (progress > 0) {
      const progressX = progress * width;
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      ctx.beginPath();
      ctx.moveTo(progressX, 0);
      ctx.lineTo(progressX, height);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [currentTime, duration, waveformData]);

  const togglePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        setLoading(true);
        setError(false);
        await audioRef.current.play();
        setIsPlaying(true);
        setLoading(false);
      }
    } catch (error) {
      console.error('Error playing audio:', error);
      setError(true);
      setLoading(false);
      setIsPlaying(false);
    }
  };

  const handleTimeUpdate = () => {
    if (!audioRef.current) return;
    setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (!audioRef.current) return;
    setDuration(audioRef.current.duration);
    setLoading(false);
    setError(false);
  };

  const tryFallbackGateway = async () => {
    setError(false);
    setLoading(true);
    
    const hash = audioUrl.match(/\/ipfs\/([^\/\?]+)/)?.[1];
    if (!hash) {
      setError(true);
      setLoading(false);
      return;
    }

    console.log('Trying fallback gateways for audio playback...');
    
    // Try each gateway until one works
    for (let i = 0; i < backupGateways.length; i++) {
      const gateway = backupGateways[i];
      try {
        const testUrl = `${gateway}${hash}`;
        console.log(`Testing gateway ${i + 1}/${backupGateways.length}: ${gateway}`);
        
        // Create timeout controller for faster fallback
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout
        
        // Test if the gateway responds
        const response = await fetch(testUrl, { 
          method: 'HEAD',
          mode: 'cors',
          cache: 'no-store',
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          console.log(`✅ Gateway working: ${gateway}`);
          setCurrentUrl(`${testUrl}?t=${Date.now()}`);
          setLoading(false);
          return;
        }
      } catch (error) {
        console.log(`❌ Gateway ${gateway} failed: ${error}`);
        continue;
      }
    }
    
    console.error('❌ All gateways failed for audio playback');
    setError(true);
    setLoading(false);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const handleWaveformClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!audioRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const progress = x / rect.width;
    const newTime = progress * duration;
    
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative group">
      {/* Main Player Container */}
      <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-black border border-green-400/30 rounded-xl overflow-hidden backdrop-blur-sm shadow-2xl">
        {/* Loading Overlay */}
        {loading && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center rounded-xl">
            <FuturisticLoader text="LOADING TRACK..." size="md" variant="circle" />
          </div>
        )}
        
        {/* Subtle Glow Effect */}
        <div className="absolute inset-0 bg-gradient-to-r from-green-400/10 via-purple-500/10 to-blue-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
        
        <div className="relative z-10 p-6">
          {/* Top Section - Cover + Info */}
          <div className="flex gap-6 mb-6">
            {/* Album Cover */}
            <div className="flex-shrink-0">
              <div className="w-24 h-24 md:w-28 md:h-28 rounded-xl overflow-hidden border-2 border-green-400/50 shadow-lg shadow-green-400/20 relative group/cover">
                {coverUrl ? (
                  <>
                    <Image 
                      src={getPrimaryGatewayUrl(coverUrl)}
                      alt={`${title} cover`}
                      fill
                      className="object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                        (e.target as HTMLImageElement).nextElementSibling?.classList.remove('hidden');
                      }}
                    />
                  </>
                ) : null}
                <div className={`w-full h-full bg-gradient-to-br from-green-400/30 via-purple-500/30 to-blue-500/30 flex items-center justify-center ${coverUrl ? 'absolute inset-0 hidden' : ''}`}>
                  <div className="text-3xl">🎵</div>
                </div>
              </div>
            </div>

            {/* Track Info */}
            <div className="flex-1 min-w-0">
              <div className="mb-3">
                <h3 className="text-green-400 font-bold text-xl font-mono truncate glow-text">
                  {title}
                </h3>
                <p className="text-gray-300 text-base font-mono truncate mt-1">{artist}</p>
                
                <div className="flex items-center gap-3 mt-3">
                  {ticker && (
                    <span className="inline-flex items-center bg-gradient-to-r from-green-400 via-green-300 to-green-400 text-black px-3 py-1.5 rounded-full text-sm font-bold font-mono shadow-lg shadow-green-400/30">
                      💎 ${ticker}
                    </span>
                  )}
                  <div className="text-sm text-gray-400 font-mono bg-black/50 px-3 py-1 rounded-full border border-gray-700/50">
                    {formatTime(currentTime)} / {formatTime(duration)}
                  </div>
                </div>
                
                {/* Uploader Address */}
                {uploaderAddress && (
                  <div className="mt-3 text-sm text-gray-400 font-mono">
                    Owner: <span className="text-green-400">{uploaderAddress}</span>
                  </div>
                )}
              </div>
              
              {description && (
                <p className="text-gray-400 text-sm font-mono leading-relaxed opacity-80">{description}</p>
              )}
            </div>
          </div>

          {/* Audio Visualizer Section */}
          <div className="mb-8">
            <div className="bg-gray-900/50 border border-gray-700/30 rounded-lg p-4">
              <div className="text-xs text-gray-400 mb-2 flex justify-between">
                <span>{isPlaying ? '🎵 LIVE VISUALIZER' : '📊 WAVEFORM'}</span>
                <span>{formatTime(currentTime)} / {formatTime(duration)}</span>
              </div>
              <canvas
                ref={canvasRef}
                width={800}
                height={80}
                onClick={handleWaveformClick}
                className="w-full h-20 cursor-pointer rounded"
                style={{ background: 'rgba(17, 24, 39, 0.5)' }}
              />
              {/* Fallback progress bar for when waveform isn't ready */}
              <div className="mt-2">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-gray-700/50 rounded-full appearance-none cursor-pointer opacity-50 hover:opacity-100 transition-opacity"
                  style={{
                    background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / duration) * 100}%, rgba(55, 65, 81, 0.3) ${(currentTime / duration) * 100}%, rgba(55, 65, 81, 0.3) 100%)`
                  }}
                />
              </div>
            </div>
          </div>

          {/* Controls Section */}
          <div className="flex items-center justify-center space-x-6">
            {/* Previous Button */}
            <button className="text-gray-400 hover:text-green-400 transition-colors duration-200 p-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 6h2v12H6zm3.5 6l8.5 6V6z"/>
              </svg>
            </button>

            {/* Main Play/Pause */}
            <button
              onClick={togglePlayPause}
              disabled={loading || error}
              className="relative bg-gradient-to-br from-green-400 via-green-300 to-green-400 hover:from-green-300 hover:via-green-200 hover:to-green-300 text-black p-4 rounded-full font-bold transition-all duration-200 disabled:from-gray-600 disabled:to-gray-500 disabled:text-gray-400 shadow-lg shadow-green-400/30 hover:shadow-green-400/50 hover:scale-105 active:scale-95"
            >
              <div className="flex items-center justify-center w-6 h-6">
                {loading ? (
                  <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full"></div>
                ) : error ? (
                  <span className="text-sm">❌</span>
                ) : isPlaying ? (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/>
                  </svg>
                ) : (
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M8 5v14l11-7z"/>
                  </svg>
                )}
              </div>
            </button>

            {/* Next Button */}
            <button className="text-gray-400 hover:text-green-400 transition-colors duration-200 p-3">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
                <path d="M6 18l8.5-6L6 6v12zM16 6v12h2V6h-2z"/>
              </svg>
            </button>
          </div>

          {/* Error Retry */}
          {error && (
            <div className="flex justify-center mt-4">
              <button
                onClick={tryFallbackGateway}
                className="bg-red-500/20 border border-red-500/50 text-red-400 px-4 py-2 rounded-lg font-mono text-sm hover:bg-red-500/30 transition-all duration-300 hover:scale-105"
              >
                🔄 RETRY STREAM
              </button>
            </div>
          )}

          {/* IPFS Link */}
          <div className="mt-6 pt-4 border-t border-gray-700/30">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-500 font-mono flex items-center gap-2">
                <span className="w-2 h-2 bg-green-400 rounded-full"></span>
                IPFS STREAM
              </span>
              <a 
                href={currentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-green-400 hover:text-green-300 text-xs font-mono transition-colors duration-200 flex items-center gap-2"
              >
                <span>OPEN DIRECT</span>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentUrl}
          crossOrigin="anonymous"
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onPlay={() => {
            setIsPlaying(true);
            setLoading(false);
            setError(false);
          }}
          onPause={() => setIsPlaying(false)}
          onError={() => {
            console.error('Error loading audio from:', currentUrl);
            
            // Try next gateway automatically with faster switching
            const hash = audioUrl.match(/\/ipfs\/([^\/\?]+)/)?.[1];
            if (hash && gatewayIndex < backupGateways.length - 1) {
              const nextIndex = gatewayIndex + 1;
              const nextGateway = backupGateways[nextIndex];
              console.log(`Auto-switching to gateway ${nextIndex + 1}: ${nextGateway}`);
              
              setGatewayIndex(nextIndex);
              setCurrentUrl(`${nextGateway}${hash}?t=${Date.now()}`);
              setError(false); // Reset error state for next attempt
            } else {
              // All gateways failed - show error
              setLoading(false);
              setError(true);
              setIsPlaying(false);
              console.error('❌ All gateways failed for audio:', audioUrl);
              console.log('💡 Try using the RETRY STREAM button to test gateways manually');
            }
          }}
          onLoadStart={() => setLoading(true)}
          onCanPlay={() => setLoading(false)}
          preload="metadata"
        />
      </div>

      <style jsx>{`
        .glow-text {
          text-shadow: 0 0 20px #10b981, 0 0 40px #10b981;
        }
        
        .modern-slider::-webkit-slider-thumb {
          appearance: none;
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #06d6a0);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.7), 0 0 30px rgba(16, 185, 129, 0.4);
          transition: all 0.3s ease;
        }
        
        .modern-slider::-webkit-slider-thumb:hover {
          transform: scale(1.2);
          box-shadow: 0 0 20px rgba(16, 185, 129, 0.9), 0 0 40px rgba(16, 185, 129, 0.6);
        }
        
        .modern-slider::-moz-range-thumb {
          height: 20px;
          width: 20px;
          border-radius: 50%;
          background: linear-gradient(45deg, #10b981, #06d6a0);
          cursor: pointer;
          border: 3px solid #000;
          box-shadow: 0 0 15px rgba(16, 185, 129, 0.7);
        }
      `}</style>
    </div>
  );
}
