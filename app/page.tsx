"use client"

import { useEffect, useRef } from "react"
import Header from "@/components/landing/Header"
import Hero from "@/components/landing/Hero"
import Features from "@/components/landing/Features"
import Footer from "@/components/landing/Footer"
import Areas from "@/components/landing/Areas"
import { getFirebaseAnalytics } from "@/lib/firebase"

export default function LandicoLanding() {
  const analyticsInitialized = useRef(false)

  useEffect(() => {
    if (!analyticsInitialized.current) {
      const analytics = getFirebaseAnalytics()
      if (analytics) {
        console.log("Firebase Analytics initialized successfully")
        analyticsInitialized.current = true
      }
    }
  }, [])

  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <Hero />
        <Features />
        <Areas />
      </main>
      <Footer />
    </div>
  )
}
