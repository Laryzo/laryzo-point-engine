import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { CheckCircle2 } from "lucide-react";
import type { Section, Theme } from "@/lib/landing/types";
import CheckoutForm from "./CheckoutForm";

const bgStyle = (bg?: string): React.CSSProperties => {
  if (!bg) return {};
  if (bg.startsWith("linear-gradient") || bg.startsWith("radial-gradient"))
    return { backgroundImage: bg };
  return { backgroundColor: bg };
};

export default function LandingRenderer({
  sections,
  theme,
  previewMode = false,
}: {
  sections: Section[];
  theme: Theme;
  previewMode?: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const primary = theme.primary || "#059669";
  const primaryDark = theme.primaryDark || "#065f46";
  const textColor = theme.text || "#0f172a";

  return (
    <div
      className="min-h-screen"
      style={{
        backgroundColor: theme.bg || "#ffffff",
        color: textColor,
        fontFamily: theme.font || "Inter, sans-serif",
      }}
    >
      {sections
        .filter((s) => s.visible !== false)
        .map((s) => {
          switch (s.type) {
            case "hero":
              return (
                <section key={s.id} className="relative overflow-hidden" style={bgStyle(s.props.bg)}>
                  <div className="max-w-6xl mx-auto px-4 py-12 md:py-20 grid md:grid-cols-2 gap-10 items-center">
                    <div className="space-y-6">
                      {s.props.badge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: primary + "22", color: primaryDark }}>
                          {s.props.badge}
                        </span>
                      )}
                      <h1 className="text-4xl md:text-5xl font-bold leading-tight">
                        {s.props.title}
                        {s.props.titleAccent && <><br /><span style={{ color: primary }}>{s.props.titleAccent}</span></>}
                      </h1>
                      {s.props.subtitle && <p className="text-lg opacity-80">{s.props.subtitle}</p>}
                      <div className="flex flex-wrap gap-3">
                        {s.props.ctaPrimary && (
                          <a href={s.props.ctaPrimaryHref || "#order"} className="inline-flex items-center px-6 py-3 rounded-md font-semibold text-white shadow-lg" style={{ backgroundColor: primary }}>
                            {s.props.ctaPrimary}
                          </a>
                        )}
                        {s.props.ctaSecondary && (
                          <a href={s.props.ctaSecondaryHref || "#"} className="inline-flex items-center px-6 py-3 rounded-md font-semibold border" style={{ borderColor: primary, color: primary }}>
                            {s.props.ctaSecondary}
                          </a>
                        )}
                      </div>
                    </div>
                    {s.props.image && (
                      <div className="relative">
                        <img src={s.props.image} alt="" className="relative rounded-2xl shadow-2xl w-full object-cover aspect-square" />
                      </div>
                    )}
                  </div>
                </section>
              );

            case "text":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)}>
                  <div className={`max-w-4xl mx-auto px-4 py-16 ${s.props.align === "left" ? "text-left" : "text-center"} space-y-4`}>
                    {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                    {s.props.body && <p className="text-lg opacity-80 leading-relaxed whitespace-pre-wrap">{s.props.body}</p>}
                  </div>
                </section>
              );

            case "features": {
              const cols = s.props.columns || 3;
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70">{s.props.subtitle}</p>}
                    </div>
                    <div className={`grid gap-6 ${cols === 2 ? "md:grid-cols-2" : cols === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-3"}`}>
                      {(s.props.items || []).map((item, i) => (
                        <div key={i} className="p-6 text-center rounded-lg border bg-white/70 backdrop-blur">
                          {item.icon && <div className="text-5xl mb-3">{item.icon}</div>}
                          <h3 className="text-xl font-bold mb-2">{item.title}</h3>
                          <p className="text-sm opacity-70">{item.desc}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case "checklist": {
              const cols = s.props.columns || 4;
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70">{s.props.subtitle}</p>}
                    </div>
                    <div className={`grid gap-4 sm:grid-cols-2 ${cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-4" : "md:grid-cols-2"}`}>
                      {(s.props.items || []).map((t, i) => (
                        <div key={i} className="flex items-start gap-3 p-4 rounded-lg border bg-white/70">
                          <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: primary }} />
                          <span className="text-sm font-medium">{t}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case "imageText": {
              const reverse = s.props.imagePosition === "right";
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className={`max-w-5xl mx-auto px-4 grid md:grid-cols-2 gap-10 items-center ${reverse ? "md:[&>*:first-child]:order-2" : ""}`}>
                    {s.props.image && (
                      <img src={s.props.image} alt="" className="rounded-2xl shadow-xl w-full object-cover cursor-pointer" onClick={() => setLightbox(s.props.image!)} />
                    )}
                    <div className="space-y-4">
                      {s.props.badge && (
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: (theme.accent || "#f59e0b") + "33", color: theme.accent || "#b45309" }}>
                          {s.props.badge}
                        </span>
                      )}
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.body && <p className="opacity-80 text-lg">{s.props.body}</p>}
                    </div>
                  </div>
                </section>
              );
            }

            case "gallery": {
              const cols = s.props.columns || 5;
              const gridClass = cols >= 5 ? "grid-cols-2 md:grid-cols-4 lg:grid-cols-5" : cols === 4 ? "grid-cols-2 md:grid-cols-4" : cols === 3 ? "grid-cols-2 md:grid-cols-3" : "grid-cols-2";
              return (
                <section key={s.id} id="testimoni" style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70">{s.props.subtitle}</p>}
                    </div>
                    <div className={`grid gap-3 ${gridClass}`}>
                      {(s.props.images || []).map((src, i) => (
                        <button key={i} type="button" onClick={() => setLightbox(src)} className="group relative aspect-square overflow-hidden rounded-lg bg-muted hover:shadow-lg transition-shadow">
                          <img src={src} loading="lazy" alt={`Gallery ${i+1}`} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </button>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case "legal":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-4xl mx-auto px-4 text-center space-y-4">
                    {s.props.badge && (
                      <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: primary + "22", color: primaryDark }}>
                        {s.props.badge}
                      </span>
                    )}
                    {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                    {s.props.body && <p className="text-lg opacity-80">{s.props.body}</p>}
                    {s.props.items?.length ? (
                      <div className="grid grid-cols-3 gap-4 pt-6 text-sm">
                        {s.props.items.map((it, i) => (
                          <div key={i} className="p-4 rounded-lg bg-white border">
                            {it.icon && <div className="text-3xl mb-2">{it.icon}</div>}
                            <div className="font-semibold">{it.title}</div>
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </section>
              );

            case "checkout":
              return (
                <section key={s.id} id="order" style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-3xl mx-auto px-4">
                    <div className="text-center mb-8 text-white space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-90">{s.props.subtitle}</p>}
                    </div>
                    <CheckoutForm
                      price={s.props.price || 75000}
                      buttonText={s.props.buttonText || "Kirim Pesanan"}
                      primaryColor={primary}
                      disabled={previewMode}
                    />
                  </div>
                </section>
              );

            case "footer":
              return (
                <footer key={s.id} style={bgStyle(s.props.bg)} className="py-10 text-white">
                  <div className="max-w-5xl mx-auto px-4 text-center space-y-3">
                    {s.props.brand && <div className="font-bold">{s.props.brand}</div>}
                    {s.props.text && <p className="text-sm opacity-80">{s.props.text}</p>}
                    {s.props.copyright && <p className="text-xs opacity-60">{s.props.copyright.replace("{year}", String(new Date().getFullYear()))}</p>}
                  </div>
                </footer>
              );

            default:
              return null;
          }
        })}

      <Dialog open={!!lightbox} onOpenChange={(v) => !v && setLightbox(null)}>
        <DialogContent className="max-w-3xl p-2 bg-black/95">
          {lightbox && <img src={lightbox} alt="Preview" className="w-full h-auto max-h-[85vh] object-contain" />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
