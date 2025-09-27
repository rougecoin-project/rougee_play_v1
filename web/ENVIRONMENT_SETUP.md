# Environment Setup Guide

## QuickNode API Key Configuration

The 404 error you're seeing is because the QuickNode API key is not configured. Follow these steps to fix it:

### Step 1: Get a QuickNode API Key

1. Go to [https://quicknode.com/](https://quicknode.com/)
2. Create an account or sign in
3. Navigate to your dashboard
4. Set up an IPFS endpoint
5. Copy your API key

### Step 2: Create Environment File

Create a file named `.env.local` in the `web` directory with the following content:

```bash
# QuickNode IPFS API Configuration
NEXT_PUBLIC_QUICKNODE_API_KEY=your_actual_api_key_here
```

Replace `your_actual_api_key_here` with your actual QuickNode API key.

### Step 3: Test the Connection

Run the test script to verify your configuration:

```bash
cd web
node test-quicknode.js
```

If successful, you should see:
```
✅ QuickNode API Connection Successful!
```

### Step 4: Restart the Development Server

After setting up the environment file, restart your Next.js development server:

```bash
npm run dev
```

## Troubleshooting

- **404 Error**: This means the API key is missing or invalid
- **403 Error**: This means the API key is invalid or expired
- **Network Error**: Check your internet connection

## Alternative: Use Mock Data

If you don't want to set up QuickNode right now, the application will fall back to mock data when the API key is not configured. However, uploads will not work without a valid API key.
