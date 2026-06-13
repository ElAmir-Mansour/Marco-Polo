"use client";

import React, { useRef, useEffect, useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import { Send, Sparkles, MessageSquare, Compass, Terminal, ShieldAlert } from "lucide-react";

interface CaravanMasterChatProps {
  userContext: {
    targetRole?: string;
    experienceLevel?: string;
    nodeTitle?: string;
  };
}

export default function CaravanMasterChat({ userContext }: CaravanMasterChatProps) {
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  // Initialize useChat with custom API route and context payload
  const { messages, sendMessage, status } = useChat({
    transport: new DefaultChatTransport({
      api: "/api/chat",
      body: {
        userContext,
      },
    }),
      messages: [
      {
        id: "welcome",
        role: "assistant",
        parts: [
          {
            type: "text",
            text: `Peace be upon you, traveler! 🐫 I am Master Marco Polo, your Caravan Master guide. I will support your steps across the software trails. I see you are currently seeking mastery of "${userContext.nodeTitle || "Foundations"}". What concepts or challenges can I help you unpack?`,
          },
        ],
      },
    ],
  });

  const isLoading = status === "submitted" || status === "streaming";

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const quickQuestions = [
    { text: "Give me a hint for this challenge", icon: Terminal },
    { text: "Explain the main concept of this oasis", icon: Sparkles },
    { text: "What is the industry practice for this?", icon: Compass },
  ];

  const handleQuickQuestionClick = (questionText: string) => {
    sendMessage({ text: questionText });
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;
    sendMessage({ text: input });
    setInput("");
  };

  return (
    <div className="flex flex-col h-full bg-indigo-oasis/80 backdrop-blur-md border border-gold-sand/15 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Header */}
      <div className="bg-indigo-oasis p-4 border-b border-gold-sand/10 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <img
            src="/marcopolo-avatar.png"
            alt="Marco Polo Avatar"
            className="h-10 w-10 rounded-full object-cover border border-gold-sand/35 shadow-[0_0_10px_rgba(212,175,55,0.2)]"
          />
          <div>
            <h3 className="text-sm font-bold font-serif tracking-wide text-gold-sand uppercase">MASTER MARCO POLO</h3>
            <p className="text-[10px] text-teal-spring font-medium flex items-center">
              <span className="h-1.5 w-1.5 rounded-full bg-teal-spring mr-1 animate-ping"></span>
              AI Caravan Master Guide
            </p>
          </div>
        </div>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 min-h-0 select-text">
        {messages.length <= 1 && (
          <div className="flex flex-col items-center justify-center p-4 border border-gold-sand/10 rounded-xl bg-midnight/35 space-y-3 animate-fadeIn text-center">
            <img
              src="/images/characters/marcopolo_welcome.png"
              alt="Marco Polo Guide"
              className="h-32 w-auto object-contain filter drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] camel-walk"
            />
            <div className="text-center text-[10px] text-text-secondary max-w-[200px] leading-relaxed font-sans">
              Your companion Marco Polo is ready. Ask any question when you get stuck!
            </div>
          </div>
        )}
        {messages.map((message) => {
          const isAssistant = message.role === "assistant";
          return (
            <div
              key={message.id}
              className={`flex items-start space-x-2.5 ${isAssistant ? "justify-start" : "justify-end"}`}
            >
              {isAssistant && (
                <img
                  src="/marcopolo-avatar.png"
                  alt="Marco Polo"
                  className="flex-shrink-0 h-8 w-8 rounded-full object-cover border border-gold-sand/40 shadow-[0_0_10px_rgba(212,175,55,0.15)]"
                />
              )}
              
              <div
                className={`max-w-[78%] rounded-2xl px-4 py-3 text-xs leading-relaxed shadow-md relative ${
                  isAssistant
                    ? "speech-pointer-left bg-midnight/80 border border-gold-sand/10 text-text-primary rounded-tl-none"
                    : "speech-pointer-right bg-gold-sand text-midnight font-semibold rounded-tr-none shadow-[0_0_15px_rgba(212,175,55,0.1)]"
                }`}
              >
                {/* Format paragraphs cleanly */}
                <div className="whitespace-pre-wrap">
                  {message.parts
                    .filter((p) => p.type === "text" || p.type === "reasoning")
                    .map((p: any) => p.text)
                    .join("")}
                </div>
              </div>

              {!isAssistant && (
                <div className="flex-shrink-0 h-8 w-8 rounded-full bg-teal-spring/20 border border-teal-spring/40 flex items-center justify-center text-teal-spring font-bold text-xs shadow-[0_0_10px_rgba(0,168,150,0.15)]">
                  ME
                </div>
              )}
            </div>
          );
        })}
        {isLoading && (
          <div className="flex items-start space-x-2.5">
            <img
              src="/marcopolo-avatar.png"
              alt="Marco Polo"
              className="flex-shrink-0 h-8 w-8 rounded-full object-cover border border-gold-sand/40 animate-pulse shadow-[0_0_10px_rgba(212,175,55,0.15)]"
            />
            <div className="speech-pointer-left bg-midnight/80 border border-gold-sand/10 text-text-secondary rounded-2xl rounded-tl-none px-4 py-3 text-[10px] italic flex items-center space-x-2 relative shadow-md">
              <span className="h-1.5 w-1.5 rounded-full bg-gold-sand animate-bounce"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-gold-sand animate-bounce [animation-delay:0.2s]"></span>
              <span className="h-1.5 w-1.5 rounded-full bg-gold-sand animate-bounce [animation-delay:0.4s]"></span>
              <span className="ml-1 text-text-secondary/70">Master Marco Polo is writing...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Suggestion Chips (Pebbles) - Persists when not loading */}
      {!isLoading && (
        <div className="px-4 py-2.5 bg-indigo-oasis/40 border-t border-gold-sand/5 flex flex-wrap gap-2">
          {quickQuestions.map((q, idx) => {
            const Icon = q.icon;
            return (
              <button
                key={idx}
                type="button"
                onClick={() => handleQuickQuestionClick(q.text)}
                className="inline-flex items-center space-x-1.5 px-3 py-1.5 rounded-full bg-midnight/60 hover:bg-gold-sand/15 border border-gold-sand/20 hover:border-gold-sand/45 text-gold-sand hover:text-text-primary text-[10px] transition-all duration-300 backdrop-blur-md shadow-[0_2px_8px_rgba(0,0,0,0.2)] hover:-translate-y-0.5 cursor-pointer"
              >
                <Icon className="h-3.5 w-3.5" />
                <span>{q.text}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* Input Form */}
      <form onSubmit={onSubmit} className="p-4 border-t border-gold-sand/10 bg-indigo-oasis flex items-center space-x-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask Master Marco Polo for help..."
          className="flex-grow bg-midnight border border-gold-sand/15 rounded-xl px-4 py-2.5 text-xs text-text-primary placeholder-text-secondary/40 focus:outline-none focus:border-gold-sand/60 transition-colors"
        />
        <button
          type="submit"
          disabled={!input.trim() || isLoading}
          className="p-2.5 bg-gold-sand hover:bg-gold-sand/90 disabled:opacity-50 disabled:hover:bg-gold-sand text-midnight rounded-xl transition-all shadow-md hover:shadow-lg flex items-center justify-center cursor-pointer"
        >
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
