import { AppProvider, useApp } from "./context/AppContext";
import { MainLayout } from "./components/Layout/MainLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { AddVideoPage } from "./pages/AddVideoPage";
import { VideoDetailPage } from "./pages/VideoDetailPage";
import { KeywordsPage } from "./pages/KeywordsPage";
import { MetadataPage } from "./pages/MetadataPage";
import { ReviewPage } from "./pages/ReviewPage";
import { ChannelsPage } from "./pages/ChannelsPage";

function AppRoutes() {
  const { step } = useApp();
  return (
    <MainLayout>
      {step === "dashboard" && <DashboardPage />}
      {step === "add-video" && <AddVideoPage />}
      {step === "video-detail" && <VideoDetailPage />}
      {step === "keywords" && <KeywordsPage />}
      {step === "metadata" && <MetadataPage />}
      {step === "review" && <ReviewPage />}
      {step === "channels" && <ChannelsPage />}
    </MainLayout>
  );
}

export default function App() {
  return (
    <AppProvider>
      <AppRoutes />
    </AppProvider>
  );
}
