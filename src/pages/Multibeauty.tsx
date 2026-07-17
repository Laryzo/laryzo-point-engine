import { useEffect, useState } from "react";
import favicon from "@/assets/multibeauty/favicon.png";
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
      // Perbarui favicon
      let link = document.querySelector("link[rel*='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      
      link.type = 'image/png';
      link.href = favicon;
      
      if (active.title) {
        document.title = active.title;
      }
    }
  }, [active, favicon]);

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
