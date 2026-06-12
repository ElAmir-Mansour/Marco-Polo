"use client";

import React, { Suspense, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import { OasisNode3D } from "./OasisNode3D";
import { TradeTrail3D } from "./TradeTrail3D";

interface NodeData {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
}

interface SilkRoad3DMapProps {
  nodes: NodeData[];
  completedSteps: string[];
  currentActiveNode: string;
  onSelectNode: (id: string) => void;
}

export default function SilkRoad3DMap({
  nodes,
  completedSteps,
  currentActiveNode,
  onSelectNode,
}: SilkRoad3DMapProps) {
  // Convert 2D layout index positions to 3D coordinate vectors
  const nodeCoordinates = useMemo(() => {
    return nodes.map((node, index) => {
      // Alternate x coordinate left and right
      const x = index % 2 === 0 ? -2.2 : 2.2;
      // Climbing upward along the Y axis representing the ascending path of knowledge
      const y = index * 2.2 - (nodes.length * 1.1); // center vertical axis
      // Slight Z coordinates depth variations
      const z = index % 3 === 0 ? -0.8 : index % 3 === 1 ? 0.8 : 0;
      
      return {
        id: node.id,
        position: [x, y, z] as [number, number, number],
      };
    });
  }, [nodes]);

  // Map coordinates by ID for fast lookup
  const coordsMap = useMemo(() => {
    const map = new Map<string, [number, number, number]>();
    nodeCoordinates.forEach((c) => {
      map.set(c.id, c.position);
    });
    return map;
  }, [nodeCoordinates]);

  // Helper to determine node status
  const getNodeStatus = (nodeId: string) => {
    if (nodeId === currentActiveNode) return "active";
    if (completedSteps.includes(nodeId)) return "unlocked";
    return "locked";
  };

  return (
    <div className="w-full h-full bg-[#070F19] rounded-2xl overflow-hidden border border-[#D4AF37]/15 relative">
      
      {/* 3D WebGL Canvas */}
      <Canvas camera={{ position: [0, 0, 10], fov: 60 }} gl={{ antialias: true }}>
        
        {/* Lights setup */}
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#D4AF37" />
        <directionalLight position={[-5, 5, -5]} intensity={0.5} color="#00A896" />
        
        {/* User Navigation controls */}
        <OrbitControls 
          enableDamping 
          dampingFactor={0.05}
          maxDistance={20}
          minDistance={3.5}
        />
        
        {/* Glowing cyber dust stars */}
        <Stars radius={100} depth={50} count={1000} factor={3} saturation={0.5} fade speed={1.5} />
        
        <Suspense fallback={null}>
          <group>
            {/* Draw curved trade routes connecting nodes */}
            {nodes.slice(0, -1).map((node, idx) => {
              const nextNode = nodes[idx + 1];
              const startPos = coordsMap.get(node.id);
              const endPos = coordsMap.get(nextNode.id);
              
              if (!startPos || !endPos) return null;
              
              const isStartUnlocked = completedSteps.includes(node.id) || node.id === currentActiveNode;
              const isEndUnlocked = completedSteps.includes(nextNode.id) || nextNode.id === currentActiveNode;
              
              return (
                <TradeTrail3D 
                  key={`trail-${node.id}`} 
                  start={startPos} 
                  end={endPos} 
                  isActive={isStartUnlocked && isEndUnlocked}
                  order={idx}
                />
              );
            })}
            
            {/* Draw oases checkpoints */}
            {nodes.map((node) => {
              const coords = coordsMap.get(node.id);
              if (!coords) return null;
              
              return (
                <OasisNode3D 
                  key={node.id} 
                  position={coords} 
                  node={node}
                  status={getNodeStatus(node.id)}
                  onSelectNode={onSelectNode}
                />
              );
            })}
          </group>
        </Suspense>

        {/* Cinematic glow pass effect */}
        <EffectComposer>
          <Bloom luminanceThreshold={0.15} luminanceSmoothing={0.9} intensity={1.2} />
        </EffectComposer>
        
      </Canvas>

      {/* Helper Overlay HUD */}
      <div className="absolute bottom-4 left-4 pointer-events-none bg-midnight/80 border border-gold-sand/15 px-3 py-1.5 rounded-xl text-[9px] font-bold text-text-secondary select-none tracking-widest uppercase flex items-center space-x-3">
        <span className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#D4AF37] shadow-[0_0_6px_#D4AF37]"></span>
          <span>Active</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00A896] shadow-[0_0_6px_#00A896]"></span>
          <span>Unlocked</span>
        </span>
        <span className="flex items-center space-x-1">
          <span className="h-1.5 w-1.5 rounded-full bg-[#8D99AE]"></span>
          <span>Locked</span>
        </span>
      </div>
      
    </div>
  );
}
