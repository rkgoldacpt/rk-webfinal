
import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";

const NotFound = () => {
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <div className="text-center max-w-md mx-auto p-6">
        <Logo size="lg" className="justify-center mb-6" />
        
        <h1 className="text-4xl font-serif font-bold mb-4 gold-text">404</h1>
        <p className="text-xl text-muted-foreground mb-6">Oops! Page not found</p>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            onClick={() => navigate("/")}
            className="bg-gold-500 hover:bg-gold-600 text-black"
          >
            Return to Dashboard
          </Button>
          
          <Button 
            variant="outline" 
            onClick={() => navigate("/new-invoice")}
            className="border-gold-200 hover:bg-gold-50"
          >
            Create New Invoice
          </Button>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
