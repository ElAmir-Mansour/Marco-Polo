"use client";

import React, { useEffect, useRef, useMemo } from "react";
import { Compass, Lock, CheckCircle, Sparkles } from "lucide-react";
import { Node, Progress } from "@/store/ExpeditionStore";

interface MapCanvasProps {
  progress: Progress;
  nodeCoordinates: { id: string; x: number; y: number }[];
  activeIndex: number;
  mapHeight: number;
  selectedNode: Node | null;
  hoveredNodeId: string | null;
  setHoveredNodeId: (id: string | null) => void;
  handleNodeClick: (node: Node) => void;
  getNodeState: (nodeId: string) => "completed" | "active" | "unlocked" | "locked";
  getNodeIcon: (node: Node, index: number, state: string) => React.ReactNode;
  mapZoom: number;
  setMapZoom: React.Dispatch<React.SetStateAction<number>>;
  recenterMap: () => void;
  camelRef: React.RefObject<HTMLDivElement | null>;
  camelEmojiRef: React.RefObject<HTMLSpanElement | null>;
  isDragging: boolean;
  handleMouseDown: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseMove: (e: React.MouseEvent<HTMLDivElement>) => void;
  handleMouseUp: () => void;
  handleTouchStart: (e: React.TouchEvent<HTMLDivElement>) => void;
  handleTouchMove: (e: React.TouchEvent<HTMLDivElement>) => void;
  mapContainerRef: React.RefObject<HTMLDivElement | null>;
}

interface Star {
  x: number;
  y: number;
  size: number;
  speed: number;
  phase: number;
}

export default function ExpeditionMapCanvas({
  progress,
  nodeCoordinates,
  activeIndex,
  mapHeight,
  selectedNode,
  hoveredNodeId,
  setHoveredNodeId,
  handleNodeClick,
  getNodeState,
  getNodeIcon,
  mapZoom,
  setMapZoom,
  recenterMap,
  camelRef,
  camelEmojiRef,
  isDragging,
  handleMouseDown,
  handleMouseMove,
  handleMouseUp,
  handleTouchStart,
  handleTouchMove,
  mapContainerRef,
}: MapCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Initialize stars once
  const stars: Star[] = useMemo(() => {
    const list: Star[] = [];
    const count = 35;
    for (let i = 0; i < count; i++) {
      const x = Math.floor(Math.sin(i * 12345) * 180) + 200; // distribute 20 to 380
      const y = Math.floor((i / count) * (mapHeight - 40)) + Math.floor(Math.cos(i * 54321) * 20) + 20;
      const size = (i % 3 === 0) ? 1.5 : (i % 3 === 1) ? 2.5 : 1.0;
      const speed = 0.02 + (i % 5) * 0.01;
      const phase = Math.random() * Math.PI * 2;
      list.push({ x, y, size, speed, phase });
    }
    return list;
  }, [mapHeight]);

  // Canvas drawing loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animId: number;
    const particleFlowSpeed = 0.00015;

    // Bezier math helper
    const getBezierPoint = (p0: { x: number; y: number }, p1: { x: number; y: number }, t: number, isForward: boolean) => {
      const cp1X = p0.x;
      const cp1Y = p0.y + (isForward ? 70 : -70);
      const cp2X = p1.x;
      const cp2Y = p1.y + (isForward ? -70 : 70);
      const mt = 1 - t;
      return {
        x: Math.pow(mt, 3) * p0.x + 3 * Math.pow(mt, 2) * t * cp1X + 3 * mt * Math.pow(t, 2) * cp2X + Math.pow(t, 3) * p1.x,
        y: Math.pow(mt, 3) * p0.y + 3 * Math.pow(mt, 2) * t * cp1Y + 3 * mt * Math.pow(t, 2) * cp2Y + Math.pow(t, 3) * p1.y,
      };
    };

    const draw = () => {
      // Clear with background color (Midnight Oasis)
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#070F19";
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const time = Date.now();

      // 1. Draw Twinkling Stars
      stars.forEach((star) => {
        const opacity = 0.15 + 0.75 * Math.abs(Math.sin(time * star.speed + star.phase));
        ctx.fillStyle = `rgba(244, 246, 248, ${opacity})`;
        ctx.beginPath();
        ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
        ctx.fill();
      });

      // 2. Draw Sand Dunes at the bottom
      const duneGrad1 = ctx.createLinearGradient(0, mapHeight - 100, 0, mapHeight);
      duneGrad1.addColorStop(0, "rgba(212, 175, 55, 0.15)");
      duneGrad1.addColorStop(1, "#070F19");

      ctx.fillStyle = duneGrad1;
      ctx.beginPath();
      ctx.moveTo(0, mapHeight - 60);
      ctx.quadraticCurveTo(100, mapHeight - 85, 200, mapHeight - 65);
      ctx.quadraticCurveTo(300, mapHeight - 45, 400, mapHeight - 75);
      ctx.lineTo(400, mapHeight);
      ctx.lineTo(0, mapHeight);
      ctx.closePath();
      ctx.fill();

      const duneGrad2 = ctx.createLinearGradient(0, mapHeight - 80, 0, mapHeight);
      duneGrad2.addColorStop(0, "rgba(0, 168, 150, 0.12)");
      duneGrad2.addColorStop(1, "#070F19");

      ctx.fillStyle = duneGrad2;
      ctx.beginPath();
      ctx.moveTo(0, mapHeight - 30);
      ctx.quadraticCurveTo(120, mapHeight - 45, 240, mapHeight - 35);
      ctx.quadraticCurveTo(320, mapHeight - 25, 400, mapHeight - 40);
      ctx.lineTo(400, mapHeight);
      ctx.lineTo(0, mapHeight);
      ctx.closePath();
      ctx.fill();

      // 3. Draw Bezier Path Connector
      if (nodeCoordinates.length > 1) {
        // Under path background line
        ctx.beginPath();
        ctx.moveTo(nodeCoordinates[0].x, nodeCoordinates[0].y);
        for (let i = 0; i < nodeCoordinates.length - 1; i++) {
          const curr = nodeCoordinates[i];
          const next = nodeCoordinates[i + 1];
          const cp1X = curr.x;
          const cp1Y = curr.y + 70;
          const cp2X = next.x;
          const cp2Y = next.y - 70;
          ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, next.x, next.y);
        }
        ctx.strokeStyle = "rgba(212, 175, 55, 0.15)";
        ctx.lineWidth = 4;
        ctx.lineCap = "round";
        ctx.setLineDash([8, 8]);
        ctx.lineDashOffset = -time * 0.01;
        ctx.stroke();

        // 4. Draw Completed Path with Teal-to-Gold Gradient & Glow
        const maxCompletedIndex = activeIndex !== -1 ? activeIndex : 0;
        if (maxCompletedIndex > 0) {
          ctx.beginPath();
          ctx.moveTo(nodeCoordinates[0].x, nodeCoordinates[0].y);
          for (let i = 0; i < maxCompletedIndex; i++) {
            const curr = nodeCoordinates[i];
            const next = nodeCoordinates[i + 1];
            const cp1X = curr.x;
            const cp1Y = curr.y + 70;
            const cp2X = next.x;
            const cp2Y = next.y - 70;
            ctx.bezierCurveTo(cp1X, cp1Y, cp2X, cp2Y, next.x, next.y);
          }

          const pathGrad = ctx.createLinearGradient(0, nodeCoordinates[0].y, 0, nodeCoordinates[maxCompletedIndex].y);
          pathGrad.addColorStop(0, "#00A896");
          pathGrad.addColorStop(1, "#D4AF37");

          ctx.strokeStyle = pathGrad;
          ctx.lineWidth = 5;
          ctx.lineCap = "round";
          ctx.setLineDash([6, 6]);
          ctx.lineDashOffset = -time * 0.02;
          ctx.shadowColor = "rgba(0, 168, 150, 0.4)";
          ctx.shadowBlur = 8;
          ctx.stroke();

          // Reset shadow
          ctx.shadowBlur = 0;
          ctx.setLineDash([]);

          // 5. Draw Animated Flowing Particles along Completed Path
          const segmentCount = maxCompletedIndex;
          for (let i = 0; i < 3; i++) {
            const flowOffset = (time * particleFlowSpeed + i * 0.33) % 1.0;
            const flowSegment = Math.floor(flowOffset * segmentCount);
            const segmentT = (flowOffset * segmentCount) - flowSegment;

            const p0 = nodeCoordinates[flowSegment];
            const p1 = nodeCoordinates[flowSegment + 1];

            if (p0 && p1) {
              const pt = getBezierPoint(p0, p1, segmentT, true);
              const colors = ["#00A896", "#D4AF37", "#F4F6F8"];
              ctx.fillStyle = colors[i];
              ctx.shadowColor = colors[i];
              ctx.shadowBlur = 6;
              ctx.beginPath();
              ctx.arc(pt.x, pt.y, 3.5, 0, Math.PI * 2);
              ctx.fill();
              ctx.shadowBlur = 0;
            }
          }
        }
      }

      animId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animId);
    };
  }, [nodeCoordinates, activeIndex, mapHeight, stars]);

  const activeCoord = nodeCoordinates[activeIndex !== -1 ? activeIndex : 0] || nodeCoordinates[0];

  return (
    <div
      ref={mapContainerRef}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleMouseUp}
      className={`absolute inset-0 overflow-y-auto p-6 z-10 scroll-smooth select-none ${isDragging ? "cursor-grabbing" : "cursor-grab"}`}
    >
      <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase mb-6 z-10 select-none">
        Learning Trail Map
      </h3>

      <div className="absolute top-4 right-4 z-30 flex items-center space-x-1.5 bg-indigo-oasis/90 border border-gold-sand/20 p-1 rounded-xl shadow-lg backdrop-blur-md select-none">
        <button
          type="button"
          onClick={() => setMapZoom((prev) => Math.min(1.3, prev + 0.1))}
          className="w-11 h-11 flex items-center justify-center text-sm font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
          title="Zoom In"
        >
          +
        </button>
        <button
          type="button"
          onClick={() => setMapZoom((prev) => Math.max(0.7, prev - 0.1))}
          className="w-11 h-11 flex items-center justify-center text-sm font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          -
        </button>
        <button
          type="button"
          onClick={recenterMap}
          className="px-3.5 h-11 flex items-center justify-center text-[9px] uppercase tracking-wider font-bold text-text-secondary hover:text-gold-sand border border-text-secondary/5 rounded-lg bg-midnight/40 transition-colors cursor-pointer"
          title="Recenter Caravan"
        >
          Recenter
        </button>
      </div>

      <div
        className="relative flex-1 w-full max-w-[340px] sm:max-w-[360px] mx-auto transition-transform duration-200 z-10"
        style={{ height: `${mapHeight}px`, transform: `scale(${mapZoom})`, transformOrigin: "top center" }}
      >
        {/* HTML5 Canvas Background trail element */}
        <canvas
          ref={canvasRef}
          width={400}
          height={mapHeight}
          className="absolute inset-0 w-full h-full pointer-events-none rounded-xl"
        />

        {/* Overlay DOM Element: Animated Camel Caravan */}
        <div
          ref={camelRef}
          style={{
            position: "absolute",
            left: activeCoord ? `${(activeCoord.x / 400) * 100}%` : "50%",
            top: activeCoord ? `${(activeCoord.y / mapHeight) * 100}%` : "50%",
            transform: "translate(-50%, -120%)",
          }}
          className={`absolute z-20 pointer-events-none camel-walk transition-opacity duration-200 ${
            hoveredNodeId === (progress?.nodes?.[activeIndex]?.id ?? null) ? "opacity-0" : "opacity-100"
          }`}
        >
          <div className="bg-indigo-oasis/95 border border-gold-sand rounded-xl px-2 py-1 flex items-center space-x-1 shadow-[0_0_12px_rgba(212,175,55,0.4)] backdrop-blur-sm">
            <span
              ref={camelEmojiRef}
              className="text-sm inline-block transition-transform duration-75"
              style={{
                transform: `scaleX(-1)`,
              }}
            >
              🐫
            </span>
            <span className="text-[8px] font-bold text-gold-sand tracking-wide uppercase font-serif">Caravan</span>
          </div>
        </div>

        {/* Overlay DOM Elements: Oases buttons */}
        {progress.nodes.map((node, index) => {
          const coord = nodeCoordinates[index];
          if (!coord) return null;
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
              {state === "active" && (
                <div className="absolute pointer-events-none w-16 h-16 -translate-x-1/2 -translate-y-1/2 z-0">
                  <div className="absolute inset-0 rounded-full border border-teal-spring/60 animate-ping" style={{ animationDuration: "2.2s" }} />
                  <div className="absolute inset-2 rounded-full border border-teal-spring/40 animate-pulse" style={{ animationDuration: "1.5s" }} />
                  <div className="absolute -inset-2 rounded-full border border-teal-spring/20 animate-ping" style={{ animationDuration: "3.5s" }} />
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
                <div className={`h-11 w-11 rounded-full border flex items-center justify-center transition-all ${
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

                <div className="mt-2 bg-midnight/90 border border-text-secondary/10 px-2 py-0.5 rounded text-[8px] font-bold text-text-primary max-w-[85px] truncate text-center group-hover:border-gold-sand/40 transition-colors shadow-sm font-sans uppercase">
                  {node.title}
                </div>
              </button>

              {/* Hover Tooltip Preview */}
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
  );
}
