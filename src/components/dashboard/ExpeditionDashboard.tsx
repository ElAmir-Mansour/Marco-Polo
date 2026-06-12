"use client";

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useRouter } from "next/navigation";
import { Compass, BookOpen, Layers, Award, Terminal, Flame, CheckCircle, Lock, Play, ArrowRight, ChevronRight, HelpCircle, MessageSquare, Sparkles, ShieldAlert, Loader2, LogOut, Brain, FileText } from "lucide-react";
import CaravanMasterChat from "../chat/CaravanMasterChat";
import * as acorn from "acorn";
import confetti from "canvas-confetti";
import { Logo } from "@/components/ui/Logo";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

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

const vertexShader = `
  uniform float uTime;
  varying vec2 vUv;
  varying vec3 vPosition;

  void main() {
    vUv = uv;
    vPosition = position;
    vec3 pos = position;
    
    // Wave sway that increases with height (pos.y ranges from -0.3 to 0.3)
    float heightFactor = clamp((pos.y + 0.3) / 0.6, 0.0, 1.0);
    
    // Multi-frequency organic sway using compound sines (heat convection)
    float swayX = sin(uTime * 3.5 + pos.y * 5.0) * 0.04 + sin(uTime * 1.5) * 0.015;
    float swayZ = cos(uTime * 3.0 + pos.y * 4.0) * 0.03 + cos(uTime * 1.2) * 0.01;
    
    pos.x += swayX * heightFactor;
    pos.z += swayZ * heightFactor;
    
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const fragmentShader = `
  uniform float uTime;
  uniform float uIsGold;
  varying vec2 vUv;
  varying vec3 vPosition;

  // Modulo 289
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+10.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

  // 3D Simplex Noise
  float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    vec3 i  = floor(v + vec3(dot(v, C.yyy)));
    vec3 x0 = v - i + vec3(dot(i, C.xxx));

    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + vec3(C.x);
    vec3 x2 = x0 - i2 + vec3(C.y);
    vec3 x3 = x0 - vec3(D.y);

    i = mod289(i);
    vec4 p = permute(permute(permute(
               i.z + vec4(0.0, i1.z, i2.z, 1.0))
             + i.y + vec4(0.0, i1.y, i2.y, 1.0)
             + i.x + vec4(0.0, i1.x, i2.x, 1.0));

    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + vec4(ns.yyyy);
    vec4 y = y_ * ns.x + vec4(ns.yyyy);
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0)*2.0 + vec4(1.0);
    vec4 s1 = floor(b1)*2.0 + vec4(1.0);
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    // Scroll coordinates upwards over time to make the fire rise
    vec3 noiseCoord = vec3(vUv.x * 2.0, vUv.y * 1.5 - uTime * 2.0, uTime * 0.4);
    
    // First octave
    float n1 = snoise(noiseCoord);
    
    // Second octave (higher frequency, lower amplitude)
    float n2 = snoise(noiseCoord * 3.0 + vec3(1.2, 0.5, 0.8)) * 0.5;
    
    // Combine noise and normalize to [0, 1] range
    float combinedNoise = (n1 + n2) / 1.5;
    combinedNoise = combinedNoise * 0.5 + 0.5;
    
    // Shape mask: fade at top and bottom to create organic flame boundaries
    float verticalFade = smoothstep(0.0, 0.15, vUv.y) * smoothstep(1.0, 0.75, vUv.y);
    
    float finalIntensity = combinedNoise * verticalFade * 1.4;
    
    // Threshold or alpha erosion to create lick contours
    float opacity = smoothstep(0.1, 0.45, finalIntensity);
    
    // Color mapping based on active theme
    vec3 color = vec3(0.0);
    if (uIsGold > 0.5) {
      // Premium Gold/Teal Flame Ramp: Deep Indigo base ➔ Glowing Teal ➔ Brilliant Gold ➔ Soft White core
      vec3 colTeal = vec3(0.0, 0.66, 0.59);
      vec3 colGold = vec3(0.83, 0.68, 0.21);
      vec3 colWhite = vec3(1.0, 0.95, 0.85);
      
      if (finalIntensity < 0.35) {
        color = mix(colTeal * 0.3, colTeal, finalIntensity / 0.35);
      } else if (finalIntensity < 0.7) {
        color = mix(colTeal, colGold, (finalIntensity - 0.35) / 0.35);
      } else {
        color = mix(colGold, colWhite, (finalIntensity - 0.7) / 0.3);
      }
    } else {
      // Standard Flame Ramp: Deep Crimson ➔ Flame Orange ➔ Warm Yellow ➔ Bright Cream core
      vec3 colCrimson = vec3(0.93, 0.15, 0.27);
      vec3 colOrange = vec3(0.95, 0.39, 0.1);
      vec3 colYellow = vec3(1.0, 0.82, 0.4);
      vec3 colWhite = vec3(1.0, 0.98, 0.85);
      
      if (finalIntensity < 0.25) {
        color = mix(colCrimson * 0.3, colCrimson, finalIntensity / 0.25);
      } else if (finalIntensity < 0.55) {
        color = mix(colCrimson, colOrange, (finalIntensity - 0.25) / 0.3);
      } else if (finalIntensity < 0.8) {
        color = mix(colOrange, colYellow, (finalIntensity - 0.55) / 0.25);
      } else {
        color = mix(colYellow, colWhite, (finalIntensity - 0.8) / 0.2);
      }
    }
    
    // Modulate opacity near the tip to blend smoothly into nothingness
    float alpha = opacity * (1.0 - vUv.y * 0.5);
    
    gl_FragColor = vec4(color * 1.5, alpha * 0.9);
  }
`;

function ThreeDFlame({ isGold }: { isGold: boolean }) {
  const outerMeshRef = useRef<THREE.Mesh>(null);
  const innerMeshRef = useRef<THREE.Mesh>(null);
  const outerMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const innerMaterialRef = useRef<THREE.ShaderMaterial>(null);
  const lightRef = useRef<THREE.PointLight>(null);
  const sparkRefs = useRef<THREE.Mesh[]>([]);

  const [sparks, setSparks] = useState<any[]>([]);

  // Generate randomized float parameters on mount to maintain hook purity
  useEffect(() => {
    const arr = [];
    for (let i = 0; i < 8; i++) {
      arr.push({
        x: (Math.random() - 0.5) * 0.08,
        y: -0.3 + Math.random() * 0.6,
        z: (Math.random() - 0.5) * 0.08,
        speed: 0.35 + Math.random() * 0.4,
        swaySpeed: 4.0 + Math.random() * 5.0,
        swayAmp: 0.02 + Math.random() * 0.03,
        size: 0.015 + Math.random() * 0.015,
        orbitSpeed: (Math.random() > 0.5 ? 1 : -1) * (1.5 + Math.random() * 2.0),
        orbitRadius: 0.08 + Math.random() * 0.08,
      });
    }
    setSparks(arr);
  }, []);

  const outerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIsGold: { value: isGold ? 1.0 : 0.0 }
  }), [isGold]);

  const innerUniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIsGold: { value: isGold ? 1.0 : 0.0 }
  }), [isGold]);

  useFrame((state, delta) => {
    const time = state.clock.getElapsedTime();

    // 1. Update shader uniforms
    if (outerMaterialRef.current) {
      outerMaterialRef.current.uniforms.uTime.value = time;
    }
    if (innerMaterialRef.current) {
      innerMaterialRef.current.uniforms.uTime.value = time * 1.35; // scroll inner slightly faster
    }

    // 2. Slow counter-rotations of the cylinders
    if (outerMeshRef.current) {
      outerMeshRef.current.rotation.y = time * 0.4;
    }
    if (innerMeshRef.current) {
      innerMeshRef.current.rotation.y = -time * 0.75;
    }

    // 3. Update point light intensity to flicker organically
    if (lightRef.current) {
      lightRef.current.intensity = 2.0 + Math.sin(time * 18.0) * 0.5 + Math.sin(time * 35.0) * 0.25;
    }

    // 4. Update spark positions
    if (sparks.length > 0) {
      sparks.forEach((p, idx) => {
        const mesh = sparkRefs.current[idx];
        if (mesh) {
          // Increment height
          p.y += delta * p.speed;

          // Loop back to bottom when it escapes the top boundary
          if (p.y > 0.35) {
            p.y = -0.3;
            p.x = (Math.random() - 0.5) * 0.08;
            p.z = (Math.random() - 0.5) * 0.08;
          }

          // Apply convective sway + orbit
          const angle = time * p.orbitSpeed;
          const swayX = Math.sin(time * p.swaySpeed) * p.swayAmp;
          const swayZ = Math.cos(time * p.swaySpeed * 0.85) * p.swayAmp;

          const currentX = p.x + Math.sin(angle) * p.orbitRadius + swayX;
          const currentZ = p.z + Math.cos(angle) * p.orbitRadius + swayZ;

          mesh.position.set(currentX, p.y, currentZ);

          // Shrink size as it rises
          const hNorm = (p.y + 0.3) / 0.65; // 0 to 1
          const currentScale = Math.max(0.001, (1.0 - hNorm * 0.85) * p.size);
          mesh.scale.setScalar(currentScale);
        }
      });
    }
  });

  return (
    <group>
      {/* Flickering light source at the base of the flame */}
      <pointLight 
        ref={lightRef} 
        color={isGold ? "#D4AF37" : "#F26419"} 
        distance={0.8} 
        decay={2.0} 
        position={[0, -0.2, 0.1]} 
      />

      {/* Outer volumetric flame mantle */}
      <mesh ref={outerMeshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.02, 0.16, 0.65, 16, 16, true]} />
        <shaderMaterial
          ref={outerMaterialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={outerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Inner hot core */}
      <mesh ref={innerMeshRef} position={[0, 0, 0]}>
        <cylinderGeometry args={[0.01, 0.11, 0.5, 16, 16, true]} />
        <shaderMaterial
          ref={innerMaterialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={innerUniforms}
          transparent
          depthWrite={false}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
        />
      </mesh>

      {/* Rising spark embers */}
      {sparks.map((_, idx) => (
        <mesh 
          key={idx} 
          ref={(el) => { if (el) sparkRefs.current[idx] = el; }}
        >
          <tetrahedronGeometry args={[1]} />
          <meshBasicMaterial 
            color={isGold ? "#00A896" : "#FFD166"} 
            transparent 
            opacity={0.85} 
          />
        </mesh>
      ))}
    </group>
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
    if (!rect) {
      setTooltipStyle({
        position: "fixed",
        left: "50%",
        top: "50%",
        transform: "translate(-50%, -50%)",
        transition: "all 0.3s ease",
      });
      return;
    }

    const cardWidth = 350;
    const cardHeight = 250;
    const gap = 16;
    
    let left = rect.x + rect.width / 2 - cardWidth / 2;
    let top = rect.y + rect.height + gap;
    
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    
    if (left < 16) left = 16;
    if (left + cardWidth > viewportWidth - 16) {
      left = viewportWidth - cardWidth - 16;
    }
    
    if (top + cardHeight > viewportHeight - 16) {
      top = rect.y - cardHeight - gap;
      if (top < 16) {
        top = viewportHeight / 2 - cardHeight / 2;
      }
    }
    
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

  const handleNodeClick = (node: Node) => {
    const state = getNodeState(node.id);
    if (state === "locked") return; // cannot select locked oases
    
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
      return;
    }

    setConsoleLogs(prev => [...prev, "All test cases passed successfully!", "Syncing ledger write to databases..."]);
    setValidationStatus("success");
    setFailCount(0);

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
        setConsoleLogs(prev => [...prev, "Ledger synchronized. Oasis successfully unlocked!"]);
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

  // Math coordinates for oases bezier curve mapping
  const nodeSpacingY = 135;
  const mapHeight = nodes.length * nodeSpacingY + 80;
  const nodeCoordinates = nodes.map((node, index) => {
    const y = index * nodeSpacingY + 70;
    // alternate x coordinates left and right
    const x = index % 2 === 0 ? 90 : 310;
    return { id: node.id, x, y };
  });

  // Calculate SVG paths
  let pathD = "";
  if (nodeCoordinates.length > 0) {
    pathD = `M ${nodeCoordinates[0].x} ${nodeCoordinates[0].y}`;
    for (let i = 0; i < nodeCoordinates.length - 1; i++) {
      const curr = nodeCoordinates[i];
      const next = nodeCoordinates[i + 1];
      const cp1X = curr.x;
      const cp1Y = curr.y + 70;
      const cp2X = next.x;
      const cp2Y = next.y - 70;
      pathD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
    }
  }

  let completedPathD = "";
  const activeIndex = nodes.findIndex(n => n.id === progress.currentActiveNode);
  const maxCompletedIndex = activeIndex !== -1 ? activeIndex : 0;
  if (nodeCoordinates.length > 0 && maxCompletedIndex > 0) {
    completedPathD = `M ${nodeCoordinates[0].x} ${nodeCoordinates[0].y}`;
    for (let i = 0; i < maxCompletedIndex; i++) {
      const curr = nodeCoordinates[i];
      const next = nodeCoordinates[i + 1];
      const cp1X = curr.x;
      const cp1Y = curr.y + 70;
      const cp2X = next.x;
      const cp2Y = next.y - 70;
      completedPathD += ` C ${cp1X} ${cp1Y}, ${cp2X} ${cp2Y}, ${next.x} ${next.y}`;
    }
  }

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
          
          {/* Survival streak widget with hydration wave animation */}
          {streak && (() => {
            const streakCount = streak.currentStreak;
            const isGoldStreak = streakCount >= 7;
            return (
              <div 
                id="tour-streak" 
                className={`flex items-center space-x-1 px-2.5 h-[30px] rounded-xl border transition-all ${
                  isGoldStreak 
                    ? "border-gold-sand/40 text-gold-sand shadow-[0_0_12px_rgba(212,175,55,0.35)] animate-pulse" 
                    : "border-orange-flame/30 text-orange-flame"
                }`}
              >
                {/* 3D Wireframe Flame Canvas */}
                <div className="h-6 w-5 relative overflow-hidden flex items-center justify-center flex-shrink-0">
                  <Canvas camera={{ position: [0, 0, 1.25], fov: 45 }} gl={{ alpha: true }}>
                    <ambientLight intensity={1.5} />
                    <ThreeDFlame isGold={isGoldStreak} />
                  </Canvas>
                </div>
                <span className="leading-none text-[10px] sm:text-xs font-bold whitespace-nowrap select-none">
                  {streakCount} {streakCount === 1 ? "Day" : "Days"}
                </span>
              </div>
            );
          })()}

          {/* Skill IQ Assessment Button */}
          <button
            onClick={() => router.push("/assessment")}
            className="flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border border-teal-spring/30 text-teal-spring hover:bg-teal-spring/10 transition-all cursor-pointer"
          >
            <Brain className="h-4 w-4" />
            <span>Skill IQ</span>
          </button>

          {/* Marketplace Button */}
          <button
            onClick={() => router.push("/marketplace")}
            className="flex items-center space-x-1 px-3 h-[30px] py-0 rounded-xl text-xs font-semibold border border-gold-sand/30 text-gold-sand hover:bg-gold-sand/10 transition-all cursor-pointer"
          >
            <Sparkles className="h-4 w-4" />
            <span>Bazaar</span>
          </button>

          {/* Leave Caravan Logout Button */}
          <button
            onClick={() => {
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
            onClick={() => setChatOpen(!chatOpen)}
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
              <div className="flex items-start space-x-3 text-left">
                <ShieldAlert className="h-5 w-5 text-orange-flame flex-shrink-0 mt-0.5 animate-pulse" />
                <div>
                  <h4 className="text-xs font-bold text-orange-flame font-serif uppercase tracking-wide">Caravan Guide Intervention</h4>
                  <p className="text-[10px] text-text-secondary leading-relaxed mt-0.5">
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
            <div id="tour-map" className="glass-panel rounded-2xl p-5 flex flex-col min-h-[420px] max-h-[580px] overflow-y-auto relative">
              <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase mb-6">Learning Trail Map</h3>
              
              <div className="relative flex-1" style={{ height: `${mapHeight}px` }}>
                
                {/* SVG path connector lines representing Silk Road */}
                <svg className="absolute inset-0 w-full h-full pointer-events-none" viewBox={`0 0 400 ${mapHeight}`} preserveAspectRatio="none">
                  {/* Background full dash trail */}
                  <path
                    d={pathD}
                    fill="none"
                    stroke="rgba(212, 175, 55, 0.15)"
                    strokeWidth="4"
                    strokeDasharray="8 8"
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
                      className="drop-shadow-[0_0_6px_rgba(0,168,150,0.4)]"
                    />
                  )}
                  <defs>
                    <linearGradient id="trail-gradient" x1="0%" y1="0%" x2="0%" y2="100%">
                      <stop offset="0%" stopColor="#00A896" />
                      <stop offset="100%" stopColor="#D4AF37" />
                    </linearGradient>
                  </defs>
                </svg>

                {/* Animated Camel Caravan element sitting on active node */}
                {activeCoord && (
                  <div 
                    style={{ 
                      left: `${(activeCoord.x / 400) * 100}%`, 
                      top: `${(activeCoord.y / mapHeight) * 100}%`,
                    }}
                    className="absolute z-20 pointer-events-none transition-all duration-1000 ease-in-out camel-walk -translate-x-1/2 -translate-y-[120%]"
                  >
                    <div className="bg-indigo-oasis/95 border border-gold-sand rounded-xl px-2 py-1 flex items-center space-x-1 shadow-[0_0_12px_rgba(212,175,55,0.4)] backdrop-blur-sm">
                      <span className="text-sm">🐫</span>
                      <span className="text-[8px] font-bold text-gold-sand tracking-wide uppercase font-serif">Caravan</span>
                    </div>
                  </div>
                )}

                {/* Oases node elements */}
                {nodes.map((node, index) => {
                  const coord = nodeCoordinates[index];
                  const state = getNodeState(node.id);
                  const isSelected = selectedNode?.id === node.id;
                  
                  return (
                    <button
                      key={node.id}
                      style={{
                        left: `${(coord.x / 400) * 100}%`,
                        top: `${(coord.y / mapHeight) * 100}%`,
                      }}
                      onClick={() => handleNodeClick(node)}
                      className={`absolute z-10 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center group cursor-pointer focus:outline-none ${
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
                        {state === "completed" ? (
                          <CheckCircle className="h-5 w-5" />
                        ) : state === "locked" ? (
                          <Lock className="h-4 w-4 text-text-secondary/40" />
                        ) : (
                          <span className="text-xs font-bold text-text-primary">{index + 1}</span>
                        )}
                      </div>

                      {/* Mini Tag Label */}
                      <div className="mt-2 bg-midnight/90 border border-text-secondary/10 px-2 py-0.5 rounded text-[8px] font-bold text-text-primary max-w-[85px] truncate text-center group-hover:border-gold-sand/40 transition-colors shadow-sm font-sans uppercase">
                        {node.title}
                      </div>
                    </button>
                  );
                })}

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
                          {isFrustrated && (
                            <span className="inline-flex items-center mt-1 text-[7px] text-orange-flame bg-orange-flame/10 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider">
                              Distressed
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
                      {selectedNode.resources.map((res, idx) => {
                        let IconComponent = FileText;
                        let iconColor = "text-text-secondary";
                        if (res.type === "video") {
                          IconComponent = Play;
                          iconColor = "text-teal-spring fill-teal-spring/20";
                        } else if (res.type === "article") {
                          IconComponent = BookOpen;
                          iconColor = "text-gold-sand";
                        }

                        return (
                          <button
                            key={idx}
                            onClick={(e) => handleResourceClick(e, res)}
                            className="flex items-center space-x-2.5 p-2 rounded-xl bg-indigo-oasis/40 border border-text-secondary/5 hover:border-gold-sand/35 hover:bg-indigo-oasis/80 transition-all text-[10px] text-text-primary cursor-pointer text-left w-full group"
                          >
                            <div className={`p-1.5 rounded-lg bg-midnight/80 border border-text-secondary/10 flex-shrink-0 group-hover:border-gold-sand/20 ${iconColor}`}>
                              <IconComponent className="h-3.5 w-3.5" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="truncate font-semibold text-text-primary group-hover:text-gold-sand transition-colors">{res.title}</p>
                              <p className="text-[7.5px] uppercase font-bold text-text-secondary/65 tracking-wider">{res.type}</p>
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
                  </div>

                  {/* Interactive compiler console logs (Styled Retro Terminal) */}
                  <div className="terminal-overlay bg-black/95 rounded-xl border border-text-secondary/15 font-mono text-[11px] text-teal-spring flex flex-col overflow-hidden max-h-40 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
                    {/* macOS-style Window control header bar */}
                    <div className="bg-[#121214] px-4 py-2 border-b border-text-secondary/10 flex items-center justify-between text-[10px] text-text-secondary/80 select-none">
                      <div className="flex items-center space-x-1.5">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm"></span>
                        <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm"></span>
                      </div>
                      <span className="flex items-center text-[9px] uppercase tracking-wider font-semibold text-text-secondary/70">
                        <Terminal className="h-3 w-3 mr-1 text-gold-sand animate-pulse" /> Sandbox Terminal Console
                      </span>
                      <span className="cursor-blink text-teal-spring font-semibold text-[9px]">ACTIVE</span>
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
              
              {/* Step details */}
              <div className="space-y-1.5">
                <h3 className="text-sm font-bold font-serif text-text-primary uppercase tracking-wide">
                  {tourStep === 1 && "Welcome, Traveler! 🐫"}
                  {tourStep === 2 && "The Learning Trail Map 🗺️"}
                  {tourStep === 3 && "Daily Streak Canteen 🔥"}
                  {tourStep === 4 && "Challenge Sandbox 💻"}
                  {tourStep === 5 && "Master Marco Polo Guidance 🧭"}
                  {tourStep === 6 && "Caravanserai Community Forum 🎪"}
                </h3>
                <p className="text-xs text-text-secondary leading-relaxed font-sans">
                  {tourStep === 1 && "Welcome to your Silk Road learning expedition trail. Let's take a quick 1-minute tour of your caravan instruments."}
                  {tourStep === 2 && "This is your learning path. The bobbing Camel Caravan represents your active oasis node. Click unlocked nodes to select challenges along the Bezier trail."}
                  {tourStep === 3 && "Keep your streak active by solving challenges daily. Your streak count dynamically scales the water level in your canteen. Complete 7+ consecutive days to unleash golden energy!"}
                  {tourStep === 4 && "Write Javascript code to solve the active coding puzzle. The UNIX terminal console below prints sandbox execution results, worker timeouts, and syntax compile logs."}
                  {tourStep === 5 && "Your companion Master Marco Polo guides you without spoiling solutions. Get hints, explanation logs, and real-time Big O complexity reviews automatically on submissions."}
                  {tourStep === 6 && "Share scrolls, ask questions, or trade insights. If the NLP guide detects high frustration, it will offer customized interventions (e.g. mentor discounts or path simplification)."}
                </p>
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
