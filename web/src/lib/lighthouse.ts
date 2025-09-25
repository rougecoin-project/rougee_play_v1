import * as lighthouse from '@lighthouse-web3/sdk';

// Simplified types to match actual Lighthouse SDK
export interface LighthouseUploadResponse {
  data: {
    Hash: string;
    Name: string;
    Size: string;
  };
}

export interface FileInfo {
  [key: string]: unknown;
}

export interface MusicMetadata {
  title: string;
  artist: string;
  album: string;
  duration: number;
  genre?: string;
  releaseDate?: string;
}

export interface AlbumMetadata {
  title: string;
  artist: string;
  releaseDate: string;
  genre?: string;
  description?: string;
  trackCount: number;
}

class LighthouseService {
  private apiKey: string;

  constructor() {
    this.apiKey = process.env.NEXT_PUBLIC_LIGHTHOUSE_API_KEY || '';
    if (!this.apiKey) {
      console.warn('Lighthouse API key not found');
    }
  }

  // Upload single music file with metadata
  async uploadMusicFile(
    file: File, 
    metadata: MusicMetadata,
    signer?: unknown  // Will be properly typed when integrated with wagmi
  ): Promise<{ hash: string; url: string }> {
    try {
      // Create metadata JSON
      const metadataBlob = new Blob([JSON.stringify(metadata)], { 
        type: 'application/json' 
      });
      const metadataFile = new File([metadataBlob], 'metadata.json');

      // Upload music file
      const musicUpload = await lighthouse.upload([file], this.apiKey);
      const musicHash = musicUpload.data.Hash;

      // Upload metadata
      const metadataUpload = await lighthouse.upload([metadataFile], this.apiKey);
      const metadataHash = metadataUpload.data.Hash;

      // Create combined metadata with IPFS hashes
      const combinedMetadata = {
        ...metadata,
        audioHash: musicHash,
        audioUrl: `https://gateway.lighthouse.storage/ipfs/${musicHash}`,
        metadataHash: metadataHash,
        uploadedAt: new Date().toISOString(),
        fileSize: file.size,
        fileName: file.name,
        mimeType: file.type
      };

      // Upload final combined metadata
      const finalMetadataBlob = new Blob([JSON.stringify(combinedMetadata)], { 
        type: 'application/json' 
      });
      const finalMetadataFile = new File([finalMetadataBlob], 'final-metadata.json');
      const finalUpload = await lighthouse.upload([finalMetadataFile], this.apiKey);

      return {
        hash: finalUpload.data.Hash,
        url: `https://gateway.lighthouse.storage/ipfs/${finalUpload.data.Hash}`
      };
    } catch (error) {
      console.error('Error uploading music file:', error);
      throw new Error('Failed to upload music file to IPFS');
    }
  }

  // Upload album artwork
  async uploadAlbumArt(
    imageFile: File,
    metadata: AlbumMetadata,
    signer?: unknown  // Will be properly typed when integrated with wagmi
  ): Promise<{ hash: string; url: string }> {
    try {
      // Upload image
      const imageUpload = await lighthouse.upload([imageFile], this.apiKey);
      const imageHash = imageUpload.data.Hash;

      // Create metadata with image hash
      const albumMetadata = {
        ...metadata,
        imageHash: imageHash,
        imageUrl: `https://gateway.lighthouse.storage/ipfs/${imageHash}`,
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
      const metadataUpload = await lighthouse.upload([metadataFile], this.apiKey);

      return {
        hash: metadataUpload.data.Hash,
        url: `https://gateway.lighthouse.storage/ipfs/${metadataUpload.data.Hash}`
      };
    } catch (error) {
      console.error('Error uploading album art:', error);
      throw new Error('Failed to upload album art to IPFS');
    }
  }

  // Upload complete album (multiple tracks + artwork)
  async uploadAlbum(
    tracks: { file: File; metadata: MusicMetadata }[],
    albumArt: File,
    albumMetadata: AlbumMetadata,
    signer?: unknown  // Will be properly typed when integrated with wagmi
  ): Promise<{ hash: string; url: string; trackHashes: string[] }> {
    try {
      // Upload album artwork first
      const artUpload = await this.uploadAlbumArt(albumArt, albumMetadata, signer);

      // Upload all tracks
      const trackPromises = tracks.map(async ({ file, metadata }) => {
        const trackUpload = await this.uploadMusicFile(file, metadata, signer);
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
      const finalUpload = await lighthouse.upload([albumFile], this.apiKey);

      return {
        hash: finalUpload.data.Hash,
        url: `https://gateway.lighthouse.storage/ipfs/${finalUpload.data.Hash}`,
        trackHashes: uploadedTracks.map(track => track.hash)
      };
    } catch (error) {
      console.error('Error uploading complete album:', error);
      throw new Error('Failed to upload album to IPFS');
    }
  }

  // Get file info from IPFS hash
  async getFileInfo(hash: string): Promise<FileInfo> {
    try {
      const response = await fetch(`https://gateway.lighthouse.storage/ipfs/${hash}`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching file info:', error);
      throw new Error('Failed to fetch file from IPFS');
    }
  }

  // Get user's uploaded files
  async getUserFiles(address: string): Promise<unknown[]> {
    try {
      const files = await lighthouse.getUploads(address);
      return files.data.fileList || [];
    } catch (error) {
      console.error('Error fetching user files:', error);
      return [];
    }
  }
}

export const lighthouseService = new LighthouseService();