"use client"

import Link from "next/link"
import { Button } from "@/components/ui/button"
import { ArrowRight } from "lucide-react"

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-center pt-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-20 lg:py-32">
        <div className="grid lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          {/* Left Column - Bold Typography */}
          <div className="space-y-6">
            <h1 className="text-5xl sm:text-6xl lg:text-7xl xl:text-8xl font-black tracking-tight text-[#fafafa] leading-[0.9]">
              <span className="block">Polaris</span>
              <span className="block">VERIFY</span>
            </h1>
            <div className="w-24 h-1 bg-gradient-to-r from-[#a78bfa] to-[#fbbf24]" />
          </div>

          {/* Right Column - Description */}
          <div className="space-y-8">
            <p className="text-lg sm:text-xl text-[#a3a3a3] leading-relaxed max-w-xl">
              The next-generation identity verification platform leverages{" "}
              <span className="text-[#a78bfa] font-medium">Zero-Knowledge Proofs</span>{" "}
              to verify your identity without revealing sensitive information.
              Engage with a privacy-first solution that protects your data from ideation to verification.
            </p>

            <Link href="/verify">
              <Button className="bg-[#fbbf24] text-[#0a0a0a] hover:bg-[#fbbf24]/90 font-semibold rounded-full px-8 py-6 text-lg gap-3 group">
                Start Verification
                <ArrowRight className="w-5 h-5 transition-transform group-hover:translate-x-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </section>
  )
}
