
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";
import laryzoLogo from "@/assets/laryzo-logo.png";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <img src={laryzoLogo} alt="Laryzo" className="w-48 h-48 mx-auto mb-8 object-contain" />
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/portal/login">
              Customer
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-orange-500 text-orange-600 hover:bg-orange-50">
            <Link to="/mitra/login">
              <Store className="w-4 h-4 mr-2" />
              Mitra Login
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg">
            <Link to="/login">
              Admin Login
            </Link>
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Index;
