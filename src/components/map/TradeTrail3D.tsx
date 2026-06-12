import React, { useMemo, useRef, useEffect } from "react";
import { useFrame } from "@react-three/fiber";
import { Line } from "@react-three/drei";
import * as THREE from "three";

interface TradeTrail3DProps {
  start: [number, number, number];
  end: [number, number, number];
  isActive: boolean;
  order: number;
}

export function TradeTrail3D({ start, end, isActive, order }: TradeTrail3DProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const progress = useRef<number>(0);

  // Set random starting progress position on mount to satisfy react-hooks/purity
  useEffect(() => {
    progress.current = Math.random();
  }, []);

  // Formulate 3D curved connector Bezier line (lifted up in Y)
  const curve = useMemo(() => {
    const startVec = new THREE.Vector3(...start);
    const endVec = new THREE.Vector3(...end);
    
    const midPoint = new THREE.Vector3()
      .addVectors(startVec, endVec)
      .multiplyScalar(0.5);
    
    // curve upward in Y
    midPoint.y += 1.2; 
    
    return new THREE.CatmullRomCurve3([startVec, midPoint, endVec]);
  }, [start, end]);

  // Points of the connection line
  const pathPoints = useMemo(() => curve.getPoints(30), [curve]);

  // Animate the single data packet caravan along the curve
  useFrame((state, delta) => {
    if (meshRef.current) {
      // Speed is offset slightly by order so they move asynchronously
      const speed = 0.2 + (order % 3) * 0.05;
      progress.current += delta * speed;
      if (progress.current > 1) {
        progress.current = 0;
      }
      
      const nextPos = curve.getPoint(progress.current);
      meshRef.current.position.copy(nextPos);
    }
  });

  return (
    <group>
      {/* Drei's high-quality line renderer (avoids SVG JSX element conflicts) */}
      <Line
        points={pathPoints}
        color={isActive ? "#00A896" : "#8D99AE"}
        opacity={isActive ? 0.35 : 0.08}
        transparent
        lineWidth={1.2}
      />

      {/* Pulsing caravan data packet particle mesh (sphere) */}
      {isActive && (
        <mesh ref={meshRef}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshBasicMaterial 
            color="#D4AF37" 
            transparent 
            opacity={0.9} 
          />
        </mesh>
      )}
    </group>
  );
}
