"use client"

import { Camera, Cpu, CheckCircle2, Share2 } from "lucide-react"

const steps = [
  {
    icon: Camera,
    step: "01",
    title: "Capture",
    description: "Take a photo of your government-issued ID using your device camera or upload an existing image.",
  },
  {
    icon: Cpu,
    step: "02",
    title: "Process",
    description: "Our OCR engine extracts the relevant data locally on your device - nothing is sent to external servers.",
  },
  {
    icon: CheckCircle2,
    step: "03",
    title: "Generate Proof",
    description: "A zero-knowledge proof is generated, cryptographically proving your identity claims without revealing raw data.",
  },
  {
    icon: Share2,
    step: "04",
    title: "Share & Verify",
    description: "Share only the proof with verifiers. They can confirm your claims without ever seeing your personal information.",
  },
]

export function HowItWorks() {
  return (
    <section id="how-it-works" className="relative py-24 lg:py-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center mb-16">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-[#fafafa] mb-4">
            How It Works
          </h2>
          <p className="text-[#a3a3a3] text-lg max-w-2xl mx-auto">
            Four simple steps to privacy-preserving identity verification
          </p>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-8">
          {steps.map((step, index) => (
            <div key={index} className="relative group">
              {/* Connector Line */}
              {index < steps.length - 1 && (
                <div className="hidden lg:block absolute top-12 left-full w-full h-0.5 bg-gradient-to-r from-[#a78bfa] to-transparent z-0" />
              )}

              <div className="relative z-10 bg-[#0a0a0a] p-6">
                {/* Step Number */}
                <div className="text-6xl font-black text-[#262626] mb-4 group-hover:text-[#a78bfa]/20 transition-colors">
                  {step.step}
                </div>

                {/* Icon */}
                <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-br from-[#a78bfa] to-[#7c3aed] text-white mb-6 group-hover:scale-110 transition-transform">
                  <step.icon className="w-7 h-7" />
                </div>

                {/* Content */}
                <h3 className="text-xl font-semibold text-[#fafafa] mb-3">
                  {step.title}
                </h3>
                <p className="text-[#a3a3a3] leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
