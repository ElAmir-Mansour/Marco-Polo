"use client";

import React, { useState, useEffect } from "react";
import { MessageSquare, Coins, Loader2 } from "lucide-react";
import confetti from "canvas-confetti";
import { audio } from "@/lib/services/audio";
import { UserProfile } from "@/store/ExpeditionStore";

interface CaravanseraiForumProps {
  userId: string | null;
  userProfile: UserProfile | null;
  onTipSuccess: (newBalance: number) => void;
  setUserFrustrated: (frustrated: boolean) => void;
  appendConsoleLog: (log: string) => void;
}

export default function CaravanseraiForum({
  userId,
  userProfile,
  onTipSuccess,
  setUserFrustrated,
  appendConsoleLog,
}: CaravanseraiForumProps) {
  const [forumPostsList, setForumPostsList] = useState<any[]>([]);
  const [newPostContent, setNewPostContent] = useState("");
  const [tippingPostId, setTippingPostId] = useState<string | null>(null);

  useEffect(() => {
    fetchForumPosts();
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

  const getInitials = (email: string) => {
    if (!email) return "TR";
    const parts = email.split("@");
    const name = parts[0];
    if (name.length >= 2) {
      return name.slice(0, 2).toUpperCase();
    }
    return name.toUpperCase() || "TR";
  };

  const handlePostToForum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPostContent.trim() || !userId) return;
    const userEmail = typeof window !== "undefined" ? localStorage.getItem("silkroad_email") || "traveler@silkroad.com" : "traveler@silkroad.com";

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
        setForumPostsList((prev) => [data.post, ...prev]);
        if (data.sentiment === "frustrated") {
          setUserFrustrated(true);
        }
      }
    } catch (err) {
      console.error("Failed to post message", err);
    }
  };

  const handleTipPost = async (postId: string, authorId: string, authorEmail: string) => {
    if (!userId) return;

    if (userId === authorId) {
      appendConsoleLog("🐫 You cannot tip your own scrolls, traveler!");
      return;
    }

    if (userProfile && userProfile.coinsBalance < 10) {
      appendConsoleLog("❌ Insufficient coins. A tip costs 10 Caravan Coins.");
      audio.playThud();
      return;
    }

    setTippingPostId(postId);
    try {
      appendConsoleLog(`Sending 10 Caravan Coins to ${authorEmail}...`);
      audio.playClick();

      const response = await fetch("/api/community/posts/tip", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          postId,
          authorId,
          tipperId: userId,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to complete tip.");
      }

      audio.playChime();
      confetti({
        particleCount: 15,
        spread: 30,
        origin: { y: 0.8 },
        colors: ["#D4AF37", "#00A896"],
      });

      onTipSuccess(data.newBalance);
      appendConsoleLog(`✅ Tipped 10 Caravan Coins to ${authorEmail} successfully!`);
    } catch (err: any) {
      console.error("Failed to tip post:", err);
      appendConsoleLog(`❌ Tipping failed: ${err.message}`);
      audio.playThud();
    } finally {
      setTippingPostId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl p-6 space-y-4 flex flex-col h-full select-text text-left">
      <h3 className="text-xs font-bold text-gold-sand tracking-wide font-serif uppercase select-none">
        Caravanserai Forum
      </h3>

      <div className="space-y-2 max-h-96 overflow-y-auto pr-1 flex-grow forum-scrollbar">
        {forumPostsList.length === 0 ? (
          <div className="text-[10px] text-text-secondary/60 italic py-2 text-center select-none">
            No traveler scrolls written yet. Share your thoughts...
          </div>
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
                <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[9px] flex-shrink-0 select-none ${
                  isFrustrated ? "bg-orange-flame/20 text-orange-flame border border-orange-flame/30" : "bg-teal-spring/10 text-teal-spring border border-teal-spring/25"
                }`}>
                  {initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-[8px] text-text-secondary mb-1 select-none">
                    <span className="font-bold text-gold-sand truncate max-w-[120px]">{post.authorEmail}</span>
                    <div className="flex items-center space-x-2">
                      <span className="text-[7px] text-text-secondary/70 flex-shrink-0">
                        {new Date(post.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                      </span>
                      {post.userId !== userId && (
                        <button
                          type="button"
                          disabled={tippingPostId !== null}
                          onClick={() => handleTipPost(post.id, post.userId, post.authorEmail)}
                          title="Tip 10 Caravan Coins"
                          className="text-gold-sand hover:text-midnight disabled:opacity-40 disabled:hover:bg-gold-sand/10 disabled:hover:text-gold-sand bg-gold-sand/10 hover:bg-gold-sand border border-gold-sand/30 rounded-lg px-1.5 py-0.5 font-sans font-bold flex items-center space-x-0.5 cursor-pointer transition-all hover:scale-105 active:scale-95"
                        >
                          {tippingPostId === post.id ? (
                            <>
                              <Loader2 className="h-2.5 w-2.5 animate-spin text-gold-sand" />
                              <span>Tipping...</span>
                            </>
                          ) : (
                            <>
                              <span>Tip 10</span>
                              <Coins className="h-2.5 w-2.5" />
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                  <p className="text-text-primary leading-relaxed break-words font-sans">{post.content}</p>
                  {post.sentiment === "frustrated" && (
                    <span className="inline-flex items-center mt-1 text-[7px] text-orange-flame bg-orange-flame/10 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-orange-flame/20 animate-pulse select-none">
                      🔥 Distressed Traveler
                    </span>
                  )}
                  {post.sentiment === "positive" && (
                    <span className="inline-flex items-center mt-1 text-[7px] text-teal-spring bg-teal-spring/10 px-1.5 py-0.5 rounded-full font-bold uppercase tracking-wider border border-teal-spring/20 select-none">
                      ☀️ Peaceful Voyage
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      <form onSubmit={handlePostToForum} className="flex gap-2 border-t border-text-secondary/10 pt-3 select-none">
        <input
          value={newPostContent}
          onChange={(e) => setNewPostContent(e.target.value)}
          placeholder="Ask a question or post a scroll..."
          className="flex-grow bg-midnight border border-gold-sand/20 rounded-lg px-3 py-1.5 text-[10px] text-text-primary focus:outline-none focus:border-gold-sand"
        />
        <button
          type="submit"
          disabled={!newPostContent.trim()}
          className="bg-gold-sand text-midnight text-[10px] font-bold px-3 py-1.5 rounded-lg hover:bg-gold-sand/90 active:scale-95 active:bg-gold-sand/80 disabled:opacity-50 disabled:scale-100 disabled:cursor-not-allowed cursor-pointer transition-all duration-150 shadow-sm"
        >
          Post
        </button>
      </form>
    </div>
  );
}
