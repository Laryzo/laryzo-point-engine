import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Loader2 } from "lucide-react";
import LandingRenderer from "@/components/landing/LandingRenderer";
import ChatAssistant from "@/components/landing/ChatAssistant";
import { useLandingPage } from "@/hooks/useLandingPage";
import type { LandingData } from "@/hooks/useLandingPage";

const Multibeauty = () => {
  const [params] = useSearchParams();
  const isPreview = params.get("preview") === "1";
  const { data, loading } = useLandingPage("multibeauty", isPreview ? "draft" : "published");
  const [live, setLive] = useState<LandingData | null>(null);


  // Live update via postMessage from builder
  useEffect(() => {
    if (!isPreview) return;
    const onMsg = (ev: MessageEvent) => {
      if (ev.data?.type === "LANDING_PREVIEW_UPDATE") {
        setLive(ev.data.payload);
      }
    };
    window.addEventListener("message", onMsg);
    window.parent?.postMessage({ type: "LANDING_PREVIEW_READY" }, "*");
    return () => window.removeEventListener("message", onMsg);
  }, [isPreview]);

  const active = live || data;

  useEffect(() => {
    if (active) {
      const originalFavicon = "/favicon.png";
      const multibeautyFavicon = "/multibeauty/favicon.png";
      
      // Update favicon to Multibeauty
      const updateFavicon = (href: string) => {
        const rels = ['icon', 'shortcut icon', 'apple-touch-icon'];
        rels.forEach(rel => {
          let link = document.querySelector(`link[rel*='${rel}']`) as HTMLLinkElement;
          if (link) {
            link.href = `${href}?v=${Date.now()}`;
          }
        });
      };

      updateFavicon(multibeautyFavicon);

      if (active.title) {
        document.title = active.title;
      }

      // Cleanup: Reset favicon back to Laryzo when leaving page
      return () => {
        updateFavicon(originalFavicon);
      };
    }
  }, [active]);

  if (loading || !active) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <>
      <LandingRenderer sections={active.sections} theme={active.theme} previewMode={isPreview} />
      
      {/* Chat Asisten - hanya tampil jika bukan preview mode */}
      {!isPreview && active.settings?.chatbot?.enabled !== false && (
        <ChatAssistant
          primaryColor={active.theme?.primary || "#059669"}
          productName={active.title || "Multibeauty Soap"}
          settings={active.settings?.chatbot}
        />
      )}
    </>
  );
};

export default Multibeauty;
