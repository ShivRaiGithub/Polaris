"use client"

import { useState } from "react"
import Link from "next/link"
import { Menu, X, Shield, Wallet, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useWallet } from "@/lib/wallet-context"

const navLinks = [
  { href: "/verify", label: "Verify" },
  { href: "/lookup", label: "Lookup" },
  { href: "/dashboard", label: "Dashboard" },
]

export function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const { 
    walletConnected, 
    walletAddress, 
    isLoading: walletLoading, 
    freighterInstalled,
    connectWallet,
    disconnectWallet 
  } = useWallet()

  return (
    <header className="fixed top-0 left-0 right-0 z-50 bg-[#0a0a0a]/80 backdrop-blur-md border-b border-[#262626]">
      <nav className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 group">
            <div className="relative">
              <Shield className="h-8 w-8 text-[#a78bfa] transition-transform group-hover:scale-110" />
              <div className="absolute inset-0 blur-md bg-[#a78bfa]/30 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <span className="text-xl font-bold text-[#fafafa]">Polaris</span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden md:flex md:items-center md:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-sm font-medium text-[#a3a3a3] hover:text-[#fafafa] transition-colors"
              >
                {link.label}
              </Link>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="hidden md:flex md:items-center md:gap-3">
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
            <Link href="/verify">
              <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                Verify
              </Button>
            </Link>
            <Link href="/lookup">
              <Button variant="outline" className="border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                Lookup
              </Button>
            </Link>
            <Link href="/dashboard">
              <Button className="bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 font-semibold rounded-full px-6">
                Dashboard
              </Button>
            </Link>
          </div>

          {/* Mobile menu button */}
          <button
            type="button"
            className="md:hidden p-2 text-[#a3a3a3] hover:text-[#fafafa]"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>

        {/* Mobile Navigation */}
        {mobileMenuOpen && (
          <div className="md:hidden py-4 border-t border-[#262626]">
            <div className="flex flex-col gap-4">
              {navLinks.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-sm font-medium text-[#a3a3a3] hover:text-[#fafafa] transition-colors"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  {link.label}
                </Link>
              ))}
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
              <Link href="/verify" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Verify
                </Button>
              </Link>
              <Link href="/lookup" onClick={() => setMobileMenuOpen(false)}>
                <Button variant="outline" className="w-full border-[#262626] text-[#fafafa] hover:bg-[#1a1a1a] rounded-full bg-transparent">
                  Lookup
                </Button>
              </Link>
              <Link href="/dashboard" onClick={() => setMobileMenuOpen(false)}>
                <Button className="w-full bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 font-semibold rounded-full">
                  Dashboard
                </Button>
              </Link>
            </div>
          </div>
        )}
      </nav>
    </header>
  )
}
