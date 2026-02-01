"use client"

import React, { createContext, useContext, useState, useEffect, ReactNode } from "react"
import { connectWallet as connectFreighter, isFreighterInstalled, disconnectWallet as disconnectFreighter, WalletState } from "./wallet"

interface WalletContextType {
  walletConnected: boolean
  walletAddress: string | null
  isLoading: boolean
  error: string | null
  freighterInstalled: boolean
  connectWallet: () => Promise<void>
  disconnectWallet: () => void
}

const WalletContext = createContext<WalletContextType | undefined>(undefined)

export function WalletProvider({ children }: { children: ReactNode }) {
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [freighterInstalled, setFreighterInstalled] = useState(false)

  // Check if Freighter is installed on mount
  useEffect(() => {
    checkFreighterInstalled()
    // Try to restore connection from localStorage
    restoreConnection()
  }, [])

  const checkFreighterInstalled = async () => {
    const installed = await isFreighterInstalled()
    setFreighterInstalled(installed)
  }

  const restoreConnection = () => {
    const savedAddress = localStorage.getItem("walletAddress")
    if (savedAddress) {
      setWalletAddress(savedAddress)
      setWalletConnected(true)
    }
  }

  const connectWallet = async () => {
    setError(null)
    setIsLoading(true)

    try {
      const result = await connectFreighter()
      
      if (result.error) {
        setError(result.error)
        setWalletConnected(false)
        setWalletAddress(null)
        localStorage.removeItem("walletAddress")
        return
      }

      setWalletConnected(result.connected)
      setWalletAddress(result.publicKey)
      
      // Save to localStorage for persistence
      if (result.publicKey) {
        localStorage.setItem("walletAddress", result.publicKey)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to connect wallet"
      setError(errorMessage)
      setWalletConnected(false)
      setWalletAddress(null)
      localStorage.removeItem("walletAddress")
    } finally {
      setIsLoading(false)
    }
  }

  const disconnectWallet = () => {
    disconnectFreighter()
    setWalletConnected(false)
    setWalletAddress(null)
    setError(null)
    localStorage.removeItem("walletAddress")
  }

  return (
    <WalletContext.Provider
      value={{
        walletConnected,
        walletAddress,
        isLoading,
        error,
        freighterInstalled,
        connectWallet,
        disconnectWallet,
      }}
    >
      {children}
    </WalletContext.Provider>
  )
}

export function useWallet() {
  const context = useContext(WalletContext)
  if (context === undefined) {
    throw new Error("useWallet must be used within a WalletProvider")
  }
  return context
}
