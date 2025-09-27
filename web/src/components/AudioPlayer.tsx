'use client';

import { useState, useRef } from 'react';

interface AudioPlayerProps {
  audioUrl: string;
  title: string;
  artist: string;
  ticker?: string;
  description?: string;
  coverUrl?: string;
}

export function AudioPlayer({ audioUrl, title, artist, ticker, description, coverUrl }: AudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Convert any IPFS URL to use Pinata gateway
  const getPinataUrl = (url: string) => {
    // Extract IPFS hash from any gateway URL
    const hashMatch = url.match(/\/ipfs\/([^\/\?]+)/);
    if (hashMatch) {
      const hash = hashMatch[1];
      return `https://gateway.pinata.cloud/ipfs/${hash}`;
    }
    return url; // Return original if not an IPFS URL
  };

  const [currentUrl, setCurrentUrl] = useState(getPinataUrl(audioUrl));

  const togglePlayPause = () => {
    if (!audioRef.current) return;

    if (isPlaying) {
      audioRef.current.pause();
    } else {
      setLoading(true);
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
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

  const tryFallbackGateway = () => {
    // Since we're already using Pinata, just retry with the same URL
    console.log('Retrying with Pinata gateway...');
    setError(false);
    setLoading(true);
    
    // Force reload by setting a new URL with cache busting
    const currentTime = Date.now();
    const urlWithCacheBust = `${getPinataUrl(audioUrl)}?t=${currentTime}`;
    setCurrentUrl(urlWithCacheBust);
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!audioRef.current) return;
    const newTime = parseFloat(e.target.value);
    audioRef.current.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="bg-gray-900 border border-gray-700 p-4 rounded retro-border">
      {/* Track Info */}
      <div className="mb-4">
        <div className="flex justify-between items-start mb-2">
          <div>
            <h3 className="text-green-400 font-bold font-mono text-sm retro-glow">{title}</h3>
            <p className="text-gray-400 text-xs font-mono">{artist}</p>
            {ticker && (
              <span className="inline-block bg-green-400 text-black px-2 py-1 text-xs font-mono font-bold mt-1">
                ${ticker}
              </span>
            )}
          </div>
          <div className="text-right">
            <div className="text-xs text-gray-500 font-mono">
              {formatTime(currentTime)} / {formatTime(duration)}
            </div>
          </div>
        </div>
        
        {description && (
          <p className="text-gray-500 text-xs font-mono mb-3">{description}</p>
        )}
      </div>

      {/* Audio Controls */}
      <div className="space-y-3">
        {/* Progress Bar */}
        <div className="relative">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full h-1 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
            style={{
              background: `linear-gradient(to right, #10b981 0%, #10b981 ${(currentTime / duration) * 100}%, #374151 ${(currentTime / duration) * 100}%, #374151 100%)`
            }}
          />
        </div>

        {/* Play/Pause Button */}
        <div className="flex items-center justify-center space-x-3">
          <button
            onClick={togglePlayPause}
            disabled={loading || error}
            className="bg-green-400 hover:bg-green-300 text-black px-6 py-2 font-mono text-sm font-bold transition-colors duration-200 disabled:bg-gray-600 disabled:text-gray-400"
          >
            {loading ? '[LOADING...]' : error ? '[ERROR]' : isPlaying ? '[PAUSE]' : '[PLAY]'}
          </button>
          
          {error && (
            <button
              onClick={tryFallbackGateway}
              className="bg-red-500 hover:bg-red-400 text-white px-4 py-2 font-mono text-xs font-bold transition-colors duration-200"
            >
              [TRY FALLBACK]
            </button>
          )}
        </div>

        {/* Hidden Audio Element */}
        <audio
          ref={audioRef}
          src={currentUrl}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onEnded={() => setIsPlaying(false)}
          onError={() => {
            setLoading(false);
            setError(true);
            console.error('Error loading audio from:', currentUrl);
          }}
          preload="metadata"
        />

        {/* IPFS URL */}
        <div className="border-t border-gray-800 pt-3">
          <div className="text-xs text-gray-500 font-mono mb-1">IPFS URL:</div>
          <a 
            href={audioUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-green-400 hover:text-green-300 text-xs font-mono break-all"
          >
            {audioUrl}
          </a>
        </div>
      </div>

      <style jsx>{`
        .slider::-webkit-slider-thumb {
          appearance: none;
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #000;
        }
        
        .slider::-moz-range-thumb {
          height: 12px;
          width: 12px;
          border-radius: 50%;
          background: #10b981;
          cursor: pointer;
          border: 2px solid #000;
        }
      `}</style>
    </div>
  );
}
