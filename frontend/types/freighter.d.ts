// Freighter Wallet API type definitions

export {};

declare global {
  interface Window {
    // Modern Freighter API (v5+)
    freighter?: {
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, options?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }) => Promise<string>;
      getNetwork: () => Promise<string>;
      setNetwork: (network: string) => Promise<void>;
    };
    
    // Legacy Freighter API (for backwards compatibility)
    freighterApi?: {
      isConnected: () => Promise<boolean>;
      getPublicKey: () => Promise<string>;
      signTransaction: (xdr: string, options?: {
        network?: string;
        networkPassphrase?: string;
        accountToSign?: string;
      }) => Promise<string>;
      getNetwork: () => Promise<string>;
      setNetwork: (network: string) => Promise<void>;
    };
  }
}
