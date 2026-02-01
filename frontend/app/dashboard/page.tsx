"use client"

import { useState } from "react"
import Link from "next/link"
import { Shield, ArrowRight, CheckCircle, Clock, XCircle, Wallet, Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { StellarBackground } from "@/components/stellar-background"

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
  const [walletConnected, setWalletConnected] = useState(false)
  const [walletAddress, setWalletAddress] = useState("")

  const connectWallet = async () => {
    // Placeholder for wallet connection
    // Your friend can implement the actual wallet connection logic here
    try {
      // Mock wallet connection
      setWalletConnected(true)
      setWalletAddress("0x1234...5678")
    } catch (error) {
      console.log("[v0] Wallet connection error:", error)
    }
  }

  const disconnectWallet = () => {
    setWalletConnected(false)
    setWalletAddress("")
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
              <span className="text-xl font-bold text-[#fafafa]">ZK-Verify</span>
            </Link>

            <div className="flex items-center gap-4">
              {walletConnected ? (
                <Button
                  onClick={disconnectWallet}
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full gap-2 bg-transparent"
                >
                  <Wallet className="w-4 h-4 text-[#a78bfa]" />
                  {walletAddress}
                </Button>
              ) : (
                <Button
                  onClick={connectWallet}
                  variant="outline"
                  className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full gap-2 bg-transparent"
                >
                  <Wallet className="w-4 h-4" />
                  Connect Wallet
                </Button>
              )}
              <Link href="/verify">
                <Button className="bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 font-semibold rounded-full gap-2">
                  <Plus className="w-4 h-4" />
                  New Verification
                </Button>
              </Link>
            </div>
          </div>
        </nav>
      </header>

      <main className="relative z-10 pt-24 pb-16 px-4 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-6xl">
          <div className="mb-12">
            <h1 className="text-4xl sm:text-5xl font-black text-[#fafafa] mb-4">
              Dashboard
            </h1>
            <p className="text-[#a3a3a3] text-lg">
              Manage your identity verifications and ZK proofs
            </p>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
            <Card className="bg-[#111111] border-[#262626]">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[#a3a3a3] text-sm">Total Verifications</p>
                    <p className="text-3xl font-bold text-[#fafafa] mt-1">12</p>
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
                    <p className="text-[#a3a3a3] text-sm">Active Proofs</p>
                    <p className="text-3xl font-bold text-[#fafafa] mt-1">8</p>
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
                    <p className="text-[#a3a3a3] text-sm">Pending</p>
                    <p className="text-3xl font-bold text-[#fafafa] mt-1">2</p>
                  </div>
                  <div className="p-3 bg-yellow-400/10 rounded-xl">
                    <Clock className="w-6 h-6 text-yellow-400" />
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Verification History */}
          <Card className="bg-[#111111] border-[#262626]">
            <CardHeader>
              <CardTitle className="text-[#fafafa]">Verification History</CardTitle>
              <CardDescription className="text-[#a3a3a3]">
                Your recent identity verification attempts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockRecords.map((record) => {
                  const status = statusConfig[record.status]
                  const StatusIcon = status.icon

                  return (
                    <div
                      key={record.id}
                      className="flex items-center justify-between p-4 bg-[#1a1a1a] rounded-xl"
                    >
                      <div className="flex items-center gap-4">
                        <div className={`p-2 rounded-lg ${status.bg}`}>
                          <StatusIcon className={`w-5 h-5 ${status.color}`} />
                        </div>
                        <div>
                          <p className="text-[#fafafa] font-medium">{record.documentType}</p>
                          <p className="text-[#a3a3a3] text-sm">{record.timestamp}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-4">
                        <span className={`px-3 py-1 rounded-full text-sm ${status.bg} ${status.color}`}>
                          {status.label}
                        </span>
                        {record.status === "verified" && record.proofId && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-[#a78bfa] hover:text-[#a78bfa] hover:bg-[#a78bfa]/10"
                          >
                            View Proof
                            <ArrowRight className="w-4 h-4 ml-1" />
                          </Button>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>

              {mockRecords.length === 0 && (
                <div className="text-center py-12">
                  <Shield className="w-12 h-12 mx-auto mb-4 text-[#a3a3a3]" />
                  <p className="text-[#a3a3a3]">No verifications yet</p>
                  <Link href="/verify">
                    <Button className="mt-4 bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90">
                      Start Your First Verification
                    </Button>
                  </Link>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}
