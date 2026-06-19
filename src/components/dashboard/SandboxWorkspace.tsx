"use client";

import React, { useRef, useState, useMemo } from "react";
import { BookOpen, Terminal, Sparkles, Loader2, Play, FileText, CheckCircle } from "lucide-react";
import { Node, Progress, UserProfile, Streak } from "@/store/ExpeditionStore";
import { useCodeSandbox } from "@/hooks/useCodeSandbox";

interface Resource {
  title: string;
  url: string;
  type: "video" | "article" | "documentation";
}

interface SandboxWorkspaceProps {
  selectedNode: Node;
  userId: string | null;
  progress: Progress;
  onSuccess: (updatedProgress: Progress, updatedStreak: Streak, updatedUser: UserProfile) => void;
  onFailure: () => void;
  setV0Prompt: (prompt: string) => void;
  setV0ModalOpen: (open: boolean) => void;
  handleResourceClick: (e: React.MouseEvent, res: Resource) => void;
  onFocusChange?: (focused: boolean) => void;
}

// Simple regex-based syntax highlighter for JavaScript code visualization
function highlightJS(code: string) {
  if (!code) return "";

  // Escape HTML characters
  let html = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const tokens: { placeholder: string; tag: string }[] = [];
  let tokenCounter = 0;

  const registerToken = (value: string, className: string) => {
    const placeholder = `___TOKEN_VAR_${tokenCounter++}___`;
    tokens.push({
      placeholder,
      tag: `<span class="${className}">${value}</span>`,
    });
    return placeholder;
  };

  // 1. Comments
  html = html.replace(/\/\/.*$/gm, (m) => registerToken(m, "text-text-secondary/50 italic"));
  html = html.replace(/\/\*[\s\S]*?\*\//g, (m) => registerToken(m, "text-text-secondary/50 italic"));

  // 2. Strings
  html = html.replace(/(["'`])(?:\\.|[^\\])*?\1/g, (m) => registerToken(m, "text-teal-spring font-medium"));

  // 3. Numbers
  html = html.replace(/\b\d+(\.\d+)?\b/g, (m) => registerToken(m, "text-orange-flame font-semibold"));

  // 4. Keywords
  const keywords = /\b(const|let|var|function|return|if|else|for|while|do|switch|case|break|continue|try|catch|finally|async|await|new|throw|import|export|from|default|class|extends|super)\b/g;
  html = html.replace(keywords, (m) => registerToken(m, "text-gold-sand font-bold"));

  // 5. Builtins & Booleans
  const builtins = /\b(true|false|null|undefined|console|log|error|window|document|Math|JSON|Array|Object|String|Number|Function|Promise)\b/g;
  html = html.replace(builtins, (m) => registerToken(m, "text-gold-sand/80 italic"));

  // 6. Functions
  html = html.replace(/\b(\w+)(?=\s*\()/g, (m) => registerToken(m, "text-teal-spring/90 font-medium"));

  for (let i = tokens.length - 1; i >= 0; i--) {
    html = html.replace(tokens[i].placeholder, tokens[i].tag);
  }

  return html;
}

export default function SandboxWorkspace({
  selectedNode,
  userId,
  progress,
  onSuccess,
  onFailure,
  setV0Prompt,
  setV0ModalOpen,
  handleResourceClick,
  onFocusChange,
}: SandboxWorkspaceProps) {
  const {
    codeSolution,
    setCodeSolution,
    validationStatus,
    consoleLogs,
    setConsoleLogs,
    liveSyntaxValid,
    liveStructureValid,
    liveSafetyValid,
    liveSyntaxError,
    handleVerifySolution,
  } = useCodeSandbox({
    selectedNode,
    userId,
    progress,
    onSuccess,
    onFailure,
  });

  const [editorScrollTop, setEditorScrollTop] = useState(0);
  const preRef = useRef<HTMLPreElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const highlightedCode = useMemo(() => {
    return highlightJS(codeSolution);
  }, [codeSolution]);

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-5 flex flex-col h-full select-text">
      {/* Node Header */}
      <div className="flex items-center justify-between border-b border-gold-sand/10 pb-3 select-none">
        <div>
          <span className="text-[9px] uppercase font-bold text-teal-spring bg-teal-spring/10 px-2 py-0.5 rounded">
            {selectedNode.difficulty}
          </span>
          <h2 className="text-base font-bold font-serif text-gold-sand mt-1">{selectedNode.title}</h2>
        </div>
        {progress.completedSteps.includes(selectedNode.id) && (
          <span className="flex items-center text-[10px] font-semibold text-gold-sand bg-gold-sand/10 px-2 py-1 rounded-lg">
            <CheckCircle className="h-3 w-3 mr-1" />
            Oasis Discovered
          </span>
        )}
      </div>

      <div className="space-y-2.5">
        <p className="text-xs leading-relaxed text-text-secondary select-none">{selectedNode.description}</p>

        {/* Study resources */}
        <div className="bg-midnight/50 rounded-xl p-3 border border-text-secondary/10 select-none">
          <h4 className="text-[10px] font-bold text-text-primary uppercase tracking-wider mb-2 flex items-center">
            <BookOpen className="h-3 w-3 mr-1 text-gold-sand" />
            Curated Study Spices
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {(selectedNode.resources || []).map((res: any, idx: number) => {
              let resTitle = "";
              let resUrl = "";
              let resType: "video" | "article" | "documentation" = "documentation";

              if (typeof res === "string") {
                resUrl = res;
                try {
                  const urlObj = new URL(res);
                  resTitle = urlObj.hostname.replace("www.", "") + " link";
                } catch {
                  resTitle = "Study Resource " + (idx + 1);
                }
              } else if (res && typeof res === "object") {
                resUrl = res.url || "";
                resTitle = res.title || "Study Resource " + (idx + 1);
                const rawType = res.type || "documentation";
                if (rawType === "video" || rawType === "article" || rawType === "documentation") {
                  resType = rawType;
                }
              }

              if (!resUrl) return null;

              const normalizedRes = { title: resTitle, url: resUrl, type: resType };
              let IconComponent = FileText;
              let iconColor = "text-text-secondary";
              if (resType === "video") {
                IconComponent = Play;
                iconColor = "text-teal-spring fill-teal-spring/20";
              } else if (resType === "article") {
                IconComponent = BookOpen;
                iconColor = "text-gold-sand";
              }

              return (
                <button
                  key={idx}
                  onClick={(e) => handleResourceClick(e, normalizedRes)}
                  className="flex items-center space-x-2.5 p-2 rounded-xl bg-indigo-oasis/40 border border-text-secondary/5 hover:border-gold-sand/35 hover:bg-indigo-oasis/80 transition-all text-[10px] text-text-primary cursor-pointer text-left w-full group"
                >
                  <div className={`p-1.5 rounded-lg bg-midnight/80 border border-text-secondary/10 flex-shrink-0 group-hover:border-gold-sand/20 ${iconColor}`}>
                    <IconComponent className="h-3.5 w-3.5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-semibold text-text-primary group-hover:text-gold-sand transition-colors">{resTitle}</p>
                    <p className="text-[7.5px] uppercase font-bold text-text-secondary/65 tracking-wider">{resType}</p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="space-y-3 flex-grow flex flex-col select-text">
        <div className="bg-midnight/70 rounded-xl p-4 border border-gold-sand/10 space-y-2 select-none">
          <h4 className="text-xs font-bold text-gold-sand flex items-center font-serif uppercase tracking-wider">
            <Terminal className="h-4 w-4 mr-1.5" />
            Oasis Coding Puzzle
          </h4>
          <p className="text-xs text-text-primary leading-relaxed">{selectedNode.challenge.question}</p>
        </div>

        {/* Dual-layer Code Editor */}
        <div className="h-[480px] flex flex-col rounded-xl overflow-hidden border border-text-secondary/20 bg-midnight text-text-primary shadow-[inset_0_2px_8px_rgba(0,0,0,0.5)]">
          <div className="bg-indigo-oasis/60 px-4 py-2 border-b border-text-secondary/15 flex items-center justify-between text-[10px] text-text-secondary font-sans select-none">
            <span className="font-semibold text-text-primary/95">JavaScript Sandbox Editor</span>
            <button
              type="button"
              onClick={() => {
                setV0Prompt(`Build a custom component for the milestone: ${selectedNode.title}`);
                setV0ModalOpen(true);
              }}
              className="flex items-center space-x-1 px-2.5 py-1 rounded bg-gold-sand/10 hover:bg-gold-sand/20 border border-gold-sand/30 text-gold-sand hover:text-text-primary font-bold text-[9px] uppercase tracking-wide transition-all cursor-pointer"
            >
              <Sparkles className="h-3 w-3 mr-0.5 animate-pulse" />
              <span>Generate UI via v0</span>
            </button>
          </div>
          <div className="flex-1 flex overflow-hidden relative">
            {/* Synced line numbers gutter */}
            <div className="w-12 bg-midnight/80 border-r border-text-secondary/10 flex flex-col items-end pr-3 py-4 font-mono text-[10px] text-text-secondary/40 select-none overflow-hidden">
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

            {/* Editor Workspace */}
            <div className="flex-grow relative overflow-hidden h-full">
              <pre
                ref={preRef}
                className="absolute inset-0 p-4 pl-2 bg-transparent text-xs font-mono leading-5 select-none pointer-events-none overflow-hidden whitespace-pre-wrap break-all text-text-primary forum-scrollbar"
                style={{
                  lineHeight: "20px",
                  margin: 0,
                  fontFamily: "var(--font-mono, monospace)",
                }}
                dangerouslySetInnerHTML={{ __html: highlightedCode + "\n\n" }}
              />
              <textarea
                ref={textareaRef}
                value={codeSolution}
                onChange={(e) => setCodeSolution(e.target.value)}
                onFocus={() => onFocusChange?.(true)}
                onBlur={() => onFocusChange?.(false)}
                onScroll={(e) => {
                  const { scrollTop, scrollLeft } = e.currentTarget;
                  setEditorScrollTop(scrollTop);
                  if (preRef.current) {
                    preRef.current.scrollTop = scrollTop;
                    preRef.current.scrollLeft = scrollLeft;
                  }
                }}
                className="absolute inset-0 p-4 pl-2 bg-transparent text-transparent caret-gold-sand text-xs font-mono focus:outline-none resize-none leading-5 select-text overflow-y-auto whitespace-pre-wrap break-all w-full h-full forum-scrollbar"
                style={{
                  lineHeight: "20px",
                  fontFamily: "var(--font-mono, monospace)",
                }}
                spellCheck="false"
              />
            </div>
          </div>

          {/* Live Analysis Strip */}
          <div className="min-h-[32px] py-1.5 sm:py-0 bg-indigo-oasis/30 px-4 border-t border-text-secondary/10 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 text-[9px] font-sans flex-shrink-0 select-none">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
              <span className="text-text-secondary/70">Live Analysis:</span>
              <span className="flex items-center space-x-1">
                <span className={`h-1.5 w-1.5 rounded-full ${liveSyntaxValid ? "bg-teal-spring animate-pulse" : "bg-orange-flame"}`}></span>
                <span className={liveSyntaxValid ? "text-teal-spring font-semibold" : "text-orange-flame font-semibold"}>
                  {liveSyntaxValid ? "Syntax OK" : "Syntax Error"}
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className={`h-1.5 w-1.5 rounded-full ${liveStructureValid ? "bg-teal-spring" : "bg-text-secondary/35"}`}></span>
                <span className={liveStructureValid ? "text-teal-spring font-semibold" : "text-text-secondary/70"}>
                  <span className="hidden xs:inline">Structure Match</span>
                  <span className="inline xs:hidden">Structure</span>
                </span>
              </span>
              <span className="flex items-center space-x-1">
                <span className={`h-1.5 w-1.5 rounded-full ${liveSafetyValid ? "bg-teal-spring" : "bg-orange-flame animate-pulse"}`}></span>
                <span className={liveSafetyValid ? "text-teal-spring font-semibold" : "text-orange-flame font-semibold"}>
                  <span className="hidden xs:inline">Safe Loops</span>
                  <span className="inline xs:hidden">Loops</span>
                </span>
              </span>
            </div>
            {liveSyntaxError && (
              <span className="text-[8.5px] text-orange-flame/80 font-mono truncate max-w-full sm:max-w-[200px]" title={liveSyntaxError}>
                {liveSyntaxError}
              </span>
            )}
          </div>
        </div>

        {/* Interactive Compiler Terminal */}
        <div className="terminal-overlay bg-black/95 rounded-xl border border-text-secondary/15 font-mono text-[11px] text-teal-spring flex flex-col overflow-hidden max-h-40 shadow-[0_4px_20px_rgba(0,0,0,0.8)]">
          <div className="bg-[#121214] px-4 py-2 border-b border-text-secondary/10 flex items-center justify-between text-[10px] text-text-secondary/80 select-none">
            <div className="flex items-center space-x-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56] border border-[#E0443E] shadow-sm cursor-pointer hover:opacity-80" onClick={() => setConsoleLogs([])} title="Clear Console"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E] border border-[#DEA123] shadow-sm"></span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F] border border-[#1AAB29] shadow-sm"></span>
            </div>
            <span className="flex items-center text-[9px] uppercase tracking-wider font-semibold text-text-secondary/70">
              <Terminal className="h-3 w-3 mr-1 text-gold-sand animate-pulse" /> Sandbox Terminal Console
            </span>
            <button
              type="button"
              onClick={() => setConsoleLogs([])}
              className="text-[8px] uppercase font-bold text-text-secondary hover:text-gold-sand px-1.5 py-0.5 rounded border border-text-secondary/20 hover:border-gold-sand/40 transition-colors cursor-pointer"
            >
              Clear
            </button>
          </div>

          <div className="p-3 space-y-1.5 overflow-y-auto flex-grow select-text forum-scrollbar">
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
                    <span className="flex-grow whitespace-pre-wrap">{log}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex justify-between items-center pt-2 select-none">
          <button
            type="button"
            onClick={() => {
              setCodeSolution(selectedNode.challenge.boilerplate || "");
              setConsoleLogs([]);
            }}
            className="text-[10px] text-text-secondary hover:text-text-primary uppercase font-bold cursor-pointer"
          >
            Reset Boilerplate
          </button>

          <button
            type="button"
            disabled={validationStatus === "verifying"}
            onClick={handleVerifySolution}
            className="flex items-center space-x-1.5 bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-40 disabled:cursor-not-allowed text-midnight font-bold py-2 px-6 rounded-xl transition-all shadow-md hover:shadow-lg text-xs cursor-pointer"
          >
            {validationStatus === "verifying" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                <span>Verifying...</span>
              </>
            ) : (
              <>
                <Play className="h-3.5 w-3.5 fill-current" />
                <span>Test & Verify</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
