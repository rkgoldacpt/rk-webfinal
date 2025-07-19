import React from "react";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { CalendarIcon, FileTextIcon, PlusIcon, UserIcon, Settings, LayoutDashboardIcon, CoinsIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";

export const Header = () => {
  const navigate = useNavigate();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  return (
    <header className="sticky top-0 z-10 bg-white bg-opacity-95 backdrop-blur-sm border-b border-gold-200 shadow-sm">
      <div className="container mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Logo size="md" />
          <span className="hidden sm:inline-block text-sm text-muted-foreground">
            Billing System
          </span>
        </div>
        
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/")}
            className="hidden md:flex gap-1 text-muted-foreground hover:text-foreground"
          >
            <LayoutDashboardIcon size={18} />
            <span>Dashboard</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/customers")}
            className="hidden md:flex gap-1 text-muted-foreground hover:text-foreground"
          >
            <UserIcon size={18} />
            <span>Customers</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/invoices")}
            className="hidden md:flex gap-1 text-muted-foreground hover:text-foreground"
          >
            <FileTextIcon size={18} />
            <span>Invoices</span>
          </Button>
          
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/history")}
            className="hidden md:flex gap-1 text-muted-foreground hover:text-foreground"
          >
            <CalendarIcon size={18} />
            <span>History</span>
          </Button>

          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/customer-payments")}
            className="hidden md:flex gap-1 text-muted-foreground hover:text-foreground"
          >
            <CoinsIcon size={18} />
            <span>Payments</span>
          </Button>
          
          <Button 
            onClick={() => navigate("/new-invoice")}
            size="sm"
            className="bg-gold-500 hover:bg-gold-600 text-black flex gap-1"
          >
            <PlusIcon size={16} />
            <span>New Bill</span>
          </Button>
        </div>
        
        <div className="md:hidden">
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="text-gray-600 hover:text-gold-500"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>
      
      {/* Mobile menu */}
      {isMobileMenuOpen && (
        <div className="md:hidden py-4">
          <div className="flex flex-col space-y-4">
            <Link
              to="/"
              className="text-gray-600 hover:text-gold-500 transition-colors flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <LayoutDashboardIcon className="w-4 h-4 mr-1" />
              Dashboard
            </Link>
            <Link
              to="/customers"
              className="text-gray-600 hover:text-gold-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <UserIcon className="w-4 h-4 mr-1" />
              Customers
            </Link>
            <Link
              to="/invoices"
              className="text-gray-600 hover:text-gold-500 transition-colors"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <FileTextIcon className="w-4 h-4 mr-1" />
              Invoices
            </Link>
            <Link
              to="/history"
              className="text-gray-600 hover:text-gold-500 transition-colors flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <CalendarIcon className="w-4 h-4 mr-1" />
              History
            </Link>
            <Link
              to="/customer-payments"
              className="text-gray-600 hover:text-gold-500 transition-colors flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <CoinsIcon className="w-4 h-4 mr-1" />
              Payments
            </Link>
            <Link
              to="/settings"
              className="text-gray-600 hover:text-gold-500 transition-colors flex items-center"
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <Settings className="w-4 h-4 mr-1" />
              Settings
            </Link>
          </div>
        </div>
      )}
    </header>
  );
};
