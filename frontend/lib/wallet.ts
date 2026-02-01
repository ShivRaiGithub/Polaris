// Freighter wallet integration utilities
import { 
  isConnected, 
  getPublicKey, 
  signTransaction,
  isAllowed,
  setAllowed 
} from "@stellar/freighter-api";

export interface WalletState {
  connected: boolean;
  publicKey: string | null;
  error: string | null;
}

/**
 * Check if Freighter wallet is installed
 */
export async function isFreighterInstalled(): Promise<boolean> {
  try {
    const connected = await isConnected();
    console.log("Freighter isConnected result:", connected);
    return connected;
  } catch (error) {
    console.error("Error checking Freighter:", error);
    return false;
  }
}

/**
 * Connect to Freighter wallet and get public key
 */
export async function connectWallet(): Promise<WalletState> {
  try {
    console.log("Attempting to connect to Freighter...");
    
    // First check if Freighter is installed
    const connected = await isConnected();
    console.log("Freighter connected:", connected);
    
    if (!connected) {
      return {
        connected: false,
        publicKey: null,
        error: "Freighter wallet is not installed. Please install it from https://www.freighter.app/",
      };
    }

    // Check if we already have permission
    const allowed = await isAllowed();
    console.log("Permission already granted:", allowed);
    
    if (!allowed) {
      // Request permission (this should show popup)
      console.log("Requesting permission from user...");
      await setAllowed();
      console.log("Permission request sent");
    }

    // Now request public key (should work after permission is granted)
    console.log("Requesting public key from Freighter...");
    const publicKey = await getPublicKey();
    console.log("Received public key:", publicKey);
    
    if (!publicKey || publicKey.trim() === "") {
      return {
        connected: false,
        publicKey: null,
        error: "No public key returned. Please make sure:\n1. You approved the connection in Freighter popup\n2. You have an account in Freighter\n3. Freighter is unlocked",
      };
    }

    return {
      connected: true,
      publicKey,
      error: null,
    };
  } catch (error: any) {
    console.error("Wallet connection error:", error);
    
    let errorMessage = "Failed to connect wallet";
    
    if (error?.message?.includes("User declined") || error?.message?.includes("rejected")) {
      errorMessage = "Connection denied. Please approve the connection request in Freighter.";
    } else if (error?.message?.includes("not installed")) {
      errorMessage = "Freighter not found. Install from https://www.freighter.app/ and refresh.";
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return {
      connected: false,
      publicKey: null,
      error: errorMessage,
    };
  }
}

/**
 * Sign a transaction using Freighter
 * @param xdr - Transaction XDR to sign
 * @param network - Network passphrase (TESTNET or PUBLIC)
 */
export async function signTransactionWithFreighter(
  xdr: string,
  network: "TESTNET" | "PUBLIC" = "TESTNET"
): Promise<string> {
  try {
    const networkPassphrase =
      network === "TESTNET"
        ? "Test SDF Network ; September 2015"
        : "Public Global Stellar Network ; September 2015";

    const signedXdr = await signTransaction(xdr, {
      network,
      networkPassphrase,
    });
    
    return signedXdr;
  } catch (error) {
    console.error("Transaction signing error:", error);
    throw new Error(
      error instanceof Error ? error.message : "Failed to sign transaction"
    );
  }
}

/**
 * Disconnect wallet (clear local state)
 */
export function disconnectWallet(): WalletState {
  return {
    connected: false,
    publicKey: null,
    error: null,
  };
}
