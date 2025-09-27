'use client';

import { useState } from 'react';

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

interface WinampTrackListProps {
  tracks: Track[];
  onTrackSelect?: (track: Track, index: number) => void;
  selectedIndex?: number | null;
}

export function WinampTrackList({ tracks, onTrackSelect, selectedIndex }: WinampTrackListProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const formatTime = (seconds: number = 0) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatFileSize = (bytes: number = 0) => {
    const mb = bytes / (1024 * 1024);
    return `${mb.toFixed(1)}MB`;
  };

  const truncateText = (text: string, maxLength: number) => {
    return text.length > maxLength ? text.substring(0, maxLength - 3) + '...' : text;
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="bg-gray-800 border-b border-gray-700 px-3 py-2">
        <div className="grid grid-cols-12 gap-2 text-xs text-gray-400 font-mono">
          <div className="col-span-1">#</div>
          <div className="col-span-4">TITLE</div>
          <div className="col-span-3">ARTIST</div>
          <div className="col-span-2">TICKER</div>
          <div className="col-span-1">TIME</div>
          <div className="col-span-1">SIZE</div>
        </div>
      </div>

      {/* Track List */}
      <div className="max-h-96 overflow-y-auto">
        {tracks.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <div className="text-lg mb-2">🎵</div>
            <div className="text-xs">NO TRACKS FOUND</div>
          </div>
        ) : (
          tracks.map((track, index) => (
            <div
              key={index}
              className={`grid grid-cols-12 gap-2 px-3 py-1.5 text-xs font-mono cursor-pointer transition-colors border-b border-gray-800/50 ${
                selectedIndex === index
                  ? 'bg-green-400/20 text-green-300'
                  : hoveredIndex === index
                  ? 'bg-gray-700/50 text-gray-300'
                  : 'text-gray-400 hover:text-gray-300'
              }`}
              onClick={() => onTrackSelect?.(track, index)}
              onMouseEnter={() => setHoveredIndex(index)}
              onMouseLeave={() => setHoveredIndex(null)}
            >
              {/* Track Number */}
              <div className="col-span-1 flex items-center">
                {selectedIndex === index ? (
                  <span className="text-green-400">▶</span>
                ) : (
                  <span className="text-gray-500">{(index + 1).toString().padStart(2, '0')}</span>
                )}
              </div>

              {/* Title */}
              <div className="col-span-4 flex items-center">
                <span className="truncate" title={track.title}>
                  {truncateText(track.title, 25)}
                </span>
              </div>

              {/* Artist */}
              <div className="col-span-3 flex items-center">
                <span className="truncate" title={track.artist}>
                  {truncateText(track.artist, 20)}
                </span>
              </div>

              {/* Ticker */}
              <div className="col-span-2 flex items-center">
                {track.ticker ? (
                  <span className="bg-green-400/20 text-green-300 px-1 py-0.5 rounded text-xs">
                    ${track.ticker}
                  </span>
                ) : (
                  <span className="text-gray-600">--</span>
                )}
              </div>

              {/* Time */}
              <div className="col-span-1 flex items-center">
                <span className="text-gray-500">
                  {track.duration ? formatTime(track.duration) : '--:--'}
                </span>
              </div>

              {/* Size */}
              <div className="col-span-1 flex items-center">
                <span className="text-gray-500">
                  {track.fileSize ? formatFileSize(track.fileSize) : '--'}
                </span>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Footer */}
      {tracks.length > 0 && (
        <div className="bg-gray-800 border-t border-gray-700 px-3 py-1">
          <div className="flex justify-between text-xs text-gray-500 font-mono">
            <span>{tracks.length} TRACKS</span>
            <span>
              {tracks.reduce((total, track) => total + (track.fileSize || 0), 0) > 0
                ? formatFileSize(tracks.reduce((total, track) => total + (track.fileSize || 0), 0))
                : 'UNKNOWN SIZE'}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
