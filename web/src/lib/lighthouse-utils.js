// Function to check if the Lighthouse API is accessible and working
export async function checkLighthouseEndpoints() {
  const endpoints = {
    api: 'https://api.lighthouse.storage/api/v0/status',
    node: 'https://node.lighthouse.storage/api/v0/status',
    gateway: 'https://gateway.lighthouse.storage/'
  };

  const results = {
    api: { status: 0, ok: false, statusText: '' },
    node: { status: 0, ok: false, statusText: '' },
    gateway: { status: 0, ok: false, statusText: '' },
    fallbacks: []
  };

  for (const [name, url] of Object.entries(endpoints)) {
    try {
      const response = await fetch(url, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      results[name] = {
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      };
    } catch (error) {
      results[name] = {
        status: 'error',
        ok: false,
        error: error.message
      };
    }
  }

  // Check alternative IPFS gateways as fallbacks
  const fallbackGateways = [
    'https://ipfs.io/ipfs/QmVLDAhCY3X9P2uRudKAryuQFPM5zqA3Yij1dY8FpGbL7T', // Known CID for a test file
    'https://dweb.link/ipfs/QmVLDAhCY3X9P2uRudKAryuQFPM5zqA3Yij1dY8FpGbL7T'
  ];

  results.fallbacks = [];

  for (const gateway of fallbackGateways) {
    try {
      const response = await fetch(gateway, {
        method: 'HEAD',
        headers: { 'Cache-Control': 'no-cache' }
      });
      
      results.fallbacks.push({
        gateway,
        status: response.status,
        ok: response.ok,
        statusText: response.statusText
      });
    } catch (error) {
      results.fallbacks.push({
        gateway,
        status: 'error',
        ok: false,
        error: error.message
      });
    }
  }

  return results;
}

// Helper function to check if a URL is accessible
export async function isUrlAccessible(url, timeout = 5000) {
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);
    
    const response = await fetch(url, { 
      method: 'HEAD',
      signal: controller.signal 
    });
    
    clearTimeout(timeoutId);
    return response.ok;
  } catch (error) {
    return false;
  }
}