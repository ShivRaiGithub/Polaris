import { StellarBackground } from "@/components/stellar-background"
import { Header } from "@/components/header"
import { HeroSection } from "@/components/hero-section"
import { FeatureCards, BuildGrowSection } from "@/components/feature-cards"
import { HowItWorks } from "@/components/how-it-works"
import { Footer } from "@/components/footer"

export default function Home() {
  return (
    <main className="relative min-h-screen bg-[#0a0a0a] overflow-hidden">
      {/* Animated Background */}
      <StellarBackground />

      {/* Content */}
      <div className="relative z-10">
        <Header />
        <HeroSection />
        <FeatureCards />
        <BuildGrowSection />
        <HowItWorks />
        <Footer />
      </div>
    </main>
  )
}
