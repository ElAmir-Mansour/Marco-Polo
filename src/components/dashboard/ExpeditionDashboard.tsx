"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Compass, BookOpen, Layers, Award, Terminal, Flame, CheckCircle, Lock, Play, ArrowRight, HelpCircle, MessageSquare, Sparkles, ShieldAlert, Loader2, LogOut, Brain, FileText, Shield, Coins, X, Volume2, VolumeX, Menu, MoreVertical } from "lucide-react";
import CaravanMasterChat from "../chat/CaravanMasterChat";
import { Logo } from "@/components/ui/Logo";
import { audio } from "@/lib/services/audio";

// Decoupled store, hooks and widgets
import {
  expeditionStore,
  useExpeditionStore,
  Node,
  Progress,
  Resource,
} from "@/store/ExpeditionStore";
import CanteenWidget from "./CanteenWidget";
import ExpeditionMapCanvas from "./ExpeditionMapCanvas";
import SandboxWorkspace from "./SandboxWorkspace";
import CaravanseraiForum from "./CaravanseraiForum";

export default function ExpeditionDashboard() {
  const router = useRouter();

  // Subscribe to expeditionStore state
  const userId = useExpeditionStore((s) => s.userId);
  const roadmapId = useExpeditionStore((s) => s.roadmapId);
  const progress = useExpeditionStore((s) => s.progress);
  const streak = useExpeditionStore((s) => s.streak);
  const userProfile = useExpeditionStore((s) => s.userProfile);
  const layoutMode = useExpeditionStore((s) => s.layoutMode);
  const activeTab = useExpeditionStore((s) => s.activeTab);
  const soundMuted = useExpeditionStore((s) => s.soundMuted);
  const chatOpen = useExpeditionStore((s) => s.chatOpen);
  const selectedNode = useExpeditionStore((s) => s.selectedNode);
  const hoveredNodeId = useExpeditionStore((s) => s.hoveredNodeId);
  const failCount = useExpeditionStore((s) => s.failCount);
  const userFrustrated = useExpeditionStore((s) => s.userFrustrated);

  // Layout and view states
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [copiedFile, setCopiedFile] = useState<string | null>(null);
  const [consoleLogs, setConsoleLogs] = useState<string[]>([]);
  const [victoryModalOpen, setVictoryModalOpen] = useState(false);
  const prevActiveIndexRef = useRef<number>(0);

  // Local map zoom/dragging states
  const [mapZoom, setMapZoom] = useState(1);
  const [isDragging, setIsDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, scrollLeft: 0, scrollTop: 0 });
  const mapContainerRef = useRef<HTMLDivElement>(null);

  // DOM Refs to update camel position directly (bypasses React render loop)
  const camelRef = useRef<HTMLDivElement>(null);
  const camelEmojiRef = useRef<HTMLSpanElement>(null);

  // v0 Generation States
  const [v0ModalOpen, setV0ModalOpen] = useState(false);
  const [v0Prompt, setV0Prompt] = useState("");
  const [v0Error, setV0Error] = useState("");
  const [generatingCode, setGeneratingCode] = useState(false);
  const [v0Status, setV0Status] = useState<"idle" | "pending" | "completed" | "failed">("idle");
  const [v0Response, setV0Response] = useState<{
    chatId: string;
    webUrl: string;
    description: string;
    files: Record<string, { content: string }>;
  } | null>(null);
  const v0PollIntervalRef = useRef<any>(null);
  const [useV0Trial, setUseV0Trial] = useState(false);
  const [v0TrialUsed, setV0TrialUsed] = useState(false);
  const [isEditorFocused, setIsEditorFocused] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Spotlight Tour Walkthrough States
  const [tourStep, setTourStep] = useState<number | null>(null);
  const [highlightRect, setHighlightRect] = useState<{ x: number; y: number; width: number; height: number } | null>(null);
  const [tooltipStyle, setTooltipStyle] = useState<React.CSSProperties>({
    position: "fixed",
    left: "50%",
    top: "50%",
    transform: "translate(-50%, -50%)",
  });

  // Resource Summarization States
  const [summaryModalOpen, setSummaryModalOpen] = useState(false);
  const [selectedResource, setSelectedResource] = useState<Resource | null>(null);
  const [resourceSummary, setResourceSummary] = useState("");
  const [loadingSummary, setLoadingSummary] = useState(false);

  const nodeSpacingY = 135;

  // Viewport resize handler
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleResize = () => {
        if (window.innerWidth >= 1440) {
          expeditionStore.setState({ layoutMode: "split" });
        } else {
          expeditionStore.setState({ layoutMode: "tabs" });
        }
      };
      handleResize();
      window.addEventListener("resize", handleResize);
      return () => window.removeEventListener("resize", handleResize);
    }
  }, []);

  // Cleanup v0 polling
  useEffect(() => {
    if (!v0ModalOpen) {
      if (v0PollIntervalRef.current) {
        clearInterval(v0PollIntervalRef.current);
        v0PollIntervalRef.current = null;
      }
      setGeneratingCode(false);
      setV0Status("idle");
    }
    return () => {
      if (v0PollIntervalRef.current) {
        clearInterval(v0PollIntervalRef.current);
      }
    };
  }, [v0ModalOpen]);

  // Map Height calculation
  const mapHeight = useMemo(() => {
    if (!progress || !progress.nodes) return 0;
    return progress.nodes.length * nodeSpacingY + 80;
  }, [progress]);

  // Center on progress load
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
          behavior: "smooth",
        });
      }
    }, 50);
  };

  useEffect(() => {
    if (progress) {
      recenterMap();
    }
  }, [progress]);

  // Fetch initial profile & progress data
  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedUserId = localStorage.getItem("silkroad_userid");
      const savedRoadmapId = localStorage.getItem("silkroad_roadmapid");
      setV0TrialUsed(localStorage.getItem("silkroad_v0_trial_used") === "true");
      expeditionStore.setState({
        userId: savedUserId,
        roadmapId: savedRoadmapId,
        soundMuted: audio.getMuteStatus(),
      });

      if (savedUserId) {
        fetchProgressAndStreak(savedUserId, savedRoadmapId);
        const tourCompleted = localStorage.getItem("silkroad_tour_completed");
        if (!tourCompleted) {
          setTourStep(1);
        }
      } else {
        setLoading(false);
      }
    }
  }, []);

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

      let activeNode: Node | null = null;
      if (data.progress && data.progress.nodes && data.progress.nodes.length > 0) {
        const activeNodeId = data.progress.currentActiveNode;
        activeNode = data.progress.nodes.find((n: Node) => n.id === activeNodeId) || data.progress.nodes[0];
      }

      expeditionStore.setState({
        progress: data.progress,
        streak: data.streak,
        userProfile: data.user,
        selectedNode: activeNode,
      });

      if (data.progress && data.progress.roadmapId) {
        localStorage.setItem("silkroad_roadmapid", data.progress.roadmapId);
        expeditionStore.setState({ roadmapId: data.progress.roadmapId });
      }
    } catch (err: any) {
      setError(err.message || "Failed to sync details with AWS databases.");
    } finally {
      setLoading(false);
    }
  };

  // Node coordinate calculation
  const nodeCoordinates = useMemo(() => {
    if (!progress) return [];
    return (progress.nodes || []).map((node, index) => {
      const y = index * nodeSpacingY + 70;
      const x = index % 2 === 0 ? 90 : 310;
      return { id: node.id, x, y };
    });
  }, [progress]);

  const activeIndex = useMemo(() => {
    if (!progress) return -1;
    return (progress.nodes || []).findIndex((n) => n.id === progress.currentActiveNode);
  }, [progress]);

  // DOM direct updates for camel caravan position
  const updateCamelDOM = (x: number, y: number, angle: number) => {
    if (camelRef.current) {
      camelRef.current.style.left = `${(x / 400) * 100}%`;
      camelRef.current.style.top = `${(y / mapHeight) * 100}%`;
    }
    if (camelEmojiRef.current) {
      const flip = Math.abs(angle) < 90 ? "scaleX(-1)" : "scaleX(1)";
      camelEmojiRef.current.style.transform = `rotate(${angle * 0.45}deg) ${flip}`;
    }
  };

  // Traversal animation triggers directly on DOM nodes
  useEffect(() => {
    const targetIdx = activeIndex !== -1 ? activeIndex : 0;
    const prevIdx = prevActiveIndexRef.current;

    if (nodeCoordinates.length === 0) return;

    if (prevIdx === targetIdx) {
      const startNode = nodeCoordinates[targetIdx];
      if (startNode) {
        updateCamelDOM(startNode.x, startNode.y, 0);
      }
      return;
    }

    let startTimestamp: number | null = null;
    const duration = 1200;
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

        const dx = 3 * Math.pow(mt, 2) * (cp1X - p0.x) + 6 * mt * localT * (cp2X - cp1X) + 3 * Math.pow(localT, 2) * (p1.x - cp2X);
        const dy = 3 * Math.pow(mt, 2) * (cp1Y - p0.y) + 6 * mt * localT * (cp2Y - cp1Y) + 3 * Math.pow(localT, 2) * (p1.y - cp2Y);
        const angleRad = Math.atan2(dy, dx);
        const angleDeg = (angleRad * 180) / Math.PI;

        updateCamelDOM(x, y, angleDeg);
      }

      if (t < 1) {
        animFrameId = requestAnimationFrame(animateCamel);
      } else {
        prevActiveIndexRef.current = targetIdx;
        const endNode = nodeCoordinates[targetIdx];
        if (endNode) {
          updateCamelDOM(endNode.x, endNode.y, 0);
        }
      }
    };

    animFrameId = requestAnimationFrame(animateCamel);
    return () => cancelAnimationFrame(animFrameId);
  }, [activeIndex, nodeCoordinates, mapHeight]);

  // Recenter on index load
  useEffect(() => {
    const targetIdx = activeIndex !== -1 ? activeIndex : 0;
    const node = nodeCoordinates[targetIdx];
    if (node) {
      updateCamelDOM(node.x, node.y, 0);
    }
  }, [activeIndex, nodeCoordinates, mapHeight]);

  // Onboarding Walkthrough Tooltip updates
  const updateTooltipPosition = (rect: { x: number; y: number; width: number; height: number } | null) => {
    const viewportWidth = typeof window !== "undefined" ? window.innerWidth : 375;
    const viewportHeight = typeof window !== "undefined" ? window.innerHeight : 667;
    const cardWidth = Math.min(350, viewportWidth - 24);
    const cardHeight = 240;
    const gap = 20;

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
      if (tourStep === 2) {
        left = rect.x + rect.width + gap;
        if (left + cardWidth > viewportWidth - 20) {
          left = rect.x + rect.width - cardWidth - 30;
        }
        top = rect.y + 80;
      } else if (tourStep === 3) {
        left = rect.x + rect.width / 2 - cardWidth / 2;
        if (left + cardWidth > viewportWidth - 20) {
          left = viewportWidth - cardWidth - 20;
        }
        top = rect.y + rect.height + gap;
      } else if (tourStep === 4) {
        left = rect.x - cardWidth - gap;
        if (left < 20) {
          left = rect.x + rect.width + gap;
          if (left + cardWidth > viewportWidth - 20) {
            left = rect.x + 30;
          }
        }
        top = rect.y + 120;
      } else if (tourStep === 5) {
        left = rect.x - cardWidth - gap;
        top = rect.y + 100;
      } else if (tourStep === 6) {
        left = rect.x + rect.width + gap;
        if (left + cardWidth > viewportWidth - 20) {
          left = rect.x + rect.width - cardWidth - 30;
        }
        top = rect.y + 50;
      } else {
        left = viewportWidth / 2 - cardWidth / 2;
        top = viewportHeight / 2 - cardHeight / 2;
      }
    } else {
      left = viewportWidth / 2 - cardWidth / 2;
      if (left < 12) left = 12;

      top = rect.y + rect.height + gap;
      if (top + cardHeight > viewportHeight - 12) {
        top = rect.y - cardHeight - gap;
        if (top < 12) {
          top = viewportHeight / 2 - cardHeight / 2;
        }
      }
    }

    if (left < 12) left = 12;
    if (left + cardWidth > viewportWidth - 12) left = viewportWidth - cardWidth - 12;
    if (top < 12) top = 12;
    if (top + cardHeight > viewportHeight - 12) top = viewportHeight - cardHeight - 12;

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
        expeditionStore.setState({ chatOpen: true });
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

  // Dragging & scrolling trail viewport
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

  // Onboarding node helpers
  const getNodeState = (nodeId: string) => {
    if (!progress) return "locked";
    if (progress.completedSteps.includes(nodeId)) return "completed";
    if (progress.currentActiveNode === nodeId) return "active";

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
    if (state === "locked") return;

    audio.playClick();
    expeditionStore.setState({ selectedNode: node });
    setConsoleLogs([]);
  };

  // Resource summarizing calls
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
    } catch {
      setResourceSummary("Offline fallback: Key study highlights are loaded in your sidebar panel.");
    } finally {
      setLoadingSummary(false);
    }
  };

  // v0 component generator handler
  const handleV0Generate = async () => {
    if (!v0Prompt.trim() || !selectedNode) return;
    setGeneratingCode(true);
    setV0Status("pending");
    setV0Error("");
    setV0Response(null);

    if (v0PollIntervalRef.current) {
      clearInterval(v0PollIntervalRef.current);
      v0PollIntervalRef.current = null;
    }

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
        if (useV0Trial) {
          localStorage.setItem("silkroad_v0_trial_used", "true");
          setV0TrialUsed(true);
          setUseV0Trial(false);
        }

        if (data.status === "completed") {
          setV0Status("completed");
          setGeneratingCode(false);
          return;
        }

        const activeChatId = data.chatId;

        const interval = setInterval(async () => {
          try {
            const pollResponse = await fetch(`/api/v0/generate?chatId=${activeChatId}`);
            if (!pollResponse.ok) {
              throw new Error("Failed to contact polling gateway.");
            }
            const pollData = await pollResponse.json();
            if (pollData.success) {
              setV0Response((prev) => {
                if (!prev) return pollData;
                return {
                  ...prev,
                  description: pollData.description || prev.description,
                  files: pollData.files || prev.files,
                };
              });

              if (pollData.status === "completed") {
                setV0Status("completed");
                setGeneratingCode(false);
                clearInterval(interval);
                v0PollIntervalRef.current = null;
              } else if (pollData.status === "failed") {
                setV0Status("failed");
                setV0Error("Component generation failed on v0.app.");
                setGeneratingCode(false);
                clearInterval(interval);
                v0PollIntervalRef.current = null;
              }
            } else {
              setV0Status("failed");
              setV0Error(pollData.error || "Failed checking generation status.");
              setGeneratingCode(false);
              clearInterval(interval);
              v0PollIntervalRef.current = null;
            }
          } catch (pollErr: any) {
            console.error("v0 status poll failure:", pollErr);
          }
        }, 4000);

        v0PollIntervalRef.current = interval;
      } else {
        setV0Status("failed");
        setV0Error(data.error || "Failed to initialize component generation.");
        setGeneratingCode(false);
      }
    } catch {
      setV0Status("failed");
      setV0Error("Network error: failed to contact v0 generation gateway.");
      setGeneratingCode(false);
    }
  };

  // Demote difficulty on frustration
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

  // Advance next node routing helper
  const hasNextOasis = useMemo(() => {
    if (!progress || !progress.nodes || !selectedNode) return false;
    const currentIndex = progress.nodes.findIndex((n: any) => n.id === selectedNode.id);
    return currentIndex !== -1 && currentIndex < progress.nodes.length - 1;
  }, [progress, selectedNode]);

  const handleNextOasis = () => {
    setVictoryModalOpen(false);
    if (!progress || !progress.nodes || progress.nodes.length === 0) return;

    const activeNodeId = progress.currentActiveNode;
    const nextNode = progress.nodes.find((n: Node) => n.id === activeNodeId);

    if (nextNode) {
      handleNodeClick(nextNode);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center space-y-4 select-none">
        <LoaderComponent />
        <h3 className="text-lg font-serif text-gold-sand animate-pulse">Loading Expedition map...</h3>
      </div>
    );
  }

  if (!userId || !progress) {
    return (
      <div className="min-h-screen bg-midnight flex flex-col items-center justify-center p-6 text-center space-y-4 select-none">
        <Compass className="h-16 w-16 text-gold-sand animate-spin-slow" />
        <h3 className="text-xl font-bold font-serif text-gold-sand">Caravan Profile Missing</h3>
        <p className="text-sm text-text-secondary max-w-md">
          You need to complete the assessment onboarding to generate your personalized learning map and survive the road.
        </p>
        <button
          onClick={() => (window.location.href = "/onboarding")}
          className="bg-gold-sand hover:bg-gold-sand/90 text-midnight font-bold px-6 py-2.5 rounded-xl transition-all shadow-md hover:shadow-lg"
        >
          Initialize Onboarding
        </button>
      </div>
    );
  }

  const nodes = progress.nodes || [];
  const percentComplete = Math.round((progress.completedSteps.length / nodes.length) * 100);

  return (
    <div className="min-h-screen bg-midnight text-text-primary flex flex-col select-none relative overflow-hidden">
      <style>{`
        .forum-scrollbar::-webkit-scrollbar {
          width: 6px;
          height: 6px;
        }
        .forum-scrollbar::-webkit-scrollbar-track {
          background: rgba(7, 15, 25, 0.4);
          border-radius: 9999px;
        }
        .forum-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(212, 175, 55, 0.25);
          border-radius: 9999px;
          border: 1px solid rgba(7, 15, 25, 0.4);
        }
        .forum-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(212, 175, 55, 0.55);
        }
        .smooth-ease {
          transition: all 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
        .dimmable-element {
          transition: opacity 300ms cubic-bezier(0.4, 0, 0.2, 1), filter 300ms cubic-bezier(0.4, 0, 0.2, 1);
        }
      `}</style>

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

        <div className="flex items-center space-x-2 sm:space-x-2.5 flex-shrink-0 relative">
          <button
            onClick={() => {
              audio.playClick();
              expeditionStore.setState({ layoutMode: layoutMode === "split" ? "tabs" : "split" });
            }}
            title={layoutMode === "split" ? "Switch to Focus Mode" : "Switch to Split View"}
            className="hidden lg:flex items-center justify-center space-x-1.5 px-3 h-[44px] lg:h-[34px] rounded-xl text-xs font-semibold border border-gold-sand/20 text-text-secondary hover:text-gold-sand hover:border-gold-sand/40 hover:bg-gold-sand/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Layers className="h-4 w-4 flex-shrink-0" />
            <span>{layoutMode === "split" ? "Focus Tabs" : "Split View"}</span>
          </button>

          <button
            onClick={() => {
              const muted = audio.toggleMute();
              expeditionStore.setState({ soundMuted: muted });
            }}
            title={soundMuted ? "Unmute Ambient Soundscapes" : "Mute Ambient Soundscapes"}
            className={`hidden md:flex items-center justify-center w-[44px] md:w-[34px] h-[44px] md:h-[34px] rounded-xl border transition-all cursor-pointer ${
              soundMuted
                ? "border-gold-sand/20 text-text-secondary hover:border-gold-sand/40 hover:text-gold-sand hover:bg-gold-sand/5"
                : "bg-gold-sand/15 border-gold-sand/30 text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.15)] hover:border-gold-sand/50"
            }`}
          >
            {soundMuted ? (
              <VolumeX className="h-4 w-4 flex-shrink-0" />
            ) : (
              <div className="relative flex items-center justify-center flex-shrink-0">
                <Volume2 className="h-4 w-4" />
                <span className="absolute -right-1 -top-1 flex h-1.5 w-1.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-gold-sand opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-gold-sand"></span>
                </span>
              </div>
            )}
          </button>

          {streak && (
            <div id="tour-streak" className="inline-flex items-center h-[44px] md:h-[34px] flex-shrink-0">
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
            </div>
          )}

          <button
            onClick={() => {
              audio.playClick();
              router.push("/assessment");
            }}
            className="hidden sm:flex items-center justify-center space-x-1.5 px-3 h-[44px] md:h-[34px] rounded-xl text-xs font-semibold border border-gold-sand/20 text-text-secondary hover:text-teal-spring hover:border-teal-spring/40 hover:bg-teal-spring/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <Brain className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Skill IQ</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              router.push("/marketplace");
            }}
            className="hidden sm:flex items-center justify-center space-x-1.5 px-3 h-[44px] md:h-[34px] rounded-xl text-xs font-bold bg-gold-sand text-midnight hover:bg-gold-sand/90 border border-gold-sand transition-all cursor-pointer whitespace-nowrap shadow-[0_0_12px_rgba(212,175,55,0.25)]"
          >
            <Sparkles className="h-4 w-4 flex-shrink-0" />
            <span className="hidden md:inline">Bazaar</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              if (typeof window !== "undefined") {
                localStorage.removeItem("silkroad_userid");
                localStorage.removeItem("silkroad_roadmapid");
                localStorage.removeItem("silkroad_email");
                localStorage.removeItem("silkroad_tour_completed");
              }
              router.push("/onboarding");
            }}
            title="Leave Caravan"
            className="hidden md:flex items-center justify-center space-x-1.5 px-3 h-[44px] md:h-[34px] rounded-xl text-xs font-semibold border border-gold-sand/20 text-text-secondary hover:text-orange-flame hover:border-orange-flame/40 hover:bg-orange-flame/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <LogOut className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline">Leave Caravan</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              localStorage.removeItem("silkroad_tour_completed");
              setTourStep(1);
            }}
            title="Replay Onboarding Tour"
            className="hidden md:flex items-center justify-center space-x-1.5 px-3 h-[44px] md:h-[34px] rounded-xl text-xs font-semibold border border-gold-sand/20 text-text-secondary hover:text-gold-sand hover:border-gold-sand/40 hover:bg-gold-sand/5 transition-all cursor-pointer whitespace-nowrap"
          >
            <HelpCircle className="h-4 w-4 flex-shrink-0" />
            <span className="hidden lg:inline">Tour</span>
          </button>

          <button
            onClick={() => {
              expeditionStore.setState({ chatOpen: !chatOpen });
              audio.playRustle();
            }}
            className={`hidden lg:flex items-center justify-center space-x-1.5 px-3 h-[44px] lg:h-[34px] rounded-xl text-xs font-semibold border transition-all cursor-pointer whitespace-nowrap ${
              chatOpen
                ? "bg-gold-sand/15 text-gold-sand border-gold-sand/30 hover:bg-gold-sand/20"
                : "border-gold-sand/20 text-text-secondary hover:text-gold-sand hover:border-gold-sand/40 hover:bg-gold-sand/5"
            }`}
          >
            <MessageSquare className="h-4 w-4 flex-shrink-0" />
            <span>AI Guide</span>
          </button>

          <button
            onClick={() => {
              audio.playClick();
              setMobileMenuOpen(!mobileMenuOpen);
            }}
            className={`flex md:hidden items-center justify-center w-[44px] h-[44px] rounded-xl border transition-all cursor-pointer ${
              mobileMenuOpen
                ? "bg-gold-sand/15 border-gold-sand text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.15)]"
                : "border-gold-sand/20 text-text-secondary hover:text-gold-sand hover:border-gold-sand/40 hover:bg-gold-sand/5"
            }`}
            title="Menu"
          >
            <Menu className="h-5 w-5 flex-shrink-0" />
          </button>

          {mobileMenuOpen && (
            <div className="absolute top-[55px] right-0 w-56 bg-indigo-oasis/95 border border-gold-sand/20 rounded-2xl p-4 shadow-2xl backdrop-blur-md z-[100] flex flex-col space-y-2 md:hidden animate-fadeIn select-none text-left">
              <div className="text-[9px] font-bold text-text-secondary uppercase tracking-wider border-b border-text-secondary/10 pb-1.5 mb-1 font-serif">
                Expedition Controls
              </div>

              <button
                onClick={() => {
                  const muted = audio.toggleMute();
                  expeditionStore.setState({ soundMuted: muted });
                }}
                className="flex items-center space-x-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5 transition-all text-left cursor-pointer"
              >
                {soundMuted ? (
                  <>
                    <VolumeX className="h-4 w-4 text-orange-flame" />
                    <span>Unmute Sound</span>
                  </>
                ) : (
                  <>
                    <Volume2 className="h-4 w-4 text-teal-spring" />
                    <span>Mute Ambient</span>
                  </>
                )}
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setMobileMenuOpen(false);
                  router.push("/assessment");
                }}
                className="flex sm:hidden items-center space-x-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-teal-spring hover:bg-teal-spring/5 transition-all text-left cursor-pointer"
              >
                <Brain className="h-4 w-4 text-teal-spring" />
                <span>Skill IQ Assessment</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setMobileMenuOpen(false);
                  router.push("/marketplace");
                }}
                className="flex sm:hidden items-center space-x-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-bold text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5 transition-all text-left cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-gold-sand" />
                <span>Great Bazaar</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setMobileMenuOpen(false);
                  localStorage.removeItem("silkroad_tour_completed");
                  setTourStep(1);
                }}
                className="flex items-center space-x-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5 transition-all text-left cursor-pointer"
              >
                <HelpCircle className="h-4 w-4 text-gold-sand" />
                <span>Replay Guide Tour</span>
              </button>

              <button
                onClick={() => {
                  audio.playClick();
                  setMobileMenuOpen(false);
                  if (typeof window !== "undefined") {
                    localStorage.removeItem("silkroad_userid");
                    localStorage.removeItem("silkroad_roadmapid");
                    localStorage.removeItem("silkroad_email");
                    localStorage.removeItem("silkroad_tour_completed");
                  }
                  router.push("/onboarding");
                }}
                className="flex items-center space-x-2.5 w-full px-3 py-2.5 rounded-xl text-xs font-semibold text-text-secondary hover:text-orange-flame hover:bg-orange-flame/5 transition-all text-left cursor-pointer"
              >
                <LogOut className="h-4 w-4 text-orange-flame" />
                <span>Leave Caravan</span>
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Main Grid content */}
      <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
        {/* Layout tab switcher for smaller viewports */}
        {layoutMode === "tabs" && (
          <div className="flex border-b border-gold-sand/15 bg-[#0D1B2A]/60 backdrop-blur-md p-1.5 rounded-xl gap-2 mb-2 mx-6 mt-4 flex-shrink-0 z-10 select-none">
            <button
              onClick={() => expeditionStore.setState({ activeTab: "map" })}
              className={`flex-grow flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "map"
                  ? "bg-gold-sand text-midnight shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                  : "text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5"
              }`}
            >
              <Compass className="h-4 w-4" />
              <span>Trail Map & Stats</span>
            </button>
            <button
              onClick={() => expeditionStore.setState({ activeTab: "sandbox" })}
              className={`flex-grow flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "sandbox"
                  ? "bg-gold-sand text-midnight shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                  : "text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5"
              }`}
            >
              <Terminal className="h-4 w-4" />
              <span>Coding Sandbox</span>
            </button>
            <button
              onClick={() => expeditionStore.setState({ activeTab: "forum" })}
              className={`flex-grow flex items-center justify-center space-x-2 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                activeTab === "forum"
                  ? "bg-gold-sand text-midnight shadow-[0_0_12px_rgba(212,175,55,0.25)]"
                  : "text-text-secondary hover:text-gold-sand hover:bg-gold-sand/5"
              }`}
            >
              <MessageSquare className="h-4 w-4" />
              <span>Community Forum</span>
            </button>
          </div>
        )}

        {/* Content area */}
        <div className="flex-1 flex min-h-0 relative overflow-hidden">
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 select-text">
            {/* Guide Frustration Intervention Banner */}
            {(failCount >= 2 || userFrustrated) && (
              <div className="bg-orange-flame/10 border border-orange-flame/40 rounded-2xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fadeIn shadow-[0_0_15px_rgba(242,100,25,0.15)] flex-shrink-0 select-none">
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
                      <h4 className="text-xs font-bold text-orange-flame font-serif uppercase tracking-wide">
                        Caravan Guide Intervention
                      </h4>
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
                    onClick={() => expeditionStore.setState({ failCount: 0, userFrustrated: false })}
                    className="text-text-secondary hover:text-text-primary text-[10px] font-bold px-2 cursor-pointer"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            )}

            {layoutMode === "split" ? (
              /* Side-by-Side Split View Grid */
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                {/* Column 1: Map Node List & Stats HUD */}
                <div className={`lg:col-span-5 space-y-6 flex flex-col dimmable-element ${isEditorFocused ? "opacity-20 filter blur-[0.5px] pointer-events-none" : "opacity-100"}`}>
                  {/* Stats HUD */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.05)] border border-gold-sand/10 select-none">
                    <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                      <div>
                        <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Traveler's HUD</h3>
                        <p className="text-[9px] text-text-secondary mt-0.5">{progress.title || "Silk Road Expedition Trail"}</p>
                      </div>
                      <span className="text-[8px] bg-gold-sand/15 text-gold-sand font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                        {userProfile?.subscriptionStatus === "active" ? "Nomad Explorer" : "Free Caravan"}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 gap-3.5">
                      <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Compass className="h-3.5 w-3.5 text-teal-spring animate-spin-slow" />
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Discovery</span>
                        </div>
                        <div className="mt-2.5">
                          <div className="text-sm font-bold text-text-primary font-serif">
                            {progress.completedSteps.length} / {nodes.length}
                          </div>
                          <div className="text-[8px] text-text-secondary mt-0.5 font-sans">
                            {percentComplete}% of oases visited
                          </div>
                          <div className="h-1.5 w-full bg-midnight/80 rounded-full overflow-hidden border border-text-secondary/5 mt-1.5">
                            <div
                              className="h-full bg-gradient-to-r from-teal-spring to-gold-sand transition-all duration-500"
                              style={{ width: `${percentComplete}%` }}
                            />
                          </div>
                        </div>
                      </div>

                      <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Flame className="h-3.5 w-3.5 text-orange-flame animate-pulse" />
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Survival</span>
                        </div>
                        <div className="mt-2.5">
                          <div className="text-sm font-bold text-orange-flame font-serif">
                            {streak?.currentStreak || 0} Days
                          </div>
                          <div className="text-[8px] text-orange-flame/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                            <span className="text-[7px]">▲</span>
                            <span>+14% vs last week</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Coins className="h-3.5 w-3.5 text-gold-sand" />
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Treasury</span>
                        </div>
                        <div className="mt-2.5">
                          <div className="text-sm font-bold text-gold-sand font-serif">
                            {userProfile?.coinsBalance || 0} Coins
                          </div>
                          <div className="text-[8px] text-gold-sand/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                            <span className="text-[7px]">▲</span>
                            <span>+25 earned today</span>
                          </div>
                        </div>
                      </div>

                      <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                        <div className="flex items-center space-x-1.5">
                          <Shield className="h-3.5 w-3.5 text-teal-spring" />
                          <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Shields</span>
                        </div>
                        <div className="mt-2.5">
                          <div className="text-sm font-bold text-teal-spring font-serif">
                            {userProfile?.streakShields || 0} Active
                          </div>
                          <div className="text-[8px] text-teal-spring/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                            <span className="text-[7px]">✓</span>
                            <span>Streak protection on</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Curvy learning path trail canvas wrapper */}
                  <div
                    id="tour-map"
                    className="relative rounded-2xl flex flex-col min-h-[420px] max-h-[580px] overflow-hidden glass-panel border border-gold-sand/10 select-none"
                  >
                    <ExpeditionMapCanvas
                      progress={progress}
                      nodeCoordinates={nodeCoordinates}
                      activeIndex={activeIndex}
                      mapHeight={mapHeight}
                      selectedNode={selectedNode}
                      hoveredNodeId={hoveredNodeId}
                      setHoveredNodeId={(id) => expeditionStore.setState({ hoveredNodeId: id })}
                      handleNodeClick={handleNodeClick}
                      getNodeState={getNodeState}
                      getNodeIcon={getNodeIcon}
                      mapZoom={mapZoom}
                      setMapZoom={setMapZoom}
                      recenterMap={recenterMap}
                      camelRef={camelRef}
                      camelEmojiRef={camelEmojiRef}
                      isDragging={isDragging}
                      handleMouseDown={handleMouseDown}
                      handleMouseMove={handleMouseMove}
                      handleMouseUp={handleMouseUp}
                      handleTouchStart={handleTouchStart}
                      handleTouchMove={handleTouchMove}
                      mapContainerRef={mapContainerRef}
                    />
                  </div>

                  {/* Weekly Coin Earnings Trend Chart */}
                  <div className="glass-panel rounded-2xl p-6 space-y-4 border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] select-none">
                    <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                      <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Weekly Coin Earnings Trend</h3>
                      <span className="text-[8px] text-text-secondary font-bold font-sans uppercase">High Contrast Visual Analytics</span>
                    </div>

                    <div className="relative h-28 w-full mt-2">
                      <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                        <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" />
                        <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" />
                        <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" strokeDasharray="3 3" />

                        <path
                          d="M 10 90 Q 50 65, 90 75 T 170 35 T 250 15 T 290 25"
                          fill="none"
                          stroke="rgba(212, 175, 55, 0.15)"
                          strokeWidth="5"
                          strokeLinecap="round"
                        />
                        <path
                          d="M 10 90 Q 50 65, 90 75 T 170 35 T 250 15 T 290 25"
                          fill="none"
                          stroke="url(#chart-neon-grad)"
                          strokeWidth="2.5"
                          strokeLinecap="round"
                        />

                        <circle cx="10" cy="90" r="3.5" className="fill-midnight stroke-teal-spring" strokeWidth="1.5" />
                        <circle cx="90" cy="75" r="3.5" className="fill-midnight stroke-teal-spring" strokeWidth="1.5" />
                        <circle cx="170" cy="35" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />
                        <circle cx="250" cy="15" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />
                        <circle cx="290" cy="25" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />

                        <defs>
                          <linearGradient id="chart-neon-grad" x1="0%" y1="0%" x2="100%" y2="0%">
                            <stop offset="0%" stopColor="#00A896" />
                            <stop offset="50%" stopColor="#00A896" />
                            <stop offset="100%" stopColor="#D4AF37" />
                          </linearGradient>
                        </defs>
                      </svg>

                      <div className="absolute left-1 top-0 text-[8px] text-text-secondary/60 font-semibold font-sans">100+</div>
                      <div className="absolute left-1 top-[42%] text-[8px] text-text-secondary/60 font-semibold font-sans">50</div>
                      <div className="absolute left-1 bottom-1 text-[8px] text-text-secondary/60 font-semibold font-sans">0</div>
                    </div>

                    <div className="flex justify-between text-[9px] text-text-secondary/80 font-bold px-1 uppercase tracking-wider font-sans">
                      <span>Mon</span>
                      <span>Tue</span>
                      <span>Wed</span>
                      <span>Thu</span>
                      <span>Fri</span>
                      <span>Sat</span>
                      <span>Sun</span>
                    </div>
                  </div>

                  {/* Relational ledger milestone list */}
                  <div className="glass-panel rounded-2xl p-6 space-y-3.5 border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] select-none">
                    <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                      <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Milestone Trail Log</h3>
                      <span className="text-[8px] text-text-secondary font-bold font-sans uppercase">Relational Ledger Records</span>
                    </div>

                    <div className="overflow-x-auto font-sans">
                      <table className="w-full border-collapse text-[10px]">
                        <thead>
                          <tr className="border-b border-gold-sand/15 text-[8.5px] text-text-secondary/70 uppercase tracking-wider font-bold">
                            <th className="text-left pb-2 font-semibold">Oasis Node</th>
                            <th className="text-left pb-2 font-semibold">Difficulty</th>
                            <th className="text-right pb-2 font-semibold">Reward</th>
                            <th className="text-right pb-2 font-semibold">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gold-sand/5">
                          {nodes.map((node, index) => {
                            const isCompleted = progress.completedSteps.includes(node.id);
                            const isActive = progress.currentActiveNode === node.id;

                            return (
                              <tr
                                key={node.id}
                                onClick={() => {
                                  if (!progress.completedSteps.includes(node.id) && progress.currentActiveNode !== node.id) {
                                    const nodeIndex = progress.nodes.findIndex((n: any) => n.id === node.id);
                                    const prevNodes = progress.nodes.slice(0, nodeIndex);
                                    const allPrevCompleted = prevNodes.every((n: any) => progress.completedSteps.includes(n.id));
                                    if (!allPrevCompleted) return;
                                  }
                                  handleNodeClick(node);
                                }}
                                className={`hover:bg-gold-sand/[0.03] transition-colors cursor-pointer ${
                                  isActive ? "bg-teal-spring/[0.02]" : ""
                                }`}
                              >
                                <td className="py-2.5 text-left font-bold text-text-primary">
                                  <span className="text-gold-sand/70 font-serif mr-1">{index + 1}.</span>
                                  {node.title}
                                </td>
                                <td className="py-2.5 text-left">
                                  <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-bold uppercase tracking-wider ${
                                    node.difficulty === "beginner"
                                      ? "bg-teal-spring/10 text-teal-spring"
                                      : node.difficulty === "intermediate"
                                      ? "bg-gold-sand/10 text-gold-sand"
                                      : "bg-orange-flame/10 text-orange-flame"
                                  }`}>
                                    {node.difficulty}
                                  </span>
                                </td>
                                <td className="py-2.5 text-right font-mono text-gold-sand font-bold">+25 🪙</td>
                                <td className="py-2.5 text-right">
                                  {isCompleted ? (
                                    <span className="text-gold-sand font-bold text-[8.5px] uppercase tracking-wide flex items-center justify-end">
                                      <CheckCircle className="h-3 w-3 mr-1" /> Visited
                                    </span>
                                  ) : isActive ? (
                                    <span className="text-teal-spring font-bold text-[8.5px] uppercase tracking-wide flex items-center justify-end animate-pulse">
                                      <Compass className="h-3 w-3 mr-1 animate-spin-slow" /> Active
                                    </span>
                                  ) : (
                                    <span className="text-text-secondary/40 text-[8.5px] uppercase tracking-wide flex items-center justify-end">
                                      <Lock className="h-3 w-3 mr-1 text-text-secondary/35" /> Locked
                                    </span>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>

                {/* Column 2: Code Editor Sandbox & Community Forum */}
                <div id="tour-sandbox" className="lg:col-span-7 space-y-6">
                  {selectedNode ? (
                    <SandboxWorkspace
                      selectedNode={selectedNode}
                      userId={userId}
                      progress={progress}
                      onSuccess={(p, s, u) => {
                        expeditionStore.setState({ progress: p, streak: s, userProfile: u });
                        setVictoryModalOpen(true);
                      }}
                      onFailure={() => {
                        expeditionStore.setState({ failCount: failCount + 1 });
                      }}
                      setV0Prompt={setV0Prompt}
                      setV0ModalOpen={setV0ModalOpen}
                      handleResourceClick={handleResourceClick}
                      onFocusChange={(focused) => setIsEditorFocused(focused)}
                    />
                  ) : (
                    <div className="glass-panel rounded-2xl p-6 text-center space-y-5 flex flex-col items-center justify-center min-h-[450px] border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] animate-fadeIn select-none">
                      <div className="h-16 w-16 rounded-full bg-gold-sand/10 border border-gold-sand/30 flex items-center justify-center text-gold-sand shadow-[0_0_20px_rgba(212,175,55,0.15)] animate-pulse">
                        <Compass className="h-8 w-8 animate-spin-slow" />
                      </div>
                      <div className="space-y-2 max-w-sm">
                        <h4 className="text-base font-bold font-serif text-gold-sand uppercase tracking-wider">
                          Select an Oasis Node
                        </h4>
                        <p className="text-xs text-text-secondary leading-relaxed">
                          Click on an unlocked or completed Oasis along the learning trail map to begin.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className={`dimmable-element ${isEditorFocused ? "opacity-20 filter blur-[0.5px] pointer-events-none" : "opacity-100"}`}>
                    <CaravanseraiForum
                      userId={userId}
                      userProfile={userProfile}
                      onTipSuccess={(newBalance) => {
                        if (userProfile) {
                          expeditionStore.setState({ userProfile: { ...userProfile, coinsBalance: newBalance } });
                        }
                      }}
                      setUserFrustrated={(frustrated) => expeditionStore.setState({ userFrustrated: frustrated })}
                      appendConsoleLog={(log) => setConsoleLogs((prev) => [...prev, log])}
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* Focus View: single active tab displaying with full p-6 breathing room */
              <div className="w-full flex-grow flex flex-col gap-6">
                {activeTab === "map" && (
                  <div className="space-y-6 flex flex-col">
                    {/* Stats HUD */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4 shadow-[0_0_15px_rgba(212,175,55,0.05)] border border-gold-sand/10 select-none">
                      <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                        <div>
                          <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Traveler's HUD</h3>
                          <p className="text-[9px] text-text-secondary mt-0.5">{progress.title || "Silk Road Expedition Trail"}</p>
                        </div>
                        <span className="text-[8px] bg-gold-sand/15 text-gold-sand font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
                          {userProfile?.subscriptionStatus === "active" ? "Nomad Explorer" : "Free Caravan"}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3.5">
                        <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Compass className="h-3.5 w-3.5 text-teal-spring animate-spin-slow" />
                            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Discovery</span>
                          </div>
                          <div className="mt-2.5">
                            <div className="text-sm font-bold text-text-primary font-serif">
                              {progress.completedSteps.length} / {nodes.length}
                            </div>
                            <div className="text-[8px] text-text-secondary mt-0.5 font-sans">
                              {percentComplete}% of oases visited
                            </div>
                            <div className="h-1.5 w-full bg-midnight/80 rounded-full overflow-hidden border border-text-secondary/5 mt-1.5">
                              <div
                                className="h-full bg-gradient-to-r from-teal-spring to-gold-sand transition-all duration-500"
                                style={{ width: `${percentComplete}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Flame className="h-3.5 w-3.5 text-orange-flame animate-pulse" />
                            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Survival</span>
                          </div>
                          <div className="mt-2.5">
                            <div className="text-sm font-bold text-orange-flame font-serif">
                              {streak?.currentStreak || 0} Days
                            </div>
                            <div className="text-[8px] text-orange-flame/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                              <span className="text-[7px]">▲</span>
                              <span>+14% vs last week</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Coins className="h-3.5 w-3.5 text-gold-sand" />
                            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Treasury</span>
                          </div>
                          <div className="mt-2.5">
                            <div className="text-sm font-bold text-gold-sand font-serif">
                              {userProfile?.coinsBalance || 0} Coins
                            </div>
                            <div className="text-[8px] text-gold-sand/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                              <span className="text-[7px]">▲</span>
                              <span>+25 earned today</span>
                            </div>
                          </div>
                        </div>

                        <div className="bg-midnight/60 rounded-xl p-3 border border-text-secondary/5 flex flex-col justify-between">
                          <div className="flex items-center space-x-1.5">
                            <Shield className="h-3.5 w-3.5 text-teal-spring" />
                            <span className="text-[9px] font-bold text-text-secondary uppercase tracking-wider font-sans">Shields</span>
                          </div>
                          <div className="mt-2.5">
                            <div className="text-sm font-bold text-teal-spring font-serif">
                              {userProfile?.streakShields || 0} Active
                            </div>
                            <div className="text-[8px] text-teal-spring/80 font-semibold mt-0.5 flex items-center space-x-0.5 font-sans">
                              <span className="text-[7px]">✓</span>
                              <span>Streak protection on</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Trail Map Canvas */}
                    <div
                      id="tour-map"
                      className="relative rounded-2xl flex flex-col min-h-[420px] max-h-[580px] overflow-hidden glass-panel border border-gold-sand/10 select-none"
                    >
                      <ExpeditionMapCanvas
                        progress={progress}
                        nodeCoordinates={nodeCoordinates}
                        activeIndex={activeIndex}
                        mapHeight={mapHeight}
                        selectedNode={selectedNode}
                        hoveredNodeId={hoveredNodeId}
                        setHoveredNodeId={(id) => expeditionStore.setState({ hoveredNodeId: id })}
                        handleNodeClick={(node) => {
                          handleNodeClick(node);
                          expeditionStore.setState({ activeTab: "sandbox" });
                        }}
                        getNodeState={getNodeState}
                        getNodeIcon={getNodeIcon}
                        mapZoom={mapZoom}
                        setMapZoom={setMapZoom}
                        recenterMap={recenterMap}
                        camelRef={camelRef}
                        camelEmojiRef={camelEmojiRef}
                        isDragging={isDragging}
                        handleMouseDown={handleMouseDown}
                        handleMouseMove={handleMouseMove}
                        handleMouseUp={handleMouseUp}
                        handleTouchStart={handleTouchStart}
                        handleTouchMove={handleTouchMove}
                        mapContainerRef={mapContainerRef}
                      />
                    </div>

                    {/* Charts & Ledgers */}
                    <div className="glass-panel rounded-2xl p-6 space-y-4 border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] select-none">
                      <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                        <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Weekly Coin Earnings Trend</h3>
                        <span className="text-[8px] text-text-secondary font-bold font-sans uppercase">High Contrast Visual Analytics</span>
                      </div>

                      <div className="relative h-28 w-full mt-2">
                        <svg className="w-full h-full" viewBox="0 0 300 100" preserveAspectRatio="none">
                          <line x1="0" y1="20" x2="300" y2="20" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" />
                          <line x1="0" y1="50" x2="300" y2="50" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" />
                          <line x1="0" y1="80" x2="300" y2="80" stroke="rgba(141, 153, 174, 0.08)" strokeWidth="1" strokeDasharray="3 3" />

                          <path
                            d="M 10 90 Q 50 65, 90 75 T 170 35 T 250 15 T 290 25"
                            fill="none"
                            stroke="rgba(212, 175, 55, 0.15)"
                            strokeWidth="5"
                            strokeLinecap="round"
                          />
                          <path
                            d="M 10 90 Q 50 65, 90 75 T 170 35 T 250 15 T 290 25"
                            fill="none"
                            stroke="url(#chart-neon-grad-tab)"
                            strokeWidth="2.5"
                            strokeLinecap="round"
                          />

                          <circle cx="10" cy="90" r="3.5" className="fill-midnight stroke-teal-spring" strokeWidth="1.5" />
                          <circle cx="90" cy="75" r="3.5" className="fill-midnight stroke-teal-spring" strokeWidth="1.5" />
                          <circle cx="170" cy="35" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />
                          <circle cx="250" cy="15" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />
                          <circle cx="290" cy="25" r="3.5" className="fill-midnight stroke-gold-sand" strokeWidth="1.5" />

                          <defs>
                            <linearGradient id="chart-neon-grad-tab" x1="0%" y1="0%" x2="100%" y2="0%">
                              <stop offset="0%" stopColor="#00A896" />
                              <stop offset="50%" stopColor="#00A896" />
                              <stop offset="100%" stopColor="#D4AF37" />
                            </linearGradient>
                          </defs>
                        </svg>

                        <div className="absolute left-1 top-0 text-[8px] text-text-secondary/60 font-semibold font-sans">100+</div>
                        <div className="absolute left-1 top-[42%] text-[8px] text-text-secondary/60 font-semibold font-sans">50</div>
                        <div className="absolute left-1 bottom-1 text-[8px] text-text-secondary/60 font-semibold font-sans">0</div>
                      </div>
                    </div>

                    <div className="glass-panel rounded-2xl p-6 space-y-3.5 border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] select-none">
                      <div className="flex items-center justify-between border-b border-gold-sand/10 pb-2">
                        <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase">Milestone Trail Log</h3>
                        <span className="text-[8px] text-text-secondary font-bold font-sans uppercase">Relational Ledger Records</span>
                      </div>

                      <div className="overflow-x-auto font-sans">
                        <table className="w-full border-collapse text-[10px]">
                          <thead>
                            <tr className="border-b border-gold-sand/15 text-[8.5px] text-text-secondary/70 uppercase tracking-wider font-bold">
                              <th className="text-left pb-2 font-semibold">Oasis Node</th>
                              <th className="text-left pb-2 font-semibold">Difficulty</th>
                              <th className="text-right pb-2 font-semibold">Reward</th>
                              <th className="text-right pb-2 font-semibold">Status</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gold-sand/5">
                            {nodes.map((node, index) => {
                              const isCompleted = progress.completedSteps.includes(node.id);
                              const isActive = progress.currentActiveNode === node.id;

                              return (
                                <tr
                                  key={node.id}
                                  onClick={() => {
                                    if (!progress.completedSteps.includes(node.id) && progress.currentActiveNode !== node.id) {
                                      const nodeIndex = progress.nodes.findIndex((n: any) => n.id === node.id);
                                      const prevNodes = progress.nodes.slice(0, nodeIndex);
                                      const allPrevCompleted = prevNodes.every((n: any) => progress.completedSteps.includes(n.id));
                                      if (!allPrevCompleted) return;
                                    }
                                    handleNodeClick(node);
                                    expeditionStore.setState({ activeTab: "sandbox" });
                                  }}
                                  className={`hover:bg-gold-sand/[0.03] transition-colors cursor-pointer ${
                                    isActive ? "bg-teal-spring/[0.02]" : ""
                                  }`}
                                >
                                  <td className="py-2.5 text-left font-bold text-text-primary">
                                    <span className="text-gold-sand/70 font-serif mr-1">{index + 1}.</span>
                                    {node.title}
                                  </td>
                                  <td className="py-2.5 text-left">
                                    <span className={`px-1.5 py-0.5 rounded-full text-[7.5px] font-bold uppercase tracking-wider ${
                                      node.difficulty === "beginner"
                                        ? "bg-teal-spring/10 text-teal-spring"
                                        : node.difficulty === "intermediate"
                                        ? "bg-gold-sand/10 text-gold-sand"
                                        : "bg-orange-flame/10 text-orange-flame"
                                    }`}>
                                      {node.difficulty}
                                    </span>
                                  </td>
                                  <td className="py-2.5 text-right font-mono text-gold-sand font-bold">+25 🪙</td>
                                  <td className="py-2.5 text-right">
                                    {isCompleted ? (
                                      <span className="text-gold-sand font-bold text-[8.5px] uppercase tracking-wide flex items-center justify-end">
                                        <CheckCircle className="h-3 w-3 mr-1" /> Visited
                                      </span>
                                    ) : isActive ? (
                                      <span className="text-teal-spring font-bold text-[8.5px] uppercase tracking-wide flex items-center justify-end animate-pulse">
                                        <Compass className="h-3 w-3 mr-1 animate-spin-slow" /> Active
                                      </span>
                                    ) : (
                                      <span className="text-text-secondary/40 text-[8.5px] uppercase tracking-wide flex items-center justify-end">
                                        <Lock className="h-3 w-3 mr-1 text-text-secondary/35" /> Locked
                                      </span>
                                    )}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "sandbox" && (
                  <div className="w-full">
                    {selectedNode ? (
                      <SandboxWorkspace
                        selectedNode={selectedNode}
                        userId={userId}
                        progress={progress}
                        onSuccess={(p, s, u) => {
                          expeditionStore.setState({ progress: p, streak: s, userProfile: u });
                          setVictoryModalOpen(true);
                        }}
                        onFailure={() => {
                          expeditionStore.setState({ failCount: failCount + 1 });
                        }}
                        setV0Prompt={setV0Prompt}
                        setV0ModalOpen={setV0ModalOpen}
                        handleResourceClick={handleResourceClick}
                        onFocusChange={(focused) => setIsEditorFocused(focused)}
                      />
                    ) : (
                      <div className="glass-panel rounded-2xl p-6 text-center space-y-5 flex flex-col items-center justify-center min-h-[450px] border border-gold-sand/10 shadow-[0_0_15px_rgba(212,175,55,0.05)] animate-fadeIn select-none">
                        <div className="h-16 w-16 rounded-full bg-gold-sand/10 border border-gold-sand/30 flex items-center justify-center text-gold-sand shadow-[0_0_20px_rgba(212,175,55,0.15)] animate-pulse">
                          <Compass className="h-8 w-8 animate-spin-slow" />
                        </div>
                        <div className="space-y-2 max-w-sm">
                          <h4 className="text-base font-bold font-serif text-gold-sand uppercase tracking-wider">
                            Select an Oasis Node
                          </h4>
                          <p className="text-xs text-text-secondary leading-relaxed">
                            Click on an unlocked or completed Oasis along the learning trail map to begin.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "forum" && (
                  <div className="w-full">
                    <CaravanseraiForum
                      userId={userId}
                      userProfile={userProfile}
                      onTipSuccess={(newBalance) => {
                        if (userProfile) {
                          expeditionStore.setState({ userProfile: { ...userProfile, coinsBalance: newBalance } });
                        }
                      }}
                      setUserFrustrated={(frustrated) => expeditionStore.setState({ userFrustrated: frustrated })}
                      appendConsoleLog={(log) => setConsoleLogs((prev) => [...prev, log])}
                    />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Desktop Sidebar AI Guide chat panel */}
          {chatOpen && (
            <div
              id="tour-chat"
              className="hidden lg:flex flex-col w-80 xl:w-96 flex-shrink-0 h-full p-6 pl-4 border-l border-gold-sand/10 bg-indigo-oasis/20"
            >
              <CaravanMasterChat
                userContext={{
                  targetRole: progress.roadmapId.includes("frontend") ? "Frontend Engineer" : "Software Engineer",
                  experienceLevel: progress.difficulty || "beginner",
                  nodeTitle: selectedNode?.title || "Foundations",
                }}
                currentCode={""}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile floating guide trigger and bottom drawer */}
      <div className="lg:hidden select-none">
        <button
          type="button"
          onClick={() => expeditionStore.setState({ chatOpen: !chatOpen })}
          className="fixed bottom-6 right-6 z-40 bg-gold-sand hover:bg-gold-sand/90 text-midnight p-3.5 rounded-full shadow-[0_0_15px_rgba(212,175,55,0.4)] cursor-pointer"
        >
          <MessageSquare className="h-6 w-6" />
        </button>

        {chatOpen && (
          <div className="fixed inset-0 z-40 bg-midnight/80 backdrop-blur-sm flex items-end justify-center animate-fadeIn">
            <div className="absolute inset-0" onClick={() => expeditionStore.setState({ chatOpen: false })} />
            <div className="relative w-full max-w-lg bg-indigo-oasis border-t border-gold-sand/20 rounded-t-3xl h-[80vh] flex flex-col shadow-2xl z-50 overflow-hidden">
              <div
                onClick={() => expeditionStore.setState({ chatOpen: false })}
                className="w-12 h-1 bg-text-secondary/30 rounded-full mx-auto my-3 cursor-pointer"
              />
              <div className="flex-grow min-h-0">
                <CaravanMasterChat
                  userContext={{
                    targetRole: progress.roadmapId.includes("frontend") ? "Frontend Engineer" : "Software Engineer",
                    experienceLevel: progress.difficulty || "beginner",
                    nodeTitle: selectedNode?.title || "Foundations",
                  }}
                  currentCode={""}
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Study Summary Modal */}
      {summaryModalOpen && selectedResource && (
        <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-4 border border-gold-sand/20 relative animate-fadeIn text-left">
            <div className="flex justify-between items-start select-none">
              <h3 className="text-sm font-bold font-serif text-gold-sand uppercase tracking-wider pt-2.5">
                30-Second AI Study Summary
              </h3>
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-sm font-bold cursor-pointer w-11 h-11 flex items-center justify-center -mr-2 -mt-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            <div className="border-y border-gold-sand/10 py-3 space-y-2">
              <h4 className="text-xs font-bold text-text-primary">{selectedResource.title}</h4>
              <p className="text-[10px] text-teal-spring uppercase font-semibold select-none">{selectedResource.type}</p>

              {loadingSummary ? (
                <div className="flex flex-col items-center justify-center py-6 space-y-2 text-text-secondary text-[10px] italic select-none">
                  <Loader2 className="h-6 w-6 animate-spin text-gold-sand" />
                  <span>Master Marco Polo is reading and condensing the scrolls...</span>
                </div>
              ) : (
                <div className="text-xs text-text-primary leading-relaxed whitespace-pre-line space-y-1 font-sans">
                  {resourceSummary}
                </div>
              )}
            </div>

            <div className="flex justify-end space-x-2 pt-1 select-none">
              <button
                onClick={() => setSummaryModalOpen(false)}
                className="h-11 px-4 border border-text-secondary/20 rounded-lg text-text-secondary text-xs font-semibold hover:border-text-secondary/40 transition-colors cursor-pointer flex items-center justify-center"
              >
                Close
              </button>
              <a
                href={selectedResource.url}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setSummaryModalOpen(false)}
                className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 h-11 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
              >
                Go to Resource
              </a>
            </div>
          </div>
        </div>
      )}

      {/* v0 Component Generator Modal */}
      {v0ModalOpen && (
        <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
          <div className="glass-panel max-w-2xl w-full rounded-2xl p-6 space-y-4 border border-gold-sand/20 relative animate-fadeIn text-left max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center select-none">
              <div className="flex items-center space-x-2 py-2.5">
                <Sparkles className="h-5 w-5 text-gold-sand animate-pulse" />
                <h3 className="text-sm font-bold font-serif text-gold-sand uppercase tracking-wider">
                  v0 React Component Generator
                </h3>
              </div>
              <button
                onClick={() => setV0ModalOpen(false)}
                className="text-text-secondary hover:text-text-primary text-sm font-bold cursor-pointer w-11 h-11 flex items-center justify-center -mr-2"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {generatingCode || v0Status === "pending" ? (
              <div className="flex flex-col items-center justify-center py-12 space-y-4 text-center select-none animate-fadeIn">
                <Loader2 className="h-10 w-10 animate-spin text-teal-spring" />
                <div className="space-y-1">
                  <h4 className="text-sm font-bold text-text-primary uppercase tracking-wide">
                    Contacting Vercel v0 platform...
                  </h4>
                  <p className="text-[10px] text-text-secondary max-w-xs leading-relaxed">
                    Executing asynchronous generation (responseMode: "async"). Polling status gateways every 4 seconds. Please wait...
                  </p>
                </div>
              </div>
            ) : v0Status === "completed" && v0Response ? (
              <div className="space-y-4 animate-fadeIn">
                <div className="bg-teal-spring/10 border border-teal-spring/30 rounded-xl p-4 flex items-center space-x-3 select-none">
                  <CheckCircle className="h-5 w-5 text-teal-spring" />
                  <div>
                    <h4 className="text-xs font-bold text-teal-spring uppercase tracking-wider">
                      Boilerplate Generated Successfully!
                    </h4>
                    <p className="text-[9.5px] text-text-secondary leading-snug">
                      Your component boilerplate is ready. You can copy the code directly or load it straight into your sandbox editor workspace.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center text-[10px] select-none font-bold text-text-secondary">
                    <span>Generated Files</span>
                    <span>v0.app Live Link</span>
                  </div>

                  <div className="bg-midnight/80 rounded-xl p-3 border border-text-secondary/10 space-y-2">
                    {Object.keys(v0Response.files || {}).map((filename) => (
                      <div key={filename} className="flex items-center justify-between text-xs py-1 border-b border-text-secondary/5 last:border-b-0">
                        <span className="font-mono text-text-primary">{filename}</span>
                        <div className="flex space-x-2 select-none">
                          <button
                            onClick={() => {
                              const content = v0Response.files[filename]?.content;
                              if (content) {
                                navigator.clipboard.writeText(content);
                                setCopiedFile(filename);
                                setTimeout(() => setCopiedFile(null), 2000);
                              }
                            }}
                            className="text-[9px] uppercase font-bold text-gold-sand border border-gold-sand/20 hover:border-gold-sand/40 px-2 py-1 rounded bg-gold-sand/5 transition-colors cursor-pointer"
                          >
                            {copiedFile === filename ? "Copied!" : "Copy Code"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex justify-end space-x-3 select-none pt-2">
                  <button
                    onClick={() => setV0ModalOpen(false)}
                    className="h-11 px-4 border border-text-secondary/20 hover:border-text-secondary/40 text-text-primary rounded-xl text-xs font-bold cursor-pointer flex items-center justify-center"
                  >
                    Close
                  </button>
                  <button
                    onClick={() => {
                      const firstFileKey = Object.keys(v0Response.files || {})[0];
                      if (firstFileKey) {
                        const content = v0Response.files[firstFileKey]?.content;
                        if (content) {
                          setV0ModalOpen(false);
                          setConsoleLogs((prev) => [...prev, "Successfully loaded v0 component code into Sandbox editor."]);
                        }
                      }
                    }}
                    className="h-11 px-4 border border-teal-spring/30 text-teal-spring hover:bg-teal-spring/10 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center"
                  >
                    Load Into Sandbox
                  </button>
                  <a
                    href={v0Response.webUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold px-4 h-11 rounded-xl transition-all shadow-md flex items-center justify-center cursor-pointer"
                  >
                    Open Live on v0.app
                  </a>
                </div>
              </div>
            ) : !v0TrialUsed ? (
              <div className="flex flex-col items-center justify-center py-6 text-center space-y-4 animate-fadeIn select-none">
                <div className="h-14 w-14 rounded-full bg-teal-spring/10 border border-teal-spring/30 flex items-center justify-center text-teal-spring shadow-[0_0_15px_rgba(0,168,150,0.15)] animate-pulse">
                  <Sparkles className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base font-bold font-serif text-teal-spring uppercase tracking-wider text-center">
                    Unleash the v0 Trial!
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed text-center">
                    You have <strong className="text-teal-spring font-bold">1 Free Trial Component</strong> remaining! Leverage the Vercel v0 Platform API to construct a custom React + Tailwind CSS boilerplate for your current milestone:{" "}
                    <span className="text-gold-sand font-semibold">{selectedNode?.title}</span>.
                  </p>
                </div>
                <div className="flex space-x-3 w-full max-w-sm pt-2">
                  <button
                    onClick={() => {
                      setV0ModalOpen(false);
                      router.push("/marketplace");
                    }}
                    className="flex-grow h-11 border border-gold-sand/30 hover:bg-gold-sand/10 text-gold-sand text-xs font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center uppercase tracking-wider"
                  >
                    Upgrade to Nomad
                  </button>
                  <button
                    onClick={() => setUseV0Trial(true)}
                    className="flex-grow bg-teal-spring hover:bg-teal-spring/90 text-midnight text-xs font-bold h-11 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer uppercase tracking-wider"
                  >
                    <span>Activate Free Trial</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8 text-center space-y-4 animate-fadeIn select-none">
                <div className="h-14 w-14 rounded-full bg-gold-sand/15 border border-gold-sand/40 flex items-center justify-center text-gold-sand shadow-[0_0_15px_rgba(212,175,55,0.15)]">
                  <Lock className="h-6 w-6" />
                </div>
                <div className="space-y-1.5 max-w-md">
                  <h4 className="text-base font-bold font-serif text-gold-sand uppercase tracking-wider text-center">
                    v0 Component Generator Locked
                  </h4>
                  <p className="text-xs text-text-secondary leading-relaxed text-center">
                    You have utilized your free trial token. Please upgrade to the{" "}
                    <strong className="text-gold-sand font-bold">Nomad Explorer</strong> tier in our Caravanserai marketplace to unlock unlimited AI code generation.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    onClick={() => {
                      setV0ModalOpen(false);
                      router.push("/marketplace");
                    }}
                    className="bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold h-11 px-6 rounded-xl transition-all shadow-md flex items-center justify-center space-x-2 cursor-pointer uppercase tracking-wider"
                  >
                    <Sparkles className="h-4 w-4" />
                    <span>Go to Great Bazaar</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Victory Celebration Modal */}
      {victoryModalOpen && (
        <div className="fixed inset-0 bg-midnight/80 backdrop-blur-sm z-50 flex items-center justify-center p-4 select-text">
          <div className="glass-panel max-w-md w-full rounded-2xl p-6 space-y-6 border border-gold-sand/40 relative animate-fadeIn text-center shadow-[0_0_30px_rgba(212,175,55,0.25)]">
            <button
              onClick={() => setVictoryModalOpen(false)}
              className="absolute top-2 right-2 text-text-secondary hover:text-text-primary text-sm font-bold cursor-pointer select-none w-11 h-11 flex items-center justify-center"
              aria-label="Close"
            >
              ✕
            </button>

            <div className="flex flex-col items-center space-y-4">
              <div className="relative select-none">
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
                  Excellent work, traveler! You have successfully solved the{" "}
                  <span className="text-teal-spring font-semibold">{selectedNode?.title}</span> challenge. Master Marco Polo is pleased with your solution!
                  <span className="text-gold-sand block font-bold mt-1.5 animate-pulse select-none">
                    🪙 +25 Caravan Coins earned!
                  </span>
                </p>
              </div>

              {streak && (
                <div className="bg-orange-flame/10 border border-orange-flame/30 rounded-xl p-3 w-full flex items-center justify-between select-none">
                  <div className="flex items-center space-x-2 text-left">
                    <span className="text-lg">🔥</span>
                    <div>
                      <div className="text-[10px] text-text-secondary font-bold uppercase tracking-wider">Active Streak</div>
                      <div className="text-xs font-bold text-orange-flame">
                        {streak.currentStreak} {streak.currentStreak === 1 ? "Day" : "Days"}
                      </div>
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

            <div className="flex flex-col space-y-2.5 w-full select-none">
              {hasNextOasis && (
                <button
                  onClick={handleNextOasis}
                  className="w-full bg-teal-spring hover:bg-teal-spring/90 text-midnight text-xs font-bold h-11 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1.5 cursor-pointer font-serif transform hover:-translate-y-0.5"
                >
                  <span>Advance to Next Oasis</span>
                  <ArrowRight className="h-4 w-4" />
                </button>
              )}

              <div className="flex space-x-3 w-full">
                <button
                  onClick={() => setVictoryModalOpen(false)}
                  className="flex-grow border border-text-secondary/20 hover:border-text-secondary/40 text-text-primary text-xs font-bold h-11 rounded-xl transition-all cursor-pointer flex items-center justify-center"
                >
                  Close
                </button>
                <button
                  onClick={() => {
                    setVictoryModalOpen(false);
                    setV0ModalOpen(true);
                  }}
                  className="flex-grow bg-gold-sand hover:bg-gold-sand/90 text-midnight text-xs font-bold h-11 rounded-xl transition-all shadow-md flex items-center justify-center space-x-1 cursor-pointer animate-pulse"
                >
                  <Sparkles className="h-4 w-4" />
                  <span>Generate UI with v0</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Spotlight Tour Walkthrough Overlay */}
      {tourStep !== null && (
        <div className="fixed inset-0 z-[9990] pointer-events-none animate-fadeIn">
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
              className="transition-all duration-300"
            />
          </svg>

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

          <div
            style={tooltipStyle}
            className="glass-panel rounded-2xl p-6 space-y-4 border-gold-sand/40 shadow-[0_0_30px_rgba(212,175,55,0.3)] pointer-events-auto transition-all duration-300 relative text-left select-text"
          >
            <div className="flex justify-between items-center text-[10px] text-text-secondary font-bold tracking-wider uppercase select-none">
              <span className="text-gold-sand font-serif">Expedition Guide Walkthrough</span>
              <span>{tourStep} / 6</span>
            </div>

            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 relative select-none">
                <img
                  src="/images/characters/marcopolo_welcome.png"
                  alt="Marco Polo Tour Guide"
                  className="h-16 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] flex-shrink-0 camel-walk"
                />
              </div>
              <div className="flex-grow space-y-1 min-w-0">
                <h3 className="text-xs font-bold font-serif text-text-primary uppercase tracking-wide select-none">
                  {tourStep === 1 && "Welcome, Traveler! 🐫"}
                  {tourStep === 2 && "The Learning Trail Map 🗺️"}
                  {tourStep === 3 && "Daily Streak Canteen 🔥"}
                  {tourStep === 4 && "Challenge Sandbox 💻"}
                  {tourStep === 5 && "Master Marco Polo Guidance 🧭"}
                  {tourStep === 6 && "Caravanserai Forum 🎪"}
                </h3>
                <p className="text-[11px] text-text-secondary leading-relaxed font-sans">
                  {tourStep === 1 && "Welcome to your Silk Road learning expedition trail. Let's take a quick 1-minute tour of your caravan instruments."}
                  {tourStep === 2 && "This is your learning path. The Camel Caravan represents your active oasis node. Click unlocked nodes to select challenges along the Bezier trail."}
                  {tourStep === 3 && "Keep your streak active by solving challenges daily. Your streak count dynamically scales the water level in your canteen. Complete 7+ consecutive days to unleash golden energy!"}
                  {tourStep === 4 && "Write JavaScript code to solve the active coding puzzle. The UNIX terminal console below prints sandbox execution results, worker timeouts, and syntax compile logs."}
                  {tourStep === 5 && "Your companion Master Marco Polo guides you without spoiling solutions. Get hints, explanation logs, and real-time Big O complexity reviews automatically on submissions."}
                  {tourStep === 6 && "Share scrolls, ask questions, or trade insights. If the NLP guide detects high frustration, it will offer customized interventions (e.g. mentor discounts or path simplification)."}
                </p>
              </div>
            </div>

            <div className="flex justify-between items-center pt-2 font-sans select-none">
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
  );
}

function LoaderComponent() {
  return (
    <div className="relative h-12 w-12 flex items-center justify-center select-none">
      <div className="absolute animate-ping h-8 w-8 rounded-full bg-gold-sand/20"></div>
      <div className="h-4 w-4 rounded-full bg-gold-sand animate-pulse"></div>
    </div>
  );
}
