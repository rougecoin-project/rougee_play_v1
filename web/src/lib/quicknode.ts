/* eslint-disable @typescript-eslint/no-explicit-any */

// Types for QuickNode IPFS API
export interface QuickNodeUploadResponse {
  id?: string;
  cid?: string;
  Hash?: string;
  name?: string;
  size?: number;
  created?: string;
  pin?: {
    cid: string;
    [key: string]: any;
  };
  [key: string]: any;
}

export interface FileInfo {
  [key: string]: unknown;
}

export interface MusicMetadata {
  title: string;
  artist: string;
  ticker: string;
  description: string;
  album?: string;
  duration?: number;
  genre?: string;
  releaseDate?: string;
  // User identification
  owner?: string;
  uploadedBy?: string;
  // Album cover
  coverImage?: File;
  coverHash?: string;
  coverUrl?: string;
  // Upload tier
  tier?: string;
}

export interface AlbumMetadata {
  title: string;
  artist: string;
  releaseDate: string;
  genre?: string;
  description?: string;
  trackCount: number;
}

// Multiple IPFS gateways for reliability and failover
const GATEWAY_URLS = [
  'https://gateway.pinata.cloud/ipfs/',
  'https://ipfs.io/ipfs/',
  'https://cloudflare-ipfs.com/ipfs/',
  'https://dweb.link/ipfs/',
  'https://4everland.io/ipfs/',
  'https://gateway.ipfs.io/ipfs/'
];

class QuickNodeService {
  private apiKey: string;
  private readonly apiUrl: string = 'https://api.quicknode.com/ipfs/rest';
  private readonly gatewayUrl: string = 'https://ipfs.io/ipfs/';

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_QUICKNODE_API_KEY || '';
    if (!this.apiKey) {
      console.error('QuickNode API key not found! Please set NEXT_PUBLIC_QUICKNODE_API_KEY in your environment variables.');
      console.error('Get your API key from: https://quicknode.com/');
    }
  }

  // Helper to get a gateway URL for a given CID
  private getGatewayUrl(cid: string, preferredGateway?: string): string {
    // If preferred gateway is specified, try that first
    if (preferredGateway) {
      return preferredGateway.endsWith('/') 
        ? `${preferredGateway}${cid}`
        : `${preferredGateway}/${cid}`;
    }

    // Default to QuickNode gateway
    return `${this.gatewayUrl}${cid}`;
  }

  // Test API key and connection
  testConnection = async (): Promise<boolean> => {
    try {
      if (!this.apiKey) {
        console.error('❌ QuickNode API key not configured!');
        console.error('Please set NEXT_PUBLIC_QUICKNODE_API_KEY in your .env.local file');
        console.error('Get your API key from: https://quicknode.com/');
        return false;
      }

      console.log('Testing QuickNode IPFS API connection...');
      console.log('API URL:', `${this.apiUrl}/v1/pinning?pageNumber=1&perPage=10`);
      console.log('API Key (first 8 chars):', this.apiKey.substring(0, 8) + '...');
      
      // Make a simple request to check the API connection
      try {
        console.log('Testing pinning endpoint...');
        const response = await fetch(`${this.apiUrl}/v1/pinning?pageNumber=1&perPage=10`, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          },
          cache: 'no-store'
        });
        
        console.log(`QuickNode API status:`, response.status, response.statusText);
        
        if (response.ok) {
          console.log(`✅ QuickNode IPFS API is reachable!`);
          return true;
        } else if (response.status === 401) {
          console.error(`❌ QuickNode API authentication failed (401)`);
          console.error('Your API key may be invalid or expired');
          console.error('Please check your API key at: https://quicknode.com/');
          return false;
        } else if (response.status === 404) {
          console.error(`❌ QuickNode API endpoint not found (404)`);
          console.error('This usually means your API key is invalid or the endpoint is wrong');
          console.error('Please verify your API key at: https://quicknode.com/');
          
          // Try to get more details from the response
          try {
            const errorText = await response.text();
            console.error('Response body:', errorText);
          } catch (e) {
            console.error('Could not read response body');
          }
          return false;
        } else {
          console.error(`❌ QuickNode IPFS API returned error:`, response.status, response.statusText);
          return false;
        }
      } catch (fetchError) {
        console.error('Failed to reach QuickNode API:', fetchError);
        console.error('This could be a network issue or the API is down');
        return false;
      }
    } catch (error) {
      console.error('QuickNode API connection test failed:', error);
      return false;
    }
  };

  // Upload single music file with metadata
  uploadMusicFile = async (
    file: File, 
    metadata: MusicMetadata,
    coverFile?: File
  ): Promise<{ hash: string; url: string; musicHash: string; musicUrl: string; coverHash?: string; coverUrl?: string }> => {
    try {
      // Check if API key is available
      if (!this.apiKey) {
        console.error('QuickNode API key is not configured!');
        console.error('Please set NEXT_PUBLIC_QUICKNODE_API_KEY in your environment variables.');
        throw new Error('QuickNode API key not configured. Please set NEXT_PUBLIC_QUICKNODE_API_KEY environment variable.');
      }

      let coverHash: string | undefined;
      let coverUrl: string | undefined;

      // Upload cover image first (if provided)
      if (coverFile) {
        console.log('Starting cover image upload...');
        console.log('Cover file details:', {
          name: coverFile.name,
          size: coverFile.size,
          type: coverFile.type
        });

        try {
          const coverFormData = new FormData();
          coverFormData.append('Body', coverFile);
          coverFormData.append('Key', `cover-${Date.now()}-${coverFile.name}`);
          coverFormData.append('ContentType', coverFile.type);

          const coverResponse = await fetch(`${this.apiUrl}/v1/s3/put-object`, {
            method: 'POST',
            headers: {
              'x-api-key': this.apiKey,
            },
            body: coverFormData
          });

          if (!coverResponse.ok) {
            const errorText = await coverResponse.text();
            console.error('Cover upload failed with status:', coverResponse.status, errorText);
            throw new Error(`Cover upload failed: ${coverResponse.status} ${coverResponse.statusText}`);
          }

          const coverUploadResult = await coverResponse.json();
          console.log('Cover upload response:', coverUploadResult);

          if (coverUploadResult?.pin?.cid) {
            coverHash = coverUploadResult.pin.cid;
            coverUrl = coverHash ? this.getGatewayUrl(coverHash) : undefined;
            console.log('✅ Cover uploaded successfully:', coverHash);
          }
        } catch (coverError) {
          console.error('Cover upload failed:', coverError);
          // Continue with music upload even if cover fails
        }
      }
      
      // Upload music file
      console.log('Starting music file upload...');
      console.log('File details:', {
        name: file.name,
        size: file.size,
        type: file.type
      });
      
      let musicUpload: QuickNodeUploadResponse;
      try {
        // Add timeout protection for the upload
        console.log('Starting music file upload with timeout protection...');
        
        const formData = new FormData();
        formData.append('Body', file);
        formData.append('Key', file.name);
        formData.append('ContentType', file.type);
        
        // Calculate timeout based on file size (1 minute per MB, minimum 2 minutes)
        const fileSizeMB = file.size / (1024 * 1024);
        const timeoutMs = Math.max(120000, fileSizeMB * 60000); // 2 minutes minimum, 1 minute per MB
        
        console.log(`Setting timeout to ${timeoutMs / 1000} seconds for ${fileSizeMB.toFixed(2)}MB file`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
        
        const uploadStartTime = Date.now();
        const response = await fetch(`${this.apiUrl}/v1/s3/put-object`, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
          },
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Upload failed with status:', response.status, errorText);
          throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
        }
        
        musicUpload = await response.json();
        const uploadDuration = Date.now() - uploadStartTime;
        console.log(`Music upload completed in ${uploadDuration}ms`);
        console.log('Music upload response:', musicUpload);
      } catch (uploadError) {
        console.error('Music upload failed:', uploadError);
        
        // Check for timeout errors
        if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
          console.error('Upload timed out - this might be due to large file size or network issues');
          throw new Error('Upload timed out. Try with a smaller file or check your network connection.');
        }
        
        throw uploadError;
      }
      
      if (!musicUpload || !musicUpload.pin || !musicUpload.pin.cid) {
        console.error('Invalid upload response structure:', musicUpload);
        throw new Error('Invalid response from QuickNode API');
      }
      
      const musicHash = musicUpload.pin.cid;

      // Create complete metadata with IPFS hash and technical details
      const completeMetadata = {
        ...metadata,
        // Ensure owner and uploadedBy are preserved from the metadata
        owner: metadata.owner || '', 
        uploadedBy: metadata.uploadedBy || '', 
        // IPFS and technical details
        audioHash: musicHash,
        audioUrl: this.getGatewayUrl(musicHash),
        coverHash: coverHash,
        coverUrl: coverUrl,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type
      };

      // Upload the complete metadata file
      console.log('Uploading metadata file...');
      const metadataBlob = new Blob([JSON.stringify(completeMetadata, null, 2)], { 
        type: 'application/json' 
      });
      const metadataFile = new File([metadataBlob], 'metadata.json');
      
      console.log('Metadata file details:', {
        name: metadataFile.name,
        size: metadataFile.size,
        type: metadataFile.type
      });
      
      let metadataUpload: QuickNodeUploadResponse;
      try {
        // Add timeout protection for the metadata upload
        console.log('Starting metadata upload...');
        
        const formData = new FormData();
        formData.append('Body', metadataFile);
        formData.append('Key', `metadata-${Date.now()}.json`);
        formData.append('ContentType', 'application/json');
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 120000); // 2 minute timeout for metadata
        
        const metadataStartTime = Date.now();
        const response = await fetch(`${this.apiUrl}/v1/s3/put-object`, {
          method: 'POST',
          headers: {
            'x-api-key': this.apiKey,
          },
          body: formData,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error('Metadata upload failed with status:', response.status, errorText);
          throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
        }
        
        metadataUpload = await response.json();
        const metadataDuration = Date.now() - metadataStartTime;
        console.log(`Metadata upload completed in ${metadataDuration}ms`);
        console.log('Metadata upload response:', metadataUpload);
      } catch (uploadError) {
        console.error('Metadata upload failed:', uploadError);
        
        // Check for timeout errors
        if (uploadError instanceof DOMException && uploadError.name === 'AbortError') {
          console.error('Metadata upload timed out - this is unusual for small JSON files');
          throw new Error('Metadata upload timed out. The QuickNode API might be experiencing issues.');
        }
        
        throw uploadError;
      }
      
      if (!metadataUpload || !metadataUpload.pin || !metadataUpload.pin.cid) {
        console.error('Invalid metadata upload response structure:', metadataUpload);
        throw new Error('Invalid response from QuickNode API');
      }

      return {
        hash: metadataUpload.pin.cid,
        url: this.getGatewayUrl(metadataUpload.pin.cid),
        musicHash: musicHash,
        musicUrl: this.getGatewayUrl(musicHash),
        coverHash: coverHash,
        coverUrl: coverUrl
      };
    } catch (error) {
      console.error('Error uploading music file:', error);
      throw new Error(`Failed to upload music file to IPFS: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  // Upload album artwork
  uploadAlbumArt = async (
    imageFile: File,
    metadata: AlbumMetadata
  ): Promise<{ hash: string; url: string }> => {
    try {
      // Upload image
      const formData = new FormData();
      formData.append('file', imageFile);
      
      const response = await fetch(`${this.apiUrl}/pinning/pinFile`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
      }
      
      const imageUpload = await response.json();
      const imageHash = imageUpload.cid;

      // Create metadata with image hash
      const albumMetadata = {
        ...metadata,
        imageHash: imageHash,
        imageUrl: this.getGatewayUrl(imageHash),
        uploadedAt: new Date().toISOString(),
        imageSize: imageFile.size,
        imageName: imageFile.name,
        imageMimeType: imageFile.type
      };

      // Upload metadata
      const metadataBlob = new Blob([JSON.stringify(albumMetadata)], { 
        type: 'application/json' 
      });
      const metadataFile = new File([metadataBlob], 'album-metadata.json');
      
      const metadataFormData = new FormData();
      metadataFormData.append('file', metadataFile);
      
      const metadataResponse = await fetch(`${this.apiUrl}/pinning/pinFile`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
        body: metadataFormData
      });
      
      if (!metadataResponse.ok) {
        throw new Error(`QuickNode API error: ${metadataResponse.status} ${metadataResponse.statusText}`);
      }
      
      const metadataUpload = await metadataResponse.json();

      return {
        hash: metadataUpload.cid,
        url: this.getGatewayUrl(metadataUpload.cid)
      };
    } catch (error) {
      console.error('Error uploading album art:', error);
      throw new Error('Failed to upload album art to IPFS');
    }
  };

  // Upload complete album (multiple tracks + artwork)
  uploadAlbum = async (
    tracks: { file: File; metadata: MusicMetadata }[],
    albumArt: File,
    albumMetadata: AlbumMetadata
  ): Promise<{ hash: string; url: string; trackHashes: string[] }> => {
    try {
      // Upload album artwork first
      const artUpload = await this.uploadAlbumArt(albumArt, albumMetadata);

      // Upload all tracks
      const trackPromises = tracks.map(async ({ file, metadata }) => {
        const trackUpload = await this.uploadMusicFile(file, metadata);
        return {
          ...metadata,
          hash: trackUpload.hash,
          url: trackUpload.url
        };
      });

      const uploadedTracks = await Promise.all(trackPromises);

      // Create complete album metadata
      const completeAlbumMetadata = {
        ...albumMetadata,
        albumArtHash: artUpload.hash,
        albumArtUrl: artUpload.url,
        tracks: uploadedTracks,
        totalTracks: tracks.length,
        uploadedAt: new Date().toISOString()
      };

      // Upload final album metadata
      const albumBlob = new Blob([JSON.stringify(completeAlbumMetadata)], { 
        type: 'application/json' 
      });
      const albumFile = new File([albumBlob], 'complete-album.json');
      
      const formData = new FormData();
      formData.append('file', albumFile);
      
      const response = await fetch(`${this.apiUrl}/pinning/pinFile`, {
        method: 'POST',
        headers: {
          'x-api-key': this.apiKey,
        },
        body: formData
      });
      
      if (!response.ok) {
        throw new Error(`QuickNode API error: ${response.status} ${response.statusText}`);
      }
      
      const finalUpload = await response.json();

      return {
        hash: finalUpload.cid,
        url: this.getGatewayUrl(finalUpload.cid),
        trackHashes: uploadedTracks.map(track => track.hash)
      };
    } catch (error) {
      console.error('Error uploading complete album:', error);
      throw new Error('Failed to upload album to IPFS');
    }
  };

  // Get file info from IPFS hash with robust fallback system
  getFileInfo = async (hash: string): Promise<FileInfo> => {
    // Remove duplicates and ensure we have all gateways
    const allGateways = Array.from(new Set([
      this.gatewayUrl,
      ...GATEWAY_URLS
    ]));

    console.log(`Fetching file info for hash: ${hash}`);
    
    for (let i = 0; i < allGateways.length; i++) {
      const gateway = allGateways[i];
      try {
        const url = gateway.endsWith('/') ? `${gateway}${hash}` : `${gateway}/${hash}`;
        console.log(`Trying gateway ${i + 1}/${allGateways.length}: ${gateway}`);
        
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
        
        const response = await fetch(url, { 
          cache: 'no-store',
          signal: controller.signal,
          mode: 'cors',
          headers: {
            'Accept': 'application/json,*/*'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (response.ok) {
          const data = await response.json();
          console.log(`✅ Successfully fetched from gateway: ${gateway}`);
          return data;
        } else {
          console.log(`❌ Gateway ${gateway} returned ${response.status}: ${response.statusText}`);
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        console.log(`❌ Gateway ${gateway} failed: ${errorMsg}`);
        
        // If this is the last gateway and we still failed, continue to try others
        if (i < allGateways.length - 1) {
          continue;
        }
      }
    }
    
    console.error(`❌ All ${allGateways.length} gateways failed for hash: ${hash}`);
    throw new Error(`Failed to fetch file from IPFS using all available gateways: ${hash}`);
  };

  // Get user's uploaded files - This requires authentication through QuickNode's API
  getUserFiles = async (address: string): Promise<any[]> => {
    try {
      if (!this.apiKey || this.apiKey === 'demo-project-id') {
        console.warn('QuickNode API key is not configured or using demo key. Returning mock data.');
        return this.getMockUserFiles();
      }
      
      console.log('Fetching user files for address:', address);
      
      try {
        // QuickNode's API for listing pins
        const response = await fetch(`${this.apiUrl}/v1/pinning?pageNumber=1&perPage=100`, {
          method: 'GET',
          headers: {
            'x-api-key': this.apiKey,
            'Content-Type': 'application/json'
          }
        });
        
        if (!response.ok) {
          console.warn(`QuickNode API returned ${response.status}: ${response.statusText}. Using mock data.`);
          return this.getMockUserFiles();
        }
        
        const pinsData = await response.json();
        console.log('Retrieved pins:', pinsData);
        
        // Filter and process pins to match the expected format
        // Handle different possible response structures
        let files = [];
        if (Array.isArray(pinsData.data)) {
          files = pinsData.data;
        } else if (Array.isArray(pinsData)) {
          files = pinsData;
        } else if (pinsData.pins && Array.isArray(pinsData.pins)) {
          files = pinsData.pins;
        }
        
        console.log('Processed files:', files);
        
        // For each pin, try to fetch metadata if it's likely a JSON file
        const filePromises = files.map(async (file: any) => {
          // If the pin appears to be metadata (based on naming convention)
          if (file.name && (file.name.includes('metadata') || file.name.endsWith('.json'))) {
            try {
              // Try to fetch the metadata content using the correct CID field
              const cid = file.cid || file.pin?.cid || file.hash;
              if (!cid) return null;
              
              const metadata = await this.getFileInfo(cid);
              
              // If it has music file properties, it's likely our metadata
              if (metadata && metadata.title && metadata.artist) {
                return {
                  ...metadata,
                  cid: cid,
                  status: file.status || 'pinned',
                  created: file.createdAt || file.created
                };
              }
            } catch (err) {
              console.error(`Error fetching metadata for ${file.cid || file.pin?.cid}:`, err);
            }
          }
          return null;
        });
        
        const results = await Promise.all(filePromises);
        // Filter out null values and return only music files
        const musicFiles = results.filter(Boolean);
        
        // If no music files found, return mock data
        if (musicFiles.length === 0) {
          console.warn('No music files found in IPFS. Using mock data.');
          return this.getMockUserFiles();
        }
        
        return musicFiles;
      } catch (error) {
        console.warn('Error fetching user files from QuickNode API:', error);
        return this.getMockUserFiles();
      }
    } catch (error) {
      console.error('Error in getUserFiles:', error);
      return this.getMockUserFiles();
    }
  };

  // Mock user files for development/demo purposes
  private getMockUserFiles = (): any[] => [
    {
      title: 'Digital Dreams',
      artist: 'Cyber Artist',
      ticker: 'DREAM',
      description: 'A futuristic electronic track',
      audioHash: 'QmMockHash1',
      audioUrl: 'https://example.com/audio1.mp3',
      uploadedAt: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      fileSize: 5242880,
      fileName: 'digital_dreams.mp3',
      owner: '0x1234567890123456789012345678901234567890',
      uploadedBy: '0x1234567890123456789012345678901234567890'
    },
    {
      title: 'Neon Nights',
      artist: 'Synth Master',
      ticker: 'NEON',
      description: 'Synthwave vibes for the night',
      audioHash: 'QmMockHash2',
      audioUrl: 'https://example.com/audio2.mp3',
      uploadedAt: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      fileSize: 3145728,
      fileName: 'neon_nights.mp3',
      owner: '0x1234567890123456789012345678901234567890',
      uploadedBy: '0x1234567890123456789012345678901234567890'
    },
    {
      title: 'Quantum Beat',
      artist: 'Tech DJ',
      ticker: 'QUANTUM',
      description: 'Experimental electronic music',
      audioHash: 'QmMockHash3',
      audioUrl: 'https://example.com/audio3.mp3',
      uploadedAt: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      fileSize: 7340032,
      fileName: 'quantum_beat.mp3',
      owner: '0x1234567890123456789012345678901234567890',
      uploadedBy: '0x1234567890123456789012345678901234567890'
    }
  ];

  // Get all public files - Similar to getUserFiles but without filtering
  getAllNetworkFiles = async (): Promise<any[]> => {
    try {
      return await this.getUserFiles(''); // No address filtering for network files
    } catch (error) {
      console.error('Error fetching network files:', error);
      return [];
    }
  };

  // Search for files by metadata content
  searchFilesByMetadata = async (): Promise<any[]> => {
    try {
      // QuickNode doesn't have a direct search API for IPFS content
      // Would need to implement a custom indexing solution
      console.log('Metadata search not directly supported by QuickNode API');
      return [];
    } catch (error) {
      console.error('Error searching files:', error);
      return [];
    }
  };
}

export const quickNodeService = new QuickNodeService();