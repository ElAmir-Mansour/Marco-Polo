"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, Award, Terminal, ArrowRight, Loader, Send, RefreshCw } from "lucide-react";
import confetti from "canvas-confetti";
import { Logo } from "@/components/ui/Logo";

export default function Onboarding() {
  const router = useRouter();
  const [email, setEmail] = useState("");
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

  // Pre-fill email from localStorage on mount
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedEmail = localStorage.getItem("silkroad_email");
      if (savedEmail) {
        setEmail(savedEmail);
      }
    }
  }, []);

  // OTP Countdown timer
  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);
  
  // Roadmap result details
  const [generatedRoadmap, setGeneratedRoadmap] = useState<any>(null);
  const [onboardingComplete, setOnboardingComplete] = useState(false);

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

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!email.trim() || !email.includes("@")) {
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
      }

      // Success! Proceed to initialize onboarding chat
      await handleStartOnboarding();
    } catch (err: any) {
      setError(err.message || "Verification failed.");
      setLoading(false);
    }
  };

  const handleStartOnboarding = async (e?: React.FormEvent, isRestart = false) => {
    if (e && typeof e.preventDefault === "function") e.preventDefault();
    if (!email.trim()) {
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
          email,
          message: "",
          restart: isRestart,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to initialize onboarding.");
      }

      setChatHistory(data.chatHistory || []);
      setIsEmailSubmitted(true);
      if (typeof window !== "undefined") {
        localStorage.setItem("silkroad_email", email);
      }
      
      if (data.onboardingComplete) {
        setOnboardingComplete(true);
        setGeneratedRoadmap(data.roadmap);
        if (typeof window !== "undefined") {
          localStorage.setItem("silkroad_userid", data.userId);
          localStorage.setItem("silkroad_roadmapid", data.roadmapId);
          localStorage.setItem("silkroad_email", email);
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
      if (data.onboardingComplete) {
        setOnboardingComplete(true);
        setGeneratedRoadmap(data.roadmap);
        if (typeof window !== "undefined") {
          localStorage.setItem("silkroad_userid", data.userId);
          localStorage.setItem("silkroad_roadmapid", data.roadmapId);
          localStorage.setItem("silkroad_email", email);
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
          <div className="bg-orange-flame/10 border border-orange-flame/30 text-orange-flame px-4 py-3 rounded-lg text-xs text-center animate-fadeIn">
            {error}
          </div>
        )}

        {/* STEP 1: Enter email or Verify OTP */}
        {!isEmailSubmitted ? (
          !isOtpSent ? (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <div className="text-center space-y-2">
                <h3 className="text-base font-medium text-text-primary">Who is embarking on this journey?</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  Provide your email to initialize your traveler record and sync progress profiles.
                </p>
              </div>
              
              <div className="mt-2 flex flex-col sm:flex-row gap-2">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Enter your traveler email address..."
                  className="flex-1 bg-midnight border border-gold-sand/20 rounded-lg px-4 py-3 text-text-primary placeholder-text-secondary/50 focus:outline-none focus:border-gold-sand/80 transition-colors text-sm"
                />
                <button
                  type="submit"
                  disabled={loading}
                  className="bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 text-midnight font-bold px-6 py-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all text-sm shadow-md cursor-pointer"
                >
                  {loading ? <Loader className="h-4 w-4 animate-spin" /> : <span>Start Journey</span>}
                  <ArrowRight className="h-4 w-4" />
                </button>
              </div>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-6 animate-fadeIn">
              <div className="text-center space-y-2">
                <h3 className="text-base font-medium text-text-primary">Enter Verification Code</h3>
                <p className="text-xs text-text-secondary max-w-sm mx-auto">
                  We've sent a 6-digit one-time code to <strong className="text-gold-sand">{email}</strong>.
                </p>
              </div>
              
              <div className="space-y-4">
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ""))}
                  placeholder="000000"
                  className="bg-midnight border border-gold-sand/25 rounded-lg py-3 text-center text-gold-sand font-mono font-bold tracking-[0.75em] text-xl focus:outline-none focus:border-gold-sand focus:ring-1 focus:ring-gold-sand max-w-[220px] mx-auto block shadow-inner"
                />

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
                    className="w-full sm:w-auto min-w-[200px] bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 text-midnight font-bold px-6 py-3 rounded-lg flex items-center justify-center space-x-1.5 transition-all text-sm shadow-md cursor-pointer"
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
          <div className="space-y-4 flex flex-col h-[420px] justify-between">
            
            {/* Completion Screen milestones */}
            {onboardingComplete && generatedRoadmap ? (
              <div className="space-y-5 flex-1 flex flex-col justify-center animate-fadeIn select-text">
                <div className="text-center space-y-2">
                  <img
                    src="/images/characters/marcopolo_welcome.png"
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
                <div className="flex-1 overflow-y-auto pr-1 space-y-3 mb-4 select-text">
                  {chatHistory.length <= 1 && (
                    <div className="flex flex-col items-center justify-center p-4 rounded-xl bg-indigo-oasis/40 border border-gold-sand/15 mb-4 animate-fadeIn space-y-2 text-center">
                      <img
                        src="/images/characters/marcopolo_welcome.png"
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
