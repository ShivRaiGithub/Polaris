"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Shield, ArrowRight, CheckCircle, Clock, XCircle, Wallet, Plus, Loader2, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StellarBackground } from "@/components/stellar-background"
import { useWallet } from "@/lib/wallet-context"
import { API_ENDPOINTS } from "@/lib/constants"

interface VerificationRecord {
  id: string
  documentType: string
  status: "verified" | "pending" | "failed"
  timestamp: string
  proofId?: string
}

const mockRecords: VerificationRecord[] = [
  {
    id: "1",
    documentType: "Aadhaar Card",
    status: "verified",
    timestamp: "2024-01-15 14:30",
    proofId: "zk_proof_abc123",
  },
  {
    id: "2",
    documentType: "PAN Card",
    status: "pending",
    timestamp: "2024-01-16 10:15",
  },
  {
    id: "3",
    documentType: "Aadhaar Card",
    status: "failed",
    timestamp: "2024-01-14 09:00",
  },
]

const statusConfig = {
  verified: {
    icon: CheckCircle,
    color: "text-green-400",
    bg: "bg-green-400/10",
    label: "Verified",
  },
  pending: {
    icon: Clock,
    color: "text-yellow-400",
    bg: "bg-yellow-400/10",
    label: "Pending",
  },
  failed: {
    icon: XCircle,
    color: "text-red-400",
    bg: "bg-red-400/10",
    label: "Failed",
  },
}

export default function DashboardPage() {
  const { 
    walletConnected, 
    walletAddress, 
    isLoading: walletLoading, 
    freighterInstalled,
    connectWallet,
    disconnectWallet 
  } = useWallet()
  const [userInfo, setUserInfo] = useState<any>(null)

  useEffect(() => {
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
              </div>
              <span className="text-xl font-bold text-[#fafafa]">Polaris</span>
            </Link>

            <div className="flex items-center gap-4">
              <Link href="/verify">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Verify
                </Button>
              </Link>
              <Link href="/lookup">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full gap-2 bg-transparent">
                  <Search className="w-4 h-4" />
                  Lookup
                </Button>
              </Link>
              <Link href="/dashboard">
                <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
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

      {/* Main Content */}
      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-24 pb-16">
        <div className="max-w-6xl mx-auto">
          {/* Page Header */}
          <div className="mb-12">
            <h1 className="text-4xl font-bold text-[#fafafa] mb-4">Dashboard</h1>
            <p className="text-[#a3a3a3] text-lg">
              Manage your identity verifications and ZK proofs
            </p>
          </div>

          {/* Stats Cards - Dynamic based on wallet connection */}
          {walletConnected && userInfo && (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-6 mb-12">
              <Card className="bg-[#111111] border-[#262626]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#a3a3a3] text-sm">Verification Status</p>
                      <p className="text-3xl font-bold text-[#fafafa] mt-1">
                        {userInfo.verified ? "Verified" : "Not Verified"}
                      </p>
                    </div>
                    <div className="p-3 bg-[#a78bfa]/10 rounded-xl">
                      <Shield className="w-6 h-6 text-[#a78bfa]" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#262626]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#a3a3a3] text-sm">Documents Registered</p>
                      <p className="text-3xl font-bold text-[#fafafa] mt-1">{userInfo.docCount || 0}</p>
                    </div>
                    <div className="p-3 bg-green-400/10 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#262626]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#a3a3a3] text-sm">Prepaid Credits</p>
                      <p className="text-3xl font-bold text-[#fbbf24] mt-1">{userInfo.prepaidCredits || 0}</p>
                    </div>
                    <div className="p-3 bg-yellow-400/10 rounded-xl">
                      <Wallet className="w-6 h-6 text-yellow-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-[#111111] border-[#262626]">
                <CardContent className="pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[#a3a3a3] text-sm">Age 18+ Verified</p>
                      <p className="text-3xl font-bold text-[#fafafa] mt-1">
                        {userInfo.attributes?.ageOver18 ? "Yes" : "No"}
                      </p>
                    </div>
                    <div className="p-3 bg-green-400/10 rounded-xl">
                      <CheckCircle className="w-6 h-6 text-green-400" />
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Wallet Connection Prompt */}
          {!walletConnected && (
            <Card className="bg-[#111111] border-[#262626] mb-12">
              <CardContent className="pt-8 pb-8">
                <div className="text-center">
                  <Wallet className="w-12 h-12 mx-auto mb-4 text-[#a3a3a3]" />
                  <p className="text-[#fafafa] font-medium mb-2">Connect Your Wallet</p>
                  <p className="text-[#a3a3a3] text-sm mb-4">
                    Connect your Freighter wallet to view your verification status
                  </p>
                  <Button
                    onClick={connectWallet}
                    disabled={walletLoading || !freighterInstalled}
                    className="bg-[#a78bfa] text-[#0a0a0a] hover:bg-[#a78bfa]/90"
                  >
                    {walletLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Connecting...
                      </>
                    ) : (
                      <>
                        <Wallet className="w-4 h-4 mr-2" />
                        Connect Freighter
                      </>
                    )}
                  </Button>
                  {!freighterInstalled && (
                    <p className="text-yellow-400 text-sm mt-3">
                      Freighter wallet not installed.{" "}
                      <a
                        href="https://www.freighter.app/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        Install it here
                      </a>
                    </p>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Verified Attributes */}
          {walletConnected && userInfo && userInfo.verified && (
            <Card className="bg-[#111111] border-[#262626] mb-8">
              <CardHeader>
                <CardTitle className="text-[#fafafa]">Your Verified Attributes</CardTitle>
                <CardDescription className="text-[#a3a3a3]">
                  Identity attributes verified on the blockchain
                </CardDescription>
              </CardHeader>
              <CardContent>
                {userInfo.attributes && (
                  <div className="grid gap-4 sm:grid-cols-2">
                    {userInfo.attributes.ageOver18 !== undefined && (
                      <div className="p-4 bg-[#1a1a1a] rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-[#a3a3a3]">Age 18+</span>
                          <span className={userInfo.attributes.ageOver18 ? "text-green-400" : "text-red-400"}>
                            {userInfo.attributes.ageOver18 ? "✓ Verified" : "✗ Not verified"}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {userInfo.attributes.ageOver21 !== undefined && (
                      <div className="p-4 bg-[#1a1a1a] rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-[#a3a3a3]">Age 21+</span>
                          <span className={userInfo.attributes.ageOver21 ? "text-green-400" : "text-red-400"}>
                            {userInfo.attributes.ageOver21 ? "✓ Verified" : "✗ Not verified"}
                          </span>
                        </div>
                      </div>
                    )}
                    
                    {userInfo.attributes.documentType && (
                      <div className="p-4 bg-[#1a1a1a] rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-[#a3a3a3]">Document Type</span>
                          <span className="text-[#fafafa] font-medium">{userInfo.attributes.documentType}</span>
                        </div>
                      </div>
                    )}
                    
                    {userInfo.attributes.genderVerified !== undefined && (
                      <div className="p-4 bg-[#1a1a1a] rounded-xl">
                        <div className="flex justify-between items-center">
                          <span className="text-[#a3a3a3]">Gender Verified</span>
                          <span className={userInfo.attributes.genderVerified ? "text-green-400" : "text-[#a3a3a3]"}>
                            {userInfo.attributes.genderVerified ? "✓ Yes" : "No"}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                {userInfo.commitmentHash && (
                  <div className="mt-4 p-4 bg-[#1a1a1a] rounded-xl">
                    <p className="text-[#a3a3a3] text-sm mb-1">Commitment Hash</p>
                    <p className="text-[#fafafa] font-mono text-xs break-all">{userInfo.commitmentHash}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Getting Started / Quick Actions */}
          <Card className="bg-[#111111] border-[#262626]">
            <CardHeader>
              <CardTitle className="text-[#fafafa]">Getting Started</CardTitle>
              <CardDescription className="text-[#a3a3a3]">
                Quick actions to manage your identity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 sm:grid-cols-2">
                <Link href="/verify" className="block">
                  <div className="p-6 bg-[#1a1a1a] rounded-xl hover:bg-[#262626] transition-colors cursor-pointer group">
                    <Shield className="w-8 h-8 text-[#a78bfa] mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-[#fafafa] font-medium mb-2">Register Identity</h3>
                    <p className="text-[#a3a3a3] text-sm">
                      Verify your identity using zero-knowledge proofs
                    </p>
                  </div>
                </Link>
                
                <Link href="/lookup" className="block">
                  <div className="p-6 bg-[#1a1a1a] rounded-xl hover:bg-[#262626] transition-colors cursor-pointer group">
                    <Search className="w-8 h-8 text-[#fbbf24] mb-3 group-hover:scale-110 transition-transform" />
                    <h3 className="text-[#fafafa] font-medium mb-2">Lookup Users</h3>
                    <p className="text-[#a3a3a3] text-sm">
                      Verify other users' identities on the blockchain
                    </p>
                  </div>
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}