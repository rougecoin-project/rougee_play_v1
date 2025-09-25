'use client';

import { useState, useRef } from 'react';
import { ConnectButton } from '@rainbow-me/rainbowkit';
import { useAccount } from 'wagmi';
import axios from 'axios';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function UploadPage() {
  const { address, isConnected } = useAccount();
  const [activeTab, setActiveTab] = useState<'upload' | 'my-files' | 'all-files'>('upload');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [myFiles, setMyFiles] = useState<any[]>([]);
  const [allFiles, setAllFiles] = useState<any[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const addLog = (message: string) => {
    setLogs(prev => [...prev.slice(-4), `> ${message}`]);
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    setUploadProgress(0);
    addLog('INITIALIZING UPLOAD SEQUENCE...');

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      
      if (!file.type.startsWith('audio/')) {
        addLog(`ERROR: ${file.name} - INVALID FILE TYPE`);
        continue;
      }

      addLog(`UPLOADING: ${file.name}`);
      const formData = new FormData();
      formData.append('file', file);

      try {
        const response = await axios.post(`${API_BASE}/upload/music`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
          onUploadProgress: (progressEvent) => {
            if (progressEvent.total) {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          },
        });

        if (response.status === 201) {
          addLog(`SUCCESS: ${file.name} - UPLOAD COMPLETE`);
        }
      } catch (error) {
        addLog(`ERROR: ${file.name} - UPLOAD FAILED`);
      }

      setUploadProgress(((i + 1) / files.length) * 100);
    }

    setUploading(false);
    setUploadProgress(0);
    addLog('UPLOAD SEQUENCE COMPLETE');
    loadMyFiles();
  };

  const loadMyFiles = async () => {
    addLog('LOADING USER FILES...');
    // Implementation would go here
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
            {({ account, openAccountModal }) => (
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
                  setActiveTab(key as any);
                  if (key === 'my-files') loadMyFiles();
                  if (key === 'all-files') loadAllFiles();
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
              <div className="text-xs text-gray-500 mb-4">
                {'>'} DRAG FILES OR CLICK TO SELECT
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
                  handleFileUpload(e.dataTransfer.files);
                }}
              >
                <div className="text-4xl mb-4">🎵</div>
                <div className="text-sm text-gray-400 mb-2">DROP AUDIO FILES</div>
                <div className="text-xs text-gray-600">MP3 | WAV | FLAC | AAC | OGG | M4A</div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="audio/*"
                  multiple
                  className="hidden"
                  onChange={(e) => handleFileUpload(e.target.files)}
                />
              </div>

              {uploading && (
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