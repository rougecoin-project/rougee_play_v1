# Lighthouse IPFS Integration Guide

## Overview

Rougee Play uses Lighthouse Web3 SDK for decentralized storage of music files and metadata. This guide explains how the authentication flow works and how to properly use the SDK in this application.

## Authentication Flow

The Lighthouse SDK requires proper wallet-based authentication for secure file operations:

### 1. Upload Authentication

```typescript
// Get wallet signer from useLighthouseAuth hook
const signer = await getLighthouseSigner();

// Upload file with authentication
const result = await lighthouseService.uploadMusicFile(
  file,
  metadata,
  signer // Pass signer for authentication
);
```

### 2. Fetching User Files Authentication

```typescript
// 1. Get authentication message from Lighthouse API
const authMessage = await lighthouse.getAuthMessage(address);

// 2. Sign this message with wallet
const signedMessage = await signer.signMessage(authMessage);

// 3. Pass both address and signed message to API
const files = await lighthouse.getUploads(address, signedMessage);
```

## Common Issues

### 401 Unauthorized Errors

If you encounter 401 errors when fetching user files, check these common causes:

1. **Missing Authentication**: The `getUploads` method requires a signed message
2. **Invalid Signature**: Ensure you're using the correct format for the auth message
3. **Wrong Address**: The address must match the signing wallet's address
4. **Expired Signature**: Authentication may need to be refreshed

### File Structure

For music files, we upload both the audio file and a separate metadata file:

1. Audio file is uploaded to IPFS first
2. Metadata JSON is created with audio file's CID
3. Metadata is uploaded separately with file references
4. Both files are linked to the user's wallet address

## Using the Hook

The `useLighthouseAuth` hook provides convenient methods for authentication:

```typescript
const { 
  address, 
  isConnected, 
  isAuthenticating,
  getAuthSignature, 
  getLighthouseSigner 
} = useLighthouseAuth();
```

- `getAuthSignature()`: Returns object with address, signature, and message
- `getLighthouseSigner()`: Returns a signer object compatible with Lighthouse SDK

## Resources

- [Lighthouse Docs](https://docs.lighthouse.storage/)
- [Lighthouse JS SDK on NPM](https://www.npmjs.com/package/@lighthouse-web3/sdk)