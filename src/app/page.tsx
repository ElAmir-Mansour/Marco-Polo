"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Sparkles, UserCheck, Flame, ArrowRight, Eye, EyeOff } from "lucide-react";
import { Logo } from "@/components/ui/Logo";
import Landing3DBackground from "@/components/map/Landing3DBackground";

export default function Home() {
  const [backgroundFocused, setBackgroundFocused] = useState(false);

  return (
    <div className="min-h-screen bg-midnight text-text-primary flex flex-col justify-between overflow-x-hidden relative select-none">
      
      {/* Decorative Blur Orbs (faded out when background is focused to ensure WebGL clarity) */}
      <div className={`absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-gold-sand/5 rounded-full filter blur-3xl pointer-events-none transition-opacity duration-700 ${backgroundFocused ? "opacity-0" : "opacity-100"}`} />
      <div className={`absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-teal-spring/5 rounded-full filter blur-3xl pointer-events-none transition-opacity duration-700 ${backgroundFocused ? "opacity-0" : "opacity-100"}`} />

      {/* 3D Cyber Silk Road Parallax Background (receives focus events) */}
      <Landing3DBackground isFocused={backgroundFocused} />

      {/* Navigation Header */}
      <header className="max-w-7xl mx-auto w-full px-6 py-6 flex items-center justify-between z-20">
        <Logo size="md" />
        <div className="flex items-center space-x-3 pointer-events-auto">
          {/* Background Map Focus Toggle */}
          <button
            onClick={() => setBackgroundFocused(!backgroundFocused)}
            className="border border-teal-spring/30 hover:bg-teal-spring/10 text-teal-spring text-xs font-bold px-4 py-2 rounded-xl uppercase tracking-wider transition-all flex items-center space-x-1.5 cursor-pointer shadow-sm"
          >
            {backgroundFocused ? (
              <>
                <EyeOff className="h-3.5 w-3.5" />
                <span>Exit Map Focus</span>
              </>
            ) : (
              <>
                <Eye className="h-3.5 w-3.5" />
                <span>Focus System Map</span>
              </>
            )}
          </button>
          
          <Link
            href="/onboarding"
            className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 py-2 rounded-xl uppercase tracking-wider transition-all shadow-[0_0_15px_rgba(212,175,55,0.25)]"
          >
            Start Journey
          </Link>
        </div>
      </header>

      {/* Hero Section (fades out smoothly in focus mode) */}
      <main className={`max-w-5xl mx-auto w-full px-6 py-12 flex-1 flex flex-col justify-center items-center text-center space-y-8 z-10 transition-all duration-700 ease-in-out ${
        backgroundFocused ? "opacity-0 scale-95 pointer-events-none" : "opacity-100 scale-100"
      }`}>
        
        <div className="inline-flex items-center space-x-2 bg-gold-sand/10 border border-gold-sand/20 rounded-full px-4 py-1.5 text-xs text-gold-sand animate-pulse font-medium">
          <Sparkles className="h-4 w-4" />
          <span>Devpost H0 Hackathon B2C Project</span>
        </div>

        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black font-serif tracking-wide text-gold-sand uppercase leading-tight">
            The AI Learning <br className="hidden sm:block" />
            <span className="text-teal-spring">Expedition Trail</span>
          </h1>
          <p className="max-w-2xl text-sm sm:text-base text-text-secondary leading-relaxed mx-auto">
            Transform software engineering into an epic trade journey. Undergo AI skill diagnostic evaluations, navigate custom learning path oases, maintain survival canteens, and trade insights in the Great Bazaar.
          </p>
        </div>

        {/* CTA Button */}
        <div>
          <Link
            href="/onboarding"
            className="inline-flex items-center space-x-2 bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold text-sm sm:text-base py-3 px-8 rounded-xl transition-all shadow-[0_0_20px_rgba(212,175,55,0.3)] hover:shadow-[0_0_30px_rgba(212,175,55,0.5)] transform hover:-translate-y-0.5"
          >
            <span>Begin Onboarding Trail</span>
            <ArrowRight className="h-5 w-5" />
          </Link>
        </div>

        {/* Feature Cards Showcase */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 w-full pt-12">
          
          {/* Card 1: AI Caravan Master (Marco Polo) */}
          <div className="glass-panel rounded-2xl p-6 text-left space-y-3 border-gold-sand/10 premium-glow">
            <div className="h-10 w-10 rounded-xl bg-gold-sand/10 border border-gold-sand/20 flex items-center justify-center text-gold-sand">
              <Logo showText={false} size="sm" />
            </div>
            <h3 className="text-sm font-bold font-serif text-text-primary uppercase tracking-wider">AI Caravan Master</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Your historical co-pilot Master Marco Polo streams customized hints and conceptual solutions without spoiling direct code results.
            </p>
          </div>

          {/* Card 2: Streak Survival */}
          <div className="glass-panel rounded-2xl p-6 text-left space-y-3 border-orange-flame/10 premium-glow">
            <div className="h-10 w-10 rounded-xl bg-orange-flame/10 border border-orange-flame/20 flex items-center justify-center text-orange-flame">
              <Flame className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold font-serif text-text-primary uppercase tracking-wider">Streak Survival</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Complete daily coding challenges to replenish your water canteen. Lock in shields to prevent streak breaks.
            </p>
          </div>

          {/* Card 3: Human Mentorship */}
          <div className="glass-panel rounded-2xl p-6 text-left space-y-3 border-teal-spring/10 premium-glow">
            <div className="h-10 w-10 rounded-xl bg-teal-spring/10 border border-teal-spring/20 flex items-center justify-center text-teal-spring">
              <UserCheck className="h-5 w-5" />
            </div>
            <h3 className="text-sm font-bold font-serif text-text-primary uppercase tracking-wider">The Great Bazaar</h3>
            <p className="text-xs text-text-secondary leading-relaxed">
              Unlock certified oases trails, buy/sell boilerplate templates, or book 1-on-1 code reviews with verified guides.
            </p>
          </div>

        </div>

      </main>

      {/* Footer (fades out in focus mode) */}
      <footer className={`py-8 border-t border-gold-sand/5 text-center text-[10px] text-text-secondary/50 transition-opacity duration-700 ${
        backgroundFocused ? "opacity-0 pointer-events-none" : "opacity-100"
      }`}>
        <p>© 2026 Silk Road Learning Systems. Dedicated to AWS Aurora & DynamoDB Serverless Deployments.</p>
      </footer>

    </div>
  );
}
