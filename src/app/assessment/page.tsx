"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Compass, Award, Sparkles, Clock, ArrowLeft, CheckCircle2, Flame, Brain, LayoutGrid, RotateCcw, ArrowRight, Loader } from "lucide-react";
import { Logo } from "@/components/ui/Logo";

interface SubSkills {
  syntax: number;
  logic: number;
  concepts: number;
  optimization: number;
}

interface Assessment {
  id: string;
  userId: string;
  trackId: string;
  score: number;
  percentile: number;
  subSkills: SubSkills;
  createdAt: string;
}

interface Question {
  id: string;
  question: string;
  options: string[];
  answerIndex: number;
  difficulty: "beginner" | "intermediate" | "advanced";
  subSkill: keyof SubSkills;
  points: number;
}

// 5 Diagnostic adaptive questions per track
const TRACK_QUESTIONS: Record<string, Question[]> = {
  javascript: [
    {
      id: "js-1",
      question: "Which of the following correctly describes lexical scoping and closure binding variables in JavaScript?",
      options: [
        "Closures copy values of outer scope variables at execution time.",
        "Closures maintain references to the active lexical environment scope variables.",
        "Closures only access block-scoped variables, not function-scoped variables.",
        "Closures bypass scope chains using execution execution registers."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "concepts",
      points: 40
    },
    {
      id: "js-2",
      question: "What is the output of: console.log(typeof null); console.log(null instanceof Object)?",
      options: [
        "'null' and true",
        "'object' and false",
        "'undefined' and false",
        "'object' and true"
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "syntax",
      points: 40
    },
    {
      id: "js-3",
      question: "Analyze event loops: in what order do microtasks (Promises) and macrotasks (setTimeout) execute relative to main stack code?",
      options: [
        "Main Stack -> Macrotasks -> Microtasks",
        "Main Stack -> Microtasks -> Macrotasks",
        "Microtasks -> Main Stack -> Macrotasks",
        "Macrotasks -> Microtasks -> Main Stack"
      ],
      answerIndex: 1,
      difficulty: "intermediate",
      subSkill: "logic",
      points: 60
    },
    {
      id: "js-4",
      question: "Which garbage collection mechanism is utilized by V8/modern JS engines to clean memory cycles?",
      options: [
        "Reference Counting alone",
        "Mark-and-Sweep tracing algorithm",
        "Deterministic stack-unwinding cleanup",
        "Manual heap deallocation callbacks"
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "optimization",
      points: 80
    },
    {
      id: "js-5",
      question: "What is the difference between a Map object and a plain JavaScript object?",
      options: [
        "Objects support any type of key; Maps only support strings.",
        "Maps preserve insertion order of keys and support any data types as keys.",
        "Objects are faster than Maps for all read/write lookup dimensions.",
        "Maps undergo strict immutable freezing; Objects are mutable."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "concepts",
      points: 80
    }
  ],
  postgresql: [
    {
      id: "pg-1",
      question: "Which index type is PostgreSQL's default, and how is it optimized?",
      options: [
        "Hash Index, optimized for range sorting queries.",
        "B-Tree Index, optimized for sorting, ranges, and equality matches.",
        "GIN Index, optimized for pattern matching searches.",
        "BRIN Index, optimized for high cardinality random lookup fields."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "concepts",
      points: 40
    },
    {
      id: "pg-2",
      question: "What is the difference between TRUNCATE and DELETE in PostgreSQL?",
      options: [
        "DELETE triggers are not fired; TRUNCATE fires all constraints.",
        "TRUNCATE is a DDL operation that claims immediate disk locks; DELETE is DML.",
        "DELETE resets auto-increment serial variables; TRUNCATE preserves them.",
        "TRUNCATE deletes rows row-by-row; DELETE removes pages."
      ],
      answerIndex: 1,
      difficulty: "intermediate",
      subSkill: "syntax",
      points: 50
    },
    {
      id: "pg-3",
      question: "Which isolation level prevents Phantom Reads under PostgreSQL concurrency standards?",
      options: [
        "Read Committed",
        "Serializable",
        "Repeatable Read",
        "Read Uncommitted"
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "logic",
      points: 70
    },
    {
      id: "pg-4",
      question: "How does MVCC (Multi-Version Concurrency Control) handle database updates in PostgreSQL?",
      options: [
        "By placing exclusive write blocks on the table rows.",
        "By creating a new version of the row tuple (marking old as dead).",
        "By buffering database updates inside active Redis transaction streams.",
        "By merging incremental changes inside a virtual heap page."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "optimization",
      points: 70
    },
    {
      id: "pg-5",
      question: "When should you prefer a GIN index over a B-Tree index in PostgreSQL tables?",
      options: [
        "When indexing standard serial primary keys.",
        "When indexing composite JSONB documents or array data structures.",
        "When indexing timestamp tracking fields for chronological sorting.",
        "When indexing highly unique UUID text rows."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "optimization",
      points: 70
    }
  ],
  react: [
    {
      id: "react-1",
      question: "What does React's virtual DOM reconciliation commit phase do?",
      options: [
        "Re-renders all elements from root to leaf node structures.",
        "Applies minimal calculated layout diff updates to the actual browser DOM.",
        "Compiles JS scripts into high-performance web assembly binaries.",
        "Synchronizes React states back into Postgres local memory tables."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "concepts",
      points: 40
    },
    {
      id: "react-2",
      question: "What happens if you omit the dependency array in a useEffect hook?",
      options: [
        "The effect runs exactly once when the component mounts.",
        "The effect runs on every single render cycle of the component.",
        "React compiler throws a syntax evaluation error.",
        "The effect is garbage collected and never executed."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "syntax",
      points: 40
    },
    {
      id: "react-3",
      question: "When should you wrap functions inside useCallback hooks?",
      options: [
        "To prevent execution of async fetch processes on renders.",
        "To maintain reference equality of callbacks passed to memoized children.",
        "To speed up normal execution performance of simple math logic.",
        "To bind variables to external worker threads."
      ],
      answerIndex: 1,
      difficulty: "intermediate",
      subSkill: "optimization",
      points: 60
    },
    {
      id: "react-4",
      question: "How does React 18 Concurrent Mode schedule render tasks?",
      options: [
        "Using synchronous blocking thread execution pools.",
        "Using interruptible render loops prioritised via Scheduler tasks.",
        "By isolating components into independent web worker threads.",
        "By disabling component render loops on low memory devices."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "logic",
      points: 80
    },
    {
      id: "react-5",
      question: "What is the primary benefit of using React.memo on a component?",
      options: [
        "It caches api fetch responses inside local storage.",
        "It skips rendering if parent context states change.",
        "It skips re-rendering if the component's props have not changed.",
        "It compiles JSX layouts inside isolated browser runtimes."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "optimization",
      points: 80
    }
  ],
  system_design: [
    {
      id: "sd-1",
      question: "What is the main advantage of horizontal scaling over vertical scaling?",
      options: [
        "It increases CPU memory registers on a single active instance.",
        "It enables fault tolerance and scalability by adding standard node machines.",
        "It guarantees 100% database transaction ACID compliance.",
        "It removes the need for web application load balancer layouts."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "concepts",
      points: 40
    },
    {
      id: "sd-2",
      question: "How does a CDN (Content Delivery Network) lower latency for global users?",
      options: [
        "By compressing SQL query responses inside memory buffers.",
        "By caching static web resources at edge locations close to users.",
        "By encrypting routing layers using VPN gateways.",
        "By balancing read workloads across master-slave database replicas."
      ],
      answerIndex: 1,
      difficulty: "beginner",
      subSkill: "optimization",
      points: 40
    },
    {
      id: "sd-3",
      question: "Under the CAP Theorem, which tradeoffs occur during a network partition?",
      options: [
        "You must choose between latency and security controls.",
        "You must choose between Consistency and Availability.",
        "You must choose between storage capacity and memory speed.",
        "You must choose between database writes and read replicas."
      ],
      answerIndex: 1,
      difficulty: "intermediate",
      subSkill: "logic",
      points: 60
    },
    {
      id: "sd-4",
      question: "What problem is solved by Consistent Hashing in load-balanced clusters?",
      options: [
        "Slow network requests between client and server layers.",
        "High memory reallocation rates when nodes are added or removed.",
        "Database sync delays between primary and secondary nodes.",
        "Browser request packet collision logs."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "logic",
      points: 80
    },
    {
      id: "sd-5",
      question: "What is a Write-Back caching strategy, and what is its primary risk?",
      options: [
        "Write to cache and DB simultaneously; risk is high write latency.",
        "Write to cache first, sync to DB asynchronously; risk is potential data loss on crash.",
        "Write to DB first, invalidate cache; risk is frequent cache misses.",
        "Write to cache only, never sync; risk is storage leak constraints."
      ],
      answerIndex: 1,
      difficulty: "advanced",
      subSkill: "optimization",
      points: 80
    }
  ]
};

export default function AssessmentCenter() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  
  // Assessment center state
  const [completedAssessments, setCompletedAssessments] = useState<Assessment[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTrack, setActiveTrack] = useState<string | null>(null);
  
  // Test runner state
  const [testActive, setTestActive] = useState(false);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [answers, setAnswers] = useState<boolean[]>([]);
  const [subSkillScores, setSubSkillScores] = useState<Record<string, { correct: number; total: number }>>({});
  
  // Circular countdown timer state
  const [timeLeft, setTimeLeft] = useState(15);
  const [savingResult, setSavingResult] = useState(false);
  const [showResultScreen, setShowResultScreen] = useState(false);
  const [latestScoreResult, setLatestScoreResult] = useState<{ score: number; percentile: number; optimized: boolean } | null>(null);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const savedUserId = localStorage.getItem("silkroad_userid");
    setUserId(savedUserId);
    if (savedUserId) {
      fetchUserAssessments(savedUserId);
    } else {
      setLoading(false);
    }
  }, []);

  const fetchUserAssessments = async (uId: string) => {
    try {
      const response = await fetch(`/api/assessment?userId=${uId}`);
      const data = await response.json();
      if (data.assessments) {
        setCompletedAssessments(data.assessments);
      }
    } catch (err) {
      console.error("Failed to load assessments", err);
    } finally {
      setLoading(false);
    }
  };

  // Timer runner logic
  useEffect(() => {
    if (testActive && !savingResult) {
      setTimeLeft(15);
      if (timerRef.current) clearInterval(timerRef.current);

      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => {
          if (prev <= 1) {
            handleNextQuestion(true); // Auto submit on timeout
            return 15;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [testActive, currentQuestionIndex, savingResult]);

  const handleStartTest = (trackId: string) => {
    const qList = TRACK_QUESTIONS[trackId] || [];
    setQuestions(qList);
    setCurrentQuestionIndex(0);
    setSelectedOption(null);
    setAnswers([]);
    
    // Initialize subskill monitors
    const initialSkills: Record<string, { correct: number; total: number }> = {
      syntax: { correct: 0, total: 0 },
      logic: { correct: 0, total: 0 },
      concepts: { correct: 0, total: 0 },
      optimization: { correct: 0, total: 0 }
    };
    setSubSkillScores(initialSkills);
    
    setActiveTrack(trackId);
    setTestActive(true);
    setShowResultScreen(false);
  };

  const handleNextQuestion = (isTimeout = false) => {
    if (questions.length === 0) return;
    
    const currentQ = questions[currentQuestionIndex];
    const isCorrect = !isTimeout && selectedOption === currentQ.answerIndex;
    
    // Log subskill analytics
    setSubSkillScores(prev => {
      const updated = { ...prev };
      const sub = currentQ.subSkill;
      if (!updated[sub]) {
        updated[sub] = { correct: 0, total: 0 };
      }
      updated[sub].total += 1;
      if (isCorrect) {
        updated[sub].correct += 1;
      }
      return updated;
    });

    setAnswers(prev => [...prev, isCorrect]);
    setSelectedOption(null);

    if (currentQuestionIndex + 1 < questions.length) {
      setCurrentQuestionIndex(prev => prev + 1);
    } else {
      // Completed last question, save results
      submitAssessmentResults([...answers, isCorrect]);
    }
  };

  const submitAssessmentResults = async (finalAnswers: boolean[]) => {
    if (timerRef.current) clearInterval(timerRef.current);
    setSavingResult(true);
    
    // Calculate raw score points matching difficulty weights
    let earnedPoints = 0;
    let maxPoints = 0;
    
    questions.forEach((q, idx) => {
      maxPoints += q.points;
      if (finalAnswers[idx]) {
        earnedPoints += q.points;
      }
    });

    // Score scaling to standard 0 - 300 scale
    const finalScore = Math.max(10, Math.round((earnedPoints / maxPoints) * 300));
    
    // Formulate final subskills percentages
    const finalSubskills = {
      syntax: 20 + Math.round(((subSkillScores.syntax?.correct || 0) / Math.max(1, subSkillScores.syntax?.total || 0)) * 80),
      logic: 20 + Math.round(((subSkillScores.logic?.correct || 0) / Math.max(1, subSkillScores.logic?.total || 0)) * 80),
      concepts: 20 + Math.round(((subSkillScores.concepts?.correct || 0) / Math.max(1, subSkillScores.concepts?.total || 0)) * 80),
      optimization: 20 + Math.round(((subSkillScores.optimization?.correct || 0) / Math.max(1, subSkillScores.optimization?.total || 0)) * 80),
    };

    // If subskills have empty totals (due to layout limits), provide defaults matching score
    const scorePct = finalScore / 300;
    if (subSkillScores.syntax?.total === 0) finalSubskills.syntax = Math.round(20 + scorePct * 80);
    if (subSkillScores.logic?.total === 0) finalSubskills.logic = Math.round(20 + scorePct * 80);
    if (subSkillScores.concepts?.total === 0) finalSubskills.concepts = Math.round(20 + scorePct * 80);
    if (subSkillScores.optimization?.total === 0) finalSubskills.optimization = Math.round(20 + scorePct * 80);

    try {
      const response = await fetch("/api/assessment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          userId,
          trackId: activeTrack,
          score: finalScore,
          subSkills: finalSubskills,
        }),
      });

      const data = await response.json();
      if (data.success) {
        setLatestScoreResult({
          score: finalScore,
          percentile: data.percentile,
          optimized: data.roadmapOptimized,
        });
        setShowResultScreen(true);
        setTestActive(false);
        // Refresh assessments feed
        if (userId) fetchUserAssessments(userId);
      }
    } catch (err) {
      console.error("Failed to post assessment scores", err);
    } finally {
      setSavingResult(false);
    }
  };

  const getScoreBracket = (score: number) => {
    if (score < 100) return { name: "Novice", color: "text-text-secondary border-text-secondary/20 bg-text-secondary/10" };
    if (score < 140) return { name: "Emerging", color: "text-orange-flame border-orange-flame/20 bg-orange-flame/10" };
    if (score < 180) return { name: "Average", color: "text-teal-spring border-teal-spring/20 bg-teal-spring/10" };
    if (score < 220) return { name: "Above Average", color: "text-teal-spring border-teal-spring/40 bg-teal-spring/20" };
    return { name: "Expert", color: "text-gold-sand border-gold-sand/40 bg-gold-sand/15 shadow-[0_0_8px_rgba(212,175,55,0.2)] animate-pulse" };
  };

  // Visual mathematical pathing for Bell Curve
  const drawBellCurvePath = (score: number, width = 320, height = 110) => {
    const mean = width / 2;
    const stdDev = 55;
    const amplitude = height - 15;
    
    let path = `M 0 ${height}`;
    for (let x = 0; x <= width; x += 2) {
      const exponent = -Math.pow(x - mean, 2) / (2 * Math.pow(stdDev, 2));
      const y = height - amplitude * Math.exp(exponent);
      path += ` L ${x} ${y}`;
    }
    path += ` L ${width} ${height} Z`;
    
    // User position marker coordinates
    const userX = (score / 300) * width;
    const userExponent = -Math.pow(userX - mean, 2) / (2 * Math.pow(stdDev, 2));
    const userY = height - amplitude * Math.exp(userExponent);
    
    return { path, userX, userY };
  };

  // Visual coordinates for Radar Chart (Role IQ)
  const drawRadarChart = (records: Assessment[]) => {
    const cx = 150;
    const cy = 135;
    const maxRadius = 90;
    
    // 5 skill dimensions
    const dimensions = [
      { key: "javascript", label: "JavaScript" },
      { key: "react", label: "React UI" },
      { key: "postgresql", label: "Postgres DB" },
      { key: "system_design", label: "System Design" },
      { key: "devops", label: "Git & DevOps" } // Mocked static dimensions if not taken
    ];

    // Build pentagon background grid rings (5 rings representing 20%, 40%, 60%, 80%, 100%)
    const gridRings = [0.2, 0.4, 0.6, 0.8, 1.0].map((scale) => {
      const r = maxRadius * scale;
      const points = dimensions.map((_, idx) => {
        const angle = idx * (2 * Math.PI / 5);
        const x = cx + r * Math.sin(angle);
        const y = cy - r * Math.cos(angle);
        return `${x},${y}`;
      }).join(" ");
      return points;
    });

    // Draw user score path coordinates
    const userPoints = dimensions.map((dim, idx) => {
      let scoreVal = 0;
      if (dim.key === "devops") {
        scoreVal = 140; // Default mock rating for secondary track
      } else {
        const matching = records.find(r => r.trackId === dim.key);
        scoreVal = matching ? matching.score : 0;
      }
      const scoreRatio = scoreVal / 300;
      const r = maxRadius * scoreRatio;
      const angle = idx * (2 * Math.PI / 5);
      const x = cx + r * Math.sin(angle);
      const y = cy - r * Math.cos(angle);
      return { x, y, label: `${x},${y}`, score: scoreVal };
    });

    const polygonPoints = userPoints.map(p => p.label).join(" ");
    
    // Axis lines
    const axisLines = dimensions.map((_, idx) => {
      const angle = idx * (2 * Math.PI / 5);
      const x = cx + maxRadius * Math.sin(angle);
      const y = cy - maxRadius * Math.cos(angle);
      return { x, y };
    });

    return { cx, cy, gridRings, polygonPoints, axisLines, userPoints, dimensions };
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center space-y-4">
        <Loader className="h-8 w-8 text-gold-sand animate-spin" />
        <h3 className="text-lg font-serif text-gold-sand animate-pulse">Synchronizing Skill Registry...</h3>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-midnight text-text-primary flex flex-col select-none">
      
      {/* Header bar */}
      <header className="bg-indigo-oasis/80 backdrop-blur-md border-b border-gold-sand/10 py-4 px-6 sticky top-0 z-50 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Logo showText={false} size="md" />
          <div>
            <h1 className="text-base font-bold font-serif tracking-wider text-gold-sand uppercase">
              Skill & Role IQ Diagnostic
            </h1>
            <p className="text-[10px] text-text-secondary">Norm-Referenced Skill Assessments</p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => router.push("/dashboard")}
            className="flex items-center space-x-1 border border-text-secondary/20 hover:border-gold-sand/30 text-text-secondary hover:text-gold-sand text-xs font-semibold px-4 py-2 rounded-xl transition-all cursor-pointer"
          >
            <LayoutGrid className="h-4 w-4" />
            <span>Dashboard</span>
          </button>
        </div>
      </header>

      {/* Test runner mode overlay screen */}
      {testActive && questions.length > 0 ? (() => {
        const currentQ = questions[currentQuestionIndex];
        const progressPercent = Math.round(((currentQuestionIndex) / questions.length) * 100);
        return (
          <div className="flex-1 flex flex-col justify-center items-center p-6 max-w-xl mx-auto w-full space-y-6">
            
            {/* Top Info Bar */}
            <div className="w-full flex justify-between items-center text-xs font-semibold text-text-secondary font-sans border-b border-text-secondary/10 pb-3">
              <div className="flex items-center space-x-2">
                <Brain className="h-4 w-4 text-teal-spring" />
                <span className="uppercase text-text-primary tracking-wide">{activeTrack?.replace("_", " ")} Track</span>
              </div>
              <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            </div>

            {/* Timed Circular countdown dial */}
            <div className="relative h-20 w-20 flex items-center justify-center animate-fadeIn">
              <svg className="absolute h-20 w-20 transform -rotate-90">
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-indigo-oasis"
                  strokeWidth="4"
                  fill="transparent"
                />
                <circle
                  cx="40"
                  cy="40"
                  r="34"
                  className="stroke-gold-sand transition-all duration-1000"
                  strokeWidth="4"
                  fill="transparent"
                  strokeDasharray={213.6}
                  strokeDashoffset={213.6 - (213.6 * timeLeft) / 15}
                />
              </svg>
              <div className="text-center">
                <span className={`text-base font-bold font-mono ${timeLeft <= 4 ? "text-orange-flame animate-ping" : "text-text-primary"}`}>
                  {timeLeft}
                </span>
                <div className="text-[7px] text-text-secondary uppercase tracking-widest font-semibold leading-none">sec</div>
              </div>
            </div>

            {/* Question Card */}
            <div className="w-full glass-panel rounded-2xl p-6 border-gold-sand/15 premium-glow text-left space-y-4 animate-fadeIn">
              <span className={`inline-block text-[8px] font-bold uppercase tracking-wider px-2 py-0.5 rounded ${
                currentQ.difficulty === "advanced" ? "bg-orange-flame/15 text-orange-flame border border-orange-flame/20" : "bg-teal-spring/15 text-teal-spring border border-teal-spring/20"
              }`}>
                {currentQ.difficulty} Level
              </span>
              <h3 className="text-sm font-bold text-text-primary leading-relaxed select-text">
                {currentQ.question}
              </h3>
            </div>

            {/* Multi-choice options */}
            <div className="w-full space-y-2.5">
              {currentQ.options.map((opt, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedOption(idx)}
                  className={`w-full text-left p-4 rounded-xl text-xs font-medium border transition-all cursor-pointer flex items-center justify-between ${
                    selectedOption === idx
                      ? "bg-gold-sand/10 border-gold-sand text-gold-sand"
                      : "bg-indigo-oasis/40 border-text-secondary/10 text-text-primary hover:border-gold-sand/40 hover:bg-indigo-oasis/80"
                  }`}
                >
                  <span className="flex-1 pr-4">{opt}</span>
                  <span className={`h-4.5 w-4.5 rounded-full border flex-shrink-0 flex items-center justify-center text-[10px] font-bold transition-all ${
                    selectedOption === idx
                      ? "bg-gold-sand text-midnight border-gold-sand"
                      : "border-text-secondary/35 text-text-secondary"
                  }`}>
                    {String.fromCharCode(65 + idx)}
                  </span>
                </button>
              ))}
            </div>

            {/* Action controls */}
            <div className="w-full flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  if (confirm("🐫 Are you sure you want to abort the expedition? Your active progress will be lost!")) {
                    if (timerRef.current) clearInterval(timerRef.current);
                    setTestActive(false);
                    setActiveTrack(null);
                  }
                }}
                className="text-xs text-text-secondary hover:text-text-primary uppercase font-bold flex items-center space-x-1 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Abort Test</span>
              </button>
              
              <button
                onClick={() => handleNextQuestion(false)}
                disabled={selectedOption === null}
                className="bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 text-midnight font-bold px-6 py-2.5 rounded-xl transition-all shadow-md flex items-center space-x-1 cursor-pointer text-xs"
              >
                <span>{currentQuestionIndex + 1 === questions.length ? "Submit Test" : "Next Question"}</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

          </div>
        );
      })() : (
        /* Main Dashboard view */
        <main className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto w-full grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Welcome/Banner Intervention overlay if any */}
          {showResultScreen && latestScoreResult && (
            <div className="lg:col-span-12 bg-gold-sand/15 border border-gold-sand/30 rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-[0_0_20px_rgba(212,175,55,0.15)]">
              <div className="flex items-start space-x-4 text-left">
                <div className="flex-shrink-0 relative">
                  <img
                    src="/images/characters/marcopolo_thinking.png"
                    alt="Marco Polo Thinking"
                    className="h-16 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] camel-walk"
                  />
                </div>
                <div>
                  <div className="flex items-center space-x-2">
                    <CheckCircle2 className="h-4 w-4 text-gold-sand" />
                    <h4 className="text-xs font-bold text-gold-sand font-serif uppercase tracking-wide">Skill Diagnostic Complete!</h4>
                  </div>
                  <p className="text-xs text-text-secondary leading-relaxed mt-1 font-sans">
                    You scored <strong className="text-gold-sand">{latestScoreResult.score} / 300</strong> placing you in the <strong className="text-gold-sand">{latestScoreResult.percentile}th percentile</strong> bracket.
                    {latestScoreResult.optimized && (
                      <span className="text-teal-spring font-semibold block sm:inline sm:ml-1">
                        🚀 Master Marco Polo has optimized your active learning roadmap to skip early basic oases!
                      </span>
                    )}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowResultScreen(false)}
                className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 py-2 rounded-xl transition-all shadow cursor-pointer flex-shrink-0"
              >
                Dismiss Review
              </button>
            </div>
          )}

          {/* Left Column: Role IQ radar chart details */}
          <div className="lg:col-span-5 flex flex-col space-y-6">
            
            {/* Overall Role IQ radar chart */}
            <div className="glass-panel rounded-2xl p-5 flex flex-col items-center relative select-none text-center h-full">
              <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase self-start mb-4">
                Traveler Role IQ Map
              </h3>
              
              {completedAssessments.length === 0 ? (
                <div className="flex-1 flex flex-col items-center justify-center p-8 space-y-3 text-text-secondary/65">
                  <Brain className="h-12 w-12 text-text-secondary/30 animate-pulse" />
                  <p className="text-xs leading-relaxed max-w-xs">
                    Complete at least one diagnostic skill assessment to unlock your interactive Role IQ spider radar chart.
                  </p>
                </div>
              ) : (() => {
                const radar = drawRadarChart(completedAssessments);
                
                // Calculate average Role IQ percentage
                const completedCount = completedAssessments.length;
                const totalScoreSum = completedAssessments.reduce((sum, r) => sum + r.score, 0);
                const averageScore = Math.round(totalScoreSum / completedCount);
                const roleBracket = getScoreBracket(averageScore);
                
                return (
                  <div className="w-full flex-1 flex flex-col items-center justify-between space-y-4">
                    
                    {/* SVG Radar Chart container */}
                    <div className="relative h-[250px] w-full max-w-[300px]">
                      <svg className="w-full h-full" viewBox="0 0 300 270">
                        {/* Background pentagon grid lines */}
                        {radar.gridRings.map((pts, idx) => (
                          <polygon
                            key={idx}
                            points={pts}
                            fill="none"
                            stroke="rgba(244, 246, 248, 0.05)"
                            strokeWidth="1.5"
                          />
                        ))}

                        {/* Grid circles markers */}
                        <circle cx={radar.cx} cy={radar.cy} r={90} fill="none" stroke="rgba(212, 175, 55, 0.1)" strokeWidth="1" strokeDasharray="3 3" />
                        <circle cx={radar.cx} cy={radar.cy} r={54} fill="none" stroke="rgba(212, 175, 55, 0.05)" strokeWidth="1" strokeDasharray="3 3" />

                        {/* Axis connecting lines */}
                        {radar.axisLines.map((pt, idx) => (
                          <line
                            key={idx}
                            x1={radar.cx}
                            y1={radar.cy}
                            x2={pt.x}
                            y2={pt.y}
                            stroke="rgba(244, 246, 248, 0.08)"
                            strokeWidth="1.5"
                          />
                        ))}

                        {/* User custom polygon mapping data */}
                        {radar.polygonPoints && (
                          <polygon
                            points={radar.polygonPoints}
                            fill="rgba(0, 168, 150, 0.25)"
                            stroke="#00A896"
                            strokeWidth="2.5"
                            className="drop-shadow-[0_0_8px_rgba(0,168,150,0.4)]"
                          />
                        )}

                        {/* Node dots mapping */}
                        {radar.userPoints.map((pt, idx) => (
                          <g key={idx}>
                            <circle
                              cx={pt.x}
                              cy={pt.y}
                              r="4"
                              className={pt.score > 0 ? "fill-gold-sand" : "fill-text-secondary/40"}
                            />
                            {pt.score > 0 && (
                              <circle
                                cx={pt.x}
                                cy={pt.y}
                                r="8"
                                className="fill-none stroke-gold-sand/50 stroke-1 animate-ping"
                              />
                            )}
                          </g>
                        ))}

                        {/* Labels */}
                        {radar.dimensions.map((dim, idx) => {
                          const angle = idx * (2 * Math.PI / 5);
                          const labelRadius = 110;
                          const x = radar.cx + labelRadius * Math.sin(angle);
                          const y = radar.cy - labelRadius * Math.cos(angle);
                          
                          // Adjust text alignments dynamically based on angles
                          let textAnchor: "start" | "end" | "middle" = "middle";
                          if (Math.sin(angle) > 0.2) textAnchor = "start";
                          if (Math.sin(angle) < -0.2) textAnchor = "end";
                          
                          return (
                            <text
                              key={idx}
                              x={x}
                              y={y + 4}
                              fill="#8D99AE"
                              fontSize="9.5"
                              fontWeight="bold"
                              textAnchor={textAnchor}
                              className="font-sans uppercase tracking-wider"
                            >
                              {dim.label}
                            </text>
                          );
                        })}
                      </svg>
                    </div>

                    {/* Overall Score Summary statistics */}
                    <div className="w-full bg-midnight/60 rounded-xl p-3 border border-text-secondary/10 flex justify-between items-center text-left">
                      <div>
                        <div className="text-[8px] text-text-secondary font-bold uppercase tracking-wider leading-none">Overall Role Score</div>
                        <div className="text-lg font-serif font-bold text-gold-sand mt-0.5">{averageScore} <span className="text-xs text-text-secondary/50 font-sans">/ 300</span></div>
                      </div>
                      <span className={`text-[9px] uppercase font-bold tracking-widest px-2.5 py-1 rounded border ${roleBracket.color}`}>
                        {roleBracket.name}
                      </span>
                    </div>

                  </div>
                );
              })()}
            </div>

          </div>

          {/* Right Column: Track assessment grid cards */}
          <div className="lg:col-span-7 space-y-6">
            
            <div className="glass-panel rounded-2xl p-5 space-y-4 text-left">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">
                  Technology Tracks
                </h3>
                <span className="text-[9px] uppercase font-bold text-text-secondary">4 Diagnostic Assessments available</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[
                  { id: "javascript", title: "JavaScript Core", desc: "Covers variables closures, event loop tasks, microtask scopes, V8 GC heap mechanics, and ES6+ standards." },
                  { id: "react", title: "React UI Framework", desc: "Covers Virtual DOM reconciles, hooks deps, ref equalities, Scheduler priority scheduling, and Memoization hooks." },
                  { id: "postgresql", title: "PostgreSQL Database", desc: "Covers indexes (B-Tree/GIN), Transaction isolation levels, MVCC tuple versions, and GIN JSONB searches." },
                  { id: "system_design", title: "System Architecture", desc: "Covers Horizontal scaling workloads, CDNs, CAP partition consistency, consistent hashing and Write-Back caching." }
                ].map((track) => {
                  const record = completedAssessments.find(r => r.trackId === track.id);
                  const isTaken = !!record;
                  const bracket = isTaken ? getScoreBracket(record.score) : null;
                  
                  return (
                    <div key={track.id} className="glass-panel rounded-xl p-4 flex flex-col justify-between space-y-4 border-text-secondary/15 relative overflow-hidden group">
                      
                      {/* Top Header */}
                      <div className="space-y-1">
                        <div className="flex justify-between items-start">
                          <h4 className="text-xs font-bold font-serif text-text-primary uppercase tracking-wide group-hover:text-gold-sand transition-colors">{track.title}</h4>
                          {isTaken && record && (
                            <span className="text-[10px] font-bold text-gold-sand">{record.score} / 300</span>
                          )}
                        </div>
                        <p className="text-[10px] text-text-secondary leading-relaxed leading-normal">{track.desc}</p>
                      </div>

                      {/* Score distribution Bell Curve and stats */}
                      {isTaken && record && bracket ? (() => {
                        const { path, userX, userY } = drawBellCurvePath(record.score);
                        return (
                          <div className="space-y-3.5 pt-2 animate-fadeIn border-t border-text-secondary/5">
                            
                            {/* SVG Bell Curve */}
                            <div className="relative h-[110px] w-full bg-midnight/35 rounded-lg border border-text-secondary/5 overflow-hidden flex items-end">
                              <svg className="w-full h-full" viewBox="0 0 320 110" preserveAspectRatio="none">
                                <defs>
                                  <linearGradient id={`bell-grad-${track.id}`} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor="#00A896" stopOpacity="0.25" />
                                    <stop offset="100%" stopColor="#0D1B2A" stopOpacity="0.05" />
                                  </linearGradient>
                                </defs>
                                {/* Bell shape path */}
                                <path
                                  d={path}
                                  fill={`url(#bell-grad-${track.id})`}
                                  stroke="rgba(0, 168, 150, 0.4)"
                                  strokeWidth="1.5"
                                />
                                {/* Mean dotted line */}
                                <line x1="160" y1="10" x2="160" y2="110" stroke="rgba(244, 246, 248, 0.05)" strokeDasharray="3 3" />
                                
                                {/* User vertical position line */}
                                <line x1={userX} y1={userY} x2={userX} y2="110" stroke="#D4AF37" strokeWidth="1" strokeDasharray="2 2" />
                                
                                {/* User dot coordinate */}
                                <circle cx={userX} cy={userY} r="3.5" fill="#D4AF37" className="drop-shadow-[0_0_4px_#D4AF37]" />
                                <circle cx={userX} cy={userY} r="7.5" fill="none" stroke="rgba(212, 175, 55, 0.4)" strokeWidth="1" className="animate-ping" />
                              </svg>
                              
                              <div className="absolute top-2 left-2.5 text-[7px] uppercase font-bold text-text-secondary/60">Global Distribution</div>
                              <div className="absolute top-2 right-2.5 text-[8px] uppercase font-bold text-gold-sand">Percentile: {record.percentile}%</div>
                            </div>

                            {/* Subskill Progress Meters */}
                            <div className="space-y-1.5 text-[9px] text-text-secondary">
                              <div className="flex justify-between font-bold text-text-primary uppercase tracking-wider border-b border-text-secondary/10 pb-1 mb-1">
                                <span>Sub-Skill Profile</span>
                                <span>Strength %</span>
                              </div>
                              {[
                                { label: "Syntax Mastery", val: record.subSkills.syntax || 60 },
                                { label: "Logical Deduction", val: record.subSkills.logic || 60 },
                                { label: "Core Concept comprehension", val: record.subSkills.concepts || 60 },
                                { label: "Optimization & Speed", val: record.subSkills.optimization || 60 }
                              ].map((bar, bIdx) => (
                                <div key={bIdx} className="space-y-0.5">
                                  <div className="flex justify-between text-[8px]">
                                    <span>{bar.label}</span>
                                    <span className="font-semibold text-text-primary">{bar.val}%</span>
                                  </div>
                                  <div className="h-1 w-full bg-midnight rounded-full overflow-hidden border border-text-secondary/5">
                                    <div 
                                      className="h-full bg-gradient-to-r from-teal-spring to-gold-sand" 
                                      style={{ width: `${bar.val}%` }}
                                    />
                                  </div>
                                </div>
                              ))}
                            </div>

                          </div>
                        );
                      })() : (
                        <div className="flex flex-col items-center justify-center p-6 border border-dashed border-text-secondary/15 rounded-xl bg-midnight/30 text-center space-y-2">
                          <Brain className="h-6 w-6 text-text-secondary/35" />
                          <p className="text-[9px] text-text-secondary/80 max-w-[200px]">Diagnose your strengths. Takes ~5 minutes.</p>
                        </div>
                      )}

                      {/* Action trigger button */}
                      <button
                        onClick={() => handleStartTest(track.id)}
                        className={`w-full py-2 px-4 rounded-xl font-bold text-xs transition-all flex items-center justify-center space-x-1 cursor-pointer mt-2 ${
                          isTaken
                            ? "border border-gold-sand/20 text-gold-sand hover:bg-gold-sand/10"
                            : "bg-gold-sand text-midnight hover:bg-gold-sand/90 shadow-md"
                        }`}
                      >
                        {isTaken ? <RotateCcw className="h-3.5 w-3.5" /> : null}
                        <span>{isTaken ? "Retake Assessment" : "Take Assessment"}</span>
                      </button>

                    </div>
                  );
                })}
              </div>

            </div>

          </div>

        </main>
      )}

    </div>
  );
}
