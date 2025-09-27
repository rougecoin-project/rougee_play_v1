/**
 * RouGee Payment System for Launch Song Fees
 * Collects 0.001 ETH fees on Base network
 */

import { parseEther, formatEther } from 'viem';

interface PaymentConfig {
  treasuryWallet: string;
  launchFee: string; // in ETH
  chainId: number; // Base mainnet = 8453
}

// RouGee Treasury Configuration
const PAYMENT_CONFIG: PaymentConfig = {
  treasuryWallet: process.env.NEXT_PUBLIC_TREASURY_WALLET || '0xc0dca68EFdCC63aD109B301585b4b8E38cAe344e', // RouGee Treasury Wallet
  launchFee: '0.001', // 0.001 ETH (~$2-3)
  chainId: 8453 // Base mainnet
};

interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
  amountPaid?: string;
}

class PaymentService {
  /**
   * Process launch song payment
   * Sends ETH from user wallet to RouGee treasury
   */
  async processLaunchPayment(userAddress: string): Promise<PaymentResult> {
    try {
      console.log('💰 Processing launch payment...');
      console.log('Amount:', PAYMENT_CONFIG.launchFee, 'ETH');
      console.log('To Treasury:', PAYMENT_CONFIG.treasuryWallet);
      console.log('From User:', userAddress);

      // Check if we're on the correct network (Base)
      if (window.ethereum) {
        const chainId = await window.ethereum.request({ method: 'eth_chainId' });
        const currentChainId = parseInt(chainId, 16);
        
        console.log('Current chain:', currentChainId, 'Required:', PAYMENT_CONFIG.chainId);
        
        if (currentChainId !== PAYMENT_CONFIG.chainId) {
          console.log('Switching to Base network...');
          // Switch to Base network
          try {
            await window.ethereum.request({
              method: 'wallet_switchEthereumChain',
              params: [{ chainId: `0x${PAYMENT_CONFIG.chainId.toString(16)}` }],
            });
            console.log('✅ Switched to Base network');
          } catch (switchError: any) {
            console.log('Adding Base network to wallet...');
            // If Base network not added to wallet, add it
            if (switchError.code === 4902) {
              await window.ethereum.request({
                method: 'wallet_addEthereumChain',
                params: [{
                  chainId: `0x${PAYMENT_CONFIG.chainId.toString(16)}`,
                  chainName: 'Base',
                  nativeCurrency: {
                    name: 'Ethereum',
                    symbol: 'ETH',
                    decimals: 18,
                  },
                  rpcUrls: ['https://mainnet.base.org'],
                  blockExplorerUrls: ['https://basescan.org'],
                }],
              });
              console.log('✅ Added Base network to wallet');
            } else {
              throw switchError;
            }
          }
        }

        // Validate treasury wallet address
        if (!PAYMENT_CONFIG.treasuryWallet || PAYMENT_CONFIG.treasuryWallet.length !== 42) {
          throw new Error('Invalid treasury wallet address');
        }

        // Check user's ETH balance
        const balance = await window.ethereum.request({
          method: 'eth_getBalance',
          params: [userAddress, 'latest'],
        });
        
        const balanceInWei = BigInt(balance);
        const requiredWei = parseEther(PAYMENT_CONFIG.launchFee);
        const bufferWei = parseEther('0.001'); // 0.001 ETH buffer for gas
        
        if (balanceInWei < requiredWei + bufferWei) {
          throw new Error(`Insufficient ETH balance. Required: ${PAYMENT_CONFIG.launchFee} ETH + gas fees`);
        }
        
        console.log('Balance check passed:', {
          balance: formatEther(balanceInWei) + ' ETH',
          required: PAYMENT_CONFIG.launchFee + ' ETH',
          buffer: '0.001 ETH for gas'
        });

        // Parse ETH amount to wei (hex string)
        const weiValue = parseEther(PAYMENT_CONFIG.launchFee);
        const hexValue = `0x${weiValue.toString(16)}`;
        
        console.log('Transaction details:', {
          to: PAYMENT_CONFIG.treasuryWallet,
          value: hexValue,
          amount: PAYMENT_CONFIG.launchFee + ' ETH'
        });

        // Estimate gas for the transaction
        let gasEstimate;
        try {
          gasEstimate = await window.ethereum.request({
            method: 'eth_estimateGas',
            params: [{
              to: PAYMENT_CONFIG.treasuryWallet,
              from: userAddress,
              value: hexValue,
            }],
          });
          console.log('Gas estimate:', gasEstimate);
        } catch (gasError) {
          console.warn('Gas estimation failed, using default:', gasError);
          gasEstimate = '0x5208'; // 21000 gas default
        }

        // Send ETH transaction with estimated gas
        const transactionParameters = {
          to: PAYMENT_CONFIG.treasuryWallet,
          from: userAddress,
          value: hexValue,
          gas: gasEstimate,
        };

        // Send transaction with better error handling
        console.log('Sending transaction with params:', transactionParameters);
        
        try {
          const txHash = await window.ethereum.request({
            method: 'eth_sendTransaction',
            params: [transactionParameters],
          });

          if (!txHash || txHash === '0x') {
            throw new Error('Transaction was rejected or failed to broadcast');
          }

          console.log('✅ Payment transaction sent:', txHash);
          
          // Wait a moment for transaction to be broadcast
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          return {
            success: true,
            transactionHash: txHash,
            amountPaid: PAYMENT_CONFIG.launchFee
          };
          
        } catch (txError: any) {
          console.error('Transaction failed:', txError);
          
          // Handle specific error cases
          if (txError.code === 4001) {
            throw new Error('Transaction rejected by user');
          } else if (txError.code === -32603) {
            throw new Error('Transaction failed to broadcast - check network connection');
          } else if (txError.message?.includes('insufficient funds')) {
            throw new Error('Insufficient ETH balance for transaction');
          } else if (txError.message?.includes('gas')) {
            throw new Error('Gas estimation failed - try increasing gas limit');
          } else {
            throw new Error(`Transaction failed: ${txError.message || 'Unknown error'}`);
          }
        }
        
        return {
          success: true,
          transactionHash: txHash,
          amountPaid: PAYMENT_CONFIG.launchFee
        };

      } else {
        throw new Error('No Web3 wallet detected');
      }

    } catch (error) {
      console.error('❌ Payment failed:', error);
      
      // Return more specific error messages
      const errorMessage = error instanceof Error ? error.message : 'Payment failed';
      
      return {
        success: false,
        error: errorMessage
      };
    }
  }

  /**
   * Get payment configuration
   */
  getPaymentConfig(): PaymentConfig {
    return PAYMENT_CONFIG;
  }

  /**
   * Format fee for display
   */
  formatFee(): string {
    return `${PAYMENT_CONFIG.launchFee} ETH`;
  }

  /**
   * Get treasury wallet address
   */
  getTreasuryWallet(): string {
    return PAYMENT_CONFIG.treasuryWallet;
  }
}

// Export singleton instance
export const paymentService = new PaymentService();
export type { PaymentResult, PaymentConfig };
