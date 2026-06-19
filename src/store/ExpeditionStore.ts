import { useSyncExternalStore } from "react";

export interface Resource {
  title: string;
  url: string;
  type: "video" | "article" | "documentation";
}

export interface Challenge {
  question: string;
  boilerplate: string;
  solutionPattern: string;
}

export interface Node {
  id: string;
  title: string;
  description: string;
  difficulty: "beginner" | "intermediate" | "advanced";
  order: number;
  resources: Resource[];
  challenge: Challenge;
}

export interface Streak {
  currentStreak: number;
  maxStreak: number;
  lastCompletedTimestamp: string;
  history: string[];
}

export interface Progress {
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

export interface UserProfile {
  coinsBalance: number;
  streakShields: number;
  subscriptionStatus: string;
}

export interface ExpeditionState {
  userId: string | null;
  roadmapId: string | null;
  progress: Progress | null;
  streak: Streak | null;
  userProfile: UserProfile | null;
  layoutMode: "split" | "tabs";
  activeTab: "map" | "sandbox" | "forum";
  soundMuted: boolean;
  chatOpen: boolean;
  selectedNode: Node | null;
  hoveredNodeId: string | null;
  forumPostsList: any[];
  failCount: number;
  userFrustrated: boolean;
}

type Listener = () => void;

class ExpeditionStore {
  private state: ExpeditionState = {
    userId: null,
    roadmapId: null,
    progress: null,
    streak: null,
    userProfile: null,
    layoutMode: "tabs",
    activeTab: "map",
    soundMuted: true,
    chatOpen: true,
    selectedNode: null,
    hoveredNodeId: null,
    forumPostsList: [],
    failCount: 0,
    userFrustrated: false,
  };

  private listeners = new Set<Listener>();

  getState = () => this.state;

  setState = (nextState: Partial<ExpeditionState> | ((prev: ExpeditionState) => Partial<ExpeditionState>)) => {
    const partial = typeof nextState === "function" ? nextState(this.state) : nextState;
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((listener) => listener());
  };

  subscribe = (listener: Listener) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };
}

const serverState: ExpeditionState = {
  userId: null,
  roadmapId: null,
  progress: null,
  streak: null,
  userProfile: null,
  layoutMode: "tabs",
  activeTab: "map",
  soundMuted: true,
  chatOpen: true,
  selectedNode: null,
  hoveredNodeId: null,
  forumPostsList: [],
  failCount: 0,
  userFrustrated: false,
};

export const expeditionStore = new ExpeditionStore();

export function useExpeditionStore<V>(selector: (state: ExpeditionState) => V): V {
  return useSyncExternalStore(
    expeditionStore.subscribe,
    () => selector(expeditionStore.getState()),
    () => selector(serverState)
  );
}
