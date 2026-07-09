import { useEffect, useState } from "react";
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

function Countdown({ endsAt }: { endsAt?: string }) {
  const [now, setNow] = useState(Date.now());
  
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  // Jika endsAt ada, gunakan itu. Jika tidak, hitung mundur ke akhir hari ini (23:59:59)
  const getTarget = () => {
    if (endsAt) {
      const targetDate = new Date(endsAt).getTime();
      // Jika target sudah lewat, kita bisa buat dia berulang harian atau tetap 0
      // Tapi permintaan user adalah "setiap hari selalu menghitung mundur"
      if (targetDate > now) return targetDate;
    }
    
    // Default: Hitung mundur ke tengah malam hari ini
    const today = new Date();
    today.setHours(23, 59, 59, 999);
    return today.getTime();
  };

  const target = getTarget();
  const diff = Math.max(0, target - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff / 3600000) % 24);
  const m = Math.floor((diff / 60000) % 60);
  const s = Math.floor((diff / 1000) % 60);
  const Item = ({ v, l }: { v: number; l: string }) => (
    <div className="flex flex-col items-center bg-white/10 backdrop-blur border border-white/20 rounded-xl px-4 py-3 min-w-[70px]">
      <div className="text-3xl md:text-4xl font-bold tabular-nums">{String(v).padStart(2, "0")}</div>
      <div className="text-[10px] uppercase opacity-80 tracking-wider">{l}</div>
    </div>
  );
  return (
    <div className="flex justify-center gap-3">
      <Item v={d} l="Hari" /><Item v={h} l="Jam" /><Item v={m} l="Menit" /><Item v={s} l="Detik" />
    </div>
  );
}

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
  const accent = theme.accent || "#f59e0b";
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
                        {s.props.titleAccent && (() => {
                          const [accent, ...rest] = s.props.titleAccent!.split("|");
                          const tail = rest.join("|");
                          return (
                            <>
                              <br />
                              <span style={{ color: primary }}>{accent}</span>
                              {tail && <span>{tail}</span>}
                            </>
                          );
                        })()}
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
                    {s.props.subtitle && <p className="text-xl font-semibold" style={{ color: primary }}>{s.props.subtitle}</p>}
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
                        <span className="inline-block px-3 py-1 rounded-full text-xs font-semibold" style={{ backgroundColor: accent + "33", color: accent }}>
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

            case "usage":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-5xl mx-auto px-4 text-center space-y-6">
                    {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                    {s.props.subtitle && <p className="opacity-80 text-lg max-w-2xl mx-auto">{s.props.subtitle}</p>}
                    <div className="grid gap-4 grid-cols-2 md:grid-cols-4 pt-4">
                      {(s.props.items || []).map((it, i) => (
                        <div key={i} className="p-6 rounded-xl border-2 bg-white/80" style={{ borderColor: primary + "44" }}>
                          <div className="text-5xl mb-3">{it.icon}</div>
                          <div className="font-semibold">{it.label}</div>
                        </div>
                      ))}
                    </div>
                    {s.props.footer && <p className="pt-4 opacity-70 italic">{s.props.footer}</p>}
                  </div>
                </section>
              );

            case "comparison":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70 max-w-3xl mx-auto">{s.props.subtitle}</p>}
                    </div>
                    <div className="grid md:grid-cols-2 gap-6">
                      {/* Left: old way */}
                      <div className="p-6 rounded-2xl bg-red-50 border-2 border-red-200 space-y-3">
                        <h3 className="text-2xl font-bold text-red-700">{s.props.leftTitle}</h3>
                        {s.props.leftSubtitle && <p className="text-sm text-red-800/80">{s.props.leftSubtitle}</p>}
                        <ul className="space-y-2">
                          {(s.props.leftItems || []).map((it, i) => (
                            <li key={i} className="flex justify-between items-center bg-white/70 rounded px-3 py-2 text-sm">
                              <span>{it.icon} {it.label}</span>
                              <span className="font-semibold text-red-700">{it.price}</span>
                            </li>
                          ))}
                        </ul>
                        <div className="pt-3 border-t border-red-300 text-center">
                          <div className="text-sm opacity-80">{s.props.leftTotalLabel}</div>
                          <div className="text-3xl font-bold text-red-700">{s.props.leftTotal}</div>
                        </div>
                      </div>
                      {/* Right: smart solution */}
                      <div className="p-6 rounded-2xl border-2 space-y-3" style={{ backgroundColor: primary + "11", borderColor: primary }}>
                        <h3 className="text-2xl font-bold" style={{ color: primaryDark }}>{s.props.rightTitle}</h3>
                        {s.props.rightSubtitle && <p className="text-sm opacity-80">{s.props.rightSubtitle}</p>}
                        {s.props.rightImage && (
                          <img src={s.props.rightImage} alt="" className="w-full max-w-xs mx-auto rounded-lg" />
                        )}
                        <div className="text-center bg-white/70 rounded p-3">
                          <div className="text-sm opacity-80">{s.props.rightPriceLabel}</div>
                          <div className="text-3xl font-bold" style={{ color: primaryDark }}>{s.props.rightPrice}</div>
                        </div>
                        <ul className="space-y-2">
                          {(s.props.rightBenefits || []).map((b, i) => (
                            <li key={i} className="flex gap-2 items-start text-sm">
                              <CheckCircle2 className="w-5 h-5 shrink-0" style={{ color: primary }} />
                              <span>{b}</span>
                            </li>
                          ))}
                        </ul>
                        {s.props.rightFooter && <p className="text-sm font-medium text-center pt-2">{s.props.rightFooter}</p>}
                      </div>
                    </div>
                  </div>
                </section>
              );

            case "beforeAfter":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70">{s.props.subtitle}</p>}
                    </div>
                    <div className="grid gap-8 md:grid-cols-2">
                      {(s.props.items || []).map((it, i) => (
                        <div key={i} className="bg-white rounded-2xl border shadow-sm overflow-hidden">
                          <div className="grid grid-cols-2">
                            <div className="relative">
                              <img src={it.before} alt="Sebelum" className="w-full aspect-square object-cover cursor-pointer" onClick={() => setLightbox(it.before)} />
                              <span className="absolute top-2 left-2 bg-red-600 text-white text-xs px-2 py-1 rounded">Sebelum</span>
                            </div>
                            <div className="relative">
                              <img src={it.after} alt="Sesudah" className="w-full aspect-square object-cover cursor-pointer" onClick={() => setLightbox(it.after)} />
                              <span className="absolute top-2 left-2 text-white text-xs px-2 py-1 rounded" style={{ backgroundColor: primary }}>Sesudah</span>
                            </div>
                          </div>
                          <div className="p-4 text-center space-y-1">
                            {it.caption && <div className="font-medium">{it.caption}</div>}
                            {it.duration && <div className="text-xs opacity-70">{it.duration}</div>}
                          </div>
                        </div>
                      ))}
                    </div>
                    {s.props.disclaimer && <p className="text-center text-xs opacity-60 mt-6 italic">{s.props.disclaimer}</p>}
                  </div>
                </section>
              );

            case "testimonials": {
              const cols = s.props.columns || 2;
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16">
                  <div className="max-w-6xl mx-auto px-4">
                    <div className="text-center mb-10 space-y-2">
                      {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                      {s.props.subtitle && <p className="opacity-70">{s.props.subtitle}</p>}
                    </div>
                    <div className={`grid gap-6 ${cols === 3 ? "md:grid-cols-3" : cols === 4 ? "md:grid-cols-2 lg:grid-cols-4" : "md:grid-cols-2"}`}>
                      {(s.props.items || []).map((it, i) => (
                        <div key={i} className="bg-white rounded-2xl p-6 border shadow-sm">
                          <div className="flex items-center gap-3 mb-3">
                            {it.photo && <img src={it.photo} alt={it.name} className="w-14 h-14 rounded-full object-cover" />}
                            <div>
                              <div className="font-semibold">{it.name}</div>
                              {it.location && <div className="text-xs opacity-70">{it.location}</div>}
                            </div>
                          </div>
                          <p className="italic opacity-80 leading-relaxed">"{it.quote}"</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>
              );
            }

            case "countdown":
              return (
                <section key={s.id} style={bgStyle(s.props.bg)} className="py-16 text-white">
                  <div className="max-w-3xl mx-auto px-4 text-center space-y-6">
                    {s.props.title && <h2 className="text-3xl md:text-4xl font-bold">{s.props.title}</h2>}
                    {s.props.subtitle && <p className="opacity-90">{s.props.subtitle}</p>}
                    <Countdown endsAt={s.props.endsAt} />
                    {s.props.bonusText && <p className="text-lg font-medium">{s.props.bonusText}</p>}
                    {s.props.ctaText && (
                      <a href={s.props.ctaHref || "#order"} className="inline-flex items-center px-8 py-4 rounded-md font-bold shadow-lg" style={{ backgroundColor: accent, color: "#000" }}>
                        {s.props.ctaText}
                      </a>
                    )}
                  </div>
                </section>
              );

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
                      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 pt-6 text-sm">
                        {s.props.items.map((it, i) => {
                          const isPdf = it.fileType === "pdf" || (it.image && /\.pdf($|\?)/i.test(it.image));
                          return (
                            <div key={i} className="p-4 rounded-lg bg-white border flex flex-col items-center text-center">
                              {it.image ? (
                                isPdf ? (
                                  <a
                                    href={it.image}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="w-full h-40 mb-3 rounded border flex flex-col items-center justify-center bg-red-50 hover:bg-red-100 transition"
                                  >
                                    <div className="text-4xl mb-1">📄</div>
                                    <div className="text-xs font-medium text-red-700">Lihat PDF</div>
                                  </a>
                                ) : (
                                  <img
                                    src={it.image}
                                    alt={it.title}
                                    className="w-full h-40 object-contain mb-3 rounded cursor-pointer"
                                    onClick={() => setLightbox(it.image!)}
                                  />
                                )
                              ) : it.icon ? (
                                <div className="text-3xl mb-2">{it.icon}</div>
                              ) : null}
                              <div className="font-semibold">{it.title}</div>
                              {it.description && (
                                <div className="text-xs opacity-70 mt-1 whitespace-pre-wrap">{it.description}</div>
                              )}
                            </div>
                          );
                        })}
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
