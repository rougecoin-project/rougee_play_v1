# QuickNode IPFS Integration

This project uses QuickNode's IPFS API for decentralized file storage and retrieval.

## Setup Instructions

1. Create a QuickNode account at [https://quicknode.com](https://quicknode.com) if you don't have one already
2. Set up an IPFS endpoint in your QuickNode dashboard
3. Get your API key from the QuickNode dashboard
4. Copy the `.env.sample` file to `.env.local` and add your QuickNode API key:

```
NEXT_PUBLIC_QUICKNODE_API_KEY=your_quicknode_api_key_here
NEXT_PUBLIC_QUICKNODE_GATEWAY_URL=https://gateway.quicknode.com/ipfs/
```

5. Install dependencies:

```
npm install
```

## Testing the QuickNode Integration

Run the test script to verify your QuickNode API connection:

```
npm run test-quicknode
```

If successful, you should see a confirmation message.

## Usage in the Application

The QuickNode service provides the following functionality:

- `uploadMusicFile`: Upload a music file with metadata
- `uploadAlbumArt`: Upload album artwork
- `uploadAlbum`: Upload a complete album (multiple tracks + artwork)
- `getFileInfo`: Get file information from an IPFS hash
- `getUserFiles`: Get files uploaded by a specific user
- `getAllNetworkFiles`: Get all public files
- `searchFilesByMetadata`: Search for files by metadata content

## Implementation Notes

- All IPFS operations use QuickNode's API which provides faster pinning and retrieval
- The implementation includes fallback gateways if the QuickNode gateway is unavailable
- Uploads include timeout protection based on file size
- Metadata is automatically generated and linked to files

## Troubleshooting

- If you see API key errors, check your `.env.local` file
- If uploads fail, verify your QuickNode subscription has sufficient storage
- For gateway issues, the system will attempt to use fallback gateways