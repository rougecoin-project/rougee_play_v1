import { useAccount, useSignMessage } from 'wagmi';
import { useState, useCallback } from 'react';

export function useLighthouseAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const getAuthSignature = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    setIsAuthenticating(true);
    
    try {
      // Lighthouse requires a specific message format for authentication
      const authMessage = `Lighthouse wants you to sign in with your Ethereum account:\n${address}\n\nSign this message to prove you have access to this wallet. This request will not trigger any blockchain transaction or cost any gas fees.\n\nNonce: ${Date.now()}`;
      
      const signature = await signMessageAsync({
        message: authMessage
      });

      setIsAuthenticating(false);
      return {
        address,
        signature,
        message: authMessage
      };
    } catch (error) {
      setIsAuthenticating(false);
      throw error;
    }
  }, [address, isConnected, signMessageAsync]);

  // Create a signer object that Lighthouse can use
  const getLighthouseSigner = useCallback(async () => {
    if (!isConnected || !address) {
      throw new Error('Wallet not connected');
    }

    return {
      getAddress: async () => address,
      signMessage: async (message: string) => {
        return await signMessageAsync({ message });
      }
    };
  }, [address, isConnected, signMessageAsync]);

  return {
    address,
    isConnected,
    isAuthenticating,
    getAuthSignature,
    getLighthouseSigner
  };
}