import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";
import laryzoLogo from "@/assets/laryzo-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-[#1E293B] via-[#0F172A] to-[#020617] flex items-center justify-center p-4">
      <div className="text-center">
        <div className="relative mb-12">
          <img src={laryzoLogo} alt="Laryzo" className="relative w-72 md:w-96 h-auto mx-auto block drop-shadow-[0_0_15px_rgba(34,211,238,0.2)]" />
        </div>
        <div className="flex flex-col sm:flex-row gap-6 justify-center">
          <Button asChild size="lg" className="bg-cyan-500 hover:bg-cyan-600 text-white border-none shadow-[0_0_20px_rgba(6,182,212,0.4)] transition-all hover:scale-105">
            <Link to="/portal/login">
              Customer Portal
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-cyan-500/50 text-cyan-400 hover:bg-cyan-500/10 backdrop-blur-sm transition-all hover:scale-105">
            <Link to="/mitra/login">
              <Store className="w-4 h-4 mr-2" />
              Mitra Login
            </Link>
          </Button>
          <Button asChild variant="ghost" size="lg" className="text-slate-400 hover:text-white hover:bg-white/5 transition-all">
            <Link to="/login">
              Admin Access
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
