"use client";

import React, { useState, useEffect } from "react";
import { Compass, Shield, Award, Calendar, DollarSign, ArrowLeft, CheckCircle2, UserCheck, ShieldAlert, Sparkles, Coins, Flame, CreditCard, Loader, Search, Clock, Star, X } from "lucide-react";
import { useRouter } from "next/navigation";
import confetti from "canvas-confetti";

interface Mentor {
  id: string;
  name: string;
  specialty: string;
  hourlyRate: number; // in USD cents
  rating: number;
  bio: string;
  avatar: string;
}

export default function Marketplace() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Billing & inventory profile states
  const [coinsBalance, setCoinsBalance] = useState(0);
  const [streakShields, setStreakShields] = useState(0);
  const [subscriptionStatus, setSubscriptionStatus] = useState("inactive");

  // Mentors state
  const [mentors, setMentors] = useState<Mentor[]>([]);
  const [loadingMentors, setLoadingMentors] = useState(true);

  // Filter and search states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");

  // Checkout & Booking states
  const [purchasedItem, setPurchasedItem] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success">("idle");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  
  // Interactive Slots Selection states
  const [dateOptions, setDateOptions] = useState<{ dayLabel: string; dateStr: string; dateObj: Date }[]>([]);
  const [selectedDateIndex, setSelectedDateIndex] = useState<number | null>(null);
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<string | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "coins">("cash");

  const [isPortalLoading, setIsPortalLoading] = useState(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);

  const showToast = (message: string, type: "success" | "error" | "info" = "error") => {
    setToast({ message, type });
    setTimeout(() => {
      setToast(prev => prev?.message === message ? null : prev);
    }, 5000);
  };

  // Time slot options
  const timeSlots = [
    { label: "09:00 AM UTC", value: "09:00" },
    { label: "01:00 PM UTC", value: "13:00" },
    { label: "05:00 PM UTC", value: "17:00" },
    { label: "09:00 PM UTC", value: "21:00" },
  ];

  // Generate date options dynamically (next 4 days)
  useEffect(() => {
    const opts = [];
    const today = new Date();
    for (let i = 0; i < 4; i++) {
      const d = new Date(today);
      d.setDate(today.getDate() + i);
      let dayLabel = "";
      if (i === 0) dayLabel = "Today";
      else if (i === 1) dayLabel = "Tomorrow";
      else {
        dayLabel = d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });
      }
      const dateStr = d.toISOString().split("T")[0]; // YYYY-MM-DD
      opts.push({ dayLabel, dateStr, dateObj: d });
    }
    setDateOptions(opts);
  }, []);

  const fetchUserBillingProfile = async (uId: string) => {
    try {
      const response = await fetch(`/api/progress?userId=${uId}`);
      const data = await response.json();
      if (data.success && data.user) {
        setCoinsBalance(data.user.coinsBalance);
        setStreakShields(data.user.streakShields);
        setSubscriptionStatus(data.user.subscriptionStatus || "inactive");
      }
    } catch (err) {
      console.error("Failed to load user billing profile:", err);
    }
  };

  const fetchMentors = async () => {
    setLoadingMentors(true);
    try {
      const response = await fetch("/api/mentors");
      const data = await response.json();
      if (data.success && data.mentors) {
        setMentors(data.mentors);
      }
    } catch (err) {
      console.error("Failed to fetch mentors:", err);
    } finally {
      setLoadingMentors(false);
    }
  };

  useEffect(() => {
    const savedUserId = localStorage.getItem("silkroad_userid");
    setUserId(savedUserId);
    if (savedUserId) {
      fetchUserBillingProfile(savedUserId);
    }
    fetchMentors();
  }, []);

  // Handle Stripe Checkout redirects for Subscriptions or Coins purchases
  const handleStripeCheckout = async (priceId: string, itemName: string) => {
    if (!userId) {
      showToast("Traveler profile missing. Register through onboarding first.", "error");
      return;
    }
    
    setPurchasedItem(itemName);
    setCheckoutStatus("processing");

    try {
      const response = await fetch("/api/billing/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ priceId }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Checkout initiation failed.");
      }

      // If mock mode is active, it does a direct DB update and returns the success URL
      if (data.mock) {
        console.log("[Marketplace] Mock checkout completed successfully.");
        await fetchUserBillingProfile(userId);
        setCheckoutStatus("success");
        // Confetti feedback loop
        confetti({
          particleCount: 120,
          spread: 70,
          origin: { y: 0.6 }
        });
      } else {
        // Redirect to real Stripe Checkout page
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Stripe Checkout failure:", err);
      setCheckoutStatus("idle");
      showToast(err.message || "Failed to initialize payment process.", "error");
    }
  };

  // Open Stripe Customer Billing Portal
  const handleOpenBillingPortal = async () => {
    if (!userId) return;
    setIsPortalLoading(true);

    try {
      // In mock simulation, pass cancelMock to simulate cancelling a subscription
      const response = await fetch("/api/billing/portal", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cancelMock: subscriptionStatus === "active" }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to open billing portal.");
      }

      if (data.mock) {
        showToast("Developer Simulation: Subscribed Status toggled / cancelled.", "info");
        await fetchUserBillingProfile(userId);
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      showToast(err.message || "Failed to launch billing portal.", "error");
    } finally {
      setIsPortalLoading(false);
    }
  };

  // Handle coins-based microtransaction purchases (like Streak Shield, verified badging)
  const handleCoinsPurchase = async (itemName: string, action: string, costInCoins: number) => {
    if (!userId) {
      showToast("Traveler profile missing. Register through onboarding first.", "error");
      return;
    }

    if (coinsBalance < costInCoins) {
      showToast(`Insufficient coins balance! This item costs ${costInCoins} coins, but you only have ${coinsBalance}. Buy more coins below!`, "error");
      return;
    }

    setPurchasedItem(itemName);
    setCheckoutStatus("processing");

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: 0, // 0 cash, using coins
          type: "marketplace",
          action,
          useCoins: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Marketplace transaction failed.");
      }

      // Sync state and show success modal
      if (data.user) {
        setCoinsBalance(data.user.coinsBalance);
        setStreakShields(data.user.streakShields);
        setSubscriptionStatus(data.user.subscriptionStatus);
      }
      setCheckoutStatus("success");
      // Confetti feedback loop
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch (err: any) {
      console.error("Coins purchase failed:", err);
      setCheckoutStatus("idle");
      showToast(err.message || "Transaction failed.", "error");
    }
  };

  const handleBookMentor = async (mentor: Mentor) => {
    if (!userId) {
      showToast("Traveler profile missing. Register through onboarding first.", "error");
      return;
    }
    if (selectedDateIndex === null || !selectedTimeSlot) {
      showToast("Please select a valid scheduled date and time slot.", "error");
      return;
    }

    const chosenDateOpt = dateOptions[selectedDateIndex];
    // Create an ISO string for scheduledAt: YYYY-MM-DDT[time]:00.000Z
    const scheduledAtStr = `${chosenDateOpt.dateStr}T${selectedTimeSlot}:00.000Z`;

    // Calculate coin cost
    const coinsCost = Math.round(mentor.hourlyRate / 10);

    if (paymentMethod === "coins" && coinsBalance < coinsCost) {
      showToast(`Insufficient coins balance! This session costs ${coinsCost} coins, but you only have ${coinsBalance}.`, "error");
      return;
    }

    setCheckoutStatus("processing");
    try {
      // 1. Create Mentorship Booking
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: mentor.id, // Dynamically maps database mentor ID
          menteeId: userId,
          scheduledAt: scheduledAtStr,
        }),
      });
      const bookingData = await bookingResponse.json();

      if (!bookingResponse.ok) throw new Error(bookingData.error);

      // 2. Charge transactional database ledger
      const txResponse = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: mentor.hourlyRate,
          type: "marketplace",
          action: "book_mentor",
          useCoins: paymentMethod === "coins",
        }),
      });

      const txData = await txResponse.json();
      if (!txResponse.ok) throw new Error(txData.error);

      // Sync state and show success modal
      if (txData.user) {
        setCoinsBalance(txData.user.coinsBalance);
        setStreakShields(txData.user.streakShields);
        setSubscriptionStatus(txData.user.subscriptionStatus);
      } else {
        await fetchUserBillingProfile(userId);
      }

      setPurchasedItem(`1-on-1 session with ${mentor.name} (${chosenDateOpt.dayLabel} at ${selectedTimeSlot} UTC)`);
      setCheckoutStatus("success");
      
      // Trigger canvas-confetti dopamine burst!
      confetti({
        particleCount: 150,
        spread: 80,
        origin: { y: 0.6 }
      });

      setSelectedMentor(null);
      setSelectedDateIndex(null);
      setSelectedTimeSlot(null);
    } catch (err: any) {
      showToast(err.message || "Failed to finalize human mentor booking.", "error");
      setCheckoutStatus("idle");
    }
  };

  // Filter time slots based on today's remaining hours (in UTC)
  const getAvailableTimeSlots = () => {
    if (selectedDateIndex === 0) {
      const currentHour = new Date().getUTCHours();
      return timeSlots.filter((slot) => {
        const slotHour = parseInt(slot.value.split(":")[0]);
        return slotHour > currentHour;
      });
    }
    return timeSlots;
  };

  // Filter mentors list based on search and selected specialty category
  const filteredMentors = mentors.filter((mentor) => {
    // Search Query check
    const matchesSearch =
      mentor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.bio.toLowerCase().includes(searchQuery.toLowerCase()) ||
      mentor.specialty.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    // Specialty category check
    if (selectedCategory === "All") return true;
    if (selectedCategory === "System Design") {
      return mentor.specialty.toLowerCase().includes("system design") || mentor.specialty.toLowerCase().includes("cloud");
    }
    if (selectedCategory === "Next.js & React") {
      return (
        mentor.specialty.toLowerCase().includes("next.js") ||
        mentor.specialty.toLowerCase().includes("react") ||
        mentor.specialty.toLowerCase().includes("ux")
      );
    }
    if (selectedCategory === "Maps & SVGs") {
      return (
        mentor.specialty.toLowerCase().includes("maps") ||
        mentor.specialty.toLowerCase().includes("visualizations") ||
        mentor.specialty.toLowerCase().includes("canvas") ||
        mentor.specialty.toLowerCase().includes("three.js")
      );
    }
    if (selectedCategory === "Database Ledgers") {
      return (
        mentor.specialty.toLowerCase().includes("database") ||
        mentor.specialty.toLowerCase().includes("ledger") ||
        mentor.specialty.toLowerCase().includes("transactions") ||
        mentor.specialty.toLowerCase().includes("postgres")
      );
    }
    return true;
  });

  const renderStars = (rating: number) => {
    const fullStars = Math.floor(rating);
    return (
      <div className="flex items-center space-x-0.5">
        {[...Array(5)].map((_, i) => {
          if (i < fullStars) {
            return (
              <Star key={i} className="h-3 w-3 text-gold-sand fill-gold-sand" />
            );
          }
          return (
            <Star key={i} className="h-3 w-3 text-text-secondary/35" />
          );
        })}
        <span className="text-[10px] text-gold-sand font-bold ml-1.5">{rating.toFixed(1)}</span>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-midnight text-text-primary py-12 px-6 overflow-y-auto select-none font-sans relative">
      {/* Immersive Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50 animate-fadeIn max-w-md w-full px-4">
          <div className={`glass-panel border p-4 rounded-xl flex items-start space-x-3 shadow-[0_0_20px_rgba(0,0,0,0.8)] backdrop-blur-md ${
            toast.type === "success" 
              ? "border-teal-spring/40 bg-[#0D1B2A]/95 text-teal-spring shadow-[0_0_15px_rgba(0,168,150,0.15)]" 
              : toast.type === "error"
              ? "border-orange-flame/40 bg-[#0D1B2A]/95 text-orange-flame shadow-[0_0_15px_rgba(242,100,25,0.15)]"
              : "border-gold-sand/40 bg-[#0D1B2A]/95 text-gold-sand shadow-[0_0_15px_rgba(212,175,55,0.15)]"
          }`}>
            <div className="flex-1 text-xs font-semibold leading-relaxed">
              {toast.message}
            </div>
            <button 
              onClick={() => setToast(null)}
              className="text-text-secondary hover:text-text-primary text-[10px] font-bold cursor-pointer flex-shrink-0"
            >
              ✕
            </button>
          </div>
        </div>
      )}
      {/* Immersive Starry Sky Background */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <svg className="absolute w-full h-full opacity-35" xmlns="http://www.w3.org/2000/svg">
          {/* Twinkling stars */}
          <circle cx="10%" cy="15%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "2.5s" }} />
          <circle cx="35%" cy="8%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "4s" }} />
          <circle cx="75%" cy="20%" r="1.5" fill="#D4AF37" className="animate-pulse" style={{ animationDuration: "3s" }} />
          <circle cx="90%" cy="10%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "5s" }} />
          <circle cx="50%" cy="25%" r="1.2" fill="#00A896" className="animate-pulse" style={{ animationDuration: "3.5s" }} />
          <circle cx="20%" cy="40%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "2.2s" }} />
          <circle cx="65%" cy="45%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "4.5s" }} />
          <circle cx="80%" cy="60%" r="1.5" fill="#D4AF37" className="animate-pulse" style={{ animationDuration: "3.8s" }} />
          <circle cx="15%" cy="75%" r="1.2" fill="#fff" className="animate-pulse" style={{ animationDuration: "2.7s" }} />
          <circle cx="45%" cy="80%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "5.5s" }} />
          <circle cx="85%" cy="85%" r="1" fill="#fff" className="animate-pulse" style={{ animationDuration: "3.2s" }} />
          <circle cx="55%" cy="92%" r="1" fill="#00A896" className="animate-pulse" style={{ animationDuration: "4.2s" }} />
        </svg>
        {/* Soft background light blooms */}
        <div className="absolute top-[20%] left-[10%] w-[400px] h-[400px] bg-teal-spring/5 rounded-full filter blur-[120px]"></div>
        <div className="absolute bottom-[20%] right-[10%] w-[500px] h-[500px] bg-gold-sand/5 rounded-full filter blur-[150px]"></div>
      </div>
      
      {/* Back button */}
      <div className="max-w-4xl mx-auto mb-8 animate-fadeIn relative z-10">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center space-x-2 text-gold-sand hover:text-gold-sand/80 text-xs font-semibold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Expedition Trail</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-12 relative z-10">
        
        {/* Marketplace banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden premium-glow animate-fadeIn">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gold-sand/5 rounded-full filter blur-3xl pointer-events-none"></div>
          
          <div className="flex-grow text-center md:text-left space-y-3 relative z-10">
            <div className="inline-flex text-gold-sand animate-pulse">
              <Sparkles className="h-8 w-8" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-bold font-serif tracking-wider text-gold-sand">THE GREAT BAZAAR</h1>
            <p className="text-xs text-text-secondary max-w-md mx-auto md:mx-0 leading-relaxed font-sans">
              Trade coins and purchase premium enhancements. Secure transactions are recorded directly onto our AWS PostgreSQL relational ledger.
            </p>
          </div>

          <div className="flex-shrink-0 relative z-10">
            <img
              src="/images/characters/marcopolo_bazaar.png"
              alt="Marco Polo Shopkeeper"
              style={{ height: "128px", width: "auto" }}
              className="object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.45)] hover:scale-105 transition-all duration-500 camel-walk"
            />
            <div className="absolute -top-3 -left-8 bg-indigo-oasis/95 border border-gold-sand/30 rounded-xl px-2.5 py-1 text-[9px] font-bold text-gold-sand shadow-lg animate-bounce select-none whitespace-nowrap backdrop-blur-sm">
              Trade well, traveler! 🪙
            </div>
          </div>
        </div>

        {/* Billing Status HUD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto animate-fadeIn">
          {/* Subscription Status Widget */}
          <div className={`glass-panel rounded-2xl p-5 border flex flex-col justify-between items-center text-center relative overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
            subscriptionStatus === "active" 
              ? "border-gold-sand/50 bg-gradient-to-b from-indigo-oasis/80 to-gold-sand/10 shadow-[0_4px_20px_rgba(212,175,55,0.2)]" 
              : "border-text-secondary/10 hover:border-gold-sand/30 hover:shadow-[0_4px_15px_rgba(0,0,0,0.4)]"
          }`}>
            {subscriptionStatus === "active" && (
              <div className="absolute top-0 right-0 bg-gold-sand text-midnight text-[8px] font-black uppercase px-2 py-0.5 rounded-bl">PRO</div>
            )}
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block font-sans">Account Status</span>
              <div className="flex items-center justify-center space-x-1.5">
                <CreditCard className={`h-4.5 w-4.5 ${subscriptionStatus === "active" ? "text-gold-sand" : "text-text-secondary"}`} />
                <span className={`text-sm font-bold font-serif ${subscriptionStatus === "active" ? "text-gold-sand" : "text-text-primary"}`}>
                  {subscriptionStatus === "active" ? "Nomad Explorer" : "Traveler (Free)"}
                </span>
              </div>
            </div>
            <div className="mt-3 w-full">
              {subscriptionStatus === "active" ? (
                <button
                  onClick={handleOpenBillingPortal}
                  disabled={isPortalLoading}
                  className="w-full h-8.5 text-[10px] font-bold uppercase tracking-wider bg-gold-sand/10 hover:bg-gold-sand/20 text-gold-sand rounded-lg border border-gold-sand/30 transition-all flex items-center justify-center space-x-1 cursor-pointer hover:shadow-[0_0_10px_rgba(212,175,55,0.1)]"
                >
                  {isPortalLoading ? <Loader className="h-3 w-3 animate-spin" /> : <span>Manage Billing</span>}
                </button>
              ) : (
                <button
                  onClick={() => handleStripeCheckout("price_nomad_monthly_15", "Nomad Subscription Upgrade")}
                  className="w-full h-8.5 text-[10px] font-bold uppercase tracking-wider bg-gradient-to-r from-gold-sand to-[#bfa032] hover:from-[#e5c249] hover:to-gold-sand text-midnight rounded-lg transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer font-serif"
                >
                  <span>Upgrade ($15/mo)</span>
                </button>
              )}
            </div>
          </div>

          {/* Coins Balance Widget */}
          <div className="glass-panel rounded-2xl p-5 border border-text-secondary/10 hover:border-gold-sand/30 hover:shadow-[0_4px_15px_rgba(212,175,55,0.1)] transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between items-center text-center">
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block font-sans">Caravan Purse</span>
              <div className="flex items-center justify-center space-x-1.5">
                <Coins className="h-5 w-5 text-gold-sand drop-shadow-[0_0_8px_rgba(212,175,55,0.4)]" />
                <span className="text-sm font-bold font-serif text-gold-sand">{coinsBalance} Coins</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-text-secondary font-medium leading-relaxed font-sans">
              Earn by solving trails or trade at the purse pouch below
            </div>
          </div>

          {/* Streak Shields Balance Widget */}
          <div className="glass-panel rounded-2xl p-5 border border-text-secondary/10 hover:border-orange-flame/30 hover:shadow-[0_4px_15px_rgba(242,100,25,0.1)] transition-all duration-300 hover:scale-[1.02] flex flex-col justify-between items-center text-center">
            <div className="space-y-1.5">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block font-sans">Survival Inventory</span>
              <div className="flex items-center justify-center space-x-1.5">
                <Flame className="h-5 w-5 text-orange-flame animate-pulse drop-shadow-[0_0_8px_rgba(242,100,25,0.4)]" />
                <span className="text-sm font-bold font-serif text-orange-flame">{streakShields} Shields</span>
              </div>
            </div>
            <div className="mt-3 text-[10px] text-text-secondary font-medium leading-relaxed font-sans">
              Protects canteens automatically if daily challenge is missed
            </div>
          </div>
        </div>

        {/* B2C Items Marketplace Grid */}
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-lg font-bold font-serif text-gold-sand flex items-center tracking-wide">
              <Shield className="h-5 w-5 mr-2" />
              ENHANCEMENTS & UPGRADES
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Streak Insurance */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow hover:border-orange-flame/30 hover:shadow-[0_0_20px_rgba(242,100,25,0.1)] transition-all duration-300">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-orange-flame/15 flex items-center justify-center text-orange-flame border border-orange-flame/30">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold font-serif text-text-primary">Caravan Streak Shield</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  Protect your water canteen streak! If you miss your daily coding challenge, this shield automatically consumes itself to save your streak history.
                </p>
              </div>
              <div className="flex flex-col space-y-2.5 pt-4 border-t border-text-secondary/10">
                <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary">
                  <span>Shield Pricing</span>
                  <span className="text-xs font-semibold text-gold-sand">50 Coins OR $4.99 USD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCoinsPurchase("Caravan Streak Shield", "buy_shield", 50)}
                    className="flex-1 bg-midnight hover:bg-gold-sand/10 border border-gold-sand/30 hover:border-gold-sand/60 text-gold-sand text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 hover:shadow-[0_0_10px_rgba(212,175,55,0.1)] font-sans"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>50 Coins</span>
                  </button>
                  <button
                    onClick={() => handleStripeCheckout("price_shield_499", "Caravan Streak Shield")}
                    className="flex-1 bg-gradient-to-r from-gold-sand to-[#bfa032] hover:from-[#e5c249] hover:to-gold-sand text-midnight text-[10px] font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 font-serif uppercase tracking-wider"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>$4.99 Cash</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Certification Badges */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow hover:border-teal-spring/30 hover:shadow-[0_0_20px_rgba(0,168,150,0.1)] transition-all duration-300">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-teal-spring/15 flex items-center justify-center text-teal-spring border border-teal-spring/30">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold font-serif text-text-primary">Verified Resume Badge</h3>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  Earn an official, shareable certificate PDF highlighting your role IQ and completed Silk Road oases. Backed by mentor-certified evaluations.
                </p>
              </div>
              <div className="flex flex-col space-y-2.5 pt-4 border-t border-text-secondary/10">
                <div className="flex justify-between items-center text-[10px] font-bold text-text-secondary">
                  <span>Certificate Pricing</span>
                  <span className="text-xs font-semibold text-gold-sand">150 Coins OR $14.99 USD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCoinsPurchase("Verified Resume Badge", "buy_badge", 150)}
                    className="flex-1 bg-midnight hover:bg-gold-sand/10 border border-gold-sand/30 hover:border-gold-sand/60 text-gold-sand text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer flex items-center justify-center space-x-1 hover:shadow-[0_0_10px_rgba(212,175,55,0.1)] font-sans"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>150 Coins</span>
                  </button>
                  <button
                    onClick={() => handleStripeCheckout("price_badge_1499", "Verified Resume Badge")}
                    className="flex-1 bg-gradient-to-r from-gold-sand to-[#bfa032] hover:from-[#e5c249] hover:to-gold-sand text-midnight text-[10px] font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center space-x-1 font-serif uppercase tracking-wider"
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>$14.99 Cash</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Shop Section */}
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-lg font-bold font-serif text-gold-sand flex items-center tracking-wide">
              <Coins className="h-5 w-5 mr-2" />
              COIN PURSER (PURCHASE COINS)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: 50 Coins */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow hover:border-gold-sand/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-gold-sand/15 flex items-center justify-center text-gold-sand border border-gold-sand/30">
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-text-primary">Pouch of Gold Coins</h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    Instantly add 50 Gold Coins to your Caravan purse. Best for one-off Streak Shields and quick tips.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-gold-sand block font-serif">50 COINS</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-text-secondary/10">
                <span className="text-sm font-bold text-gold-sand">$1.99 USD</span>
                <button
                  onClick={() => handleStripeCheckout("price_coins_50_2", "50 Gold Coins")}
                  className="bg-gradient-to-r from-gold-sand to-[#bfa032] hover:from-[#e5c249] hover:to-gold-sand text-midnight text-xs font-serif uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Purchase Pouch
                </button>
              </div>
            </div>

            {/* Card B: 200 Coins */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow hover:border-gold-sand/30 transition-all duration-300">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-gold-sand/15 flex items-center justify-center text-gold-sand border border-gold-sand/30 relative">
                    <div className="absolute -top-1.5 -right-1.5 bg-orange-flame text-text-primary font-bold text-[7px] px-1.5 py-0.5 rounded-full animate-bounce">SAVE</div>
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-text-primary">Chest of Gold Coins</h3>
                  <p className="text-xs text-text-secondary leading-relaxed font-sans">
                    Stock up with 200 Gold Coins. Perfect for buying multiple Streak Shields, premium Certification badges, and tipping.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-gold-sand block font-serif">200 COINS</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-text-secondary/10">
                <span className="text-sm font-bold text-gold-sand">$7.99 USD</span>
                <button
                  onClick={() => handleStripeCheckout("price_coins_200_8", "200 Gold Coins")}
                  className="bg-gradient-to-r from-gold-sand to-[#bfa032] hover:from-[#e5c249] hover:to-gold-sand text-midnight text-xs font-serif uppercase tracking-wider font-bold px-4 py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Purchase Chest
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 1-on-1 Mentor Booking Section */}
        <div className="space-y-6 animate-fadeIn">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-lg font-bold font-serif text-gold-sand flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Verified Human Caravanners (Mentors)
            </h2>
            <p className="text-[10px] text-text-secondary mt-1">
              Hire verified industry experts for customized 1-on-1 code reviews and session matching.
            </p>
          </div>

          {/* Specialty Filter and Search Section */}
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
              {/* Search input */}
              <div className="relative flex-grow max-w-md">
                <input
                  type="text"
                  placeholder="Search mentors by name, bio, or skill..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-indigo-oasis/40 border border-gold-sand/20 hover:border-gold-sand/40 focus:border-gold-sand focus:outline-none rounded-xl py-2 px-4 pl-10 text-xs text-text-primary placeholder-text-secondary transition-all"
                />
                <div className="absolute left-3.5 top-2.5 text-text-secondary">
                  <Search className="h-4 w-4" />
                </div>
                {searchQuery && (
                  <button
                    onClick={() => setSearchQuery("")}
                    className="absolute right-3 top-2 text-text-secondary hover:text-text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>

              {/* Total Mentors Indicator */}
              <div className="text-[11px] text-text-secondary font-medium">
                Found <span className="text-gold-sand font-bold">{filteredMentors.length}</span> verified experts
              </div>
            </div>

            {/* Specialty Categories Filters */}
            <div className="flex flex-wrap gap-2">
              {[
                { id: "All", label: "All Specialties" },
                { id: "System Design", label: "System Design" },
                { id: "Next.js & React", label: "Next.js & React" },
                { id: "Maps & SVGs", label: "Maps & SVGs" },
                { id: "Database Ledgers", label: "Database Ledgers" },
              ].map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`py-1.5 px-3 rounded-lg text-[10px] font-bold tracking-wider uppercase transition-all duration-300 border cursor-pointer ${
                    selectedCategory === cat.id
                      ? "bg-gold-sand border-gold-sand text-midnight shadow-[0_0_10px_rgba(212,175,55,0.25)]"
                      : "bg-indigo-oasis/30 border-text-secondary/15 text-text-secondary hover:text-text-primary hover:border-gold-sand/30"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mentor Cards Grid */}
          {loadingMentors ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-4">
              <Loader className="h-8 w-8 animate-spin text-gold-sand" />
              <p className="text-xs text-text-secondary font-medium uppercase tracking-widest font-serif">Sourcing mentors from PG database...</p>
            </div>
          ) : filteredMentors.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-text-secondary/10 rounded-2xl bg-indigo-oasis/10">
              <UserCheck className="h-8 w-8 mx-auto text-text-secondary/40 mb-3" />
              <p className="text-sm font-semibold text-text-primary">No Caravan mentors found matching search criteria.</p>
              <p className="text-xs text-text-secondary mt-1">Try resetting the specialty category filters or adjusting search queries.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {filteredMentors.map((mentor) => (
                <div 
                  key={mentor.id} 
                  className="glass-panel rounded-2xl p-6 flex flex-col space-y-4 justify-between border border-text-secondary/10 premium-glow hover:border-teal-spring/30 transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_30px_rgba(0,0,0,0.5)]"
                >
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3.5">
                      <div className="h-12 w-12 rounded-full bg-gradient-to-br from-gold-sand/20 to-teal-spring/20 text-gold-sand border-2 border-gold-sand/40 flex items-center justify-center font-bold text-lg shadow-[0_0_12px_rgba(212,175,55,0.2)]">
                        {mentor.avatar}
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-text-primary tracking-wide">{mentor.name}</h4>
                        <span className="inline-block text-[9px] bg-teal-spring/10 text-teal-spring border border-teal-spring/30 font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded mt-0.5">
                          {mentor.specialty}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-text-secondary leading-relaxed font-sans min-h-[50px]">{mentor.bio}</p>
                    <div className="pt-1">
                      {renderStars(mentor.rating)}
                    </div>
                  </div>

                  <div className="pt-4 border-t border-text-secondary/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-text-primary">
                        ${(mentor.hourlyRate / 100).toFixed(2)} / hr
                      </span>
                      <span className="text-[9px] text-gold-sand font-medium mt-0.5 flex items-center">
                        <Coins className="h-3 w-3 mr-0.5" />
                        or {Math.round(mentor.hourlyRate / 10)} Coins
                      </span>
                    </div>
                    
                    <button
                      onClick={() => setSelectedMentor(mentor)}
                      className="bg-indigo-oasis hover:bg-gold-sand border border-gold-sand/30 hover:border-gold-sand text-gold-sand hover:text-midnight text-xs font-bold px-4 py-2.5 rounded-xl transition-all cursor-pointer shadow-sm hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] font-serif uppercase tracking-wider"
                    >
                      Schedule Session
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Schedule Modal */}
        {selectedMentor && (
          <div className="fixed inset-0 bg-midnight/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-6 border-gold-sand/35 relative animate-fadeIn shadow-[0_0_50px_rgba(212,175,55,0.1)]">
              
              <div className="flex justify-between items-start">
                <div className="space-y-1">
                  <h3 className="text-base font-bold font-serif text-gold-sand">Book Expedition</h3>
                  <p className="text-[10.5px] text-text-secondary">
                    with <span className="font-bold text-text-primary">{selectedMentor.name}</span>
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSelectedMentor(null);
                    setSelectedDateIndex(null);
                    setSelectedTimeSlot(null);
                  }}
                  className="p-1 rounded-lg border border-text-secondary/15 text-text-secondary hover:text-text-primary hover:border-gold-sand/35 transition-colors cursor-pointer"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* 1. Date selector pills */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block font-sans">Select Date</label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {dateOptions.map((opt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSelectedDateIndex(idx);
                        setSelectedTimeSlot(null); // Reset time slot when date changes
                      }}
                      className={`h-14 rounded-xl border flex flex-col items-center justify-center transition-all cursor-pointer ${
                        selectedDateIndex === idx
                          ? "bg-gold-sand/20 border-gold-sand text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.25)] scale-105"
                          : "bg-midnight/70 border-text-secondary/15 text-text-secondary hover:border-gold-sand/40 hover:text-text-primary"
                      }`}
                    >
                      <span className="text-[9px] font-black uppercase tracking-wider block">
                        {idx === 0 ? "Today" : idx === 1 ? "Tomorrow" : opt.dayLabel.split(",")[0]}
                      </span>
                      <span className="text-[11px] font-bold mt-1">
                        {idx < 2 ? opt.dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }) : opt.dayLabel.split(",")[1]?.trim()}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. Time selector grid */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block font-sans">Available Expeditions (UTC)</label>
                {selectedDateIndex === null ? (
                  <div className="text-center p-4 border border-dashed border-text-secondary/10 rounded-xl text-text-secondary text-xs bg-midnight/30">
                    Choose a date first to reveal available oases.
                  </div>
                ) : getAvailableTimeSlots().length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-orange-flame/20 rounded-xl text-orange-flame text-xs bg-orange-flame/5">
                    No remaining slots for today. Try tomorrow!
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2">
                    {getAvailableTimeSlots().map((slot) => (
                      <button
                        key={slot.value}
                        type="button"
                        onClick={() => setSelectedTimeSlot(slot.value)}
                        className={`h-11 rounded-xl border flex items-center justify-center space-x-2 transition-all text-xs font-semibold cursor-pointer ${
                          selectedTimeSlot === slot.value
                            ? "bg-teal-spring/20 border-teal-spring text-teal-spring shadow-[0_0_12px_rgba(0,168,150,0.25)] scale-105"
                            : "bg-midnight/70 border-text-secondary/15 text-text-secondary hover:border-teal-spring/40 hover:text-text-primary"
                        }`}
                      >
                        <Clock className="h-3.5 w-3.5" />
                        <span>{slot.label.replace(" UTC", "")}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* 3. Currency payment toggle */}
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-secondary uppercase tracking-widest block font-sans">Select Payment Purser</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("cash")}
                    className={`h-11 rounded-xl border flex items-center justify-center space-x-2 transition-all text-xs font-bold cursor-pointer ${
                      paymentMethod === "cash"
                        ? "bg-gold-sand/20 border-gold-sand text-gold-sand shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                        : "bg-midnight/70 border-text-secondary/15 text-text-secondary hover:border-gold-sand/40 hover:text-text-primary"
                    }`}
                  >
                    <CreditCard className="h-3.5 w-3.5" />
                    <span>Pay with Cash</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPaymentMethod("coins")}
                    className={`h-11 rounded-xl border flex items-center justify-center space-x-2 transition-all text-xs font-bold cursor-pointer ${
                      paymentMethod === "coins"
                        ? "bg-gold-sand/20 border-gold-sand text-gold-sand shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                        : "bg-midnight/70 border-text-secondary/15 text-text-secondary hover:border-gold-sand/40 hover:text-text-primary"
                    }`}
                  >
                    <Coins className="h-3.5 w-3.5" />
                    <span>Use Gold Coins</span>
                  </button>
                </div>
              </div>

              {/* 4. Receipt details breakdown */}
              <div className="bg-midnight/70 border border-text-secondary/15 rounded-xl p-3.5 space-y-2 text-xs font-sans">
                <div className="flex justify-between items-center text-text-secondary text-[11px]">
                  <span>Base rate</span>
                  <span>${(selectedMentor.hourlyRate / 100).toFixed(2)} / hr</span>
                </div>
                <div className="flex justify-between items-center text-text-secondary text-[11px]">
                  <span>Est. Duration</span>
                  <span>1.0 Hour</span>
                </div>
                <div className="border-t border-text-secondary/10 pt-2 flex justify-between items-center font-bold">
                  <span className="text-text-primary">Total Price</span>
                  {paymentMethod === "cash" ? (
                    <span className="text-gold-sand">${(selectedMentor.hourlyRate / 100).toFixed(2)} USD</span>
                  ) : (
                    <span className="text-gold-sand flex items-center">
                      <Coins className="h-3.5 w-3.5 mr-1" />
                      {Math.round(selectedMentor.hourlyRate / 10)} Coins
                    </span>
                  )}
                </div>
                {paymentMethod === "coins" && (
                  <div className="flex justify-between items-center text-[10px] text-text-secondary pt-1.5 border-t border-dashed border-text-secondary/10">
                    <span>Purse Balance</span>
                    <span className={`font-semibold ${coinsBalance >= Math.round(selectedMentor.hourlyRate / 10) ? "text-teal-spring" : "text-orange-flame animate-pulse"}`}>
                      {coinsBalance} Coins
                    </span>
                  </div>
                )}
              </div>

              {/* 5. Booking Actions */}
              <div className="flex space-x-3 pt-2">
                <button
                  onClick={() => {
                    setSelectedMentor(null);
                    setSelectedDateIndex(null);
                    setSelectedTimeSlot(null);
                  }}
                  className="flex-1 h-11 border border-text-secondary/15 rounded-xl text-text-secondary text-xs hover:border-text-secondary/30 transition-all font-bold cursor-pointer text-center flex items-center justify-center"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBookMentor(selectedMentor)}
                  disabled={selectedDateIndex === null || !selectedTimeSlot || (paymentMethod === "coins" && coinsBalance < Math.round(selectedMentor.hourlyRate / 10))}
                  className="flex-grow bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold h-11 rounded-xl transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer text-center flex items-center justify-center"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {checkoutStatus === "success" && (
          <div className="fixed inset-0 bg-midnight/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-sm w-full rounded-2xl p-6 text-center space-y-4 border-teal-spring/30 animate-fadeIn shadow-[0_0_40px_rgba(0,168,150,0.1)]">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-spring/10 text-teal-spring border border-teal-spring/25 shadow-[0_0_12px_rgba(0,168,150,0.2)]">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold font-serif text-gold-sand">Transaction Authenticated</h3>
              <p className="text-xs text-text-secondary leading-relaxed">
                Payment finalized successfully. Your item: <span className="font-semibold text-text-primary">"{purchasedItem}"</span> has been logged securely in PostgreSQL tables.
              </p>
              <button
                onClick={() => setCheckoutStatus("idle")}
                className="w-full bg-teal-spring hover:bg-teal-spring/90 text-midnight font-bold text-xs py-3 px-4 rounded-xl transition-all cursor-pointer shadow-md"
              >
                Return to Bazaar
              </button>
            </div>
          </div>
        )}

        {/* Processing Modal */}
        {checkoutStatus === "processing" && (
          <div className="fixed inset-0 bg-midnight/85 backdrop-blur-md z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-xs w-full rounded-2xl p-6 text-center space-y-3 border-gold-sand/30 animate-fadeIn">
              <div className="flex justify-center">
                <LoaderComponent />
              </div>
              <h3 className="text-xs font-bold text-gold-sand animate-pulse font-serif uppercase tracking-wider">Authorizing Ledger Write...</h3>
              <p className="text-[10px] text-text-secondary">Securing database transaction lock.</p>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}

// Sub-components loader
function LoaderComponent() {
  return (
    <div className="relative h-10 w-10 flex items-center justify-center">
      <div className="absolute animate-ping h-6 w-6 rounded-full bg-gold-sand/20"></div>
      <div className="h-3 w-3 rounded-full bg-gold-sand animate-pulse"></div>
    </div>
  );
}
