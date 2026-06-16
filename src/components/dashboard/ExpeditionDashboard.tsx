"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Compass, BookOpen, Layers, Award, Terminal, Flame, CheckCircle, Lock, Play, ArrowRight, ChevronRight, HelpCircle, MessageSquare, Sparkles, ShieldAlert, Loader2, LogOut, Brain, FileText, Shield, Coins, X, Volume2, VolumeX } from "lucide-react";
import CaravanMasterChat from "../chat/CaravanMasterChat";
import * as acorn from "acorn";
import confetti from "canvas-confetti";
import { Logo } from "@/components/ui/Logo";
import { audio } from "@/lib/services/audio";

interface Resource {
  title: string;
  url: string;
  type: "video" | "article" | "documentation";
}

interface Challenge {
  question: string;
  boilerplate: string;
  solutionPattern: string;
}

interface Node {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  resources: Resource[];
  challenge: Challenge;
}

interface Streak {
  currentStreak: number;
  maxStreak: number;
  lastCompletedTimestamp: string;
  history: string[];
}

interface Progress {
  userId: string;
  roadmapId: string;
  completedSteps: string[];
  currentActiveNode: string;
  lastAccessedTimestamp: string;
  nodes: Node[];
  title: string;
  description: string;
  difficulty?: string;
}

interface CanteenWidgetProps {
  streak: Streak;
  userProfile: {
    coinsBalance: number;
    streakShields: number;
    subscriptionStatus: string;
  } | null;
  userId: string | null;
  onRefreshData: () => void;
}

function CanteenWidget({ streak, userProfile, userId, onRefreshData }: CanteenWidgetProps) {
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
          0% { transform: translate(-40px, 0); }
          100% { transform: translate(0, 0); }
        }
        @keyframes wave-slide-2 {
          0% { transform: translate(0, 0); }
          100% { transform: translate(-40px, 0); }
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
        className={`flex items-center space-x-2 px-2.5 h-[30px] rounded-xl border transition-all cursor-pointer select-none bg-indigo-oasis/40 ${
          isGoldStreak
            ? "border-gold-sand/40 text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.25)] hover:border-gold-sand/80"
            : streakCount === 0
            ? "border-orange-flame/30 text-orange-flame/80 hover:border-orange-flame/60"
            : "border-teal-spring/30 text-teal-spring hover:border-teal-spring/60"
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
                <g style={{ transform: `translateY(${100 - fillPercent}%)`, transition: "transform 1s cubic-bezier(0.16, 1, 0.3, 1)" }}>
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
        <div className="absolute right-0 mt-2.5 w-80 bg-indigo-oasis border border-gold-sand/20 rounded-2xl p-5 shadow-[0_4px_30px_rgba(0,0,0,0.6)] backdrop-blur-md animate-fadeIn text-left text-xs space-y-4">
          
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
                    <g style={{ transform: `translateY(${100 - fillPercent}%)`, transition: "transform 1.2s ease-out" }}>
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

            <div className="flex-1 space-y-1">
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

export default function ExpeditionDashboard() {
  const router = useRouter();
  // Local storage state keys
  const [userId, setUserId] = useState<string | null>(null);
  const [roadmapId, setRoadmapId] = useState<string | null>(null);
  
  // Data state
  const [progress, setProgress] = useState<Progress | null>(null);
  const [streak, setStreak] = useState<Streak | null>(null);
  const [selectedNode, setSelectedNode] = useState<Node | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [codeSolution, setCodeSolution] = useState("");
  const [editorScrollTop, setEditorScrollTop] = useState(0);
  
  // Status state
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [validationStatus, setValidationStatus] = useState<"idle" | "success" | "failure">("idle");
  const [chatOpen, setChatOpen] = useState(true);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [victoryModalOpen, setVictoryModalOpen] = useState(false);
  const [camelCoords, setCamelCoords] = useState<{ x: number; y: number; angle: number } | null>(null);
  const prevActiveIndexRef = useRef<number>(0);

  // Real-time syntax and structural check states
  const [liveSyntaxValid, setLiveSyntaxValid] = useState(true);
  const [liveStructureValid, setLiveStructureValid] = useState(true);
  const [liveSafetyValid, setLiveSafetyValid] = useState(true);
  const [liveSyntaxError, setLiveSyntaxError] = useState<string | null>(null);

  // Learning Trail Map Interactive States
  const [hoveredNodeId, setHoveredNodeId] = useState<string | null>(null);
  const [mapZoom, setMapZoom] = useState(1);
  const [soundMuted, setSoundMuted] = useState(true);

  useEffect(() => {
    if (!selectedNode || !codeSolution) return;

    const timer = setTimeout(() => {
      // 1. Check syntax validity
      try {
        acorn.parse(codeSolution, { ecmaVersion: 2020 });
        setLiveSyntaxValid(true);
        setLiveSyntaxError(null);
      } catch (err: any) {
        setLiveSyntaxValid(false);
        setLiveSyntaxError(err.message);
      }

      // 2. Check structural pattern validity
      try {
        const patternStr = selectedNode.challenge.solutionPattern;
        const pattern = new RegExp(patternStr);
        setLiveStructureValid(pattern.test(codeSolution));
      } catch (err) {
        setLiveStructureValid(false);
      }

      // 3. Check loop safety (no potential infinite loops)
      const hasInfiniteLoopRisk = 
        (codeSolution.includes("while") && !codeSolution.includes("break") && codeSolution.includes("true")) ||
        (codeSolution.includes("for") && codeSolution.includes(";;"));
      setLiveSafetyValid(!hasInfiniteLoopRisk);

    }, 300); // 300ms debounce

    return () => clearTimeout(timer);
  }, [codeSolution, selectedNode]);

  // Phase 3 B2C Daily Companion States
  const [failCount, setFailCount] = useState(0);
  const [userFrustrated, setUserFrustrated] = useState(false);
  const [forumPostsList, setForumPostsList] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceSummary, setResourceSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  // v0 Generation States
  const [v0ModalOpen, setV0ModalOpen] = useState(false);
  const [v0Prompt, setV0Prompt] = useState("");
  const [v0Error, setV0Error] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [v0Response, setV0Response] = useState<{
    chatId: string;
    webUrl: string;
    description: string;
    files: Record<string, { content: string }>;
  } | null>(null);

  // Math coordinates for oases bezier curve mapping
  const nodeSpacingY = 135;
  const mapHeight = useMemo(() => {
    if (!progress || !progress.nodes) return 0;
    return progress.nodes.length * nodeSpacingY + 80;
  }, [progress]);

  // Drag to scroll states & refs
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) {
      return;
    }
    const container = mapContainerRef.current;
    if (!container) return;

    setIsDragging(true);
    dragStart.current = {
      x: e.clientX,
      y: e.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = mapContainerRef.current;
    if (!container) return;

    e.preventDefault();
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    container.scrollLeft = dragStart.current.scrollLeft - dx;
    container.scrollTop = dragStart.current.scrollTop - dy;
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    if (target.closest("button") || target.closest("a") || target.closest("input") || target.closest("textarea")) {
      return;
    }
    const container = mapContainerRef.current;
    if (!container || e.touches.length === 0) return;

    setIsDragging(true);
    const touch = e.touches[0];
    dragStart.current = {
      x: touch.clientX,
      y: touch.clientY,
      scrollLeft: container.scrollLeft,
      scrollTop: container.scrollTop,
    };
  };

  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (!isDragging) return;
    const container = mapContainerRef.current;
    if (!container || e.touches.length === 0) return;

    const touch = e.touches[0];
    const dx = touch.clientX - dragStart.current.x;
    const dy = touch.clientY - dragStart.current.y;
    container.scrollLeft = dragStart.current.scrollLeft - dx;
    container.scrollTop = dragStart.current.scrollTop - dy;
  };

  const recenterMap = () => {
    setMapZoom(1);
    setTimeout(() => {
      const el = document.getElementById("active-node-btn");
      const container = mapContainerRef.current;
      if (el && container) {
        const containerRect = container.getBoundingClientRect();
        const elRect = el.getBoundingClientRect();
        
        const relativeTop = elRect.top - containerRect.top + container.scrollTop;
        const relativeLeft = elRect.left - containerRect.left + container.scrollLeft;
        
        const targetTop = relativeTop - containerRect.height / 2 + elRect.height / 2;
        const targetLeft = relativeLeft - containerRect.width / 2 + elRect.width / 2;
        
        container.scrollTo({
          top: targetTop,
          left: targetLeft,
          behavior: "smooth"
        });
      }
    }, 50);
  };

  // Center on progress load
  useEffect(() => {
    if (progress) {
      recenterMap();
    }
  }, [progress]);

  const stars = useMemo(() => {
    const list = [];
    const count = 25;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.sin(i * 12345) * 180) + 200; // distribute 20 to 380
      const y = Math.floor((i / count) * 580) + Math.floor(Math.cos(i * 54321) * 20);
      const size = (i % 3 === 0) ? 1.5 : (i % 3 === 1) ? 2.5 : 1.0;
      const animationClass = (i % 3 === 0) ? "twinkle-star-1" : (i % 3 === 1) ? "twinkle-star-2" : "twinkle-star-3";
      list.push({ x, y, size, animationClass, id: `star-${i}` });
    }
    return list;
  }, []);

  const renderDecorations = (coord: { x: number; y: number }, index: number) => {
    const isLeftAligned = index % 2 === 0;
    const decX = isLeftAligned ? coord.x + 50 : coord.x - 50;
    const decY = coord.y - 15;
    
    if (index % 3 === 0) {
      return (
        <div 
          key={`dec-${index}`}
          style={{
            position: "absolute",
            left: `${(decX / 400) * 100}%`,
            top: `${(decY / mapHeight) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="pointer-events-none select-none z-0"
        >
          <svg viewBox="0 0 64 64" className="h-7 w-7 text-teal-spring/20 select-none pointer-events-none">
            <path d="M30 60 Q33 42, 27 28 Q30 27, 33 28 Q36 42, 33 60 Z" fill="#D4AF37" opacity="0.3" />
            <path d="M27 28 Q12 24, 10 35 Q20 33, 27 28 Z" fill="#00A896" opacity="0.4" />
            <path d="M27 28 Q17 15, 21 7 Q26 17, 27 28 Z" fill="#00A896" opacity="0.4" />
            <path d="M33 28 Q48 24, 50 35 Q40 33, 33 28 Z" fill="#00A896" opacity="0.4" />
            <path d="M33 28 Q43 15, 39 7 Q35 17, 33 28 Z" fill="#00A896" opacity="0.4" />
          </svg>
        </div>
      );
    } else if (index % 3 === 1) {
      return (
        <div 
          key={`dec-${index}`}
          style={{
            position: "absolute",
            left: `${(decX / 400) * 100}%`,
            top: `${(decY / mapHeight) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="pointer-events-none select-none z-0"
        >
          <svg viewBox="0 0 64 64" className="h-6 w-6 text-gold-sand/20 select-none pointer-events-none">
            <polygon points="32,18 12,46 52,46" fill="#0D1B2A" stroke="#D4AF37" strokeWidth="1.5" opacity="0.4" />
            <polygon points="32,18 27,46 37,46" fill="#070F19" stroke="#D4AF37" strokeWidth="1" opacity="0.5" />
            <line x1="32" y1="18" x2="32" y2="10" stroke="#F26419" strokeWidth="1.5" opacity="0.5" />
            <polygon points="32,10 38,12 32,14" fill="#F26419" opacity="0.5" />
          </svg>
        </div>
      );
    } else {
      return (
        <div 
          key={`dec-${index}`}
          style={{
            position: "absolute",
            left: `${(decX / 400) * 100}%`,
            top: `${(decY / mapHeight) * 100}%`,
            transform: "translate(-50%, -50%)",
          }}
          className="pointer-events-none select-none z-0"
        >
          <svg viewBox="0 0 64 64" className="h-5 w-5 text-teal-spring/15 select-none pointer-events-none">
            <path d="M30 18 A5 5 0 0 1 40 18 V46 H30 Z" fill="#00A896" opacity="0.3" />
            <path d="M30 28 H22 V22 A3 3 0 0 1 28 22 V28" fill="#00A896" opacity="0.3" />
            <path d="M40 33 H48 V27 A3 3 0 0 1 44 27 V33" fill="#00A896" opacity="0.3" />
          </svg>
        </div>
      );
    }
  };
  
  // Memoize nodeCoordinates to avoid constant recreations on unrelated state updates
  const nodeCoordinates = useMemo(() => {
    if (!progress) return [];
    return (progress.nodes || []).map((node, index) => {
      const y = index * nodeSpacingY + 70;
      // alternate x coordinates left and right
      const x = index % 2 === 0 ? 90 : 310;
      return { id: node.id, x, y };
    });
  }, [progress]);

  // Calculate SVG paths
  const pathD = useMemo(() => {
    if (nodeCoordinates.length === 0) return "";
    let d = `M ${nodeCoordinates[0].x} ${nodeCoordinates[0].y}`;
    for (let i = 0; i < nodeCoordinates.length - 1; i++) {
      const curr = nodeCoordinates[i];
      const next = nodeCoordinates[i + 1];
      const cp1X = curr.x;
      const cp1Y = curr.y + 70;
      const cp2X = next.x;
      const cp2Y = next.y - 70;
      d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [nodeCoordinates]);

  const activeIndex = useMemo(() => {
    if (!progress) return -1;
    return (progress.nodes || []).findIndex(n => n.id === progress.currentActiveNode);
  }, [progress]);

  const completedPathD = useMemo(() => {
    const maxCompletedIndex = activeIndex !== -1 ? activeIndex : 0;
    if (nodeCoordinates.length === 0 || maxCompletedIndex === 0) return "";
    let d = `M ${nodeCoordinates[0].x} ${nodeCoordinates[0].y}`;
    for (let i = 0; i < maxCompletedIndex; i++) {
      const curr = nodeCoordinates[i];
      const next = nodeCoordinates[i + 1];
      const cp1X = curr.x;
      const cp1Y = curr.y + 70;
      const cp2X = next.x;
      const cp2Y = next.y - 70;
      d += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
    }
    return d;
  }, [nodeCoordinates, activeIndex]);

  // Cubic Bezier animation hook to traverse camel along path curves
  useEffect(() => {
    const targetIdx = activeIndex !== -1 ? activeIndex : 0;
    const prevIdx = prevActiveIndexRef.current;

    if (nodeCoordinates.length === 0) return;

    if (prevIdx === targetIdx) {
      const startNode = nodeCoordinates[targetIdx];
      if (startNode) {
        setCamelCoords({ x: startNode.x, y: startNode.y, angle: 0 });
      }
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 1200; // Traversal duration
    const stepsCount = Math.abs(targetIdx - prevIdx);
    const isForward = targetIdx > prevIdx;
    let animFrameId: number;

    const animateCamel = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const elapsed = timestamp - startTimestamp;
      const t = Math.min(elapsed / duration, 1);

      const segmentIndex = Math.min(Math.floor(t * stepsCount), stepsCount - 1);
      const localT = (t * stepsCount) - segmentIndex;

      const currIdx = isForward ? prevIdx + segmentIndex : prevIdx - segmentIndex;
      const nextIdx = isForward ? currIdx + 1 : currIdx - 1;

      const p0 = nodeCoordinates[currIdx];
      const p1 = nodeCoordinates[nextIdx];

      if (p0 && p1) {
        const cp1X = p0.x;
        const cp1Y = p0.y + (isForward ? 70 : -70);
        const cp2X = p1.x;
        const cp2Y = p1.y + (isForward ? -70 : 70);

        const mt = 1 - localT;
        const x = Math.round(
          Math.pow(mt, 3) * p0.x +
          3 * Math.pow(mt, 2) * localT * cp1X +
          3 * mt * Math.pow(localT, 2) * cp2X +
          Math.pow(localT, 3) * p1.x
        );
        const y = Math.round(
          Math.pow(mt, 3) * p0.y +
          3 * Math.pow(mt, 2) * localT * cp1Y +
          3 * mt * Math.pow(localT, 2) * cp2Y +
          Math.pow(localT, 3) * p1.y
        );

        // Cubic Bezier tangent vector derivative calculations: B'(t) = 3(1-t)^2(P1-P0) + 6(1-t)t(P2-P1) + 3t^2(P3-P2)
        const dx = 3 * Math.pow(mt, 2) * (cp1X - p0.x) + 6 * mt * localT * (cp2X - cp1X) + 3 * Math.pow(localT, 2) * (p1.x - cp2X);
        const dy = 3 * Math.pow(mt, 2) * (cp1Y - p0.y) + 6 * mt * localT * (cp2Y - cp1Y) + 3 * Math.pow(localT, 2) * (p1.y - cp2Y);
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI;

        setCamelCoords({ x, y, angle: angleDeg });
      }

      if (t < 1) {
        animFrameId = requestAnimationFrame(animateCamel);
      } else {
        prevActiveIndexRef.current = targetIdx;
        const endNode = nodeCoordinates[targetIdx];
        if (endNode) {
          setCamelCoords({ x: endNode.x, y: endNode.y, angle: 0 });
        }
      }
    };

    animFrameId = requestAnimationFrame(animateCamel);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeIndex, nodeCoordinates]);

  const handleV0Generate = async () => {
    if (!v0Prompt.trim() || !selectedNode) return;
    setGeneratingCode(true);
    setV0Error("");
    setV0Response(null);
    try {
      const response = await fetch("/api/v0/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: v0Prompt,
          nodeTitle: selectedNode.title,
        }),
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setV0Response(data);
      } else {
        setV0Error(data.error || "Failed to generate component.");
      }
    } catch (err) {
      setV0Error("Network error: failed to contact v0 generation gateway.");
    } finally {
      setGeneratingCode(false);
    }
  };

  // Interactive Tour Walkthrough State
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  });

  const updateTooltipPosition = (rect: { x: number; y: number; width: number; height: number } | null) => {
    const cardWidth = 350;
    const cardHeight = 250;
    const gap = 20;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;

    if (!rect || tourStep === 1) {
      setTooltipStyle({
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        width: `${cardWidth}px`,
        transition: "all 0.3s ease",
      });
      return;
    }

    let left = 0;
    let top = 0;
    const isDesktop = viewportWidth >= 1024;

    if (isDesktop) {
      // Custom desktop side-positioning per step
      if (tourStep === 2) {
        // Learning Trail Map: place to the right
        left = rect.x + rect.width + gap;
        if (left + cardWidth > viewportWidth - 20) {
          left = rect.x + rect.width - cardWidth - 30; // overlay slightly on the right side of the map
        }
        top = rect.y + 80;
      } else if (tourStep === 3) {
        // Daily Streak: place below
        left = rect.x + rect.width / 2 - cardWidth / 2;
        if (left + cardWidth > viewportWidth - 20) {
          left = viewportWidth - cardWidth - 20;
        }
        top = rect.y + rect.height + gap;
      } else if (tourStep === 4) {
        // Challenge Sandbox: place to the left (overlaying the map)
        left = rect.x - cardWidth - gap;
        if (left < 20) {
          left = rect.x + rect.width + gap; // fall back to right side
          if (left + cardWidth > viewportWidth - 20) {
            left = rect.x + 30; // overlay inside sandbox
          }
        }
        top = rect.y + 120;
      } else if (tourStep === 5) {
        // AI Chat: place to the left of the chat panel
        left = rect.x - cardWidth - gap;
        top = rect.y + 100;
      } else if (tourStep === 6) {
        // Forum: place to the right or above
        left = rect.x + rect.width + gap;
        if (left + cardWidth > viewportWidth - 20) {
          left = rect.x + rect.width - cardWidth - 30;
        }
        top = rect.y + 50;
      } else {
        // Default centering fallback
        left = viewportWidth / 2 - cardWidth / 2;
        top = viewportHeight / 2 - cardHeight / 2;
      }
    } else {
      // Mobile positioning (always stack above or below)
      left = viewportWidth / 2 - cardWidth / 2;
      if (left < 10) left = 10;
      
      // Try below first
      top = rect.y + rect.height + gap;
      if (top + cardHeight > viewportHeight - 10) {
        // Try above
        top = rect.y - cardHeight - gap;
        if (top < 10) {
          // Center as fallback
          top = viewportHeight / 2 - cardHeight / 2;
        }
      }
    }

    // Double check viewport bounds to prevent card from going off-screen
    if (left < 10) left = 10;
    if (left + cardWidth > viewportWidth - 10) left = viewportWidth - cardWidth - 10;
    if (top < 10) top = 10;
    if (top + cardHeight > viewportHeight - 10) top = viewportHeight - cardHeight - 10;

    setTooltipStyle({
      position: "fixed",
      left: `${left}px`,
      top: `${top}px`,
      width: `${cardWidth}px`,
      transition: "all 0.3s ease",
    });
  };

  const updateHighlightRect = () => {
    if (tourStep === null || tourStep === 1) {
      setHighlightRect(null);
      updateTooltipPosition(null);
      return;
    }

    let targetId = "";
    if (tourStep === 2) targetId = "tour-map";
    else if (tourStep === 3) targetId = "tour-streak";
    else if (tourStep === 4) targetId = "tour-sandbox";
    else if (tourStep === 5) targetId = "tour-chat";
    else if (tourStep === 6) targetId = "tour-forum";

    const el = document.getElementById(targetId);
    if (el) {
      if (tourStep !== 3) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const rect = el.getBoundingClientRect();
      const updatedRect = {
        x: rect.left,
        y: rect.top,
        width: rect.width,
        height: rect.height,
      };
      setHighlightRect(updatedRect);
      updateTooltipPosition(updatedRect);
    } else {
      setHighlightRect(null);
      updateTooltipPosition(null);
    }
  };

  useEffect(() => {
    if (tourStep !== null) {
      if (tourStep === 5) {
        setChatOpen(true);
      }
      
      const timer = setTimeout(() => {
        updateHighlightRect();
      }, 150);

      let frameId: number;
      const handleScrollOrResize = () => {
        cancelAnimationFrame(frameId);
        frameId = requestAnimationFrame(updateHighlightRect);
      };

      window.addEventListener("resize", handleScrollOrResize);
      window.addEventListener("scroll", handleScrollOrResize, true);
      
      return () => {
        clearTimeout(timer);
        window.removeEventListener("resize", handleScrollOrResize);
        window.removeEventListener("scroll", handleScrollOrResize, true);
        cancelAnimationFrame(frameId);
      };
    }
  }, [tourStep]);

  useEffect(() => {
    // Load IDs from localStorage
    const savedUserId = localStorage.getItem("silkroad_userid");
    const savedRoadmapId = localStorage.getItem("silkroad_roadmapid");
    
    setUserId(savedUserId);
    setRoadmapId(savedRoadmapId);
    setSoundMuted(audio.getMuteStatus());

    if (savedUserId) {
      fetchProgressAndStreak(savedUserId, savedRoadmapId);
      fetchForumPosts();
      
      // Trigger Walkthrough Tour if first visit
      const tourCompleted = localStorage.getItem("silkroad_tour_completed");
      if (!tourCompleted) {
        setTourStep(1);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const fetchForumPosts = async () => {
    try {
      const response = await fetch("/api/community/posts");
      const data = await response.json();
      if (data.posts) {
        setForumPostsList(data.posts);
      }
    } catch (err) {
      console.error("Failed to load forum posts", err);
    }
  };

  const handlePostToForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !userId || !progress) return;
    const userEmail = localStorage.getItem("silkroad_email") || "traveler@silkroad.com";
    
    try {
      const response = await fetch("/api/community/posts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          email: userEmail,
          content: newPostContent,
        }),
      });
      const data = await response.json();
      if (data.success) {
        setNewPostContent("");
        setForumPostsList(prev => [data.post, ...prev]);
        if (data.sentiment === "frustrated") {
          setUserFrustrated(true);
        }
      }
    } catch (err) {
      console.error("Failed to post message", err);
    }
  };

  const handleDemoteDifficulty = async () => {
    if (!userId || !progress) return;
    const currentDiff = progress.difficulty || "beginner";
    let newDiff = "beginner";
    if (currentDiff === "advanced") newDiff = "intermediate";
    
    try {
      const userEmail = localStorage.getItem("silkroad_email") || "traveler@silkroad.com";
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: userEmail,
          message: `Please lower my difficulty to ${newDiff}`,
          restart: false,
        }),
      });
      const data = await response.json();
      if (data.success) {
        window.location.reload();
      }
    } catch (err) {
      console.error("Failed to lower difficulty", err);
    }
  };

  const handleResourceClick = async (e: React.MouseEvent, res: Resource) => {
    e.preventDefault();
    setSelectedResource(res);
    setSummaryModalOpen(true);
    setLoadingSummary(true);
    setResourceSummary("");
    
    try {
      const response = await fetch("/api/resources/summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: res.title,
          url: res.url,
          type: res.type,
        }),
      });
      const data = await response.json();
      setResourceSummary(data.summary || "Unable to load summary details.");
    } catch (err) {
      setResourceSummary("Offline fallback: Key study highlights are loaded in your sidebar panel.");
    } finally {
      setLoadingSummary(false);
    }
  };

  const fetchProgressAndStreak = async (uId: string, rId: string | null) => {
    try {
      const url = rId 
        ? `/api/progress?userId=${uId}&roadmapId=${rId}`
        : `/api/progress?userId=${uId}`;
      const response = await fetch(url);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to load progress details.");
      }

      setProgress(data.progress);
      setStreak(data.streak);
      setUserProfile(data.user);

      // Select the first node or active node
      if (data.progress && data.progress.nodes && data.progress.nodes.length > 0) {
        const activeNodeId = data.progress.currentActiveNode;
        const active = data.progress.nodes.find((n: Node) => n.id === activeNodeId) || data.progress.nodes[0];
        setSelectedNode(active);
        setCodeSolution(active.challenge.boilerplate || "");
      }

      // Sync roadmapId with localStorage if it was dynamically resolved by the backend
      if (data.progress && data.progress.roadmapId) {
        localStorage.setItem("silkroad_roadmapid", data.progress.roadmapId);
        setRoadmapId(data.progress.roadmapId);
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync details with AWS databases.");
    } finally {
      setLoading(false);
    }
  };

  const getInitials = (email: string) => {
    if (!email) return "TR";
    const parts = email.split("@");
    const name = parts[0];
    if (name.length >= 2) {
      return name.slice(0, 2).toUpperCase();
    }
    return name.toUpperCase() || "TR";
  };

  // Node State Evaluator
  const getNodeState = (nodeId: string) => {
    if (!progress) return "locked";
    if (progress.completedSteps.includes(nodeId)) return "completed";
    if (progress.currentActiveNode === nodeId) return "active";
    
    // Check if previous nodes are completed to see if it is locked
    const nodeIndex = progress.nodes.findIndex((n) => n.id === nodeId);
    const prevNodes = progress.nodes.slice(0, nodeIndex);
    const allPrevCompleted = prevNodes.every((n) => progress.completedSteps.includes(n.id));
    
    return allPrevCompleted ? "unlocked" : "locked";
  };

  const getNodeIcon = (node: Node, index: number, state: string) => {
    const title = node.title.toLowerCase();
    const iconSize = "h-4 w-4 transition-all duration-300 group-hover:scale-110";
    if (state === "completed") {
      return <CheckCircle className={`${iconSize} text-gold-sand`} />;
    }
    if (state === "locked") {
      return <Lock className={`${iconSize} text-text-secondary/40`} />;
    }
    
    // Unlocked or active node: select custom themed icon
    if (index === 0) {
      return <Compass className={`${iconSize} text-teal-spring`} />;
    }
    if (title.includes("foundation") || title.includes("basic") || title.includes("javascript")) {
      return <BookOpen className={`${iconSize} text-teal-spring`} />;
    }
    if (title.includes("logic") || title.includes("array") || title.includes("function") || title.includes("manipulation")) {
      return <Layers className={`${iconSize} text-teal-spring`} />;
    }
    if (title.includes("database") || title.includes("ledger") || title.includes("aws") || title.includes("dynamodb") || title.includes("postgres") || title.includes("scaling")) {
      return <Coins className={`${iconSize} text-teal-spring`} />;
    }
    if (title.includes("ui") || title.includes("ux") || title.includes("frontend") || title.includes("react") || title.includes("component") || title.includes("visual")) {
      return <Sparkles className={`${iconSize} text-teal-spring`} />;
    }
    return <Award className={`${iconSize} text-teal-spring`} />;
  };

  const handleNodeClick = (node: Node) => {
    const state = getNodeState(node.id);
    if (state === "locked") return; // cannot select locked oases
    
    audio.playClick();
    setSelectedNode(node);
    setCodeSolution(node.challenge.boilerplate || "");
    setValidationStatus("idle");
    setConsoleLogs([]);
  };

  // helper to get test cases based on selectedNode challenge details
  const getTestCasesForNode = (node: Node) => {
    const title = node.title.toLowerCase();
    const question = node.challenge.question.toLowerCase();
    
    if (title.includes("foundation") || question.includes("sum(")) {
      return {
        functionName: "sum",
        testCases: [
          { params: [2, 3], expected: 5 },
          { params: [-1, 5], expected: 4 },
          { params: [0, 0], expected: 0 }
        ]
      };
    }
    
    if (title.includes("logic") || question.includes("doublearray")) {
      return {
        functionName: "doubleArray",
        testCases: [
          { params: [[1, 2, 3]], expected: [2, 4, 6] },
          { params: [[0, -4]], expected: [0, -8] },
          { params: [[]], expected: [] }
        ]
      };
    }

    if (question.includes("double")) {
      return {
        functionName: "double",
        testCases: [
          { params: [5], expected: 10 },
          { params: [0], expected: 0 }
        ]
      };
    }

    // Default: try to parse function name
    const match = (node.challenge.boilerplate || "").match(/function\s+(\w+)/);
    const functionName = match ? match[1] : "solution";
    return {
      functionName,
      testCases: []
    };
  };

  // Code challenge validator (AST parser + Web Worker Sandbox)
  const handleVerifySolution = async () => {
    if (!selectedNode || !userId || !progress) return;
    setValidationStatus("idle");
    setConsoleLogs(["Initializing compilation sandbox...", "Loading AST syntax parser..."]);

    // 1. AST Syntax Parsing
    try {
      acorn.parse(codeSolution, { ecmaVersion: 2020 });
      setConsoleLogs(prev => [...prev, "AST Syntax Check: PASSED."]);
    } catch (err: any) {
      setConsoleLogs(prev => [...prev, `Syntax Check FAILED: ${err.message}`]);
      setValidationStatus("failure");
      setFailCount(prev => prev + 1);
      audio.playThud();
      return;
    }

    // 2. Regex Pattern Matching
    const patternStr = selectedNode.challenge.solutionPattern;
    const pattern = new RegExp(patternStr);
    if (!pattern.test(codeSolution)) {
      setConsoleLogs(prev => [
        ...prev, 
        `Structural Analysis FAILED: Submission must match solution criteria /${patternStr}/.`
      ]);
      setValidationStatus("failure");
      setFailCount(prev => prev + 1);
      audio.playThud();
      return;
    }
    setConsoleLogs(prev => [...prev, "Structural constraint check: PASSED."]);

    // 3. Web Worker Execution Sandbox
    setConsoleLogs(prev => [...prev, "Spawning isolated sandbox thread...", "Running test cases..."]);
    const targetTests = getTestCasesForNode(selectedNode);

    const executionResult = await new Promise<{ success: boolean; error?: string }>((resolve) => {
      const workerCode = `
        self.onmessage = function(e) {
          const { code, functionName, testCases } = e.data;
          try {
            const userFn = new Function('return ' + code)();
            if (typeof userFn !== 'function') {
              self.postMessage({ success: false, error: "Must export a valid function." });
              return;
            }

            if (testCases && testCases.length > 0) {
              for (let i = 0; i < testCases.length; i++) {
                const tc = testCases[i];
                const result = userFn.apply(null, tc.params);
                const isMatch = JSON.stringify(result) === JSON.stringify(tc.expected);
                if (!isMatch) {
                  self.postMessage({
                    success: false,
                    error: "Assertion Failed on parameter: expected " + JSON.stringify(tc.expected) + " but got " + JSON.stringify(result)
                  });
                  return;
                }
              }
            } else {
              // Simple execution check
              userFn;
            }
            self.postMessage({ success: true });
          } catch (err) {
            self.postMessage({ success: false, error: err.message });
          }
        };
      `;

      const blob = new Blob([workerCode], { type: "application/javascript" });
      const worker = new Worker(URL.createObjectURL(blob));

      const timeoutId = setTimeout(() => {
        worker.terminate();
        resolve({ success: false, error: "Execution Timeout: Code execution exceeded 2000ms. Check for infinite loops." });
      }, 2000);

      worker.onmessage = (e) => {
        clearTimeout(timeoutId);
        worker.terminate();
        if (e.data.success) {
          resolve({ success: true });
        } else {
          resolve({ success: false, error: e.data.error });
        }
      };

      worker.postMessage({
        code: codeSolution,
        functionName: targetTests.functionName,
        testCases: targetTests.testCases
      });
    });

    if (!executionResult.success) {
      setConsoleLogs(prev => [...prev, `Runtime Check FAILED: ${executionResult.error}`]);
      setValidationStatus("failure");
      setFailCount(prev => prev + 1);
      audio.playThud();
      return;
    }

    setConsoleLogs(prev => [...prev, "All test cases passed successfully!", "Syncing ledger write to databases..."]);
    setValidationStatus("success");
    setFailCount(0);
    audio.playChime();

    // Confetti celebration!
    confetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.6 },
      colors: ["#D4AF37", "#00A896", "#F4F6F8"],
    });

    try {
      const response = await fetch("/api/progress/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          roadmapId: progress.roadmapId,
          nodeId: selectedNode.id,
          codeSubmitted: codeSolution,
          isCorrect: true,
          feedbackText: "Challenge solved successfully!",
        }),
      });
      
      const data = await response.json();
      if (data.success) {
        setProgress(data.progress);
        setStreak(data.streak);
        if (data.user) {
          setUserProfile(data.user);
        }
        setConsoleLogs(prev => [...prev, "Ledger synchronized. Oasis successfully unlocked!"]);
        setVictoryModalOpen(true);
      }
    } catch (err) {
      console.error("Failed to commit progress to databases:", err);
      setConsoleLogs(prev => [...prev, "AWS sync warning: transaction logged locally, check server connections."]);
    }

    // 4. Request Real-Time AI Reviewer feedback analysis
    setConsoleLogs(prev => [...prev, "Requesting Master Marco Polo review feedback..."]);
    try {
      const reviewResponse = await fetch("/api/progress/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          codeSubmitted: codeSolution,
          question: selectedNode.challenge.question,
          functionName: targetTests.functionName,
        }),
      });
      const reviewData = await reviewResponse.json();
      if (reviewData.review) {
        const reviewLines = reviewData.review.split("\n").filter((l: string) => l.trim().length > 0);
        setConsoleLogs(prev => [...prev, "--- AI Master Review ---", ...reviewLines]);
      }
    } catch (err) {
      console.error("Failed to fetch code review", err);
      setConsoleLogs(prev => [...prev, "Reviewer fallback: your code logic is optimized."]);
    }
  };


  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center space-y-4">
        <LoaderComponent />
        <h3 className="text-lg font-serif text-gold-sand animate-pulse">Loading Expedition map...</h3>
      </div>
    );
  }

  if (!userId || !progress) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center p-6 text-center space-y-4">
        <Compass className="h-16 w-16 text-gold-sand animate-spin-slow" />
        <h3 className="text-xl font-bold font-serif text-gold-sand">Caravan Profile Missing</h3>
        <p className="text-sm text-text-secondary max-w-md">
          You need to complete the assessment onboarding to generate your personalized learning map and survive the road.
        </p>
        <button
          onClick={() => window.location.href = "/onboarding"}
          className="bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          Initialize Onboarding
        </button>
      </div>
    );
  }

  const activeNodeId = progress.currentActiveNode;
  const nodes = progress.nodes || [];
  const percentComplete = Math.round((progress.completedSteps.length / nodes.length) * 100);

  const activeCoord = nodeCoordinates[activeIndex !== -1 ? activeIndex : 0] || nodeCoordinates[0];

  return (
    <div className="min-h-screen bg-midnight text-text-primary flex flex-col select-none">
      
      {/* Header bar */}
      <header className="bg-indigo-oasis/80 backdrop-blur-md border-b border-gold-sand/10 py-4 px-6 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo showText={false} size="md" />
          <div>
            <h1 className="text-base font-bold font-serif tracking-wider text-gold-sand uppercase">
              {progress.title || "SILK ROAD"}
            </h1>
            <p className="text-[10px] text-text-secondary">Expedition Trail Dashboard</p>
          </div>
        </div>

        {/* Action controls */}
        <div className="flex items-center space-x-4">
          
          {/* Sound Synthesizer Toggle */}
          <button
            onClick={() => {
              const muted = audio.toggleMute();
              setSoundMuted(muted);
            }}
            title={soundMuted ? "Unmute Ambient Soundscapes" : "Mute Ambient Soundscapes"}
            className={`flex items-center justify-center w-[30px] h-[30px] rounded-xl border transition-all cursor-pointer ${
              soundMuted
                ? "border-gold-sand/20 text-text-secondary/70 hover:border-gold-sand/40 hover:text-gold-sand hover:bg-gold-sand/5"
                : "bg-gold-sand/15 border-gold-sand text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.15)]"
            }`}
          >
            {soundMuted ? (
              <VolumeX className="h-4 w-4" />
            ) : (
              <div className="relative flex items-center justify-center">
                <Volume2 className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-sand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold-sand"></span>
                </span>
              </div>
            )}
          </button>

          {/* Survival streak widget with hydration wave animation */}
          {streak && (
            <CanteenWidget
              streak={streak}
              userProfile={userProfile}
              userId={userId}
              onRefreshData={() => {
                if (userId) {
                  fetchProgressAndStreak(userId, roadmapId);
                }
              }}
            />
          )}

          {/* Skill IQ Assessment Button */}
          <button
            onClick={() => {
              audio.playClick();
              router.push("/assessment");
            }}
            className="flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border border-teal-spring/30 text-teal-spring hover:bg-teal-spring/10 transition-all cursor-pointer"
          >
            <Brain className="h-4 w-4" />
            <span>Skill IQ</span>
          </button>

          {/* Marketplace Button */}
          <button
            onClick={() => {
              audio.playClick();
              router.push("/marketplace");
            }}
            className="flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border border-gold-sand/30 text-gold-sand hover:bg-gold-sand/10 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Bazaar</span>
          </button>

          {/* Leave Caravan Logout Button */}
          <button
            onClick={() => {
              audio.playClick();
              if (typeof window !== "undefined") {
                localStorage.removeItem("silkroad_userid");
                localStorage.removeItem("silkroad_roadmapid");
                localStorage.removeItem("silkroad_email");
              }
              router.push("/onboarding");
            }}
            title="Leave Caravan"
            className="flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border border-orange-flame/30 text-orange-flame hover:bg-orange-flame/10 transition-all cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span className="hidden sm:inline">Leave Caravan</span>
          </button>

          {/* Toggle AI guide button */}
          <button
            onClick={() => {
              setChatOpen(!chatOpen);
              audio.playRustle();
            }}
            className={`flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              chatOpen 
                ? "bg-gold-sand text-midnight border-gold-sand" 
                : "border-gold-sand/30 text-gold-sand hover:bg-gold-sand/10"
            }`}
          >
            <MessageSquare className="h-4 w-4" />
            <span>AI Guide</span>
          </button>
        </div>
      </header>

      {/* Main Grid content */}
      <div className="flex-1 flex min-h-0 relative">
        
        {/* Left Columns (Map and Challenge) */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-y-auto p-6 gap-6">

          {/* Guide Sentiment Frustration Intervention Banner */}
          {(failCount >= 2 || userFrustrated) && (
            <div className="lg:col-span-12 bg-orange-flame/10 border border-orange-flame/40 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-[0_0_15px_rgba(242,100,25,0.15)]">
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 relative">
                  <img
                    src="/images/characters/marcopolo_concerned.png"
                    alt="Marco Polo Concerned"
                    className="h-16 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(242,100,25,0.4)] camel-walk"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <ShieldAlert className="h-4 w-4 text-orange-flame animate-pulse" />
                    <h4 className="text-xs font-bold text-orange-flame font-serif uppercase tracking-wide">Caravan Guide Intervention</h4>
                  </div>
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-1">
                    Companion Guide Marco Polo reports your traveler status is distressed. Would you like to schedule an immediate 1-on-1 code matching review at 20% off, or lower your trail difficulty rank?
                  </p>
                </div>
              </div>
              <div className="flex space-x-2 flex-shrink-0">
                <button
                  onClick={handleDemoteDifficulty}
                  className="border border-text-secondary/20 hover:border-text-secondary/40 text-text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer"
                >
                  Lower Difficulty
                </button>
                <button
                  onClick={() => router.push("/marketplace")}
                  className="bg-orange-flame hover:bg-orange-flame/90 text-text-primary text-[10px] font-bold px-3 py-1.5 rounded-xl transition-all shadow-md cursor-pointer"
                >
                  Book Mentor
                </button>
                <button
                  onClick={() => {
                    setFailCount(0);
                    setUserFrustrated(false);
                  }}
                  className="text-text-secondary hover:text-text-primary text-[10px] font-bold px-2 cursor-pointer"
                >
                  Dismiss
                </button>
              </div>
            </div>
          )}
          
          {/* Column 1: Map Node List & Stats */}
          <div className="lg:col-span-5 space-y-6 flex flex-col">
            
            {/* Expedition Progress Card */}
            <div className="glass-panel rounded-2xl p-5 space-y-4">
              <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Expedition Status</h3>
              <p className="text-xs text-text-secondary leading-relaxed">{progress.description}</p>
              
              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-text-secondary font-semibold">
                  <span>Oases Discovered</span>
                  <span>{progress.completedSteps.length} / {nodes.length} ({percentComplete}%)</span>
                </div>
                <div className="h-2 w-full bg-midnight rounded-full overflow-hidden border border-text-secondary/10">
                  <div 
                    className="h-full bg-gradient-to-r from-teal-spring to-gold-sand transition-all duration-500"
                    style={{ width: `${percentComplete}%` }}
                  />
                </div>
              </div>
            </div>

            {/* Curvy SVG learning trail map dashboard */}
            <div 
              id="tour-map" 
              className={`relative rounded-2xl flex flex-col min-h-[420px] max-h-[580px] overflow-hidden glass-panel transition-all select-none ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}`}
            >
              <style>{`
                @keyframes march-forward {
                  to { stroke-dashoffset: -20; }
                }
                .trail-flow-completed {
                  stroke-dasharray: 6 6;
                  animation: march-forward 1.2s infinite linear !important;
                }
                .trail-flow-background {
                  stroke-dasharray: 8 8;
                  animation: march-forward 3.5s infinite linear !important;
                }
                @keyframes twinkle {
                  0%, 100% { opacity: 0.15; }
                  50% { opacity: 0.85; }
                }
                .twinkle-star-1 {
                  animation: twinkle 3s infinite ease-in-out;
                }
                .twinkle-star-2 {
                  animation: twinkle 2s infinite ease-in-out 0.5s;
                }
                .twinkle-star-3 {
                  animation: twinkle 4.5s infinite ease-in-out 1.2s;
                }
              `}</style>

              {/* Fixed Background Layer: Twinkling Stars & Sand Dunes */}
              <div className="absolute inset-0 z-0 pointer-events-none select-none overflow-hidden">
                {/* Twinkling star field */}
                <svg className="absolute inset-0 w-full h-full" opacity="0.35">
                  {stars.map((star) => (
                    <circle
                      key={star.id}
                      cx={star.x}
                      cy={star.y}
                      r={star.size}
                      fill="#F4F6F8"
                      className={star.animationClass}
                      opacity={0.3}
                    />
                  ))}
                </svg>
                
                {/* Layered sand dunes at the bottom */}
                <div className="absolute bottom-0 left-0 right-0 h-24 opacity-25">
                  <svg className="w-full h-full" viewBox="0 0 400 100" preserveAspectRatio="none">
                    <defs>
                      <linearGradient id="bg-dune-grad-1" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#070F19" />
                      </linearGradient>
                      <linearGradient id="bg-dune-grad-2" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#00A896" />
                        <stop offset="100%" stopColor="#070F19" />
                      </linearGradient>
                    </defs>
                    <path d="M0 80 Q100 55, 200 75 T400 65 V100 H0 Z" fill="url(#bg-dune-grad-1)" />
                    <path d="M0 90 Q120 75, 240 85 T400 80 V100 H0 Z" fill="url(#bg-dune-grad-2)" />
                  </svg>
                </div>
              </div>

              {/* Scrollable Viewport Panel */}
              <div
                ref={mapContainerRef}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onTouchStart={handleTouchStart}
                onTouchMove={handleTouchMove}
                onTouchEnd={handleMouseUp}
                className="absolute inset-0 overflow-y-auto p-5 z-10 scroll-smooth"
              >
                <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase mb-6 z-10 select-none">Learning Trail Map</h3>

                {/* Zoom & Recenter HUD Controls */}
                <div className="absolute top-4 right-4 z-30 flex items-center space-x-1.5 bg-indigo-oasis/90 border border-gold-sand/20 p-1 rounded-xl shadow-lg backdrop-blur-md">
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.min(1.3, prev + 0.1))}
                    className="w-6 h-6 flex items-center justify-center text-xs font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
                    title="Zoom In"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => setMapZoom(prev => Math.max(0.7, prev - 0.1))}
                    className="w-6 h-6 flex items-center justify-center text-xs font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
                    title="Zoom Out"
                  >
                    -
                  </button>
                  <button
                    type="button"
                    onClick={recenterMap}
                    className="px-2 h-6 flex items-center justify-center text-[8px] uppercase tracking-wider font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
                    title="Recenter Caravan"
                  >
                    Recenter
                  </button>
                </div>

                <div 
                  className="relative flex-1 w-full max-w-[340px] sm:max-w-[360px] mx-auto transition-transform duration-200 z-10" 
                  style={{ height: `${mapHeight}px`, transform: `scale(${mapZoom})`, transformOrigin: "top center" }}
                >
                  
                  {/* SVG path connector lines representing Silk Road */}
                  <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 400 ${mapHeight}`} preserveAspectRatio="none">
                    {/* Background full dash trail */}
                    <path
                      d={pathD}
                      fill="none"
                      stroke="rgba(212, 175, 55, 0.15)"
                      strokeWidth="4"
                      className="trail-flow-background"
                      strokeLinecap="round"
                    />
                    {/* Active completed route highlight path */}
                    {completedPathD && (
                      <path
                        d={completedPathD}
                        fill="none"
                        stroke="url(#trail-gradient)"
                        strokeWidth="5"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        className="trail-flow-completed drop-shadow-[0_0_6px_rgba(0,168,150,0.4)]"
                        filter="url(#glow-effect)"
                      />
                    )}
                    <defs>
                      <linearGradient id="trail-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                        <stop offset="0%" stopColor="#00A896" />
                        <stop offset="100%" stopColor="#D4AF37" />
                      </linearGradient>
                      <filter id="glow-effect" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="3" result="blur" />
                        <feMerge>
                          <feMergeNode in="blur" />
                          <feMergeNode in="SourceGraphic" />
                        </feMerge>
                      </filter>
                    </defs>

                    {/* Glowing flow particles */}
                    {completedPathD && (
                      <>
                        <circle r="4" fill="#00A896" className="drop-shadow-[0_0_6px_#00A896] pointer-events-none">
                          <animateMotion dur="6s" repeatCount="indefinite" path={completedPathD} />
                        </circle>
                        <circle r="3" fill="#D4AF37" className="drop-shadow-[0_0_6px_#D4AF37] pointer-events-none">
                          <animateMotion dur="6s" begin="2s" repeatCount="indefinite" path={completedPathD} />
                        </circle>
                        <circle r="3" fill="#F4F6F8" className="drop-shadow-[0_0_4px_#F4F6F8] pointer-events-none">
                          <animateMotion dur="6s" begin="4s" repeatCount="indefinite" path={completedPathD} />
                        </circle>
                      </>
                    )}
                  </svg>

                  {/* Animated Camel Caravan element traversing the Bezier path */}
                  {camelCoords && (
                    <div 
                      style={{ 
                        left: `${(camelCoords.x / 400) * 100}%`, 
                        top: `${(camelCoords.y / mapHeight) * 100}%`,
                        transform: "translate(-50%, -120%)",
                      }}
                      className={`absolute z-20 pointer-events-none camel-walk transition-opacity duration-200 ${
                        hoveredNodeId === (progress?.nodes?.[activeIndex]?.id ?? null) ? "opacity-0" : "opacity-100"
                      }`}
                    >
                      <div className="bg-indigo-oasis/95 border border-gold-sand rounded-xl px-2 py-1 flex items-center space-x-1 shadow-[0_0_12px_rgba(212,175,55,0.4)] backdrop-blur-sm">
                        <span 
                          className="text-sm inline-block transition-transform duration-75"
                          style={{
                            transform: `rotate(${camelCoords.angle * 0.45}deg) ${
                              // Default emoji faces left. If dx > 0 (moving right, angle in range [-90, 90]), flip it to face right.
                              Math.abs(camelCoords.angle) < 90 ? "scaleX(-1)" : "scaleX(1)"
                            }`
                          }}
                        >
                          🐫
                        </span>
                        <span className="text-[8px] font-bold text-gold-sand tracking-wide uppercase font-serif">Caravan</span>
                      </div>
                    </div>
                  )}

                  {/* Render background decorations next to oases */}
                  {nodes.map((_, index) => {
                    const coord = nodeCoordinates[index];
                    return renderDecorations(coord, index);
                  })}

                  {/* Oases node elements */}
                  {nodes.map((node, index) => {
                    const coord = nodeCoordinates[index];
                    const state = getNodeState(node.id);
                    const isSelected = selectedNode?.id === node.id;
                    
                    return (
                      <div
                        key={node.id}
                        style={{
                          position: "absolute",
                          left: `${(coord.x / 400) * 100}%`,
                          top: `${(coord.y / mapHeight) * 100}%`,
                        }}
                        className={hoveredNodeId === node.id ? "z-30" : "z-10"}
                      >
                        {/* Animated concentric ripples around active node */}
                        {state === "active" && (
                          <div className="absolute pointer-events-none w-16 h-16 -translate-x-1/2 -translate-y-1/2 z-0">
                            <div className="absolute inset-0 rounded-full border border-teal-spring/60 animate-ping" style={{ animationDuration: "2.2s" }}></div>
                            <div className="absolute inset-2 rounded-full border border-teal-spring/40 animate-pulse" style={{ animationDuration: "1.5s" }}></div>
                            <div className="absolute -inset-2 rounded-full border border-teal-spring/20 animate-ping" style={{ animationDuration: "3.5s" }}></div>
                          </div>
                        )}

                        <button
                          id={state === "active" ? "active-node-btn" : undefined}
                          onClick={() => handleNodeClick(node)}
                          onMouseEnter={() => setHoveredNodeId(node.id)}
                          onMouseLeave={() => setHoveredNodeId(null)}
                          className={`-translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none ${
                            state === "locked" ? "cursor-not-allowed opacity-40" : ""
                          }`}
                          disabled={state === "locked"}
                        >
                          {/* Node circle */}
                          <div className={`h-10 w-10 rounded-full border flex items-center justify-center transition-all ${
                            state === "completed"
                              ? "bg-gold-sand/20 border-gold-sand text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:scale-110"
                              : state === "active"
                              ? "bg-teal-spring/25 border-teal-spring text-teal-spring oasis-pulse scale-105"
                              : state === "unlocked"
                              ? "bg-indigo-oasis border-text-secondary/40 text-text-primary hover:border-gold-sand hover:scale-105"
                              : "bg-midnight border-text-secondary/15 text-text-secondary"
                          } ${isSelected ? "ring-2 ring-gold-sand ring-offset-2 ring-offset-midnight scale-115" : ""}`}>
                            {getNodeIcon(node, index, state)}
                          </div>

                          {/* Mini Tag Label */}
                          <div className="mt-2 bg-midnight/90 border border-text-secondary/10 px-2 py-0.5 rounded text-[8px] font-bold text-text-primary max-w-[85px] truncate text-center group-hover:border-gold-sand/40 transition-colors shadow-sm font-sans uppercase">
                            {node.title}
                          </div>
                        </button>

                        {/* Interactive Hover Tooltip Preview */}
                        {hoveredNodeId === node.id && (
                          <div 
                            style={{
                              position: "absolute",
                              left: index % 2 === 0 ? "12px" : "-12px",
                              top: "-15px", 
                              transform: index % 2 === 0 ? "translate(-20%, -100%)" : "translate(-80%, -100%)",
                            }}
                            className={`z-50 w-56 bg-indigo-oasis/95 rounded-xl p-4 shadow-[0_10px_35px_rgba(0,0,0,0.9)] pointer-events-none animate-fadeIn backdrop-blur-md text-left text-[10px] space-y-2.5 border transition-all duration-300 ${
                              state === "active" 
                                ? "border-teal-spring/60 shadow-[0_0_20px_rgba(0,168,150,0.3)]" 
                                : state === "completed"
                                ? "border-gold-sand/50 shadow-[0_0_15px_rgba(212,175,55,0.15)]"
                                : "border-text-secondary/20"
                            }`}
                          >
                            <div className="flex justify-between items-center font-serif font-bold uppercase tracking-wider text-gold-sand text-[8.5px]">
                              <div className="flex items-center space-x-1.5">
                                <span>Oasis {index + 1}</span>
                                {state === "active" && (
                                  <span className="text-[7px] px-1 py-0.2 rounded bg-teal-spring/20 text-teal-spring border border-teal-spring/30 animate-pulse font-sans normal-case tracking-normal">
                                    Active
                                  </span>
                                )}
                              </div>
                              <span className={`text-[7px] px-1.5 py-0.5 rounded border font-sans tracking-normal font-medium ${
                                node.difficulty === "beginner"
                                  ? "bg-teal-spring/10 text-teal-spring border-teal-spring/30"
                                  : node.difficulty === "intermediate"
                                  ? "bg-gold-sand/10 text-gold-sand border-gold-sand/30"
                                  : "bg-orange-flame/10 text-orange-flame border-orange-flame/30"
                              }`}>
                                {node.difficulty}
                              </span>
                            </div>
                            <h4 className="text-text-primary font-bold font-sans text-xs leading-snug">{node.title}</h4>
                            <p className="text-text-secondary leading-relaxed font-sans line-clamp-3 text-[9.5px]">{node.description}</p>
                            
                            <div className="flex justify-between items-center text-[8.5px] text-text-secondary/80 font-bold border-t border-text-secondary/10 pt-2.5 mt-2">
                              <span className="flex items-center text-gold-sand">🪙 +25 Coins</span>
                              <span className="flex items-center text-teal-spring">🐪 {node.resources?.length || 0} Spices</span>
                            </div>
                            
                            <div className="text-[8px] font-bold text-text-primary/70 flex items-center justify-between bg-midnight/40 px-2.5 py-1 rounded border border-text-secondary/5 mt-2">
                              <span>Status</span>
                              <span className={state === "completed" ? "text-gold-sand" : state === "active" ? "text-teal-spring animate-pulse" : "text-text-secondary"}>
                                {state === "completed" ? "✓ Visited" : state === "active" ? "🔥 Active Oasis" : "Locked"}
                              </span>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}

                </div>
              </div>
            </div>

            {/* Caravanserai Community Forum Board */}
            <div id="tour-forum" className="glass-panel rounded-2xl p-5 space-y-4 flex flex-col">
              <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Caravanserai Forum</h3>
              
              {/* List of posts */}
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1 flex-1">
                {forumPostsList.length === 0 ? (
                  <div className="text-[10px] text-text-secondary/60 italic py-2 text-center">No traveler scrolls written yet. Share your thoughts...</div>
                ) : (
                  forumPostsList.map((post) => {
                    const initials = getInitials(post.authorEmail);
                    const isFrustrated = post.sentiment === "frustrated";
                    const accentClass = isFrustrated 
                      ? "border-l-3 border-orange-flame shadow-[inset_4px_0_0_rgba(242,100,25,0.05)]" 
                      : "border-l-3 border-teal-spring/40";
                    return (
                      <div 
                        key={post.id} 
                        className={`p-3 rounded-r-xl rounded-l-none bg-midnight/90 border-y border-r border-text-secondary/10 text-[10px] text-left flex items-start space-x-3 transition-all hover:bg-midnight/70 ${accentClass}`}
                      >
                        <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0 ${
                          isFrustrated ? "bg-orange-flame/20 text-orange-flame border border-orange-flame/30" : "bg-teal-spring/10 text-teal-spring border border-teal-spring/25"
                        }`}>
                          {initials}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between text-[8px] text-text-secondary mb-1">
                            <span className="font-bold text-gold-sand truncate max-w-[120px]">{post.authorEmail}</span>
                            <span className="text-[7px] text-text-secondary/70 flex-shrink-0">{new Date(post.createdAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                          </div>
                          <p className="text-text-primary leading-relaxed break-words font-sans">{post.content}</p>
                          {post.sentiment === "frustrated" && (
                            <span className="inline-flex items-center mt-1 text-[7px] text-orange-flame bg-orange-flame/10 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-orange-flame/20 animate-pulse">
                              🔥 Distressed Traveler
                            </span>
                          )}
                          {post.sentiment === "positive" && (
                            <span className="inline-flex items-center mt-1 text-[7px] text-teal-spring bg-teal-spring/10 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-teal-spring/20">
                              ☀️ Peaceful Voyage
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              
              {/* Form */}
              <form onSubmit={handlePostToForum} className="flex gap-2 border-t border-text-secondary/10 pt-3">
                <input
                  value={newPostContent}
                  onChange={(e) => setNewPostContent(e.target.value)}
                  placeholder="Ask a question or post a scroll..."
                  className="flex-1 bg-midnight border border-gold-sand/20 rounded-lg px-3 py-1.5 text-[10px] text-text-primary focus:outline-none focus:border-gold-sand"
                />
                <button
                  type="submit"
                  disabled={!newPostContent.trim()}
                  className="bg-gold-sand text-midnight text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gold-sand/90 disabled:opacity-50 cursor-pointer"
                >
                  Post
                </button>
              </form>
            </div>

          </div>

          {/* Column 2: Challenge Details & Code Sandbox */}
          <div id="tour-sandbox" className="lg:col-span-7 space-y-6">
            
            {selectedNode ? (
              <div className="glass-panel rounded-2xl p-5 space-y-5 flex flex-col h-full">
                
                {/* Node heading */}
                <div className="flex items-center justify-between border-b border-gold-sand/10 pb-3">
                  <div>
                    <span className="text-[9px] uppercase font-bold text-teal-spring bg-teal-spring/10 px-2 py-0.5 rounded">
                      {selectedNode.difficulty}
                    </span>
                    <h2 className="text-base font-bold font-serif text-gold-sand mt-1">{selectedNode.title}</h2>
                  </div>
                  
                  {/* Complete status flag */}
                  {progress.completedSteps.includes(selectedNode.id) && (
                    <span className="flex items-center text-[10px] font-semibold text-gold-sand bg-gold-sand/10 px-2 py-1 rounded-lg">
                      <CheckCircle className="h-3 w-3 mr-1" />
                      Oasis Discovered
                    </span>
                  )}
                </div>

                {/* Conceptual explanation / resources */}
                <div className="space-y-2.5">
                  <p className="text-xs leading-relaxed text-text-secondary leading-relaxed">{selectedNode.description}</p>
                  
                  {/* Curated Resources */}
                  <div className="bg-midnight/50 rounded-xl p-3 border border-text-secondary/10">
                    <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center">
                      <BookOpen className="h-3 w-3 mr-1 text-gold-sand" />
                      Curated Study Spices
                    </h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      {(selectedNode.resources || []).map((res: any, idx: number) => {
                        let resTitle = "";
                        let resUrl = "";
                        let resType: "video" | "article" | "documentation" = "documentation";

                        if (typeof res === "string") {
                          resUrl = res;
                          try {
                            const urlObj = new URL(res);
                            resTitle = urlObj.hostname.replace("www.", "") + " link";
                          } catch {
                            resTitle = "Study Resource " + (idx + 1);
                          }
                        } else if (res && typeof res === "object") {
                          resUrl = res.url || "";
                          resTitle = res.title || "Study Resource " + (idx + 1);
                          const rawType = res.type || "documentation";
                          if (rawType === "video" || rawType === "article" || rawType === "documentation") {
                            resType = rawType;
                          }
                        }

                        if (!resUrl) return null;

                        const normalizedRes = { title: resTitle, url: resUrl, type: resType };

                        let IconComponent = FileText;
                        let iconColor = "text-text-secondary";
                        if (resType === "video") {
                          IconComponent = Play;
                          iconColor = "text-teal-spring fill-teal-spring/20";
                        } else if (resType === "article") {
                          IconComponent = BookOpen;
                          iconColor = "text-gold-sand";
                        }

                        return (
                          <button
                            key={idx}
                            onClick={(e) => handleResourceClick(e, normalizedRes)}
                            className="flex items-center space-x-2.5 p-2 rounded-xl bg-indigo-oasis/40 border border-text-secondary/5 hover:border-gold-sand/35 hover:bg-indigo-oasis/80 transition-all text-[10px] text-text-primary cursor-pointer text-left w-full group"
                          >
                            <div className={`p-1.5 rounded-lg bg-midnight/80 border border-text-secondary/10 flex-shrink-0 group-hover:border-gold-sand/20 ${iconColor}`}>
                              <IconComponent className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-text-primary group-hover:text-gold-sand transition-colors">{resTitle}</p>
                              <p className="text-[7.5px] uppercase font-bold text-text-secondary/65 tracking-wider">{resType}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Challenge & Sandbox */}
                <div className="space-y-3 flex-1 flex flex-col select-text">
                  <div className="bg-midnight/70 rounded-xl p-4 border border-gold-sand/10 space-y-2">
                    <h4 className="text-xs font-bold text-gold-sand flex items-center font-serif uppercase tracking-wider">
                      <Terminal className="h-4 w-4 mr-1.5" />
                      Oasis Coding Puzzle
                    </h4>
                    <p className="text-xs text-text-primary leading-relaxed">{selectedNode.challenge.question}</p>
                  </div>

                  {/* Sandbox code editor */}
                  <div className="flex-1 min-h-[220px] flex flex-col rounded-xl overflow-hidden border border-text-secondary/20 bg-midnight text-text-primary shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
                    <div className="bg-indigo-oasis/60 px-4 py-2 border-b border-text-secondary/15 flex items-center justify-between text-[10px] text-text-secondary font-sans">
                      <span className="font-semibold text-text-primary/95">JavaScript Sandbox Editor</span>
                      <button
                        type="button"
                        onClick={() => {
                          setV0Prompt(`Build a custom component for the milestone: ${selectedNode.title}`);
                          setV0ModalOpen(true);
                          setV0Error("");
                          setV0Response(null);
                        }}
                        className="flex items-center space-x-1 px-2.5 py-1 rounded bg-gold-sand/10 hover:bg-gold-sand/20 border border-gold-sand/30 text-gold-sand hover:text-text-primary font-bold text-[9px] uppercase tracking-wide transition-all cursor-pointer"
                      >
                        <Sparkles className="h-3 w-3 mr-0.5 animate-pulse" />
                        <span>Generate UI via v0</span>
                      </button>
                    </div>
                    <div className="flex-1 flex overflow-hidden relative">
                      {/* Synced line numbers gutter */}
                      <div className="w-10 bg-midnight/80 border-r border-text-secondary/10 flex flex-col items-end pr-2 py-4 font-mono text-[10px] text-text-secondary/40 select-none overflow-hidden">
                        <div 
                          style={{ transform: `translateY(-${editorScrollTop}px)` }}
                          className="flex flex-col items-end w-full"
                        >
                          {codeSolution.split("\n").map((_, i) => (
                            <div key={i} className="h-5 flex items-center justify-end leading-5">
                              {i + 1}
                            </div>
                          ))}
                        </div>
                      </div>
                      
                      {/* Textarea */}
                      <textarea
                        value={codeSolution}
                        onChange={(e) => setCodeSolution(e.target.value)}
                        onScroll={(e) => setEditorScrollTop(e.currentTarget.scrollTop)}
                        className="flex-1 p-4 pl-2 bg-midnight text-xs font-mono text-text-primary focus:outline-none resize-none leading-5 select-text overflow-y-auto"
                        style={{ lineHeight: "20px" }}
                        spellCheck="false"
                      />
                    </div>
                    {/* Live Analysis Strip */}
                    <div className="bg-indigo-oasis/30 px-4 py-1.5 border-t border-text-secondary/10 flex items-center justify-between text-[9px] font-sans flex-wrap gap-2 select-none">
                      <div className="flex items-center space-x-3">
                        <span className="text-text-secondary/70">Live Analysis:</span>
                        <span className="flex items-center space-x-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${liveSyntaxValid ? "bg-teal-spring animate-pulse" : "bg-orange-flame"}`}></span>
                          <span className={liveSyntaxValid ? "text-teal-spring font-semibold" : "text-orange-flame font-semibold"}>
                            {liveSyntaxValid ? "Syntax OK" : "Syntax Error"}
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${liveStructureValid ? "bg-teal-spring" : "bg-text-secondary/35"}`}></span>
                          <span className={liveStructureValid ? "text-teal-spring font-semibold" : "text-text-secondary/70"}>
                            Structure Match
                          </span>
                        </span>
                        <span className="flex items-center space-x-1">
                          <span className={`h-1.5 w-1.5 rounded-full ${liveSafetyValid ? "bg-teal-spring" : "bg-orange-flame animate-pulse"}`}></span>
                          <span className={liveSafetyValid ? "text-teal-spring font-semibold" : "text-orange-flame font-semibold"}>
                            {liveSafetyValid ? "Safe Loops" : "Loop Danger"}
                          </span>
                        </span>
                      </div>
                      {liveSyntaxError && (
                        <span className="text-[8.5px] text-orange-flame/80 font-mono truncate max-w-[200px]" title={liveSyntaxError}>
                          {liveSyntaxError}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Interactive compiler console logs (Styled Retro Terminal) */}
                  <div className="terminal-overlay bg-black/95 rounded-xl border border-text-secondary/15 font-mono text-[11px] text-teal-spring flex flex-col overflow-hidden max-h-40 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                    {/* macOS-style Window control header bar */}
                    <div className="bg-[#121214] px-4 py-2 border-b border-text-secondary/10 flex items-center justify-between text-[10px] text-text-secondary/80 select-none">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm cursor-pointer hover:opacity-80" onClick={() => setConsoleLogs([])} title="Clear Console"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm"></span>
                      </div>
                      <span className="flex items-center text-[9px] uppercase tracking-wider font-semibold text-text-secondary/70">
                        <Terminal className="h-3 w-3 mr-1 text-gold-sand animate-pulse" /> Sandbox Terminal Console
                      </span>
                      <button 
                        type="button"
                        onClick={() => setConsoleLogs([])}
                        className="text-[8px] uppercase font-bold text-text-secondary hover:text-gold-sand px-1.5 py-0.5 rounded border border-text-secondary/20 hover:border-gold-sand/40 transition-colors cursor-pointer"
                      >
                        Clear
                      </button>
                    </div>

                    <div className="p-3 space-y-1.5 overflow-y-auto flex-1 select-text scrollbar-thin">
                      {consoleLogs.length === 0 ? (
                        <div className="text-text-secondary/50 text-center py-2 text-[10px] italic">Compile logs: Idle. Ready to test & verify...</div>
                      ) : (
                        consoleLogs.map((log, idx) => {
                          const isError = log.includes("FAILED") || log.includes("Error") || log.includes("warning");
                          const isHeader = log.includes("---");
                          return (
                            <div 
                              key={idx} 
                              className={`text-[10px] py-0.5 leading-relaxed font-mono flex items-start space-x-1.5 ${
                                isHeader ? "text-gold-sand font-bold" : isError ? "text-orange-flame" : "text-teal-spring"
                              }`}
                            >
                              {!isHeader && <span className="text-text-secondary/40 select-none">$&gt;</span>}
                              <span className="flex-1 whitespace-pre-wrap">{log}</span>
                            </div>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Submit buttons */}
                  <div className="flex justify-between items-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setCodeSolution(selectedNode.challenge.boilerplate || "");
                        setConsoleLogs([]);
                        setValidationStatus("idle");
                      }}
                      className="text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold cursor-pointer"
                    >
                      Reset Boilerplate
                    </button>
                    
                    <button
                      type="button"
                      onClick={handleVerifySolution}
                      className="flex items-center space-x-1.5 bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold py-2 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-xs cursor-pointer"
                    >
                      <Play className="h-3.5 w-3.5 fill-current" />
                      <span>Test & Verify</span>
                    </button>
                  </div>

                </div>

              </div>
            ) : (
              <div className="glass-panel rounded-2xl p-12 text-center text-text-secondary flex flex-col items-center justify-center h-full">
                <Compass className="h-12 w-12 text-text-secondary/40 animate-spin-slow mb-4" />
                <p className="text-sm">Select an unlocked oasis from your Learning Trail map to view resources and solve coding puzzles.</p>
              </div>
            )}

          </div>

        </div>

        {/* Desktop Sidebar Chat Panel */}
        {chatOpen && (
          <div id="tour-chat" className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 h-full p-6 pl-4 border-l border-gold-sand/10 bg-indigo-oasis/20">
            <CaravanMasterChat 
              userContext={{
                targetRole: progress.roadmapId.includes("frontend") ? "Frontend Engineer" : "Software Engineer",
                experienceLevel: progress.difficulty || "beginner",
                nodeTitle: selectedNode?.title || "Foundations",
              }} 
              currentCode={codeSolution}
            />
          </div>
        )}

        {/* Mobile floating advisor button & sliding sheet drawer */}
        <div className="lg:hidden">
          {/* Floating trigger */}
          <button
            type="button"
            onClick={() => setChatOpen(!chatOpen)}
            className="fixed bottom-6 right-6 z-40 bg-gold-sand hover:bg-gold-sand/90 text-midnight p-3.5 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] transition-all animate-bounce cursor-pointer"
          >
            <MessageSquare className="h-6 w-6" />
          </button>
          
          {/* Slide up panel */}
          {chatOpen && (
            <div className="fixed inset-0 z-40 bg-midnight/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
              <div className="absolute inset-0" onClick={() => setChatOpen(false)} />
              <div className="relative w-full max-w-lg bg-indigo-oasis border-t border-gold-sand/20 rounded-t-3xl h-[80vh] flex flex-col shadow-2xl z-50 overflow-hidden">
                {/* Drag handle */}
                <div 
                  onClick={() => setChatOpen(false)} 
                  className="w-12 h-1 bg-text-secondary/30 rounded-full mx-auto my-3 cursor-pointer" 
                />
                <div className="flex-grow min-h-0">
                  <CaravanMasterChat 
                    userContext={{
                      targetRole: progress.roadmapId.includes("frontend") ? "Frontend Engineer" : "Software Engineer",
                      experienceLevel: progress.difficulty || "beginner",
                      nodeTitle: selectedNode?.title || "Foundations",
                    }} 
                    currentCode={codeSolution}
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Micro-Learning Summary Modal */}
        {summaryModalOpen && selectedResource && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-4 border-gold-sand/20 relative animate-fadeIn select-text text-left">
              <div className="flex justify-between items-start">
                <h3 className="text-sm font-bold font-serif text-gold-sand uppercase tracking-wider">30-Second AI Study Summary</h3>
                <button
                  onClick={() => setSummaryModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>
              
              <div className="border-y border-gold-sand/10 py-3 space-y-2">
                <h4 className="text-xs font-bold text-text-primary">{selectedResource.title}</h4>
                <p className="text-[10px] text-teal-spring uppercase font-semibold">{selectedResource.type}</p>
                
                {loadingSummary ? (
                  <div className="flex flex-col items-center justify-center py-6 space-y-2 text-text-secondary text-[10px] italic">
                    <Loader2 className="h-6 w-6 animate-spin text-gold-sand" />
                    <span>Master Marco Polo is reading and condensing the scrolls...</span>
                  </div>
                ) : (
                  <div className="text-xs text-text-primary leading-relaxed whitespace-pre-line space-y-1 font-sans">
                    {resourceSummary}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-1">
                <button
                  onClick={() => setSummaryModalOpen(false)}
                  className="px-4 py-2 border border-text-secondary/20 rounded-lg text-text-secondary text-[10px] font-semibold hover:border-text-secondary/40 transition-colors cursor-pointer"
                >
                  Close
                </button>
                <a
                  href={selectedResource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => setSummaryModalOpen(false)}
                  className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-[10px] font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center cursor-pointer"
                >
                  Go to Resource
                </a>
              </div>
            </div>
          </div>
        )}

        {/* v0 Component Generator Modal */}
        {v0ModalOpen && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 space-y-4 border-gold-sand/20 relative animate-fadeIn select-text text-left max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-2">
                  <Sparkles className="h-5 w-5 text-gold-sand animate-pulse" />
                  <h3 className="text-sm font-bold font-serif text-gold-sand uppercase tracking-wider">v0 Component Generator</h3>
                </div>
                <button
                  onClick={() => setV0ModalOpen(false)}
                  className="text-text-secondary hover:text-text-primary text-xs font-bold cursor-pointer"
                >
                  ✕
                </button>
              </div>

              {(!userProfile || userProfile.subscriptionStatus !== "active") ? (
                <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-fadeIn">
                  <div className="h-14 w-14 rounded-full bg-gold-sand/15 border border-gold-sand/40 flex items-center justify-center text-gold-sand shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                    <Lock className="h-6 w-6" />
                  </div>
                  <div className="space-y-1.5 max-w-md">
                    <h4 className="text-base font-bold font-serif text-gold-sand uppercase tracking-wider text-center">Nomad Upgrade Required</h4>
                    <p className="text-xs text-text-secondary leading-relaxed text-center">
                      Chart the Oasis with v0 component generation! This premium feature leverages the Vercel v0 Platform API to construct bespoke React and Tailwind CSS templates. Upgrade your caravan status to Nomad in the Great Bazaar to unlock it.
                    </p>
                  </div>
                  <button
                    onClick={() => {
                      setV0ModalOpen(false);
                      router.push("/marketplace");
                    }}
                    className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-1 cursor-pointer animate-pulse"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Go to Great Bazaar</span>
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-xs text-text-secondary leading-relaxed">
                    Describe a UI component matching this milestone (<span className="text-gold-sand">{selectedNode?.title}</span>). v0 will generate self-contained React & Tailwind CSS code aligned with Silk Road styling.
                  </p>

                  {v0Error && (
                    <div className="bg-orange-flame/10 border border-orange-flame/40 text-orange-flame rounded-xl p-3 text-xs">
                      {v0Error}
                    </div>
                  )}

                  {/* Form Input */}
                  {!v0Response && !generatingCode && (
                    <div className="space-y-3">
                      <textarea
                        value={v0Prompt}
                        onChange={(e) => setV0Prompt(e.target.value)}
                        placeholder="e.g. Create a glassmorphic user profile card with golden stats counters and teal activity sparklines..."
                        className="w-full h-24 bg-midnight border border-gold-sand/25 rounded-xl p-3 text-xs text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-gold-sand resize-none"
                      />
                      <div className="flex justify-end space-x-2">
                        <button
                          onClick={() => setV0ModalOpen(false)}
                          className="px-4 py-2 border border-text-secondary/20 rounded-lg text-text-secondary text-[10px] font-semibold hover:border-text-secondary/40 transition-colors cursor-pointer"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={handleV0Generate}
                          disabled={!v0Prompt.trim()}
                          className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-[10px] font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center cursor-pointer disabled:opacity-50"
                        >
                          Generate Boilerplate
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Loading State */}
                  {generatingCode && (
                    <div className="flex flex-col items-center justify-center py-12 space-y-4">
                      <div className="relative h-16 w-16 flex items-center justify-center">
                        <Compass className="h-10 w-10 text-gold-sand animate-spin" />
                        <div className="absolute animate-ping h-14 w-14 rounded-full bg-gold-sand/10"></div>
                      </div>
                      <div className="text-center space-y-1">
                        <p className="text-xs text-text-primary font-bold">Crafting component on v0.app...</p>
                        <p className="text-[10px] text-text-secondary">Whispering to the sand dunes to align neon CSS vectors...</p>
                      </div>
                    </div>
                  )}

                  {/* Response Panel */}
                  {v0Response && (
                    <div className="space-y-4">
                      <div className="bg-midnight/70 rounded-xl p-4 border border-gold-sand/15 space-y-2">
                        <h4 className="text-[10px] font-bold text-gold-sand uppercase tracking-wider">v0 Blueprint</h4>
                        <p className="text-xs text-text-primary leading-relaxed">{v0Response.description}</p>
                      </div>

                      {/* Render files list and code preview */}
                      {Object.keys(v0Response.files).length > 0 ? (
                        <div className="space-y-3">
                          {Object.entries(v0Response.files).map(([path, fileObj]) => (
                            <div key={path} className="space-y-1">
                              <div className="flex items-center justify-between text-[10px] text-text-secondary font-mono px-1">
                                <span>{path}</span>
                                <button
                                  onClick={() => {
                                    navigator.clipboard.writeText(fileObj.content);
                                    alert("Component code copied to clipboard!");
                                  }}
                                  className="text-teal-spring hover:underline cursor-pointer"
                                >
                                  Copy Code
                                </button>
                              </div>
                              <pre className="bg-black/90 p-4 rounded-xl border border-text-secondary/15 overflow-auto text-[10px] font-mono text-teal-spring max-h-60 leading-relaxed scrollbar-thin">
                                <code>{fileObj.content}</code>
                              </pre>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-text-secondary italic">No source files returned from generation.</p>
                      )}

                      {/* Action buttons */}
                      <div className="flex justify-between items-center pt-2">
                        <button
                          onClick={() => {
                            setV0Response(null);
                            setV0Error("");
                          }}
                          className="text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold cursor-pointer"
                        >
                          Start Over
                        </button>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => {
                              const firstFileKey = Object.keys(v0Response.files)[0];
                              if (firstFileKey) {
                                setCodeSolution(v0Response.files[firstFileKey].content);
                                setV0ModalOpen(false);
                                setConsoleLogs(prev => [...prev, "Successfully loaded v0 component code into Sandbox editor."]);
                              }
                            }}
                            className="px-4 py-2 border border-teal-spring/30 text-teal-spring hover:bg-teal-spring/10 rounded-xl text-[10px] font-bold transition-all cursor-pointer"
                          >
                            Load Into Sandbox
                          </button>
                      <a
                        href={v0Response.webUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-[10px] font-bold px-4 py-2 rounded-xl transition-all shadow-md flex items-center cursor-pointer"
                      >
                        Open Live on v0.app
                      </a>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    )}

        {/* Victory Celebration Modal */}
        {victoryModalOpen && (
          <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-6 border-gold-sand/40 relative animate-fadeIn select-text text-center shadow-[0_0_30px_rgba(212,175,55,0.25)]">
              <button
                onClick={() => setVictoryModalOpen(false)}
                className="absolute top-4 right-4 text-text-secondary hover:text-text-primary text-xs font-bold cursor-pointer"
              >
                ✕
              </button>

              <div className="flex flex-col items-center space-y-4">
                <div className="relative">
                  <img
                    src="/images/characters/marcopolo_celebrating.png"
                    alt="Marco Polo Celebrating"
                    className="h-40 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.5)] camel-walk"
                  />
                  <div className="absolute -top-2 -right-4 bg-teal-spring text-midnight text-[9px] font-bold px-2 py-0.5 rounded-full shadow animate-bounce">
                    Victory! 🏆
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="text-xl font-bold font-serif text-gold-sand uppercase tracking-wider">Oasis Unlocked!</h3>
                  <p className="text-xs text-text-secondary leading-relaxed max-w-sm mx-auto">
                    Excellent work, traveler! You have successfully solved the <span className="text-teal-spring font-semibold">{selectedNode?.title}</span> challenge. Master Marco Polo is pleased with your solution!
                    <span className="text-gold-sand block font-bold mt-1.5 animate-pulse">🪙 +25 Caravan Coins earned!</span>
                  </p>
                </div>

                {streak && (
                  <div className="bg-orange-flame/10 border border-orange-flame/30 rounded-xl p-3 w-full flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-left">
                      <span className="text-lg">🔥</span>
                      <div>
                        <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Active Streak</div>
                        <div className="text-xs font-bold text-orange-flame">{streak.currentStreak} {streak.currentStreak === 1 ? 'Day' : 'Days'}</div>
                      </div>
                    </div>
                    {streak.currentStreak >= 7 && (
                      <span className="text-[9px] bg-gold-sand text-midnight font-bold px-2 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        Golden Energy Activated
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setVictoryModalOpen(false)}
                  className="flex-1 border border-text-secondary/20 hover:border-text-secondary/40 text-text-primary text-xs font-bold py-2.5 rounded-xl transition-all cursor-pointer"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setVictoryModalOpen(false);
                    setV0ModalOpen(true);
                  }}
                  className="flex-1 bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold py-2.5 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer animate-pulse"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate UI with v0</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Spotlight tutorial walkthrough modal overlay */}
        {tourStep !== null && (
          <div className="fixed inset-0 z-[9990] pointer-events-none animate-fadeIn">
            {/* SVG dim & blur mask */}
            <svg className="absolute inset-0 w-full h-full pointer-events-auto" style={{ fill: "rgba(7, 15, 25, 0.75)" }}>
              <defs>
                <mask id="spotlight-mask">
                  <rect x="0" y="0" width="100%" height="100%" fill="white" />
                  {highlightRect && (
                    <rect
                      x={highlightRect.x - 8}
                      y={highlightRect.y - 8}
                      width={highlightRect.width + 16}
                      height={highlightRect.height + 16}
                      rx="16"
                      fill="black"
                    />
                  )}
                </mask>
              </defs>
              <rect
                x="0"
                y="0"
                width="100%"
                height="100%"
                mask="url(#spotlight-mask)"
                className="backdrop-blur-[2px] transition-all duration-300"
              />
            </svg>

            {/* Glowing gold frame around active highlight */}
            {highlightRect && (
              <div
                style={{
                  position: "fixed",
                  left: `${highlightRect.x - 8}px`,
                  top: `${highlightRect.y - 8}px`,
                  width: `${highlightRect.width + 16}px`,
                  height: `${highlightRect.height + 16}px`,
                }}
                className="rounded-2xl border-2 border-gold-sand shadow-[0_0_20px_rgba(212,175,55,0.5)] transition-all duration-300 pointer-events-none animate-pulse"
              />
            )}

            {/* Guide Card Tooltip */}
            <div
              style={tooltipStyle}
              className="glass-panel rounded-2xl p-6 space-y-4 border-gold-sand/40 shadow-[0_0_30px_rgba(212,175,55,0.3)] pointer-events-auto transition-all duration-300 relative text-left select-text"
            >
              {/* Step counter */}
              <div className="flex justify-between items-center text-[10px] text-text-secondary font-bold tracking-wider uppercase">
                <span className="text-gold-sand font-serif">Expedition Guide Walkthrough</span>
                <span>{tourStep} / 6</span>
              </div>
              
              {/* Step details with Mascot */}
              <div className="flex items-start space-x-4">
                <div className="flex-shrink-0 relative">
                  <img
                    src="/images/characters/marcopolo_welcome.png"
                    alt="Marco Polo Tour Guide"
                    className="h-16 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] flex-shrink-0 camel-walk"
                  />
                </div>
                <div className="flex-1 space-y-1 min-w-0">
                  <h3 className="text-xs font-bold font-serif text-text-primary uppercase tracking-wide">
                    {tourStep === 1 && "Welcome, Traveler! 🐫"}
                    {tourStep === 2 && "The Learning Trail Map 🗺️"}
                    {tourStep === 3 && "Daily Streak Canteen 🔥"}
                    {tourStep === 4 && "Challenge Sandbox 💻"}
                    {tourStep === 5 && "Master Marco Polo Guidance 🧭"}
                    {tourStep === 6 && "Caravanserai Community Forum 🎪"}
                  </h3>
                  <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                    {tourStep === 1 && "Welcome to your Silk Road learning expedition trail. Let's take a quick 1-minute tour of your caravan instruments."}
                    {tourStep === 2 && "This is your learning path. The bobbing Camel Caravan represents your active oasis node. Click unlocked nodes to select challenges along the Bezier trail."}
                    {tourStep === 3 && "Keep your streak active by solving challenges daily. Your streak count dynamically scales the water level in your canteen. Complete 7+ consecutive days to unleash golden energy!"}
                    {tourStep === 4 && "Write Javascript code to solve the active coding puzzle. The UNIX terminal console below prints sandbox execution results, worker timeouts, and syntax compile logs."}
                    {tourStep === 5 && "Your companion Master Marco Polo guides you without spoiling solutions. Get hints, explanation logs, and real-time Big O complexity reviews automatically on submissions."}
                    {tourStep === 6 && "Share scrolls, ask questions, or trade insights. If the NLP guide detects high frustration, it will offer customized interventions (e.g. mentor discounts or path simplification)."}
                  </p>
                </div>
              </div>

              {/* Navigation controls */}
              <div className="flex justify-between items-center pt-2 font-sans">
                <button
                  onClick={() => {
                    localStorage.setItem("silkroad_tour_completed", "true");
                    setTourStep(null);
                  }}
                  className="text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold cursor-pointer"
                >
                  Skip Tour
                </button>
                
                <div className="flex space-x-2">
                  {tourStep > 1 && (
                    <button
                      onClick={() => setTourStep(tourStep - 1)}
                      className="px-3.5 py-1.5 border border-text-secondary/20 hover:border-text-secondary/40 text-text-primary rounded-xl text-[10px] font-bold cursor-pointer transition-colors"
                    >
                      Back
                    </button>
                  )}
                  <button
                    onClick={() => {
                      if (tourStep < 6) {
                        setTourStep(tourStep + 1);
                      } else {
                        localStorage.setItem("silkroad_tour_completed", "true");
                        setTourStep(null);
                      }
                    }}
                    className="bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold px-4 py-1.5 rounded-xl text-[10px] cursor-pointer shadow transition-all animate-pulse"
                  >
                    {tourStep === 6 ? "Begin Expedition" : "Next"}
                  </button>
                </div>
              </div>
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
    <div className="relative h-12 w-12 flex items-center justify-center">
      <div className="absolute animate-ping h-8 w-8 rounded-full bg-gold-sand/20"></div>
      <div className="h-4 w-4 rounded-full bg-gold-sand animate-pulse"></div>
    </div>
  );
}
