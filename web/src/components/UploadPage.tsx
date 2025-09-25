'use client';

import { useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import { lighthouseService, MusicMetadata } from '@/lib/lighthouse';
import { useLighthouseAuth } from '@/hooks/useLighthouseAuth';

export function UploadPage() {
  const { address, isConnected } = useAccount();
  const { getLighthouseSigner } = useLighthouseAuth();
  const [activeTab, setActiveTab] = useState<'upload' | 'my-files' | 'all-files'>('upload');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  
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

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), `> ${message}`]);
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
    addLog(`FILE SELECTED: ${file.name}`);
  };

  const handleMetadataSubmit = async (e: React.FormEvent) => {
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
    setUploadProgress(25);
    addLog('INITIALIZING IPFS UPLOAD...');

    try {
      // Get the authenticated signer for Lighthouse
      const signer = await getLighthouseSigner();
      addLog('WALLET AUTHENTICATED');
      
      setUploadProgress(50);

      const result = await lighthouseService.uploadMusicFile(
        selectedFile,
        {
          ...metadata,
          owner: address || 'unknown',
          uploadedBy: address || 'unknown'
        },
        signer
      );

      setUploadProgress(100);
      addLog(`SUCCESS: UPLOADED TO IPFS`);
      addLog(`HASH: ${result.hash}`);
      setUploadResult(result.url);
      
    } catch (error) {
      addLog(`ERROR: UPLOAD FAILED - ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const resetForm = () => {
    setSelectedFile(null);
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
    
    addLog('LOADING USER FILES...');
    try {
      const files = await lighthouseService.getUserFiles(address);
      addLog(`FOUND ${files.length} FILES`);
      // TODO: Display files in UI
    } catch (error) {
      addLog('ERROR: FAILED TO LOAD FILES');
      console.error('File loading error:', error);
    }
  };

  const loadAllFiles = async () => {
    addLog('LOADING NETWORK FILES...');
    // Implementation would go here
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

        {/* Navigation */}
        <div className="mb-8">
          <div className="flex space-x-4 mb-4">
            {[
              { key: 'upload', label: 'UPLOAD' },
              { key: 'my-files', label: 'MY_FILES' },
              { key: 'all-files', label: 'NETWORK' },
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
          {activeTab === 'upload' && (
            <div className="p-6">
              {!showMetadataForm && !uploadResult && (
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

              {showMetadataForm && !uploading && !uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} FILE: {selectedFile?.name}
                  </div>
                  <div className="text-xs text-gray-500 mb-6">
                    {'>'} ENTER TRACK METADATA
                  </div>
                  
                  <form onSubmit={handleMetadataSubmit} className="space-y-4">
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
                        disabled={!isConnected}
                        className="bg-green-400 text-black px-6 py-2 text-xs font-mono font-bold hover:bg-green-300 disabled:bg-gray-700 disabled:text-gray-500"
                      >
                        {!isConnected ? '[CONNECT WALLET]' : '[UPLOAD TO IPFS]'}
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
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} UPLOADING TO IPFS...
                  </div>
                  <div className="mb-6">
                    <div className="bg-gray-900 h-1 mb-2">
                      <div 
                        className="bg-green-400 h-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                    <div className="text-xs text-gray-500">
                      PROGRESS: {uploadProgress}%
                    </div>
                  </div>
                </>
              )}

              {uploadResult && (
                <>
                  <div className="text-xs text-gray-500 mb-4">
                    {'>'} UPLOAD SUCCESSFUL!
                  </div>
                  <div className="bg-green-400/10 border border-green-400 p-4 mb-6">
                    <div className="text-xs text-green-400 mb-2">IPFS URL:</div>
                    <a 
                      href={uploadResult} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-xs text-green-400 hover:underline break-all font-mono"
                    >
                      {uploadResult}
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
              <div className="text-center py-16 text-gray-700">
                <div className="text-2xl mb-4">🎵</div>
                <div className="text-xs">NO FILES FOUND</div>
                <div className="text-xs mt-2">USE [UPLOAD] TO ADD MUSIC</div>
              </div>
            </div>
          )}

          {activeTab === 'all-files' && (
            <div className="p-6">
              <div className="text-xs text-gray-500 mb-4">
                {'>'} NETWORK MUSIC DATABASE
              </div>
              <div className="text-center py-16 text-gray-700">
                <div className="text-2xl mb-4">🌐</div>
                <div className="text-xs">SCANNING NETWORK...</div>
                <div className="text-xs mt-2">NO TRACKS DISCOVERED</div>
              </div>
            </div>
          )}
        </div>

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