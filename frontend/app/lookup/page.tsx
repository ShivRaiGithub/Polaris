"use client"

import React from "react"
import { useState } from "react"
import Link from "next/link"
import { Shield, Search, Loader2, CheckCircle, XCircle, ExternalLink, User, FileText, Wallet } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { StellarBackground } from "@/components/stellar-background"
import { useWallet } from "@/lib/wallet-context"
import { API_ENDPOINTS, DOCUMENT_TYPES } from "@/lib/constants"

interface UserInfo {
  address: string
  verified: boolean
  docCount?: number
  commitmentHash?: string
  timestamp?: string
  attributes?: {
    ageOver18?: boolean
    ageOver21?: boolean
    documentType?: string
    documentTypeCode?: number
    genderVerified?: boolean
    verificationDate?: string
  }
  documents?: Array<{
    index: number
    timestamp?: string
    commitmentHash?: string
    attributes?: {
      ageOver18?: boolean
      ageOver21?: boolean
      documentType?: string
      documentTypeCode?: number
      genderVerified?: boolean
    }
  }>
  error?: string
}

export default function LookupPage() {
  const [searchAddress, setSearchAddress] = useState("")
  const [isSearching, setIsSearching] = useState(false)
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)
  const [error, setError] = useState<string | null>(null)
  const { 
    walletConnected, 
    walletAddress, 
    isLoading: walletLoading, 
    freighterInstalled,
    connectWallet,
    disconnectWallet 
  } = useWallet()

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!searchAddress.trim()) {
      setError("Please enter a valid Stellar address")
      return
    }

    setError(null)
    setIsSearching(true)
    setUserInfo(null)

    try {
      const response = await fetch(`${API_ENDPOINTS.USER}/${searchAddress.trim()}`)

      if (!response.ok) {
        if (response.status === 404) {
          setUserInfo({
            address: searchAddress.trim(),
            verified: false,
            error: "User not found or not verified",
          })
        } else {
          throw new Error("Failed to fetch user information")
        }
        return
      }

      const data: UserInfo = await response.json()
      setUserInfo(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to lookup user")
    } finally {
      setIsSearching(false)
    }
  }

  const handleClear = () => {
    setSearchAddress("")
    setUserInfo(null)
    setError(null)
  }

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
              <span className="text-xl font-bold text-[#fafafa]">Polaris</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/verify">
                <Button
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent"
                >
                  Verify
                </Button>
              </Link>
              <Link href="/lookup">
                <Button
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent"
                >
                  Lookup
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent"
                >
                  Dashboard
                </Button>
              </Link>
              {walletConnected && walletAddress ? (
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full gap-2 bg-transparent"
                >
                  <Wallet className="w-4 h-4 text-[#a78bfa]" />
                  {walletAddress.substring(0, 4)}...{walletAddress.substring(walletAddress.length - 4)}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  disabled={walletLoading || !freighterInstalled}
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full gap-2 bg-transparent"
                >
                  {walletLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Wallet className="w-4 h-4" />
                  )}
                  Connect Wallet
                </Button>
              )}
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-4xl">
          <div className="text-center mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-[#fafafa] mb-4">
              Verify User Identity
            </h1>
            <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
              Look up any Stellar address to verify their identity status and attributes on-chain.
            </p>
          </div>

          <div className="grid gap-8">
            {/* Search Card */}
            <Card className="bg-[#111111] border-[#262626]">
              <CardHeader>
                <CardTitle className="text-[#fafafa] flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#a78bfa]" />
                  Search by Address
                </CardTitle>
                <CardDescription className="text-[#a3a3a3]">
                  Enter a Stellar public address to check verification status
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleSearch} className="space-y-4">
                  <div className="flex gap-4">
                    <Input
                      type="text"
                      placeholder="GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX"
                      value={searchAddress}
                      onChange={(e) => setSearchAddress(e.target.value)}
                      className="flex-1 bg-[#1a1a1a] border-[#262626] text-[#fafafa] placeholder:text-[#a3a3a3] focus:border-[#a78bfa]"
                    />
                    <Button
                      type="submit"
                      disabled={isSearching || !searchAddress.trim()}
                      className="bg-[#a78bfa] text-[#0a0a0a] hover:bg-[#a78bfa]/90 font-semibold px-8"
                    >
                      {isSearching ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <>
                          <Search className="w-5 h-5 mr-2" />
                          Search
                        </>
                      )}
                    </Button>
                  </div>

                  {searchAddress && (
                    <Button
                      type="button"
                      onClick={handleClear}
                      variant="outline"
                      className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] bg-transparent"
                    >
                      Clear Search
                    </Button>
                  )}
                </form>

                {error && (
                  <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm flex items-start gap-2">
                    <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                    <p>{error}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Results Card */}
            {userInfo && (
              <Card className={`bg-[#111111] ${userInfo.verified ? "border-green-500/20" : "border-red-500/20"}`}>
                <CardHeader>
                  <CardTitle className="text-[#fafafa] flex items-center gap-2">
                    {userInfo.verified ? (
                      <>
                        <CheckCircle className="w-5 h-5 text-green-400" />
                        Identity Verified
                      </>
                    ) : (
                      <>
                        <XCircle className="w-5 h-5 text-red-400" />
                        Not Verified
                      </>
                    )}
                  </CardTitle>
                  <CardDescription className="text-[#a3a3a3] font-mono text-sm break-all">
                    {userInfo.address}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {userInfo.verified ? (
                    <>
                      {/* Basic Info */}
                      <div className="grid gap-4">
                        <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                          <span className="text-[#a3a3a3]">Verification Status</span>
                          <span className="text-green-400 font-medium flex items-center gap-2">
                            <CheckCircle className="w-4 h-4" />
                            Verified
                          </span>
                        </div>

                        <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                          <span className="text-[#a3a3a3]">Document Count</span>
                          <span className="text-[#fafafa] font-medium">{userInfo.docCount || 0}</span>
                        </div>

                        {userInfo.timestamp && (
                          <div className="flex justify-between items-center p-4 bg-[#1a1a1a] rounded-xl">
                            <span className="text-[#a3a3a3]">Registration Time</span>
                            <span className="text-[#fafafa] font-medium">
                              {new Date(parseInt(userInfo.timestamp) * 1000).toLocaleString()}
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Verified Attributes */}
                      {userInfo.attributes && (
                        <div className="p-4 bg-[#1a1a1a] rounded-xl">
                          <h3 className="text-[#fafafa] font-medium mb-3 flex items-center gap-2">
                            <User className="w-5 h-5 text-[#a78bfa]" />
                            Verified Attributes
                          </h3>
                          <div className="grid gap-3 text-sm">
                            {userInfo.attributes.ageOver18 !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#a3a3a3]">Age 18+:</span>
                                <span
                                  className={userInfo.attributes.ageOver18 ? "text-green-400" : "text-red-400"}
                                >
                                  {userInfo.attributes.ageOver18 ? "✓ Verified" : "✗ Not verified"}
                                </span>
                              </div>
                            )}

                            {userInfo.attributes.ageOver21 !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#a3a3a3]">Age 21+:</span>
                                <span
                                  className={userInfo.attributes.ageOver21 ? "text-green-400" : "text-red-400"}
                                >
                                  {userInfo.attributes.ageOver21 ? "✓ Verified" : "✗ Not verified"}
                                </span>
                              </div>
                            )}

                            {userInfo.attributes.documentType && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#a3a3a3]">Document Type:</span>
                                <span className="text-[#fafafa] font-medium">
                                  {userInfo.attributes.documentType}
                                </span>
                              </div>
                            )}

                            {userInfo.attributes.genderVerified !== undefined && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#a3a3a3]">Gender Verified:</span>
                                <span
                                  className={
                                    userInfo.attributes.genderVerified ? "text-green-400" : "text-[#a3a3a3]"
                                  }
                                >
                                  {userInfo.attributes.genderVerified ? "✓ Yes" : "No"}
                                </span>
                              </div>
                            )}

                            {userInfo.attributes.verificationDate && (
                              <div className="flex justify-between items-center">
                                <span className="text-[#a3a3a3]">Verification Date:</span>
                                <span className="text-[#fafafa] font-medium">
                                  {new Date(parseInt(userInfo.attributes.verificationDate) * 1000).toLocaleDateString()}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Commitment Hash */}
                      {userInfo.commitmentHash && (
                        <div className="p-4 bg-[#1a1a1a] rounded-xl">
                          <div className="flex justify-between items-start gap-4">
                            <div className="flex-1">
                              <p className="text-[#a3a3a3] text-sm mb-1">Latest Commitment Hash</p>
                              <p className="text-[#fafafa] font-mono text-xs break-all">
                                {userInfo.commitmentHash}
                              </p>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* All Documents */}
                      {userInfo.documents && userInfo.documents.length > 0 && (
                        <div className="space-y-3">
                          <h3 className="text-[#fafafa] font-medium flex items-center gap-2">
                            <FileText className="w-5 h-5 text-[#a78bfa]" />
                            All Verified Documents ({userInfo.documents.length})
                          </h3>
                          <div className="space-y-3">
                            {userInfo.documents.map((doc: any, idx: number) => (
                              <div key={idx} className="p-4 bg-[#1a1a1a] rounded-xl border border-[#262626]">
                                <div className="flex items-center justify-between mb-3">
                                  <span className="text-[#fbbf24] font-medium">Document #{doc.index + 1}</span>
                                  {doc.timestamp && (
                                    <span className="text-[#a3a3a3] text-xs">
                                      {new Date(parseInt(doc.timestamp) * 1000).toLocaleDateString()}
                                    </span>
                                  )}
                                </div>
                                {doc.attributes && (
                                  <div className="grid gap-2 text-sm">
                                    <div className="flex justify-between">
                                      <span className="text-[#a3a3a3]">Age 18+:</span>
                                      <span className={doc.attributes.ageOver18 ? "text-green-400" : "text-red-400"}>
                                        {doc.attributes.ageOver18 ? "✓" : "✗"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#a3a3a3]">Age 21+:</span>
                                      <span className={doc.attributes.ageOver21 ? "text-green-400" : "text-red-400"}>
                                        {doc.attributes.ageOver21 ? "✓" : "✗"}
                                      </span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-[#a3a3a3]">Document:</span>
                                      <span className="text-[#fafafa]">{doc.attributes.documentType}</span>
                                    </div>
                                    {doc.attributes.genderVerified && (
                                      <div className="flex justify-between">
                                        <span className="text-[#a3a3a3]">Gender:</span>
                                        <span className="text-green-400">✓ Verified</span>
                                      </div>
                                    )}
                                  </div>
                                )}
                                {doc.commitmentHash && (
                                  <div className="mt-3 pt-3 border-t border-[#262626]">
                                    <p className="text-[#a3a3a3] text-xs mb-1">Commitment</p>
                                    <p className="text-[#fafafa] font-mono text-xs break-all">
                                      {doc.commitmentHash}
                                    </p>
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-xl">
                      <div className="flex items-start gap-2">
                        <XCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-red-400 font-medium mb-1">User Not Verified</p>
                          <p className="text-red-400/80 text-sm">
                            This address has not registered any verified identity on the blockchain.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Info Card */}
            <Card className="bg-[#111111] border-[#262626]">
              <CardHeader>
                <CardTitle className="text-[#fafafa] text-lg">How it Works</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-[#a3a3a3]">
                <p>
                  This lookup tool allows you to verify the identity status of any Stellar address on the Polaris
                  network.
                </p>
                <p>
                  When you search for an address, you'll see:
                </p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Whether the user has verified their identity</li>
                  <li>Number of documents registered</li>
                  <li>Verified attributes (age, document type, etc.)</li>
                  <li>Commitment hash for on-chain verification</li>
                </ul>
                <p className="text-[#a78bfa] mt-4">
                  ✨ All verification is done using zero-knowledge proofs - no personal information is revealed!
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
