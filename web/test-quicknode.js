// Test script for QuickNode IPFS integration
async function testQuickNodeConnection() {
    if (!process.env.NEXT_PUBLIC_QUICKNODE_API_KEY) {
        console.error('ERROR: NEXT_PUBLIC_QUICKNODE_API_KEY not set in environment');
        console.error('Please set this environment variable before running the test');
        process.exit(1);
    }

    console.log('Testing QuickNode IPFS API connection...');
    
    try {
        const response = await fetch('https://api.quicknode.com/ipfs/rest/pinning/pins', {
            method: 'GET',
            headers: {
                'x-api-key': process.env.NEXT_PUBLIC_QUICKNODE_API_KEY,
                'Content-Type': 'application/json'
            }
        });
        
        if (response.ok) {
            console.log('✅ QuickNode API Connection Successful!');
            console.log('Response status:', response.status);
            const data = await response.json();
            console.log('Retrieved pins count:', data.pins ? data.pins.length : 0);
            return true;
        } else {
            console.error('❌ QuickNode API Connection Failed!');
            console.error('Response status:', response.status, response.statusText);
            const text = await response.text();
            console.error('Response body:', text);
            return false;
        }
    } catch (error) {
        console.error('❌ Error connecting to QuickNode API:', error);
        return false;
    }
}

// Run the test
testQuickNodeConnection()
    .then(success => {
        if (success) {
            console.log('QuickNode IPFS API is properly configured!');
        } else {
            console.error('QuickNode IPFS API configuration check failed!');
            process.exit(1);
        }
    })
    .catch(error => {
        console.error('Test failed with error:', error);
        process.exit(1);
    });