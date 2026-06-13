"use client";

import React, { useState, useEffect } from "react";
import { Compass, Shield, Award, Calendar, DollarSign, ArrowLeft, CheckCircle2, UserCheck, ShieldAlert, Sparkles, Coins, Flame, CreditCard, Loader } from "lucide-react";
import { useRouter } from "next/navigation";

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

  // Checkout states
  const [purchasedItem, setPurchasedItem] = useState<string | null>(null);
  const [checkoutStatus, setCheckoutStatus] = useState<"idle" | "processing" | "success">("idle");
  const [bookingDate, setBookingDate] = useState("");
  const [selectedMentor, setSelectedMentor] = useState<Mentor | null>(null);
  const [isPortalLoading, setIsPortalLoading] = useState(false);

  // Mock list of verified experts
  const mentors: Mentor[] = [
    {
      id: "mentor-ibn-battuta",
      name: "Mentor Ibn Battuta",
      specialty: "System Design & Global Cloud Architectures",
      hourlyRate: 7500, // $75.00
      rating: 4.9,
      bio: "Traveled across AWS clusters, configuring high-availability database regions and DynamoDB partitions globally.",
      avatar: "I",
    },
    {
      id: "mentor-marcopolo",
      name: "Companion Marco Polo",
      specialty: "Next.js 14, React & Core UX Craftsmanship",
      hourlyRate: 6000, // $60.00
      rating: 5.0,
      bio: "Crafts beautifully interactive fullstack client layouts. Passionate about animations and CSS design tokens.",
      avatar: "M",
    },
  ];

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

  useEffect(() => {
    const savedUserId = localStorage.getItem("silkroad_userid");
    setUserId(savedUserId);
    if (savedUserId) {
      fetchUserBillingProfile(savedUserId);
    }
  }, []);

  // Handle Stripe Checkout redirects for Subscriptions or Coins purchases
  const handleStripeCheckout = async (priceId: string, itemName: string) => {
    if (!userId) {
      alert("Traveler profile missing. Register through onboarding first.");
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
      } else {
        // Redirect to real Stripe Checkout page
        window.location.href = data.url;
      }
    } catch (err: any) {
      console.error("Stripe Checkout failure:", err);
      setCheckoutStatus("idle");
      alert(err.message || "Failed to initialize payment process.");
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
        alert("Developer Simulation: Subscribed Status toggled / cancelled.");
        await fetchUserBillingProfile(userId);
      } else {
        window.location.href = data.url;
      }
    } catch (err: any) {
      alert(err.message || "Failed to launch billing portal.");
    } finally {
      setIsPortalLoading(false);
    }
  };

  // Handle coins-based microtransaction purchases
  const handleCoinsPurchase = async (itemName: string, action: string, costInCoins: number) => {
    if (!userId) {
      alert("Traveler profile missing. Register through onboarding first.");
      return;
    }

    if (coinsBalance < costInCoins) {
      alert(`Insufficient coins balance! This item costs ${costInCoins} coins, but you only have ${coinsBalance}. Buy more coins below!`);
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
    } catch (err: any) {
      console.error("Coins purchase failed:", err);
      setCheckoutStatus("idle");
      alert(err.message || "Transaction failed.");
    }
  };

  const handleBookMentor = async (mentor: Mentor) => {
    if (!userId) {
      alert("Traveler profile missing. Register through onboarding first.");
      return;
    }
    if (!bookingDate) {
      alert("Please select a valid scheduled datetime.");
      return;
    }

    setCheckoutStatus("processing");
    try {
      // 1. Create Mentorship Booking
      const bookingResponse = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mentorId: "d1245781-cc67-4221-88c9-aaee334455bb", // hardcoded seed schema uuid
          menteeId: userId,
          scheduledAt: bookingDate,
        }),
      });
      const bookingData = await bookingResponse.json();

      if (!bookingResponse.ok) throw new Error(bookingData.error);

      // 2. Charge transactional database ledger (using cash simulation)
      await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: mentor.hourlyRate,
          type: "marketplace",
        }),
      });

      setPurchasedItem(`1-on-1 session with ${mentor.name}`);
      setCheckoutStatus("success");
      setSelectedMentor(null);
    } catch (err: any) {
      alert(err.message || "Failed to finalize human mentor booking.");
      setCheckoutStatus("idle");
    }
  };

  return (
    <div className="min-h-screen bg-midnight text-text-primary py-12 px-6 overflow-y-auto select-none">
      
      {/* Back button */}
      <div className="max-w-4xl mx-auto mb-8">
        <button
          onClick={() => router.push("/dashboard")}
          className="flex items-center space-x-2 text-gold-sand hover:text-gold-sand/80 text-xs font-semibold uppercase tracking-wider cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Expedition Trail</span>
        </button>
      </div>

      <div className="max-w-4xl mx-auto space-y-12">
        
        {/* Marketplace banner */}
        <div className="glass-panel rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden premium-glow">
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
              className="h-32 sm:h-36 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.45)] hover:scale-105 transition-all duration-500 camel-walk"
            />
            <div className="absolute -top-3 -left-8 bg-indigo-oasis/95 border border-gold-sand/30 rounded-xl px-2.5 py-1 text-[9px] font-bold text-gold-sand shadow-lg animate-bounce select-none whitespace-nowrap backdrop-blur-sm">
              Trade well, traveler! 🪙
            </div>
          </div>
        </div>

        {/* Billing Status HUD */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 max-w-4xl mx-auto">
          {/* Subscription Status Widget */}
          <div className={`glass-panel rounded-xl p-4 border flex flex-col justify-between items-center text-center relative overflow-hidden ${
            subscriptionStatus === "active" 
              ? "border-gold-sand/40 bg-gold-sand/5 shadow-[0_0_15px_rgba(212,175,55,0.15)] animate-pulse" 
              : "border-text-secondary/10"
          }`}>
            {subscriptionStatus === "active" && (
              <div className="absolute top-0 right-0 bg-gold-sand text-midnight text-[8px] font-black uppercase px-2 py-0.5 rounded-bl">PRO</div>
            )}
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block">Account Status</span>
              <div className="flex items-center justify-center space-x-1.5">
                <CreditCard className={`h-4 w-4 ${subscriptionStatus === "active" ? "text-gold-sand" : "text-text-secondary"}`} />
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
                  className="w-full h-8 text-[10px] font-bold uppercase tracking-wider bg-gold-sand/20 hover:bg-gold-sand/35 text-gold-sand rounded-lg border border-gold-sand/30 transition-all flex items-center justify-center space-x-1 cursor-pointer"
                >
                  {isPortalLoading ? <Loader className="h-3 w-3 animate-spin" /> : <span>Manage Billing</span>}
                </button>
              ) : (
                <button
                  onClick={() => handleStripeCheckout("price_nomad_monthly_15", "Nomad Subscription Upgrade")}
                  className="w-full h-8 text-[10px] font-bold uppercase tracking-wider bg-gold-sand hover:bg-gold-sand/90 text-midnight rounded-lg transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer"
                >
                  <span>Upgrade ($15/mo)</span>
                </button>
              )}
            </div>
          </div>

          {/* Coins Balance Widget */}
          <div className="glass-panel rounded-xl p-4 border border-text-secondary/10 flex flex-col justify-between items-center text-center">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block">Caravan Purse</span>
              <div className="flex items-center justify-center space-x-1.5">
                <Coins className="h-4 w-4 text-gold-sand" />
                <span className="text-sm font-bold font-serif text-gold-sand">{coinsBalance} Coins</span>
              </div>
            </div>
            <div className="mt-3 text-[9px] text-text-secondary font-medium">
              Earn by solving trails or buy pouches below
            </div>
          </div>

          {/* Streak Shields Balance Widget */}
          <div className="glass-panel rounded-xl p-4 border border-text-secondary/10 flex flex-col justify-between items-center text-center">
            <div className="space-y-1">
              <span className="text-[9px] uppercase font-bold text-text-secondary tracking-widest block">Survival Inventory</span>
              <div className="flex items-center justify-center space-x-1.5">
                <Flame className="h-4 w-4 text-orange-flame animate-pulse" />
                <span className="text-sm font-bold font-serif text-orange-flame">{streakShields} Shields</span>
              </div>
            </div>
            <div className="mt-3 text-[9px] text-text-secondary font-medium">
              Protects canteens if daily challenge is missed
            </div>
          </div>
        </div>

        {/* B2C Items Marketplace Grid */}
        <div className="space-y-6">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-base font-bold font-serif text-gold-sand flex items-center">
              <Shield className="h-4 w-4 mr-2" />
              Enhancements & Upgrades
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card 1: Streak Insurance */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-orange-flame/15 flex items-center justify-center text-orange-flame border border-orange-flame/30">
                  <Shield className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold font-serif text-text-primary">Caravan Streak Shield</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Protect your water canteen streak! If you miss your daily coding challenge, this shield automatically consumes itself to save your streak history.
                </p>
              </div>
              <div className="flex flex-col space-y-2.5 pt-4 border-t border-text-secondary/10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">Shield Pricing</span>
                  <span className="text-xs font-semibold text-gold-sand">50 Coins OR $4.99 USD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCoinsPurchase("Caravan Streak Shield", "buy_shield", 50)}
                    className="flex-1 border border-gold-sand/30 hover:bg-gold-sand/10 text-gold-sand text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Buy with 50 Coins
                  </button>
                  <button
                    onClick={() => handleStripeCheckout("price_shield_499", "Caravan Streak Shield")}
                    className="flex-1 bg-gold-sand hover:bg-gold-sand/90 text-midnight text-[10px] font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Buy with $4.99 Cash
                  </button>
                </div>
              </div>
            </div>

            {/* Card 2: Certification Badges */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow">
              <div className="space-y-2">
                <div className="h-10 w-10 rounded-lg bg-teal-spring/15 flex items-center justify-center text-teal-spring border border-teal-spring/30">
                  <Award className="h-5 w-5" />
                </div>
                <h3 className="text-base font-bold font-serif text-text-primary">Verified Resume Badge</h3>
                <p className="text-xs text-text-secondary leading-relaxed">
                  Earn an official, shareable certificate PDF highlighting your role IQ and completed Silk Road oases. Backed by mentor-certified evaluations.
                </p>
              </div>
              <div className="flex flex-col space-y-2.5 pt-4 border-t border-text-secondary/10">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-text-secondary">Certificate Pricing</span>
                  <span className="text-xs font-semibold text-gold-sand">150 Coins OR $14.99 USD</span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleCoinsPurchase("Verified Resume Badge", "buy_badge", 150)}
                    className="flex-1 border border-gold-sand/30 hover:bg-gold-sand/10 text-gold-sand text-[10px] font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                  >
                    Buy with 150 Coins
                  </button>
                  <button
                    onClick={() => handleStripeCheckout("price_badge_1499", "Verified Resume Badge")}
                    className="flex-1 bg-gold-sand hover:bg-gold-sand/90 text-midnight text-[10px] font-bold py-2.5 rounded-xl transition-all shadow-md cursor-pointer"
                  >
                    Buy with $14.99 Cash
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Currency Shop Section */}
        <div className="space-y-6">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-base font-bold font-serif text-gold-sand flex items-center">
              <Coins className="h-4 w-4 mr-2" />
              Coin Purser (Purchase Coins)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Card A: 50 Coins */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-gold-sand/15 flex items-center justify-center text-gold-sand border border-gold-sand/30">
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-text-primary">Pouch of Gold Coins</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Instantly add 50 Gold Coins to your Caravan purse. Best for one-off Streak Shields and quick tips.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-gold-sand block">50 COINS</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-text-secondary/10">
                <span className="text-sm font-bold text-gold-sand">$1.99 USD</span>
                <button
                  onClick={() => handleStripeCheckout("price_coins_50_2", "50 Gold Coins")}
                  className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Purchase Pouch
                </button>
              </div>
            </div>

            {/* Card B: 200 Coins */}
            <div className="glass-panel rounded-2xl p-6 flex flex-col justify-between space-y-4 premium-glow">
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="h-10 w-10 rounded-lg bg-gold-sand/15 flex items-center justify-center text-gold-sand border border-gold-sand/30 relative">
                    <div className="absolute -top-1.5 -right-1.5 bg-orange-flame text-text-primary font-bold text-[7px] px-1 rounded-full animate-bounce">SAVE</div>
                    <Coins className="h-5 w-5" />
                  </div>
                  <h3 className="text-base font-bold font-serif text-text-primary">Chest of Gold Coins</h3>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Stock up with 200 Gold Coins. Perfect for buying multiple Streak Shields, premium Certification badges, and tipping.
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-xs font-black text-gold-sand block">200 COINS</span>
                </div>
              </div>
              <div className="flex items-center justify-between pt-4 border-t border-text-secondary/10">
                <span className="text-sm font-bold text-gold-sand">$7.99 USD</span>
                <button
                  onClick={() => handleStripeCheckout("price_coins_200_8", "200 Gold Coins")}
                  className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 py-2 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Purchase Chest
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 1-on-1 Mentor Booking Section */}
        <div className="space-y-6">
          <div className="border-b border-gold-sand/15 pb-2">
            <h2 className="text-lg font-bold font-serif text-gold-sand flex items-center">
              <UserCheck className="h-5 w-5 mr-2" />
              Verified Human Caravanners (Mentors)
            </h2>
            <p className="text-[10px] text-text-secondary mt-1">
              Hire verified industry experts for customized 1-on-1 code reviews and session matching.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {mentors.map((mentor) => (
              <div key={mentor.id} className="glass-panel rounded-2xl p-6 flex flex-col space-y-4 justify-between border-teal-spring/10">
                <div className="space-y-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-10 w-10 rounded-full bg-gold-sand/20 text-gold-sand border border-gold-sand/40 flex items-center justify-center font-bold text-sm">
                      {mentor.avatar}
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-text-primary">{mentor.name}</h4>
                      <p className="text-[9px] text-teal-spring font-medium">{mentor.specialty}</p>
                    </div>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed">{mentor.bio}</p>
                  <div className="text-[10px] text-gold-sand font-semibold">★ {mentor.rating} Rating</div>
                </div>

                <div className="pt-4 border-t border-text-secondary/10 flex items-center justify-between">
                  <span className="text-xs font-bold text-text-primary">
                    ${(mentor.hourlyRate / 100).toFixed(2)} / hr
                  </span>
                  
                  <button
                    onClick={() => setSelectedMentor(mentor)}
                    className="border border-gold-sand/30 hover:bg-gold-sand/10 text-gold-sand text-xs font-semibold px-4 py-2 rounded-xl transition-all"
                  >
                    Schedule Session
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Schedule Modal */}
        {selectedMentor && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-5 border-gold-sand/20 relative animate-fadeIn">
              <h3 className="text-base font-bold font-serif text-gold-sand">Book Session: {selectedMentor.name}</h3>
              <p className="text-xs text-text-secondary">
                Select your scheduled date and time. Booking will deduct hourly rates directly onto our secure database ledger.
              </p>
              
              <div className="space-y-2">
                <label className="text-[10px] font-bold text-text-primary uppercase tracking-wider block">Expedition Date</label>
                <input
                  type="datetime-local"
                  required
                  value={bookingDate}
                  onChange={(e) => setBookingDate(e.target.value)}
                  className="w-full bg-midnight border border-gold-sand/20 rounded-lg p-2.5 text-xs text-text-primary focus:outline-none focus:border-gold-sand"
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2">
                <button
                  onClick={() => setSelectedMentor(null)}
                  className="px-4 py-2 border border-text-secondary/20 rounded-lg text-text-secondary text-xs hover:border-text-secondary/40 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBookMentor(selectedMentor)}
                  className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 py-2 rounded-xl transition-all"
                >
                  Confirm Booking
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Success Modal */}
        {checkoutStatus === "success" && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-sm w-full rounded-2xl p-6 text-center space-y-4 border-teal-spring/30 animate-fadeIn">
              <div className="inline-flex items-center justify-center p-3 rounded-full bg-teal-spring/10 text-teal-spring">
                <CheckCircle2 className="h-8 w-8" />
              </div>
              <h3 className="text-base font-bold font-serif text-gold-sand">Transaction Authenticated</h3>
              <p className="text-xs text-text-secondary">
                Payment finalized successfully. Your item: <span className="font-semibold text-text-primary">"{purchasedItem}"</span> has been logged securely in PostgreSQL tables.
              </p>
              <button
                onClick={() => setCheckoutStatus("idle")}
                className="w-full bg-teal-spring hover:bg-teal-spring/90 text-midnight font-bold text-xs py-2 px-4 rounded-xl transition-all"
              >
                Return to Bazaar
              </button>
            </div>
          </div>
        )}

        {/* Processing Modal */}
        {checkoutStatus === "processing" && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-xs w-full rounded-2xl p-6 text-center space-y-3 border-gold-sand/20 animate-fadeIn">
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
