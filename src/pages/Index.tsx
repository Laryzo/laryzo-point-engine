
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingUp, Users, Award, ArrowRight, LogIn } from "lucide-react";
import { Link } from "react-router-dom";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-primary to-primary/60 bg-clip-text text-transparent">
            Laryzo Point Engine
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
            Sistem manajemen poin berbasis binary tree untuk memaksimalkan distribusi reward dan membangun jaringan customer yang kuat
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button asChild size="lg">
              <Link to="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Admin Login
              </Link>
            </Button>
            <Button variant="outline" size="lg">
              Learn More
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>

        {/* Features */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Users className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Binary Tree Structure</CardTitle>
              <CardDescription>
                Struktur pohon biner yang optimal untuk distribusi poin dan pertumbuhan jaringan
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <Award className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Auto Point Distribution</CardTitle>
              <CardDescription>
                Distribusi poin otomatis berdasarkan transaksi dengan persentase yang dapat dikonfigurasi
              </CardDescription>
            </CardHeader>
          </Card>

          <Card className="text-center">
            <CardHeader>
              <div className="mx-auto mb-4 w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-primary" />
              </div>
              <CardTitle>Real-time Analytics</CardTitle>
              <CardDescription>
                Dashboard analitik real-time untuk memantau performa jaringan dan distribusi poin
              </CardDescription>
            </CardHeader>
          </Card>
        </div>

        {/* Demo Access */}
        <Card className="max-w-md mx-auto">
          <CardHeader className="text-center">
            <CardTitle>Demo Access</CardTitle>
            <CardDescription>
              Akses demo untuk mencoba sistem
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div><strong>Email:</strong> admin@laryzo.com</div>
            <div><strong>Password:</strong> Any password</div>
            <Button asChild className="w-full mt-4">
              <Link to="/login">
                <LogIn className="w-4 h-4 mr-2" />
                Try Demo
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Index;
