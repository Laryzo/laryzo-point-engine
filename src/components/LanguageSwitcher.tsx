import { useLanguage } from "@/context/LanguageContext";

interface LanguageSwitcherProps {
  className?: string;
}

export function LanguageSwitcher({ className = "" }: LanguageSwitcherProps) {
  const { lang, setLang } = useLanguage();

  return (
    <div className={`flex items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-full p-1 shadow-xl ${className}`}>
      <button
        onClick={() => setLang("ID")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          lang === "ID"
            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        ID
      </button>
      <button
        onClick={() => setLang("EN")}
        className={`px-3 py-1 rounded-full text-xs font-medium transition-all duration-300 ${
          lang === "EN"
            ? "bg-cyan-500 text-white shadow-lg shadow-cyan-500/30"
            : "text-slate-400 hover:text-slate-200"
        }`}
      >
        EN
      </button>
    </div>
  );
}
