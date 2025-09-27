/**
 * ACRCloud Music Recognition Service
 * Detects copyrighted music using ACRCloud's Music Database
 * Based on: https://docs.acrcloud.com/tutorials/recognize-music
 */

import crypto from 'crypto';

interface ACRCloudConfig {
  host: string;
  accessKey: string;
  accessSecret: string;
}

interface ACRCloudResponse {
  status: {
    msg: string;
    code: number;
    version: string;
  };
  metadata?: {
    timestamp_utc: string;
    music?: Array<{
      external_ids?: {
        isrc?: string;
        upc?: string;
        spotify?: { track?: { id: string } };
        deezer?: { track?: { id: string } };
        youtube?: { vid?: string };
      };
      score: number;
      title: string;
      artists: Array<{ name: string }>;
      album?: { name: string };
      release_date?: string;
      duration_ms: number;
      play_offset_ms: number;
      label?: string;
    }>;
  };
}

class ACRCloudService {
  private config: ACRCloudConfig;

  constructor() {
    this.config = {
      host: process.env.NEXT_PUBLIC_ACRCLOUD_HOST || 'identify-us-west-2.acrcloud.com',
      accessKey: process.env.NEXT_PUBLIC_ACRCLOUD_ACCESS_KEY || 'ffe1111392c55f77a2c79c4da280d72e',
      accessSecret: process.env.NEXT_PUBLIC_ACRCLOUD_ACCESS_SECRET || '7PX52kCrxpo5utqXATWa47iKRc0ehe3mlUIij8TQ'
    };
  }

  /**
   * Generate signature for ACRCloud API
   */
  private generateSignature(
    httpMethod: string,
    uri: string,
    accessKey: string,
    dataType: string,
    signatureVersion: string,
    timestamp: number
  ): string {
    const stringToSign = [
      httpMethod,
      uri,
      accessKey,
      dataType,
      signatureVersion,
      timestamp
    ].join('\n');

    return crypto
      .createHmac('sha1', this.config.accessSecret)
      .update(Buffer.from(stringToSign, 'utf-8'))
      .digest('base64');
  }

  /**
   * Check if an audio file contains copyrighted music
   * Returns true if original content (safe to upload)
   * Returns false if copyrighted content detected
   */
  async checkCopyright(audioFile: File): Promise<{
    isOriginal: boolean;
    confidence: number;
    detectedMusic?: {
      title: string;
      artist: string;
      album?: string;
      score: number;
    };
    error?: string;
  }> {
    try {
      console.log('🔍 Starting ACRCloud copyright check...');
      
      // Convert file to buffer for processing
      const arrayBuffer = await audioFile.arrayBuffer();
      const audioBuffer = Buffer.from(arrayBuffer);
      
      // Take first 10 seconds for recognition (ACRCloud recommendation)
      const sampleSize = Math.min(audioBuffer.length, 1024 * 1024); // 1MB max
      const audioSample = audioBuffer.slice(0, sampleSize);

      const httpMethod = 'POST';
      const httpUri = '/v1/identify';
      const dataType = 'audio';
      const signatureVersion = '1';
      const timestamp = Date.now();

      const signature = this.generateSignature(
        httpMethod,
        httpUri,
        this.config.accessKey,
        dataType,
        signatureVersion,
        timestamp
      );

      // Prepare form data
      const formData = new FormData();
      formData.append('sample', new Blob([audioSample]), 'sample.mp3');
      formData.append('sample_bytes', sampleSize.toString());
      formData.append('access_key', this.config.accessKey);
      formData.append('data_type', dataType);
      formData.append('signature_version', signatureVersion);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());

      console.log('📡 Sending request to ACRCloud...');
      
      const response = await fetch(`https://${this.config.host}${httpUri}`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`ACRCloud API error: ${response.status} ${response.statusText}`);
      }

      const result: ACRCloudResponse = await response.json();
      console.log('📄 ACRCloud response:', result);

      if (result.status.code !== 0) {
        if (result.status.code === 1001) {
          // No music detected - this is good, original content
          console.log('✅ No copyrighted music detected');
          return {
            isOriginal: true,
            confidence: 100
          };
        } else {
          // Other error codes
          console.error('❌ ACRCloud error:', result.status.msg);
          return {
            isOriginal: false,
            confidence: 0,
            error: result.status.msg
          };
        }
      }

      // Music detected - check if it's copyrighted
      const music = result.metadata?.music?.[0];
      if (music) {
        console.log('🎵 Music detected:', {
          title: music.title,
          artist: music.artists?.[0]?.name,
          score: music.score
        });

        // High confidence detection means copyrighted content
        const isHighConfidence = music.score >= 80; // 80+ score is high confidence
        
        return {
          isOriginal: !isHighConfidence,
          confidence: music.score,
          detectedMusic: {
            title: music.title,
            artist: music.artists?.[0]?.name || 'Unknown',
            album: music.album?.name,
            score: music.score
          }
        };
      }

      // No music in response but status was success
      console.log('✅ No copyrighted music detected in response');
      return {
        isOriginal: true,
        confidence: 100
      };

    } catch (error) {
      console.error('❌ ACRCloud copyright check failed:', error);
      return {
        isOriginal: false,
        confidence: 0,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  }

  /**
   * Test ACRCloud connection
   */
  async testConnection(): Promise<boolean> {
    try {
      // Create a minimal test request
      const httpMethod = 'POST';
      const httpUri = '/v1/identify';
      const dataType = 'audio';
      const signatureVersion = '1';
      const timestamp = Date.now();

      const signature = this.generateSignature(
        httpMethod,
        httpUri,
        this.config.accessKey,
        dataType,
        signatureVersion,
        timestamp
      );

      const formData = new FormData();
      formData.append('access_key', this.config.accessKey);
      formData.append('data_type', dataType);
      formData.append('signature_version', signatureVersion);
      formData.append('signature', signature);
      formData.append('timestamp', timestamp.toString());
      // No sample data - should return "no result" but confirms connection

      const response = await fetch(`https://${this.config.host}${httpUri}`, {
        method: 'POST',
        body: formData,
      });

      console.log('ACRCloud connection test:', response.status);
      return response.ok;
      
    } catch (error) {
      console.error('ACRCloud connection test failed:', error);
      return false;
    }
  }
}

// Export singleton instance
export const acrCloudService = new ACRCloudService();
export type { ACRCloudResponse };
