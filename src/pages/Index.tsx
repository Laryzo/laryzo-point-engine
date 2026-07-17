import { Button } from "@/components/ui/button";
import { Store, Users } from "lucide-react";
import { Link } from "react-router-dom";
import laryzoLogo from "@/assets/laryzo-logo-transparent.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-gradient-to-br from-cyan-500/15 to-blue-500/10 rounded-full blur-[150px]" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-gradient-to-tl from-emerald-500/15 to-teal-500/10 rounded-full blur-[150px]" />
      <div className="absolute top-[50%] left-[50%] w-[40%] h-[40%] bg-gradient-to-br from-purple-500/10 to-pink-500/5 rounded-full blur-[120px]" />
      
      <div className="relative z-10 text-center max-w-2xl">
        <div className="relative mb-8">
          <img 
            src={laryzoLogo} 
            alt="Laryzo" 
            className="relative w-72 md:w-96 h-auto mx-auto block drop-shadow-[0_0_30px_rgba(6,182,212,0.4)]" 
          />
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
              <span>Customer Portal</span>
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
              <span>Mitra Login</span>
              <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/0 via-emerald-500/10 to-emerald-500/0 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
