import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Store, Users, Globe } from "lucide-react";
import { Link } from "react-router-dom";
import laryzoLogo from "@/assets/laryzo-logo-transparent.png";

const Index = () => {
  const [lang, setLang] = useState<"ID" | "EN">("ID");

  const content = {
    ID: {
      motto: "Bersama Kita Bertumbuh",
      customerPortal: "Customer Portal",
      mitraLogin: "Mitra Login",
    },
    EN: {
      motto: "Growing Together",
      customerPortal: "Customer Portal",
      mitraLogin: "Partner Login",
    },
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Language Switcher */}
      <div className="absolute top-6 right-6 z-20 flex items-center gap-2 bg-slate-900/40 backdrop-blur-md border border-slate-800 rounded-full p-1 shadow-xl">
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
              : "text-slate-400 hover:text-slate-200 opacity-50"
          }`}
        >
          EN
        </button>
      </div>

      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-cyan-500/15 to-blue-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-emerald-500/15 to-teal-500/10 rounded-full blur-[150px]" />
      <div className="absolute top-[50%] left-[50%] w-[40%] h-[40%] bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-[120px]" />
      
      <div className="relative z-10 text-center max-w-2xl">
        <div className="relative mb-8 flex flex-col items-center">
          <img 
            src={laryzoLogo} 
            alt="Laryzo" 
            className="relative w-72 md:w-96 h-auto block drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]" 
          />
          <p className="-mt-12 md:-mt-16 text-white/80 font-sans font-light tracking-[0.2em] text-[10px] md:text-xs uppercase animate-fade-in relative z-10">
            {content[lang].motto}
          </p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          {/* Customer Portal Button */}
          <Button 
            asChild 
            size="lg" 
            className="group relative px-8 py-6 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white border-0 shadow-lg shadow-cyan-500/40 hover:shadow-cyan-500/60 transition-all duration-300 hover:scale-105 font-semibold text-base overflow-hidden"
          >
            <Link to="/portal/login" className="flex items-center justify-center gap-3">
              <Users className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>{content[lang].customerPortal}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </Button>
  
          {/* Mitra Login Button */}
          <Button 
            asChild 
            size="lg" 
            className="group relative px-8 py-6 border-2 border-emerald-500/60 text-emerald-400 hover:text-white bg-gradient-to-r from-emerald-500/10 to-teal-500/10 hover:from-emerald-500/20 hover:to-teal-500/20 backdrop-blur-sm shadow-lg shadow-emerald-500/20 hover:shadow-emerald-500/40 transition-all duration-300 hover:scale-105 font-semibold text-base overflow-hidden hover:border-emerald-400"
          >
            <Link to="/mitra/login" className="flex items-center justify-center gap-3">
              <Store className="w-5 h-5 transition-transform group-hover:scale-110" />
              <span>{content[lang].mitraLogin}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
