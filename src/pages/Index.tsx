
import { Button } from "@/components/ui/button";
import { Store } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-12 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
          Laryzo
        </h1>
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <Button asChild size="lg">
            <Link to="/portal/login">
              Customer
            </Link>
          </Button>
          <Button asChild variant="outline" size="lg" className="border-orange-500 text-orange-600 hover:bg-orange-50">
            <Link to="/mitra/login">
              <Store className="w-4 h-4 mr-2" />
              Mitra
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
