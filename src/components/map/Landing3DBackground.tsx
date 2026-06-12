"use client";

import React, { Suspense, useMemo, useRef, useEffect, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Stars, Line, Html, OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import * as THREE from "three";

// Simulated Telemetry data for each system routing state
const HUDData = [
  {
    op: "QUERY: GET_ROADMAP_PROGRESS",
    latency: "2ms",
    target: "Edge Cache Node (us-east-1)",
    color: "#00A896",
    dbType: "Vercel Edge Cache (Hot state read)",
    logs: [
      "Incoming request from client gateway...",
      "Route matched: /api/roadmaps/javascript-trail",
      "Cache HIT: serving from Vercel Edge CDN...",
      "Payload: 4.8 KB. Transfer complete."
    ]
  },
  {
    op: "MUTATION: UPDATE_USER_STREAK",
    latency: "5ms",
    target: "DynamoDB Table: SilkRoad_UserStreaks",
    color: "#F26419",
    dbType: "AWS DynamoDB (High-speed NoSQL write)",
    logs: [
      "ACORN_AST verification check: PASSED",
      "Updating user hydration metrics...",
      "DynamoDB PutItem: userId_d8d48750-aa77-482d",
      "Streak incremented. Canteen level: 100%."
    ]
  },
  {
    op: "TRANSACTION: CREATE_MENTOR_BOOKING",
    latency: "35ms",
    target: "Aurora RDS PG Cluster (Multi-AZ)",
    color: "#D4AF37",
    dbType: "AWS RDS Aurora (PostgreSQL ACID relational)",
    logs: [
      "Acquiring locks for multi-table insertion...",
      "Charging 50 platform coins from wallet...",
      "RDS PG row inserted: bookings_tx_992a",
      "Transaction committed. Mentor stream synced."
    ]
  },
  {
    op: "STREAM: CO_PILOT_GUIDE_PROMPT",
    latency: "82ms",
    target: "Vercel AI SDK -> Gemini API",
    color: "#8D5AEC",
    dbType: "Vercel AI SDK Edge Client Streams",
    logs: [
      "AI Caravan Master query: 'Explain Dijkstra...'",
      "Sending request payload to Gemini API...",
      "Receiving response token streams...",
      "Payload: 'To cross the desert...' (184 tokens)"
    ]
  }
];

// Telemetry HUD overlay in the top-left margin
function TelemetryHUD({ routingPhase }: { routingPhase: number }) {
  const currentData = HUDData[routingPhase];
  const [typedLogs, setTypedLogs] = useState<string[]>([]);

  // Sync typed logs simulation when routing phase changes
  useEffect(() => {
    setTypedLogs([]);
    let currentIdx = 0;
    const logInterval = setInterval(() => {
      if (currentIdx < currentData.logs.length) {
        setTypedLogs((prev) => [...prev, currentData.logs[currentIdx]]);
        currentIdx++;
      } else {
        clearInterval(logInterval);
      }
    }, 850); // Output a new log line every 850ms
    return () => clearInterval(logInterval);
  }, [routingPhase, currentData.logs]);

  // Color mappings
  const phaseColors = {
    0: "border-[#00A896]/30 text-[#00A896]",
    1: "border-[#F26419]/30 text-[#F26419]",
    2: "border-[#D4AF37]/30 text-[#D4AF37]",
    3: "border-[#8D5AEC]/30 text-[#8D5AEC]",
  };

  const glowBgColors = {
    0: "bg-[#00A896]/10",
    1: "bg-[#F26419]/10",
    2: "bg-[#D4AF37]/10",
    3: "bg-[#8D5AEC]/10",
  };

  const badgeColors = {
    0: "bg-[#00A896]/20 text-[#00A896] border-[#00A896]/30",
    1: "bg-[#F26419]/20 text-[#F26419] border-[#F26419]/30",
    2: "bg-[#D4AF37]/20 text-[#D4AF37] border-[#D4AF37]/30",
    3: "bg-[#8D5AEC]/20 text-[#8D5AEC] border-[#8D5AEC]/30",
  };

  return (
    <div className={`hidden md:block absolute top-32 left-8 z-20 w-80 p-4 rounded-2xl border backdrop-blur-md bg-[#070F19]/80 shadow-2xl transition-all duration-500 pointer-events-auto ${phaseColors[routingPhase as keyof typeof phaseColors]}`}>
      <div className="flex items-center justify-between border-b border-white/5 pb-2 mb-3">
        <div className="flex items-center space-x-2">
          <div className="h-2 w-2 rounded-full animate-pulse" style={{ backgroundColor: currentData.color }} />
          <span className="text-[9px] font-mono font-bold uppercase tracking-widest text-[#F4F6F8]">System Telemetry</span>
        </div>
        <span className={`text-[8px] font-mono px-2 py-0.5 rounded border ${badgeColors[routingPhase as keyof typeof badgeColors]}`}>
          {currentData.latency}
        </span>
      </div>

      <div className="space-y-1.5 font-mono text-[9px]">
        <div className="flex justify-between">
          <span className="text-[#8D99AE]">OP:</span>
          <span className="text-[#F4F6F8] font-bold">{currentData.op}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#8D99AE]">TARGET:</span>
          <span className="text-[#F4F6F8] truncate max-w-[180px] text-right">{currentData.target}</span>
        </div>
        <div className="flex justify-between border-b border-white/5 pb-2 mb-2">
          <span className="text-[#8D99AE]">INFRA:</span>
          <span className="text-[#F4F6F8]/70">{currentData.dbType}</span>
        </div>

        {/* Realistic Log Stream */}
        <div className="h-24 font-mono text-[8px] space-y-1 overflow-hidden bg-black/40 rounded-xl p-2.5 border border-white/5">
          {typedLogs.map((log, index) => (
            <div key={index} className="flex items-start space-x-1 animate-fadeIn">
              <span className="text-[#8D99AE] select-none">&gt;</span>
              <span className="text-[#F4F6F8]/90 break-all leading-normal">{log}</span>
            </div>
          ))}
          {typedLogs.length < currentData.logs.length && (
            <div className="flex items-center space-x-1">
              <span className="text-[#8D99AE] select-none">&gt;</span>
              <span className="h-2.5 w-1 bg-[#F4F6F8] animate-pulse" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to draw code character symbols to canvas texture dynamically
function createSymbolTexture(symbol: string, color: string) {
  if (typeof window === "undefined") return null;
  const canvas = document.createElement("canvas");
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext("2d");
  if (ctx) {
    ctx.clearRect(0, 0, 64, 64);
    ctx.font = "bold 34px monospace";
    ctx.fillStyle = color;
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = color;
    ctx.shadowBlur = 8;
    ctx.fillText(symbol, 32, 32);
  }
  return new THREE.CanvasTexture(canvas);
}

// Custom particle system that floats glowing programming characters (e.g. {}, =>) upwards
function FloatingCodeParticles() {
  const symbols = ["{}", "[]", "=>", "&&", "++", "==="];
  const [pointGroups, setPointGroups] = useState<Float32Array[]>([]);

  // Generate random coordinates on mount to satisfy react-hooks/purity rules
  useEffect(() => {
    const groups = symbols.map(() => {
      const count = 12;
      const positions = new Float32Array(count * 3);
      for (let i = 0; i < count; i++) {
        positions[i * 3] = (Math.random() - 0.5) * 24; // x
        positions[i * 3 + 1] = (Math.random() - 0.5) * 14; // y
        positions[i * 3 + 2] = (Math.random() - 0.5) * 12 - 3; // z
      }
      return positions;
    });
    setPointGroups(groups);
  }, []);

  // Memoize canvas textures
  const textures = useMemo(() => {
    if (typeof window === "undefined") return [];
    return symbols.map(sym => createSymbolTexture(sym, "#00A896"));
  }, []);

  const refs = useRef<any[]>([]);

  // Float particles upward and loop them
  useFrame((state, delta) => {
    refs.current.forEach((pts, idx) => {
      if (pts) {
        pts.rotation.y += delta * 0.012 * (idx % 2 === 0 ? 1 : -1);
        pts.rotation.x += delta * 0.006;

        const posAttr = pts.geometry.attributes.position;
        if (posAttr) {
          const arr = posAttr.array as Float32Array;
          for (let i = 0; i < posAttr.count; i++) {
            arr[i * 3 + 1] += delta * 0.18; // float Y velocity
            if (arr[i * 3 + 1] > 7) {
              arr[i * 3 + 1] = -7; // loop back to bottom
            }
          }
          posAttr.needsUpdate = true;
        }
      }
    });
  });

  if (textures.length === 0 || pointGroups.length === 0) return null;

  return (
    <group>
      {pointGroups.map((positions, idx) => {
        const tex = textures[idx];
        if (!tex) return null;
        return (
          <points key={idx} ref={(el) => { refs.current[idx] = el; }}>
            <bufferGeometry>
              <bufferAttribute
                attach="attributes-position"
                count={positions.length / 3}
                array={positions}
                itemSize={3}
                args={[positions, 3]}
              />
            </bufferGeometry>
            <pointsMaterial
              map={tex}
              size={0.42}
              transparent
              opacity={0.22}
              depthWrite={false}
              blending={THREE.AdditiveBlending}
            />
          </points>
        );
      })}
    </group>
  );
}

// Individual cyber-node component with dynamic BFS propagation glow highlights
interface NodeProps {
  position: [number, number, number];
  label: string;
  order: number;
  routingPhase: number;
  shapeType: "octahedron" | "sphere" | "torus" | "cylinder" | "box" | "dodecahedron";
}

function LandingNode({ position, label, order, routingPhase, shapeType }: NodeProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const ring1Ref = useRef<THREE.Mesh>(null);
  const ring2Ref = useRef<THREE.Mesh>(null);

  // Smooth lerp animations variables
  const currentScale = useRef<number>(1.0);
  const currentIntensity = useRef<number>(1.0);

  // Animate node active ranges
  const checkIsActive = (phase: number, time: number) => {
    if (order === 0) {
      if (phase === 3) return true;
      return time < 1.4;
    }
    if (order === 1) {
      if (phase === 3) return true;
      return time >= 0.6 && time < 2.0;
    }
    if (order === 2) {
      return phase === 0 && time >= 1.2 && time < 3.2;
    }
    if (order === 3) {
      return phase === 3 && time >= 1.0 && time < 4.2;
    }
    if (order === 4) {
      return phase === 2 && time >= 1.2 && time < 3.0;
    }
    if (order === 5) {
      if (phase === 1) return time >= 1.2 && time < 3.2;
      if (phase === 2) return time >= 2.0 && time < 3.8;
      return false;
    }
    return false;
  };

  const getPhaseColor = () => {
    if (routingPhase === 0) return "#00A896";
    if (routingPhase === 1) return "#F26419";
    if (routingPhase === 2) return "#D4AF37";
    return "#8D5AEC";
  };
  const color = getPhaseColor();

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime() % 4.5;
    const isNodeActive = checkIsActive(routingPhase, elapsed);

    // Smooth color / glow intensity lerping (creates fluid neon transitions)
    const targetScale = isNodeActive ? 1.25 : 1.0;
    const targetIntensity = isNodeActive ? 3.5 : 0.8;

    currentScale.current = THREE.MathUtils.lerp(currentScale.current, targetScale, 0.05);
    currentIntensity.current = THREE.MathUtils.lerp(currentIntensity.current, targetIntensity, 0.05);

    // Update outer mesh properties imperatively
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * (isNodeActive ? 0.8 : 0.3);
      meshRef.current.rotation.x += delta * 0.15;
      meshRef.current.scale.setScalar(currentScale.current);
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 1.4 + order) * 0.12;

      const mat = meshRef.current.material as THREE.MeshStandardMaterial;
      if (mat) {
        mat.emissiveIntensity = currentIntensity.current;
        mat.color.set(color);
        mat.emissive.set(color);
      }
    }

    // Update core mesh properties imperatively
    if (coreRef.current) {
      coreRef.current.rotation.z -= delta * 0.5;
      coreRef.current.scale.setScalar(currentScale.current);

      const coreMat = coreRef.current.material as THREE.MeshStandardMaterial;
      if (coreMat) {
        coreMat.emissiveIntensity = currentIntensity.current * 1.5;
        coreMat.color.set(color);
        coreMat.emissive.set(color);
      }
    }

    // Spin and color orbital rings imperatively
    if (ring1Ref.current) {
      ring1Ref.current.rotation.z += delta * 0.3;
      const ringMat = ring1Ref.current.material as THREE.MeshBasicMaterial;
      if (ringMat) {
        ringMat.opacity = currentIntensity.current * 0.08;
        ringMat.color.set(color);
      }
    }
    if (ring2Ref.current) {
      ring2Ref.current.rotation.z -= delta * 0.15;
      const ringMat = ring2Ref.current.material as THREE.MeshBasicMaterial;
      if (ringMat) {
        ringMat.opacity = currentIntensity.current * 0.04;
        ringMat.color.set(color);
      }
    }
  });

  const getGeometry = () => {
    switch (shapeType) {
      case "octahedron": return <octahedronGeometry args={[0.45, 1]} />;
      case "sphere": return <sphereGeometry args={[0.38, 12, 12]} />;
      case "torus": return <torusGeometry args={[0.32, 0.08, 8, 24]} />;
      case "dodecahedron": return <dodecahedronGeometry args={[0.35]} />;
      case "cylinder": return <cylinderGeometry args={[0.3, 0.3, 0.58, 16]} />;
      case "box": return <boxGeometry args={[0.45, 0.45, 0.45]} />;
    }
  };

  return (
    <group position={position}>
      {/* Outer rotating custom shape mesh */}
      <mesh ref={meshRef}>
        {getGeometry()}
        <meshStandardMaterial 
          color={color} 
          wireframe 
          emissive={color} 
          emissiveIntensity={0.8} 
          transparent
          opacity={0.75}
        />
      </mesh>

      {/* Inner glowing nucleus */}
      <mesh ref={coreRef}>
        <dodecahedronGeometry args={[0.15]} />
        <meshStandardMaterial 
          color={color} 
          emissive={color} 
          emissiveIntensity={1.2} 
        />
      </mesh>

      {/* Outer spinning orbital rings */}
      <mesh ref={ring1Ref} rotation={[Math.PI / 3, Math.PI / 4, 0]}>
        <ringGeometry args={[0.62, 0.64, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.08} side={THREE.DoubleSide} />
      </mesh>
      <mesh ref={ring2Ref} rotation={[Math.PI / 4, -Math.PI / 3, 0]}>
        <ringGeometry args={[0.72, 0.74, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.04} side={THREE.DoubleSide} />
      </mesh>

      {/* Floating 3D HTML Checkpoints tags */}
      <Html distanceFactor={9} position={[0, 0.95, 0]}>
        <div className="bg-[#0D1B2A]/80 border border-[#00A896]/20 px-2.5 py-1 rounded-xl text-[8px] font-mono tracking-widest text-[#F4F6F8]/80 shadow-lg backdrop-blur-sm select-none uppercase font-semibold whitespace-nowrap">
          {label}
        </div>
      </Html>
    </group>
  );
}

// Connecting trail component with simulated wave flow particles
interface TrailProps {
  start: [number, number, number];
  end: [number, number, number];
  routingPhase: number;
  trailType: "common" | "cache" | "ai" | "db" | "dynamodb" | "db_to_dynamo";
}

function LandingTrail({ start, end, routingPhase, trailType }: TrailProps) {
  const lineRef = useRef<any>(null);
  const particleRefs = useRef<THREE.Mesh[]>([]);
  const progress = useRef<number>(0);

  // Smooth lerp variables
  const currentLineWidth = useRef<number>(0.8);
  const currentOpacity = useRef<number>(0.15);

  useEffect(() => {
    progress.current = Math.random();
  }, []);

  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    const midPoint = new THREE.Vector3().addVectors(startVec, endVec).multiplyScalar(0.5);
    midPoint.y += 1.0; // lift Bezier center vector curve
    return new THREE.CatmullRomCurve3([startVec, midPoint, endVec]);
  }, [start, end]);

  const pathPoints = useMemo(() => curve.getPoints(25), [curve]);

  // Check if trail is active on routing timeline
  const checkIsTrailActive = (phase: number, time: number) => {
    if (trailType === "common") {
      if (phase === 3) return true;
      return time < 1.8;
    }
    if (trailType === "cache") {
      return phase === 0 && time >= 0.8 && time < 2.8;
    }
    if (trailType === "ai") {
      return phase === 3;
    }
    if (trailType === "db") {
      return phase === 2 && time >= 0.8 && time < 2.5;
    }
    if (trailType === "dynamodb") {
      return phase === 1 && time >= 0.8 && time < 2.8;
    }
    if (trailType === "db_to_dynamo") {
      return phase === 2 && time >= 1.6 && time < 3.5;
    }
    return false;
  };

  const getTrailColor = () => {
    if (trailType === "cache") return "#00A896";
    if (trailType === "ai") return "#8D5AEC";
    if (trailType === "db") return "#D4AF37";
    if (trailType === "dynamodb") return "#F26419";
    if (trailType === "db_to_dynamo") return "#F26419";
    if (routingPhase === 0) return "#00A896";
    if (routingPhase === 1) return "#F26419";
    if (routingPhase === 2) return "#D4AF37";
    return "#8D5AEC";
  };
  const color = getTrailColor();

  useFrame((state, delta) => {
    const elapsed = state.clock.getElapsedTime() % 4.5;
    const isTrailActive = checkIsTrailActive(routingPhase, elapsed);

    // Smooth fading updates
    const targetWidth = isTrailActive ? 1.5 : 0.8;
    const targetOpacity = isTrailActive ? 0.65 : 0.15;

    currentLineWidth.current = THREE.MathUtils.lerp(currentLineWidth.current, targetWidth, 0.05);
    currentOpacity.current = THREE.MathUtils.lerp(currentOpacity.current, targetOpacity, 0.05);

    // Update connection line properties imperatively
    if (lineRef.current && lineRef.current.material) {
      const mat = lineRef.current.material;
      mat.opacity = currentOpacity.current;
      mat.linewidth = currentLineWidth.current;
      if (mat.color) {
        mat.color.set(color);
      }
    }

    // Increment overall loop animation time
    const speed = isTrailActive ? 0.35 : 0.15;
    progress.current += delta * speed;
    if (progress.current > 1) {
      progress.current = 0;
    }

    // Update each particle in the flowing stream
    const numParticles = 4;
    particleRefs.current.forEach((ref, idx) => {
      if (ref) {
        let pProgress = (progress.current + (idx / numParticles)) % 1;
        
        // If bi-directional streaming in AI phase, reverse half of the particles
        if (routingPhase === 3 && (trailType === "common" || trailType === "ai") && idx % 2 === 0) {
          pProgress = 1 - pProgress;
        }

        const nextPos = curve.getPoint(pProgress);
        ref.position.copy(nextPos);
        
        const pMat = ref.material as THREE.MeshBasicMaterial;
        if (pMat) {
          pMat.color.set(color);
          pMat.opacity = isTrailActive ? 0.9 : 0.2;
        }
      }
    });
  });

  return (
    <group>
      <Line 
        ref={lineRef}
        points={pathPoints} 
        color={color} 
        opacity={0.15} 
        transparent 
        lineWidth={0.8} 
      />
      
      {/* Animated Flowing Multi-Particle Stream */}
      {Array.from({ length: 4 }).map((_, idx) => (
        <mesh 
          key={idx} 
          ref={(el) => { if (el) particleRefs.current[idx] = el; }}
        >
          <sphereGeometry args={[0.055, 6, 6]} />
          <meshBasicMaterial 
            color={color} 
            transparent 
            opacity={0.2} 
          />
        </mesh>
      ))}
    </group>
  );
}

// Master Canvas Scene content incorporating the custom animations
function SceneContent({ routingPhase, isFocused }: { routingPhase: number; isFocused: boolean }) {
  // System Nodes data positioning representing the system architecture topology
  const nodesData = useMemo(() => [
    { position: [-6.5, -1.8, -2.0] as [number, number, number], label: "Global User Requests", shape: "octahedron" as const },
    { position: [-3.0, 0.8, -1.0] as [number, number, number], label: "Caravanserai Gateway", shape: "sphere" as const },
    { position: [0.2, 2.2, 1.0] as [number, number, number], label: "Oasis Cache Layer", shape: "torus" as const },
    { position: [3.2, 1.5, 0.5] as [number, number, number], label: "AI Guide Edge Route", shape: "dodecahedron" as const },
    { position: [2.5, -1.2, -1.5] as [number, number, number], label: "Aurora PG Database", shape: "cylinder" as const },
    { position: [6.0, -2.0, 0.0] as [number, number, number], label: "DynamoDB Streak Engine", shape: "box" as const },
  ], []);

  useFrame((state) => {
    if (isFocused) return; // Disable parallax camera displacement when focused to let OrbitControls execute

    // Parallax camera displacement + organic breathing sway
    const elapsed = state.clock.getElapsedTime();
    const swayX = Math.sin(elapsed * 0.4) * 0.7;
    const swayY = Math.cos(elapsed * 0.3) * 0.4;

    const targetX = state.mouse.x * 2.5 + swayX;
    const targetY = state.mouse.y * 1.5 + swayY;
    
    state.camera.position.x = THREE.MathUtils.lerp(state.camera.position.x, targetX, 0.035);
    state.camera.position.y = THREE.MathUtils.lerp(state.camera.position.y, targetY, 0.035);
    state.camera.lookAt(0, 0.0, 0);
  });

  return (
    <group>
      {/* OrbitControls: active only in focus mode */}
      <OrbitControls 
        enabled={isFocused} 
        enableZoom={isFocused} 
        enableRotate={isFocused} 
        enablePan={isFocused} 
        enableDamping
      />

      {/* Lights settings */}
      <ambientLight intensity={0.3} />
      <pointLight position={[10, 10, 10]} intensity={1.5} color="#D4AF37" />
      <directionalLight position={[-10, 5, -10]} intensity={0.5} color="#00A896" />

      {/* Nebula background */}
      <Stars radius={100} depth={50} count={600} factor={2} saturation={0.5} fade speed={1} />

      {/* Floating rising programming symbols code dust */}
      <FloatingCodeParticles />

      {/* 1. Client (0) -> Gateway (1) : Common trail (all phases) */}
      <LandingTrail 
        start={nodesData[0].position} 
        end={nodesData[1].position} 
        routingPhase={routingPhase} 
        trailType="common" 
      />

      {/* 2. Gateway (1) -> Cache (2) : Cache Hit Path (Phase 0) */}
      <LandingTrail 
        start={nodesData[1].position} 
        end={nodesData[2].position} 
        routingPhase={routingPhase} 
        trailType="cache" 
      />

      {/* 3. Gateway (1) -> AI Edge (3) : AI Route Path (Phase 3) */}
      <LandingTrail 
        start={nodesData[1].position} 
        end={nodesData[3].position} 
        routingPhase={routingPhase} 
        trailType="ai" 
      />

      {/* 4. Gateway (1) -> Aurora PG (4) : Relational Query Path (Phase 2) */}
      <LandingTrail 
        start={nodesData[1].position} 
        end={nodesData[4].position} 
        routingPhase={routingPhase} 
        trailType="db" 
      />

      {/* 5. Gateway (1) -> DynamoDB (5) : Streak Write Path (Phase 1) */}
      <LandingTrail 
        start={nodesData[1].position} 
        end={nodesData[5].position} 
        routingPhase={routingPhase} 
        trailType="dynamodb" 
      />

      {/* 6. Aurora PG (4) -> DynamoDB (5) : Async Event Log (Phase 2) */}
      <LandingTrail 
        start={nodesData[4].position} 
        end={nodesData[5].position} 
        routingPhase={routingPhase} 
        trailType="db_to_dynamo" 
      />

      {/* Interactive system architecture topology nodes */}
      {nodesData.map((node, idx) => (
        <LandingNode 
          key={`node-${idx}`} 
          position={node.position} 
          label={node.label}
          order={idx}
          routingPhase={routingPhase}
          shapeType={node.shape}
        />
      ))}

      {/* Postprocessing Bloom */}
      <EffectComposer>
        <Bloom luminanceThreshold={0.12} luminanceSmoothing={0.9} intensity={1.6} />
      </EffectComposer>
    </group>
  );
}

export default function Landing3DBackground({ isFocused = false }: { isFocused?: boolean }) {
  const [routingPhase, setRoutingPhase] = useState(0);

  // Auto-switch transaction phases in a repeating loop every 4.8 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      setRoutingPhase((prev) => (prev + 1) % 4);
    }, 4800);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className={`absolute inset-0 z-0 ${isFocused ? "pointer-events-auto" : "pointer-events-none"}`}>
      {/* 3D WebGL Canvas Layer with Dynamic Opacity */}
      <div className={`absolute inset-0 z-0 transition-opacity duration-700 ease-in-out ${isFocused ? "opacity-85" : "opacity-40"}`}>
        <Canvas camera={{ position: [0, 0, 7.5], fov: 60 }} gl={{ antialias: true }}>
          <Suspense fallback={null}>
            <SceneContent routingPhase={routingPhase} isFocused={isFocused} />
          </Suspense>
        </Canvas>
      </div>

      {/* Radial Vignette Overlay: dims the center in standard mode, clears up in focus mode */}
      <div 
        className="absolute inset-0 pointer-events-none z-1 transition-all duration-700 ease-in-out"
        style={{
          background: isFocused 
            ? "radial-gradient(circle, rgba(7,15,25,0.15) 0%, rgba(7,15,25,0.45) 100%)" 
            : "radial-gradient(circle, rgba(7,15,25,0.2) 20%, rgba(7,15,25,0.85) 80%)"
        }}
      />

      {/* System Telemetry Glassmorphic HUD overlay (100% opacity for maximum readability) */}
      <TelemetryHUD routingPhase={routingPhase} />
    </div>
  );
}
