import React, { useRef, useState } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import * as THREE from "three";

interface NodeData {
  id: string;
  title: string;
  difficulty: string;
  order: number;
}

interface OasisNode3DProps {
  position: [number, number, number];
  node: NodeData;
  status: "locked" | "unlocked" | "active";
  onSelectNode: (id: string) => void;
}

export function OasisNode3D({ position, node, status, onSelectNode }: OasisNode3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);

  // Animate elements every frame
  useFrame((state, delta) => {
    if (meshRef.current) {
      meshRef.current.rotation.y += delta * 0.4;
      meshRef.current.rotation.x += delta * 0.2;
      
      // Floating vertical bobbing animation
      meshRef.current.position.y = position[1] + Math.sin(state.clock.getElapsedTime() * 1.8 + node.order) * 0.12;
    }
    if (coreRef.current) {
      coreRef.current.rotation.z -= delta * 0.8;
      coreRef.current.rotation.y += delta * 0.3;
    }
  });

  // Color mappings based on status
  const getColor = () => {
    if (status === "active") return "#D4AF37"; // Desert Gold
    if (status === "unlocked") return "#00A896"; // Turquoise Spring
    return "#8D99AE"; // Muted locked grey
  };

  const isLocked = status === "locked";

  return (
    <group position={position}>
      {/* Outer Cage Wireframe */}
      <mesh 
        ref={meshRef} 
        onClick={() => onSelectNode(node.id)}
        onPointerOver={() => {
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
      >
        <octahedronGeometry args={[0.55, 1]} />
        <meshStandardMaterial 
          color={getColor()} 
          wireframe
          emissive={getColor()}
          emissiveIntensity={hovered ? 3.0 : status === "active" ? 2.0 : 0.4}
          transparent
          opacity={isLocked ? 0.35 : 0.85}
        />
      </mesh>

      {/* Inner Glowing Core Core */}
      {!isLocked && (
        <mesh ref={coreRef}>
          <dodecahedronGeometry args={[0.22]} />
          <meshStandardMaterial 
            color={getColor()}
            emissive={getColor()}
            emissiveIntensity={status === "active" ? 3.5 : 1.5}
          />
        </mesh>
      )}

      {/* Active Pulse halo ring */}
      {status === "active" && (
        <mesh>
          <torusGeometry args={[0.9, 0.03, 8, 32]} />
          <meshBasicMaterial 
            color="#D4AF37" 
            transparent 
            opacity={0.35} 
          />
        </mesh>
      )}

      {/* Interactive HTML Details Label */}
      {(hovered || status === "active") && (
        <Html distanceFactor={10} position={[0, 1.1, 0]}>
          <div 
            onClick={() => onSelectNode(node.id)}
            className={`cursor-pointer px-3 py-2 rounded-xl text-[10px] w-44 shadow-2xl backdrop-blur-md transition-all duration-300 border ${
              status === "active" 
                ? "bg-[#0D1B2A]/95 border-[#D4AF37] text-text-primary shadow-[0_0_12px_rgba(212,175,55,0.25)]" 
                : "bg-[#070F19]/90 border-text-secondary/20 text-text-secondary hover:border-[#00A896]/50 hover:text-text-primary"
            } uppercase select-none`}
          >
            <div className="font-bold tracking-wide line-clamp-1">{node.title}</div>
            <div className="flex justify-between items-center mt-1 text-[8px] tracking-widest font-mono">
              <span className={status === "active" ? "text-[#D4AF37]" : "text-teal-spring"}>
                {status}
              </span>
              <span className="opacity-60">{node.difficulty}</span>
            </div>
          </div>
        </Html>
      )}
    </group>
  );
}
