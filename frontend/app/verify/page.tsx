"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { Shield, Wallet, Loader2, CheckCircle, AlertCircle, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StellarBackground } from "@/components/stellar-background"
import { useWallet } from "@/lib/wallet-context"
import { signTransactionWithFreighter } from "@/lib/wallet"
import { TEST_IDENTITY_DATA, DOCUMENT_TYPES, GENDER_OPTIONS, API_ENDPOINTS } from "@/lib/constants"

interface VerificationResponse {
  success: boolean
  txnHash?: string
  commitment?: string
  nullifier?: string
  publicSignals?: string[]
  docCount?: number
  requiresPayment?: boolean
  prepaidCredits?: number
  verifiedAttributes?: {
    ageOver18: boolean
    ageOver21: boolean
    documentType: string
    documentTypeCode: number
    genderVerified: boolean
  }
  error?: string
  message?: string
  // For unsigned transaction flow
  unsignedXdr?: string
  requiresSignature?: boolean
}

export default function VerifyPage() {
  const { 
    walletConnected, 
    walletAddress, 
    isLoading: walletLoading, 
    error: walletError, 
    freighterInstalled,
    connectWallet,
    disconnectWallet 
  } = useWallet()

  const [isRegistering, setIsRegistering] = useState(false)
  const [isPrepaying, setIsPrepaying] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<VerificationResponse | null>(null)
  const [registrationStep, setRegistrationStep] = useState<string>("")
  const [userInfo, setUserInfo] = useState<any>(null)
  // Fetch user info when wallet connects
  React.useEffect(() => {
    if (walletConnected && walletAddress) {
      fetchUserInfo()
    }
  }, [walletConnected, walletAddress])

  const fetchUserInfo = async () => {
    if (!walletAddress) return
    try {
      const response = await fetch(`${API_ENDPOINTS.USER}/${walletAddress}`)
      if (response.ok) {
        const data = await response.json()
        setUserInfo(data)
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    }
  }
  const handlePrepayment = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first")
      return
    }

    setError(null)
    setIsPrepaying(true)

    try {
      // Get token contract address (native XLM)
      const nativeAssetContract = "CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC" // Native asset on testnet
      
      // Build prepayment transaction on backend
      const buildResponse = await fetch(`${API_ENDPOINTS.REGISTER}/build-prepay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: walletAddress,
        }),
      })

      const buildData = await buildResponse.json()

      if (!buildResponse.ok) {
        throw new Error(buildData.error || "Failed to build prepayment transaction")
      }

      // Sign with Freighter
      const signedXdr = await signTransactionWithFreighter(buildData.unsignedXdr, "TESTNET")

      // Submit signed transaction
      const submitResponse = await fetch(`${API_ENDPOINTS.REGISTER}/prepay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          signedXdr,
          userAddress: walletAddress,
        }),
      })

      const submitData = await submitResponse.json()

      if (!submitResponse.ok) {
        throw new Error(submitData.error || "Prepayment failed")
      }

      // Refresh user info to show updated credits
      await fetchUserInfo()
      
      setSuccess({
        success: true,
        txnHash: submitData.txnHash,
        message: "Prepayment successful!",
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to process prepayment")
    } finally {
      setIsPrepaying(false)
    }
  }

  const handleRegisterIdentity = async () => {
    if (!walletAddress) {
      setError("Please connect your wallet first")
      return
    }

    setError(null)
    setIsRegistering(true)
    setSuccess(null)
    setRegistrationStep("Preparing registration...")

    try {
      // Send registration request to backend (backend handles everything)
      setRegistrationStep("Generating ZK proof and submitting to blockchain...")
      const response = await fetch(API_ENDPOINTS.REGISTER, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          userAddress: walletAddress,
          identityData: TEST_IDENTITY_DATA,
        }),
      })

      const data: VerificationResponse = await response.json()

      if (!response.ok) {
        // Check if payment is required
        if (response.status === 402 && data.requiresPayment) {
          throw new Error(data.message || "Payment required for additional verifications. Please prepay first.")
        }
        throw new Error(data.error || "Registration failed")
      }

      // Success
      setSuccess(data)
      setRegistrationStep("")
      
      // Refresh user info to update doc count
      await fetchUserInfo()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to register identity")
      setRegistrationStep("")
    } finally {
      setIsRegistering(false)
    }
  }

  // Combined error from wallet or registration
  const displayError = walletError || error

  return (
    <div className="relative min-h-screen bg-[#0a0a0a]">
      <StellarBackground />
      
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#262626]">
        <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="relative">
                <Shield className="h-8 w-8 text-[#a78bfa] transition-transform group-hover:scale-110" />
                <div className="absolute inset-0 blur-md bg-[#a78bfa]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              <span className="text-xl font-bold text-[#fafafa]">ZK-Verify</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/dashboard">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Dashboard
                </Button>
              </Link>
              <Link href="/lookup">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Lookup
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-[#fafafa] mb-4">
              Register Your Identity
            </h1>
            <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
              Connect your Freighter wallet and register your zero-knowledge verified identity on Stellar blockchain.
            </p>
          </div>

          <div className="grid gap-8">
            {/* Prepayment Success Message */}
            {success && success.success && success.message && (
              <Card className="bg-green-500/10 border-green-500/20">
                <CardContent className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    <span className="text-green-400 font-semibold">{success.message}</span>
                  </div>
                  {success.txnHash && (
                    <div className="flex items-center gap-2 text-xs text-green-300">
                      <span>Transaction:</span>
                      <a
                        href={`https://stellar.expert/explorer/testnet/tx/${success.txnHash}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline hover:text-green-200"
                      >
                        {success.txnHash.slice(0, 8)}...{success.txnHash.slice(-6)}
                      </a>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
            {/* Wallet Connection Card */}
            <Card className="bg-[#111111] border-[#262626]">
              <CardHeader>
                <CardTitle className="text-[#fafafa] flex items-center gap-2">
                  <Wallet className="w-5 h-5 text-[#a78bfa]" />
                  Wallet Connection
                </CardTitle>
                <CardDescription className="text-[#a3a3a3]">
                  Connect your Freighter wallet to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {!freighterInstalled && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-medium mb-1">Freighter wallet not detected</p>
                        <p className="text-yellow-400/80 mb-2">
                          Please install Freighter wallet extension from{" "}
                          <a
                            href="https://www.freighter.app/"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="underline hover:text-yellow-300"
                          >
                            freighter.app
                          </a>
                        </p>
                        <div className="mt-2 text-xs space-y-1 text-yellow-400/70">
                          <p>Troubleshooting steps:</p>
                          <ul className="list-disc list-inside ml-2 space-y-0.5">
                            <li>Make sure Freighter extension is installed and enabled</li>
                            <li>Unlock your Freighter wallet</li>
                            <li>Refresh this page after installing (Ctrl+Shift+R)</li>
                            <li>Check if the extension is enabled for this site</li>
                          </ul>
                        </div>
                        <Button
                          onClick={() => {
                            window.location.reload();
                          }}
                          variant="outline"
                          className="mt-3 border-yellow-500/30 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                        >
                          Refresh Page
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {walletConnected && walletAddress ? (
                  <div className="space-y-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex items-center gap-2 mb-2">
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        <span className="text-green-400 font-medium">Wallet Connected</span>
                      </div>
                      <p className="text-[#a3a3a3] text-sm font-mono break-all">{walletAddress}</p>
                    </div>
                    <Button
                      onClick={disconnectWallet}
                      variant="outline"
                      className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] bg-transparent"
                    >
                      Disconnect Wallet
                    </Button>
                  </div>
                ) : (
                  <Button
                    onClick={connectWallet}
                    disabled={walletLoading || !freighterInstalled}
                    className="w-full bg-[#a78bfa] text-[#0a0a0a] hover:bg-[#a78bfa]/90 py-6 text-lg font-semibold"
                  >
                    {walletLoading ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-5 h-5 mr-2" />
                        Connect Freighter Wallet
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>

            {/* Prepayment Card */}
            {walletConnected && userInfo && (
              <Card className="bg-[#111111] border-[#262626]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa] flex items-center gap-2">
                    <Wallet className="w-5 h-5 text-[#fbbf24]" />
                    Prepaid Credits
                  </CardTitle>
                  <CardDescription className="text-[#a3a3a3]">
                    Prepay for additional verifications (30 XLM per verification)
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="p-4 bg-[#1a1a1a] rounded-xl">
                      <p className="text-[#a3a3a3] text-sm mb-1">Documents Registered</p>
                      <p className="text-2xl font-bold text-[#fafafa]">{userInfo.docCount || 0}</p>
                    </div>
                    <div className="p-4 bg-[#1a1a1a] rounded-xl">
                      <p className="text-[#a3a3a3] text-sm mb-1">Prepaid Credits</p>
                      <p className="text-2xl font-bold text-[#fbbf24]">{userInfo.prepaidCredits || 0}</p>
                    </div>
                  </div>

                  {(userInfo.docCount || 0) >= 1 && (userInfo.prepaidCredits || 0) === 0 && (
                    <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-xl text-yellow-400 text-sm">
                      <p className="font-medium mb-1">⚠️ Payment Required</p>
                      <p className="text-yellow-400/80">
                        You need to prepay before registering additional documents.
                      </p>
                    </div>
                  )}

                  <Button
                    onClick={handlePrepayment}
                    disabled={isPrepaying}
                    className="w-full bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90"
                  >
                    {isPrepaying ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Processing Payment...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Prepay 30 XLM for 1 Verification
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {/* Identity Data Card */}
            {walletConnected && (
              <Card className="bg-[#111111] border-[#262626]">
                <CardHeader>
                  <CardTitle className="text-[#fafafa] flex items-center gap-2">
                    <Shield className="w-5 h-5 text-[#a78bfa]" />
                    Identity Information (Test Data)
                  </CardTitle>
                  <CardDescription className="text-[#a3a3a3]">
                    Using pre-configured test data for demo purposes
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Name</span>
                      <span className="text-[#fafafa] font-medium">{TEST_IDENTITY_DATA.name}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Date of Birth</span>
                      <span className="text-[#fafafa] font-medium">
                        {TEST_IDENTITY_DATA.dob.day}/{TEST_IDENTITY_DATA.dob.month}/{TEST_IDENTITY_DATA.dob.year}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Gender</span>
                      <span className="text-[#fafafa] font-medium">
                        {GENDER_OPTIONS[TEST_IDENTITY_DATA.gender as keyof typeof GENDER_OPTIONS]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Document Type</span>
                      <span className="text-[#fafafa] font-medium">
                        {DOCUMENT_TYPES[TEST_IDENTITY_DATA.docType as keyof typeof DOCUMENT_TYPES]}
                      </span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Document ID</span>
                      <span className="text-[#fafafa] font-medium font-mono">{TEST_IDENTITY_DATA.docId}</span>
                    </div>
                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Age Requirement</span>
                      <span className="text-[#fafafa] font-medium">{TEST_IDENTITY_DATA.minAge}+ years</span>
                    </div>
                  </div>

                  {registrationStep && (
                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                      <div className="flex items-center gap-2 text-blue-400">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span className="text-sm">{registrationStep}</span>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleRegisterIdentity}
                    disabled={
                      isRegistering || 
                      !walletConnected || 
                      ((userInfo?.docCount || 0) >= 1 && (userInfo?.prepaidCredits || 0) === 0)
                    }
                    className="w-full bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 py-6 text-lg font-semibold"
                  >
                    {isRegistering ? (
                      <>
                        <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                        {registrationStep || "Processing..."}
                      </>
                    ) : ((userInfo?.docCount || 0) >= 1 && (userInfo?.prepaidCredits || 0) === 0) ? (
                      <>
                        <AlertCircle className="w-5 h-5 mr-2" />
                        Prepayment Required
                      </>
                    ) : (
                      <>
                        <Shield className="w-5 h-5 mr-2" />
                        Register Identity on Chain
                      </>
                    )}
                  </Button>

                  {displayError && (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
                        <p>{displayError}</p>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Success Card */}
            {success && success.success && (
              <Card className="bg-[#111111] border-green-500/20">
                <CardHeader>
                  <CardTitle className="text-[#fafafa] flex items-center gap-2">
                    <CheckCircle className="w-5 h-5 text-green-400" />
                    Identity Registered Successfully!
                  </CardTitle>
                  <CardDescription className="text-[#a3a3a3]">
                    Your identity has been verified and registered on the Stellar blockchain
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid gap-4">
                    <div className="p-4 bg-green-500/10 border border-green-500/20 rounded-xl">
                      <div className="flex justify-between items-start gap-4">
                        <div className="flex-1">
                          <p className="text-[#a3a3a3] text-sm mb-1">Transaction Hash</p>
                          <p className="text-green-400 font-mono text-sm break-all">{success.txnHash}</p>
                        </div>
                        <a
                          href={`https://stellar.expert/explorer/testnet/tx/${success.txnHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-green-400 hover:text-green-300"
                        >
                          <ExternalLink className="w-5 h-5" />
                        </a>
                      </div>
                    </div>

                    {success.verifiedAttributes && (
                      <div className="p-4 bg-[#1a1a1a] rounded-xl">
                        <p className="text-[#fafafa] font-medium mb-3">Verified Attributes:</p>
                        <div className="grid gap-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-[#a3a3a3]">Age 18+:</span>
                            <span className={success.verifiedAttributes.ageOver18 ? "text-green-400" : "text-red-400"}>
                              {success.verifiedAttributes.ageOver18 ? "✓ Verified" : "✗ Not verified"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#a3a3a3]">Age 21+:</span>
                            <span className={success.verifiedAttributes.ageOver21 ? "text-green-400" : "text-red-400"}>
                              {success.verifiedAttributes.ageOver21 ? "✓ Verified" : "✗ Not verified"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#a3a3a3]">Document Type:</span>
                            <span className="text-[#fafafa]">{success.verifiedAttributes.documentType}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-[#a3a3a3]">Gender Verified:</span>
                            <span className={success.verifiedAttributes.genderVerified ? "text-green-400" : "text-[#a3a3a3]"}>
                              {success.verifiedAttributes.genderVerified ? "✓ Yes" : "No"}
                            </span>
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                      <span className="text-[#a3a3a3]">Document Count</span>
                      <span className="text-[#fafafa] font-medium">{success.docCount}</span>
                    </div>

                    <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-xl text-blue-400 text-sm">
                      <p className="font-medium mb-1">Next Verification</p>
                      <p className="text-blue-400/80">
                        For additional verifications, you'll need to prepay 30 XLM per verification.
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-4">
                    <Link href="/dashboard" className="flex-1">
                      <Button className="w-full bg-[#a78bfa] text-[#0a0a0a] hover:bg-[#a78bfa]/90">
                        Go to Dashboard
                      </Button>
                    </Link>
                    <Link href="/lookup" className="flex-1">
                      <Button variant="outline" className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] bg-transparent">
                        Lookup Users
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}