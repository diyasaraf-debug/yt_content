import { createContext, useContext, useState, ReactNode } from "react";
import type { AppStep, VideoListItem } from "../types";

interface AppContextValue {
  step: AppStep;
  setStep: (s: AppStep) => void;
  activeVideoId: string | null;
  setActiveVideoId: (id: string | null) => void;
  openVideo: (id: string, step?: AppStep) => void;
  videos: VideoListItem[];
  setVideos: (v: VideoListItem[]) => void;
  refreshTrigger: number;
  triggerRefresh: () => void;
}

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [step, setStep] = useState<AppStep>("dashboard");
  const [activeVideoId, setActiveVideoId] = useState<string | null>(null);
  const [videos, setVideos] = useState<VideoListItem[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  function openVideo(id: string, target: AppStep = "video-detail") {
    setActiveVideoId(id);
    setStep(target);
  }

  function triggerRefresh() {
    setRefreshTrigger((n) => n + 1);
  }

  return (
    <AppContext.Provider
      value={{
        step,
        setStep,
        activeVideoId,
        setActiveVideoId,
        openVideo,
        videos,
        setVideos,
        refreshTrigger,
        triggerRefresh,
      }}
    >
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used within AppProvider");
  return ctx;
}
