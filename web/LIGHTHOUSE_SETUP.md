# Lighthouse API Setup Guide

## Quick Fix for 401 Unauthorized Errors

The 401 errors you're seeing are caused by a missing Lighthouse API key. Here's how to fix it:

### Step 1: Get Your Lighthouse API Key

1. Go to [https://lighthouse.storage/](https://lighthouse.storage/)
2. Sign up for a free account
3. Navigate to your dashboard
4. Copy your API key

### Step 2: Create Environment File

Create a file called `.env.local` in the `web` directory with the following content:

```env
NEXT_PUBLIC_LIGHTHOUSE_API_KEY=your-actual-api-key-here
```

Replace `your-actual-api-key-here` with the API key you got from Lighthouse.

### Step 3: Restart Your Development Server

After creating the `.env.local` file:

1. Stop your development server (Ctrl+C)
2. Run `npm run dev` again
3. The 401 errors should be resolved

### Step 4: Verify Setup

1. Open your browser's developer console
2. Look for "Using API key: Valid key present" in the logs
3. Try uploading a file or viewing your files

## Troubleshooting

### If you still get 401 errors:

1. **Check the API key format**: Make sure there are no extra spaces or quotes
2. **Verify the file location**: The `.env.local` file should be in the `web` directory
3. **Restart the server**: Environment variables are only loaded when the server starts
4. **Check the console**: Look for "Lighthouse API key not configured" errors

### JSON Parsing Errors (Unexpected token 'c'):

If you see errors like `SyntaxError: Unexpected token 'c', "could not "... is not valid JSON`:

1. **This means the API returned HTML instead of JSON** - usually an authentication issue
2. **Check your API key**: Make sure it's valid and not expired
3. **Verify the API key format**: No extra spaces, quotes, or special characters
4. **Test the connection**: The app will now test the API connection before uploading

### Common Issues:

- **File not found**: Make sure `.env.local` is in the correct directory (`web/.env.local`)
- **Still getting 401**: The API key might be invalid or expired
- **JSON parsing errors**: Usually means invalid API key or API is down
- **Upload works but viewing doesn't**: This might be a different authentication issue

## Need Help?

If you're still having issues:

1. Check the browser console for detailed error messages
2. Verify your API key is valid at [https://lighthouse.storage/](https://lighthouse.storage/)
3. Make sure you're using the same wallet address for uploading and viewing files
