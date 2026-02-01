"use client"

import { Button } from "@/components/ui/button"
import { ArrowRight, Shield, Lock, Zap, Eye, FileCheck, Server } from "lucide-react"

const features = [
  {
    icon: Shield,
    title: "Privacy First",
    description:
      "Your personal data never leaves your device. We use advanced cryptography to verify your identity without exposing sensitive information.",
  },
  {
    icon: Lock,
    title: "Zero-Knowledge",
    description:
      "Prove you meet requirements without revealing the underlying data. Age verification? Prove you're over 18 without sharing your birthdate.",
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description:
      "Generate proofs in milliseconds. Our optimized circuits ensure quick verification without compromising on security.",
  },
  
  {
    icon: FileCheck,
    title: "Multi-Document",
    description:
      "Support for Aadhaar, PAN, Driving License, and Passport. Verify any government-issued ID with the same privacy guarantees.",
  },
  
]

export function FeatureCards() {
  return (
    <section id="features" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fafafa] mb-4">
            Why Choose Polaris?
          </h2>
          <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
            Built with cutting-edge cryptography to ensure your privacy is never compromised
          </p>
        </div>

        {/* Feature Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative bg-[#111111] border border-[#262626] rounded-2xl p-8 hover:border-[#a78bfa]/50 transition-all duration-300"
            >
              {/* Glow effect on hover */}
              <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-[#a78bfa]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

              <div className="relative z-10">
                <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-[#a78bfa]/10 text-[#a78bfa] mb-6 group-hover:scale-110 transition-transform duration-300">
                  <feature.icon className="w-6 h-6" />
                </div>

                <h3 className="text-xl font-semibold text-[#fafafa] mb-3">
                  {feature.title}
                </h3>

                <p className="text-[#a3a3a3] leading-relaxed">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function BuildGrowSection() {
  return (
    <section className="relative py-24 lg:py-32 overflow-hidden">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Curved Arrow SVG */}
        <div className="flex justify-center mb-8">
          <svg
            width="120"
            height="80"
            viewBox="0 0 120 80"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="text-[#a78bfa]"
          >
            <path
              d="M10 70C10 70 30 10 60 10C90 10 110 50 110 50"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              fill="none"
            />
            <path
              d="M100 40L110 50L100 60"
              stroke="currentColor"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </div>

        {/* Single Verify Card */}
        <div className="max-w-3xl mx-auto">
          <div className="bg-[#111111] border border-[#262626] rounded-2xl p-8 lg:p-10">
            <h3 className="text-2xl lg:text-3xl font-bold text-[#fafafa] mb-4">
              Verify
            </h3>
            <p className="text-[#a3a3a3] leading-relaxed">
              Upload your government-issued ID and generate a zero-knowledge proof instantly. 
              Your data stays on your device - only the cryptographic proof is shared, 
              ensuring complete privacy while meeting verification requirements.
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}