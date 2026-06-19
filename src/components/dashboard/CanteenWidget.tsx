"use client";

import React, { useState, useEffect, useRef } from "react";
import { X, Shield, Coins, Loader2 } from "lucide-react";
import { Streak, UserProfile } from "@/store/ExpeditionStore";

interface CanteenWidgetProps {
  streak: Streak;
  userProfile: UserProfile | null;
  userId: string | null;
  onRefreshData: () => void;
}

export default function CanteenWidget({
  streak,
  userProfile,
  userId,
  onRefreshData,
}: CanteenWidgetProps) {
  const [open, setOpen] = useState(false);
  const [buying, setBuying] = useState(false);
  const [buyError, setBuyError] = useState<string | null>(null);
  const [buySuccess, setBuySuccess] = useState(false);
  const widgetRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (widgetRef.current && !widgetRef.current.contains(event.target as globalThis.Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const streakCount = streak.currentStreak;
  const isGoldStreak = streakCount >= 7;
  const fillPercent = streakCount === 0 ? 0 : Math.min(100, Math.round((streakCount / 7) * 100));

  const getLast7Days = () => {
    const days = [];
    const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setUTCDate(d.getUTCDate() - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        dateStr,
        dayName: dayNames[d.getUTCDay()],
        dayNum: d.getUTCDate(),
        isToday: i === 0,
        completed: (streak.history || []).includes(dateStr),
      });
    }
    return days;
  };

  const handleBuyShield = async () => {
    if (!userId) return;
    setBuying(true);
    setBuyError(null);
    setBuySuccess(false);

    try {
      const response = await fetch("/api/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          amount: 0,
          type: "marketplace",
          action: "buy_shield",
          useCoins: true,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to buy shield.");
      }

      setBuySuccess(true);
      setTimeout(() => setBuySuccess(false), 2000);
      onRefreshData();
    } catch (err: any) {
      setBuyError(err.message || "Purchase failed.");
    } finally {
      setBuying(false);
    }
  };

  const canteenOutlineClass = isGoldStreak
    ? "stroke-[#D4AF37] drop-shadow-[0_0_8px_rgba(212,175,55,0.6)]"
    : streakCount === 0
    ? "stroke-[#F26419]/50 drop-shadow-[0_0_6px_rgba(242,100,25,0.3)]"
    : "stroke-[#00A896]/60";

  const liquidColor = isGoldStreak
    ? "#D4AF37"
    : streakCount === 0
    ? "transparent"
    : "#00A896";

  return (
    <div ref={widgetRef} className="relative z-[99]">
      <style>{`
        @keyframes wave-slide-1 {
          0% { transform: translate3d(-40px, 0, 0); }
          100% { transform: translate3d(0, 0, 0); }
        }
        @keyframes wave-slide-2 {
          0% { transform: translate3d(0, 0, 0); }
          100% { transform: translate3d(-40px, 0, 0); }
        }
        .canteen-wave-1 {
          animation: wave-slide-1 4s infinite linear;
        }
        .canteen-wave-2 {
          animation: wave-slide-2 2.5s infinite linear;
        }
        .canteen-wave-fast-1 {
          animation: wave-slide-1 1.8s infinite linear;
        }
        .canteen-wave-fast-2 {
          animation: wave-slide-2 1.2s infinite linear;
        }
      `}</style>

      {/* Main Pill Widget */}
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center justify-center space-x-2 px-3 h-[34px] rounded-xl border transition-all cursor-pointer select-none bg-indigo-oasis/40 whitespace-nowrap ${
          isGoldStreak
            ? "border-gold-sand/40 text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:border-gold-sand/80"
            : streakCount === 0
            ? "border-gold-sand/20 text-text-secondary hover:text-orange-flame hover:border-orange-flame/40"
            : "border-gold-sand/20 text-text-secondary hover:text-teal-spring hover:border-teal-spring/40"
        }`}
      >
        <div className="relative h-6 w-5 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 30" className="h-5 w-4 select-none fill-none">
            <defs>
              <clipPath id="canteen-clip-pill">
                <path d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z" />
              </clipPath>
            </defs>

            {/* Cap */}
            <path d="M 10 2 h 4 v 2 h -4 z" fill={isGoldStreak ? "#D4AF37" : "#8D99AE"} />
            <path d="M 9 4 h 6 v 2 h -6 z" fill={isGoldStreak ? "#D4AF37" : "#F4F6F8"} className="opacity-80" />
            <path d="M 11 6 h 2 v 2 h -2 z" fill={isGoldStreak ? "#D4AF37" : "#8D99AE"} />

            {/* Canteen Body Background */}
            <path d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z" fill="#070F19" fillOpacity="0.8" />

            {/* Clipped liquid waves */}
            <g clipPath="url(#canteen-clip-pill)">
              {fillPercent > 0 && (
                <g style={{ transform: `translate3d(0, ${100 - fillPercent}%, 0)`, transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)" }}>
                  <path
                    d="M -40 10 Q -30 7, -20 10 T 0 10 T 20 10 T 40 10 T 60 10 V 40 H -40 Z"
                    fill={liquidColor}
                    fillOpacity="0.4"
                    className={isGoldStreak ? "canteen-wave-fast-1" : "canteen-wave-1"}
                  />
                  <path
                    d="M -40 10 Q -30 13, -20 10 T 0 10 T 20 10 T 40 10 T 60 10 V 40 H -40 Z"
                    fill={liquidColor}
                    fillOpacity="0.75"
                    className={isGoldStreak ? "canteen-wave-fast-2" : "canteen-wave-2"}
                  />
                </g>
              )}
            </g>

            {/* Outer border */}
            <path
              d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z"
              className={canteenOutlineClass}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <span className="leading-none text-[10px] sm:text-xs font-bold whitespace-nowrap select-none font-serif tracking-wide">
          {streakCount} {streakCount === 1 ? "Day" : "Days"}
        </span>
      </button>

      {/* Hover/Click Detailed Popover */}
      {open && (
        <div className="fixed sm:absolute top-[70px] sm:top-auto left-4 sm:left-auto right-4 sm:right-0 mt-2.5 w-auto sm:w-80 bg-indigo-oasis border border-gold-sand/20 rounded-2xl p-6 shadow-[0_4px_30px_rgba(0,0,0,0.6)] backdrop-blur-md animate-fadeIn text-left text-xs space-y-4">
          <div className="flex items-center justify-between border-b border-text-secondary/15 pb-2">
            <span className="font-serif font-bold tracking-wider text-gold-sand uppercase">Survival Canteen</span>
            <button onClick={() => setOpen(false)} className="text-text-secondary hover:text-text-primary">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center space-x-4">
            <div className="h-16 w-12 bg-midnight/80 rounded-xl border border-text-secondary/10 flex items-center justify-center relative overflow-hidden flex-shrink-0">
              <svg viewBox="0 0 24 30" className="h-12 w-9 fill-none">
                <defs>
                  <clipPath id="canteen-clip-large">
                    <path d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z" />
                  </clipPath>
                </defs>
                <path d="M 10 2 h 4 v 2 h -4 z" fill={isGoldStreak ? "#D4AF37" : "#8D99AE"} />
                <path d="M 9 4 h 6 v 2 h -6 z" fill={isGoldStreak ? "#D4AF37" : "#F4F6F8"} className="opacity-80" />
                <path d="M 11 6 h 2 v 2 h -2 z" fill={isGoldStreak ? "#D4AF37" : "#8D99AE"} />

                <path d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z" fill="#070F19" fillOpacity="0.85" />

                <g clipPath="url(#canteen-clip-large)">
                  {fillPercent > 0 && (
                    <g style={{ transform: `translate3d(0, ${100 - fillPercent}%, 0)`, transition: "transform 1.2s ease-out" }}>
                      <path
                        d="M -40 10 Q -30 7, -20 10 T 0 10 T 20 10 T 40 10 T 60 10 V 40 H -40 Z"
                        fill={liquidColor}
                        fillOpacity="0.4"
                        className={isGoldStreak ? "canteen-wave-fast-1" : "canteen-wave-1"}
                      />
                      <path
                        d="M -40 10 Q -30 13, -20 10 T 0 10 T 20 10 T 40 10 T 60 10 V 40 H -40 Z"
                        fill={liquidColor}
                        fillOpacity="0.75"
                        className={isGoldStreak ? "canteen-wave-fast-2" : "canteen-wave-2"}
                      />
                    </g>
                  )}
                </g>
                <path
                  d="M 9 8 H 15 C 18 8, 20 10, 20 13 V 23 C 20 26, 17 28, 12 28 C 7 28, 4 26, 4 23 V 13 C 4 10, 6 8, 9 8 Z"
                  className={canteenOutlineClass}
                  strokeWidth="2.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <div className="flex-grow space-y-1">
              <p className="text-text-secondary text-[10px] uppercase font-bold tracking-wider">Hydration Status</p>
              <h4 className={`text-sm font-serif font-bold ${isGoldStreak ? "text-gold-sand" : "text-teal-spring"}`}>
                {streakCount === 0 ? "Dehydrated" : `${fillPercent}% Hydrated`}
              </h4>
              <p className="text-text-secondary text-[9px]">
                {isGoldStreak
                  ? "Unleashing neon gold flame bonus energy!"
                  : `${streakCount}/7 days to Nomad Master status.`}
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between text-[10px]">
              <span className="font-bold text-text-primary uppercase tracking-wide">Expedition Trail History</span>
              <span className="text-text-secondary">Last 7 Days</span>
            </div>
            <div className="grid grid-cols-7 gap-1.5 text-center">
              {getLast7Days().map((day) => (
                <div key={day.dateStr} className="space-y-1">
                  <span className="text-[8px] text-text-secondary block font-bold uppercase">{day.dayName}</span>
                  <div
                    title={day.completed ? "Challenge Completed!" : day.isToday ? "Complete puzzle today to continue streak!" : "Missed Day"}
                    className={`h-7 w-7 rounded-lg border flex items-center justify-center text-[10px] font-bold transition-all ${
                      day.completed
                        ? "bg-teal-spring/20 border-teal-spring text-teal-spring shadow-[0_0_6px_rgba(0,168,150,0.2)]"
                        : day.isToday
                        ? "bg-indigo-oasis border-gold-sand/40 text-gold-sand animate-pulse"
                        : "bg-midnight border-text-secondary/15 text-text-secondary/40"
                    }`}
                  >
                    {day.completed ? "✓" : day.dayNum}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-midnight/70 rounded-xl p-3 border border-text-secondary/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-1.5 text-[11px] font-bold">
                <Shield className="h-4 w-4 text-orange-flame flex-shrink-0 animate-pulse" />
                <span className="text-text-primary">Streak Shields</span>
              </div>
              <span className="text-[11px] font-black text-orange-flame">
                {userProfile?.streakShields || 0} Active
              </span>
            </div>
            <p className="text-[9px] text-text-secondary leading-relaxed">
              Deducts 1 shield automatically when you miss a day to protect your streak.
            </p>

            <div className="border-t border-text-secondary/15 pt-2 flex items-center justify-between gap-4">
              <div className="flex items-center space-x-1">
                <Coins className="h-3.5 w-3.5 text-gold-sand" />
                <span className="font-bold text-gold-sand text-[11px]">{userProfile?.coinsBalance || 0}</span>
              </div>

              <button
                type="button"
                onClick={handleBuyShield}
                disabled={buying || !userProfile || userProfile.coinsBalance < 50}
                className={`px-3 py-1.5 rounded-lg font-bold text-[10px] uppercase tracking-wide transition-all ${
                  buySuccess
                    ? "bg-teal-spring text-midnight"
                    : "bg-gold-sand text-midnight hover:bg-gold-sand/90 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                }`}
              >
                {buying ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : buySuccess ? (
                  "Shield Added!"
                ) : (
                  "Buy Shield (50c)"
                )}
              </button>
            </div>
            {buyError && <p className="text-[9px] text-orange-flame font-semibold">{buyError}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
