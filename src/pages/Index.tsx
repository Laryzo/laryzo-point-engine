import { Button } from "@/components/ui/button";
2	import { Store } from "lucide-react";
3	import { Link } from "react-router-dom";
4	import laryzoLogo from "@/assets/laryzo-logo.png";
5	
6	const Index = () => {
7	  return (
8	    <div className="min-h-screen bg-background flex items-center justify-center">
9	      <div className="text-center">
10	        <img src={laryzoLogo} alt="Laryzo" className="w-64 h-auto mx-auto mb-8 object-contain rounded-lg shadow-xl" />
11	        <div className="flex flex-col sm:flex-row gap-4 justify-center">
12	          <Button asChild size="lg">
13	            <Link to="/portal/login">
14	              Customer
15	            </Link>
16	          </Button>
17	          <Button asChild variant="outline" size="lg" className="border-orange-500 text-orange-600 hover:bg-orange-50">
18	            <Link to="/mitra/login">
19	              <Store className="w-4 h-4 mr-2" />
20	              Mitra
21	            </Link>
22	          </Button>
23	          <Button asChild variant="outline" size="lg">
24	            <Link to="/login">
25	              Admin
26	            </Link>
27	          </Button>
28	        </div>
29	      </div>
30	    </div>
31	  );
32	};
33	
34	export default Index;
35	
