"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, Award, Terminal, ArrowRight, Loader, Send, RefreshCw, AlertTriangle, CheckCircle2, Mail, Lock } from "lucide-react";
import confetti from "canvas-confetti";
import { Logo } from "@/components/ui/Logo";

export default function Onboarding() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [isEmailSubmitted, setIsEmailSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inputMessage, setInputMessage] = useState("");
  const [chatHistory, setChatHistory] = useState<{ role: "assistant" | "user"; content: string }[]>([]);
  const [error, setError] = useState("");
  
  // OTP Auth States
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState("");
  const [mockOtp, setMockOtp] = useState<string | null>(null);
  const [countdown, setCountdown] = useState(0);
  const [cooldownCountdown, setCooldownCountdown] = useState(0);

  // UI / UX States
  const [mascotPose, setMascotPose] = useState<"welcome" | "thinking" | "concerned" | "celebrating">("welcome");
  const [usingFallback, setUsingFallback] = useState(false);

  // Pre-fill email from localStorage on mount & check for existing session
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("silkroad_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
      
      const savedUserId = localStorage.getItem("silkroad_userid");
      const savedRoadmapId = localStorage.getItem("silkroad_roadmapid");
      if (savedUserId && savedRoadmapId) {
        router.push("/dashboard");
      } else {
        localStorage.removeItem("silkroad_tour_completed");
        if (savedUserId && savedEmail) {
          // Auto-initialize returning session
          handleStartOnboarding(undefined, false, savedEmail);
        }
      }
    }
  }, [router]);

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  // Cooldown countdown timer
  useEffect(() => {
    if (cooldownCountdown > 0) {
      const timer = setTimeout(() => setCooldownCountdown(cooldownCountdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldownCountdown]);
  
  // Roadmap result details
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

  // Dynamic mascot reactions
  useEffect(() => {
    if (onboardingComplete) {
      setMascotPose("celebrating");
    } else if (error) {
      setMascotPose("concerned");
    } else if (loading) {
      setMascotPose("thinking");
    } else {
      setMascotPose("welcome");
    }
  }, [loading, error, onboardingComplete]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const triggerConfetti = () => {
    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.6 },
      colors: ["#D4AF37", "#00A896", "#F26419"],
    });
  };

  // Scroll chat list to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatHistory]);

  const validateEmail = (val: string) => {
    if (!val) {
      setEmailError("");
      return false;
    }
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!regex.test(val)) {
      setEmailError("Please enter a valid email address.");
      return false;
    }
    setEmailError("");
    return true;
  };

  const handleEmailChange = (val: string) => {
    setEmail(val);
    validateEmail(val);
  };

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!email.trim() || !validateEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setLoading(true);
    setError("");
    setMockOtp(null);

    try {
      const response = await fetch("/api/auth/otp/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 429) {
          const match = data.error?.match(/wait (\d+) seconds/i);
          const secs = match ? parseInt(match[1], 10) : 30;
          setCooldownCountdown(secs);
        }
        throw new Error(data.error || "Failed to send verification code.");
      }

      setIsOtpSent(true);
      setCountdown(60);
      if (data.mock && data.mockOtp) {
        setMockOtp(data.mockOtp);
      }
    } catch (err: any) {
      setError(err.message || "Failed to send code.");
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode.trim() || otpCode.length !== 6) {
      setError("Please enter the 6-digit verification code.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/otp/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, token: otpCode }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Verification failed.");
      }

      if (typeof window !== "undefined") {
        localStorage.setItem("silkroad_userid", data.user.id);
        localStorage.setItem("silkroad_email", email);
        localStorage.removeItem("silkroad_tour_completed");
      }

      // Success! Proceed to initialize onboarding chat
      await handleStartOnboarding();
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setLoading(false);
    }
  };

  const handleStartOnboarding = async (e?: React.FormEvent, isRestart = false, overrideEmail?: string) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    const activeEmail = overrideEmail || email;
    if (!activeEmail.trim()) {
      setError("Please enter a traveler email address.");
      return;
    }
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: activeEmail,
          message: "",
          restart: isRestart,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize onboarding.");
      }

      setChatHistory(data.chatHistory || []);
      setUsingFallback(!!data.usingFallback);
      setIsEmailSubmitted(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("silkroad_email", activeEmail);
      }
      
      if (data.onboardingComplete) {
        if (typeof window !== "undefined") {
          localStorage.setItem("silkroad_userid", data.userId);
          localStorage.setItem("silkroad_roadmapid", data.roadmapId);
          localStorage.setItem("silkroad_email", activeEmail);
          localStorage.removeItem("silkroad_tour_completed");
        }
        
        if (!isRestart) {
          // If they already completed onboarding, bypass completion screen and route straight to dashboard
          router.push("/dashboard");
        } else {
          setOnboardingComplete(true);
          setGeneratedRoadmap(data.roadmap);
          triggerConfetti();
        }
      }
    } catch (err: any) {
      setError(err.message || "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const submitMessage = async (messageText: string) => {
    if (!messageText.trim() || loading) return;
    
    setLoading(true);
    setError("");

    // optimistic update
    setChatHistory(prev => [...prev, { role: "user", content: messageText }]);

    try {
      const response = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          message: messageText,
          restart: false,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to post message.");
      }

      setChatHistory(data.chatHistory || []);
      setUsingFallback(!!data.usingFallback);
      if (data.onboardingComplete) {
        setOnboardingComplete(true);
        setGeneratedRoadmap(data.roadmap);
        if (typeof window !== "undefined") {
          localStorage.setItem("silkroad_userid", data.userId);
          localStorage.setItem("silkroad_roadmapid", data.roadmapId);
          localStorage.setItem("silkroad_email", email);
          localStorage.removeItem("silkroad_tour_completed");
          triggerConfetti();
        }
      }
    } catch (err: any) {
      setError(err.message || "Failed to submit response.");
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputMessage.trim() || loading) return;
    const msg = inputMessage;
    setInputMessage("");
    await submitMessage(msg);
  };

  const getSuggestionChips = () => {
    const userMsgsCount = chatHistory.filter((m) => m.role === "user").length;
    if (userMsgsCount === 0) {
      return [
        "Frontend Engineer 💻",
        "Backend Engineer ⚙️",
        "Fullstack Developer 🚀",
        "DevOps Specialist ☁️",
        "AI/ML Engineer 🧠"
      ];
    }
    if (userMsgsCount === 1) {
      return [
        "Novice Traveler (Beginner) 🐣",
        "Caravan Merchant (Intermediate) 🐫",
        "Expedition Master (Advanced) 🛡️"
      ];
    }
    if (userMsgsCount === 2) {
      return [
        "Next.js, React, Tailwind CSS",
        "PostgreSQL, Databases, APIs",
        "AWS, Cloud Deployments, Docker",
        "AI Tools, Python, LLMs"
      ];
    }
    if (userMsgsCount === 3) {
      return [
        "Build SaaS projects & scale apps",
        "Pass technical coding interviews",
        "Learn modern backend structures",
        "Deploy Serverless systems"
      ];
    }
    return [];
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-midnight py-12 px-4 sm:px-6 lg:px-8 relative overflow-hidden select-none">
      
      {/* Decorative Blur elements */}
      <div className="absolute top-10 left-10 w-32 h-32 bg-teal-spring/5 rounded-full filter blur-3xl pointer-events-none"></div>
      <div className="absolute bottom-10 right-10 w-48 h-48 bg-gold-sand/5 rounded-full filter blur-3xl pointer-events-none"></div>

      <div className="max-w-2xl w-full space-y-6 glass-panel rounded-2xl p-6 sm:p-8 premium-glow relative z-10">
        
        {/* Title Header */}
        <div className="text-center border-b border-gold-sand/15 pb-4 flex flex-col items-center">
          <Logo size="lg" showText={false} className="mb-2 animate-pulse" />
          <h2 className="text-2xl font-bold font-serif tracking-wider text-gold-sand uppercase">
            SILK ROAD EXPEDITION
          </h2>
          <p className="mt-1 text-xs text-text-secondary">
            Chart your personalized AI software engineering trail. Conversational Onboarding.
          </p>
        </div>

        {error && (
          <div className="bg-orange-flame/10 border border-orange-flame/30 text-orange-flame px-4 py-3 rounded-lg text-xs text-center animate-fadeIn flex items-center justify-center space-x-2">
            <AlertTriangle className="h-4 w-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* STEP 1: Enter email or Verify OTP */}
        {!isEmailSubmitted ? (
          !isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="flex flex-col items-center justify-center text-center animate-fadeIn">
                <img
                  src={`/images/characters/marcopolo_${mascotPose}.png`}
                  alt="Marco Polo Mascot"
                  className="h-28 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.45)] camel-walk mb-2 transition-all duration-500"
                />
                <h3 className="text-base font-semibold font-serif text-text-primary">Who is embarking on this journey?</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1">
                  Provide your email to initialize your traveler record and sync progress profiles.
                </p>
              </div>

              {cooldownCountdown > 0 && (
                <div className="bg-orange-flame/10 border border-orange-flame/20 text-orange-flame p-3 rounded-lg text-xs text-center animate-fadeIn flex items-center justify-center space-x-2">
                  <AlertTriangle className="h-4 w-4 animate-pulse" />
                  <span>OTP dispatch rate limited. Cooldown active: <strong>{cooldownCountdown}s</strong></span>
                </div>
              )}
              
              <div className="mt-2 space-y-3">
                <div className="relative flex items-center">
                  <span className="absolute left-3.5 text-text-secondary/50">
                    <Mail className="h-4 w-4" />
                  </span>
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => handleEmailChange(e.target.value)}
                    placeholder="Enter your traveler email address..."
                    className={`w-full bg-midnight border rounded-xl pl-10 pr-10 py-3.5 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:ring-1 transition-all text-sm ${
                      emailError
                        ? "border-orange-flame/50 focus:border-orange-flame focus:ring-orange-flame"
                        : email && !emailError
                        ? "border-teal-spring/50 focus:border-teal-spring focus:ring-teal-spring"
                        : "border-gold-sand/20 focus:border-gold-sand/80 focus:ring-gold-sand"
                    }`}
                  />
                  {email && (
                    <span className="absolute right-3.5">
                      {emailError ? (
                        <AlertTriangle className="h-4 w-4 text-orange-flame animate-pulse" />
                      ) : (
                        <CheckCircle2 className="h-4 w-4 text-teal-spring" />
                      )}
                    </span>
                  )}
                </div>
                {emailError && (
                  <p className="text-[10px] text-orange-flame pl-1.5 animate-fadeIn">{emailError}</p>
                )}
                
                <button
                  type="submit"
                  disabled={loading || !email.trim() || !!emailError || cooldownCountdown > 0}
                  className="w-full bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-40 disabled:cursor-not-allowed text-midnight font-bold py-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-sm shadow-md cursor-pointer hover:shadow-lg font-serif tracking-wider"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <span>Start Journey</span>}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fadeIn">
              <div className="flex flex-col items-center justify-center text-center">
                <img
                  src={`/images/characters/marcopolo_${mascotPose}.png`}
                  alt="Marco Polo Mascot"
                  className="h-28 w-auto object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.45)] camel-walk mb-2 transition-all duration-500"
                />
                <h3 className="text-base font-semibold font-serif text-text-primary">Enter Verification Code</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto mt-1">
                  We've sent a 6-digit one-time code to <strong className="text-gold-sand">{email}</strong>.
                </p>
              </div>
              
              <div className="space-y-4">
                {/* Custom blink and caret styling injected */}
                <style>{`
                  @keyframes pin-blink {
                    50% { opacity: 0; }
                  }
                  .animate-blink {
                    animation: pin-blink 1s step-end infinite;
                  }
                `}</style>
                
                <div className="relative max-w-[280px] mx-auto py-2">
                  {/* Invisible real input overlay */}
                  <input
                    type="text"
                    maxLength={6}
                    pattern="\d*"
                    inputMode="numeric"
                    required
                    value={otpCode}
                    onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-default z-20"
                    autoFocus
                  />
                  {/* Styled Segmented PIN Boxes */}
                  <div className="flex justify-between gap-2.5 relative z-10 pointer-events-none">
                    {Array.from({ length: 6 }).map((_, idx) => {
                      const char = otpCode[idx] || "";
                      const isFocused = otpCode.length === idx;
                      const isFilled = char !== "";
                      return (
                        <div
                          key={idx}
                          className={`w-10 h-12 rounded-xl flex items-center justify-center text-lg font-bold font-mono transition-all duration-300 border bg-midnight/80 ${
                            isFocused
                              ? "border-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.3)] scale-105 animate-pulse"
                              : isFilled
                              ? "border-teal-spring text-teal-spring shadow-[0_0_8px_rgba(0,168,150,0.2)]"
                              : "border-gold-sand/15 text-text-secondary"
                          }`}
                        >
                          {char ? (
                            char
                          ) : isFocused ? (
                            <span className="w-0.5 h-5 bg-gold-sand animate-blink" />
                          ) : (
                            <span className="text-gold-sand/20 font-sans text-xs">•</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>

                {mockOtp && (
                  <div className="bg-teal-spring/10 border border-teal-spring/20 text-teal-spring text-[10px] p-2.5 rounded-lg text-center max-w-xs mx-auto animate-fadeIn flex flex-col items-center space-y-1.5">
                    <span>Developer Sandbox: Mock email code sent.</span>
                    <button
                      type="button"
                      onClick={() => setOtpCode(mockOtp)}
                      className="bg-teal-spring/20 hover:bg-teal-spring/30 text-teal-spring font-bold px-3 py-1 rounded text-[9px] transition-all cursor-pointer border border-teal-spring/30"
                    >
                      Autofill code: {mockOtp}
                    </button>
                  </div>
                )}

                <div className="flex flex-col items-center space-y-3 pt-2">
                  <button
                    type="submit"
                    disabled={loading || otpCode.length !== 6}
                    className="w-full sm:w-auto min-w-[220px] bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 text-midnight font-bold px-6 py-3.5 rounded-xl flex items-center justify-center space-x-1.5 transition-all text-sm shadow-md cursor-pointer hover:shadow-lg font-serif"
                  >
                    {loading ? <Loader className="h-4 w-4 animate-spin" /> : <span>Verify & Start Onboarding</span>}
                  </button>

                  <div className="text-[10px] text-text-secondary">
                    {countdown > 0 ? (
                      <span>Resend code in {countdown}s</span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleSendOtp()}
                        className="text-gold-sand hover:underline font-semibold cursor-pointer"
                      >
                        Resend Code
                      </button>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      setIsOtpSent(false);
                      setOtpCode("");
                      setMockOtp(null);
                    }}
                    className="text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold tracking-wider cursor-pointer"
                  >
                    Change email address
                  </button>
                </div>
              </div>
            </form>
          )
        ) : (
          /* STEP 2: Chat Onboarding interface */
          <div className={`space-y-4 flex flex-col justify-between ${onboardingComplete ? "h-auto" : "h-[420px]"}`}>
            
            {/* Completion Screen milestones */}
            {onboardingComplete && generatedRoadmap ? (
              <div className="space-y-5 flex-1 flex flex-col justify-center animate-fadeIn select-text">
                <div className="text-center space-y-2">
                  <img
                    src="/images/characters/marcopolo_celebrating.png"
                    alt="Marco Polo Mascot"
                    className="h-28 w-auto mx-auto object-contain filter drop-shadow-[0_0_15px_rgba(212,175,55,0.45)] camel-walk mb-2"
                  />
                  <h3 className="text-lg font-bold font-serif text-gold-sand uppercase tracking-wider">{generatedRoadmap.title}</h3>
                  <p className="text-xs text-text-secondary px-6 leading-relaxed">{generatedRoadmap.description}</p>
                </div>

                <div className="space-y-2.5">
                  <h4 className="text-[10px] font-bold text-text-primary tracking-wider uppercase border-b border-text-secondary/10 pb-1">
                    Your Caravan Milestones
                  </h4>
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {generatedRoadmap.nodes.map((node: any, idx: number) => (
                      <div key={node.id} className="flex items-center justify-between p-2.5 rounded-lg bg-indigo-oasis/40 border border-text-secondary/10">
                        <div className="flex items-center space-x-2.5">
                          <span className="flex items-center justify-center h-5 w-5 rounded-full bg-gold-sand/15 text-gold-sand text-[10px] font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <div className="text-xs font-semibold text-text-primary">{node.title}</div>
                            <div className="text-[9px] text-text-secondary line-clamp-1">{node.description}</div>
                          </div>
                        </div>
                        <span className="text-[8px] uppercase font-bold text-teal-spring bg-teal-spring/10 px-2 py-0.5 rounded">
                          {node.difficulty}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => router.push("/dashboard")}
                  className="w-full flex items-center justify-center space-x-2 bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold py-3 px-4 rounded-xl transition-all shadow-[0_0_15px_rgba(212,175,55,0.25)] hover:shadow-[0_0_25px_rgba(212,175,55,0.4)] cursor-pointer text-sm"
                >
                  <span>Begin learning trail</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            ) : (
              /* Chat log message feed */
              <div className="flex-1 flex flex-col justify-between min-h-0">
                {usingFallback && (
                  <div className="mb-3 p-3 rounded-xl bg-orange-flame/10 border border-orange-flame/25 text-orange-flame text-[10px] leading-relaxed flex items-start space-x-2.5 animate-fadeIn">
                    <AlertTriangle className="h-4 w-4 flex-shrink-0 animate-pulse text-orange-flame mt-0.5" />
                    <div>
                      <strong className="font-bold">Sandstorm Warning:</strong> Master Marco Polo is navigating heavy sandstorms (API Rate Limit). Star-maps guidelines are loaded for instant roadmap alignment.
                    </div>
                  </div>
                )}

                <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4 select-text">
                  {chatHistory.length <= 1 && (
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-indigo-oasis/40 border border-gold-sand/15 mb-4 animate-fadeIn space-y-2 text-center">
                      <img
                        src={`/images/characters/marcopolo_${mascotPose}.png`}
                        alt="Marco Polo Mascot"
                        className="h-28 w-auto object-contain filter drop-shadow-[0_0_12px_rgba(212,175,55,0.45)] camel-walk"
                      />
                      <p className="text-[10px] text-text-secondary max-w-xs font-sans">
                        Master Marco Polo will ask you a few questions to chart your personalized learning trail.
                      </p>
                    </div>
                  )}
                  {chatHistory.map((msg, index) => {
                    const isAssistant = msg.role === "assistant";
                    return (
                      <div
                        key={index}
                        className={`flex items-start space-x-2 ${isAssistant ? "justify-start" : "justify-end"}`}
                      >
                        {isAssistant && (
                          <img
                            src="/marcopolo-avatar.png"
                            alt="Marco Polo"
                            className="flex-shrink-0 h-7 w-7 rounded-full object-cover border border-gold-sand/40"
                          />
                        )}
                        <div
                          className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed relative ${
                            isAssistant
                              ? "speech-pointer-left bg-midnight/60 border border-gold-sand/10 text-text-primary rounded-tl-none"
                              : "speech-pointer-right bg-gold-sand text-midnight font-semibold rounded-tr-none shadow-sm"
                          }`}
                        >
                          {msg.content}
                        </div>
                        {!isAssistant && (
                          <div className="flex-shrink-0 h-7 w-7 rounded-full bg-teal-spring/20 border border-teal-spring/40 flex items-center justify-center text-teal-spring font-bold text-[10px] shadow-[0_0_10px_rgba(0,168,150,0.15)]">
                            ME
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {loading && (
                    <div className="flex items-start space-x-2">
                      <img
                        src="/marcopolo-avatar.png"
                        alt="Marco Polo"
                        className="flex-shrink-0 h-7 w-7 rounded-full object-cover border border-gold-sand/40 animate-pulse"
                      />
                      <div className="bg-midnight/60 border border-gold-sand/10 text-text-secondary rounded-xl rounded-tl-none px-3.5 py-2.5 text-[10px] italic flex items-center space-x-1.5 animate-pulse relative speech-pointer-left">
                        <Loader className="h-3 w-3 animate-spin text-gold-sand" />
                        <span>Master Marco Polo is checking details...</span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Suggestion Chips */}
                {!loading && getSuggestionChips().length > 0 && (
                  <div className="flex flex-wrap gap-2 pb-3 justify-center animate-fadeIn">
                    {getSuggestionChips().map((chip, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => submitMessage(chip)}
                        className="px-3 py-1.5 rounded-full bg-indigo-oasis/40 hover:bg-gold-sand/15 border border-gold-sand/20 hover:border-gold-sand/45 text-gold-sand hover:text-text-primary text-[10px] transition-all duration-300 backdrop-blur-md shadow-sm hover:-translate-y-0.5 cursor-pointer font-medium"
                      >
                        {chip}
                      </button>
                    ))}
                  </div>
                )}

                {/* Input form */}
                <div className="flex items-center justify-between border-t border-text-secondary/10 pt-3">
                  <button
                    type="button"
                    onClick={(e) => handleStartOnboarding(e, true)}
                    className="flex items-center space-x-1 text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold cursor-pointer"
                  >
                    <RefreshCw className="h-3 w-3" />
                    <span>Restart Chat</span>
                  </button>

                  <form onSubmit={handleSendMessage} className="flex-1 flex items-center space-x-2 ml-4">
                    <input
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      placeholder="Type your response to Master Marco Polo..."
                      className="flex-grow bg-midnight border border-gold-sand/15 rounded-xl px-4 py-2 text-xs text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-gold-sand/50 transition-colors"
                      disabled={loading}
                    />
                    <button
                      type="submit"
                      disabled={!inputMessage.trim() || loading}
                      className="p-2 bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 text-midnight rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
                    >
                      <Send className="h-4 w-4" />
                    </button>
                  </form>
                </div>

              </div>
            )}

          </div>
        )}

      </div>
    </div>
  );
}
