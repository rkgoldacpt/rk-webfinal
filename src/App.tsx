import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import Index from "@/pages/Index";
import NotFound from "./pages/NotFound";
import Customers from "@/pages/Customers";
import Invoices from "@/pages/Invoices";
import NewInvoice from "@/pages/NewInvoice";
import InvoiceDetail from "@/pages/InvoiceDetail";
import InvoicePrint from "@/pages/InvoicePrint";
import Print from "@/pages/Print";
import History from "@/pages/History";
import Settings from "@/pages/Settings";
import Login from "@/pages/Login";
import CustomerPayments from "@/pages/CustomerPayments";
import PWAInstallPrompt from "@/components/PWAInstallPrompt";

const queryClient = new QueryClient();

// Protected Route component
const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const isAuthenticated = localStorage.getItem("isAuthenticated");
  
  if (!isAuthenticated) {
    return <Navigate to="/login" />;
  }
  
  return <>{children}</>;
};

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          
          <Route path="/" element={
            <ProtectedRoute>
              <Index />
            </ProtectedRoute>
          } />
          
          <Route path="/new-invoice" element={
            <ProtectedRoute>
              <NewInvoice />
            </ProtectedRoute>
          } />
          
          <Route path="/customers" element={
            <ProtectedRoute>
              <Customers />
            </ProtectedRoute>
          } />
          
          <Route path="/invoices" element={
            <ProtectedRoute>
              <Invoices />
            </ProtectedRoute>
          } />
          
          <Route path="/invoice/:invoiceId" element={
            <ProtectedRoute>
              <InvoiceDetail />
            </ProtectedRoute>
          } />
          
          <Route path="/invoice/:invoiceId/print" element={
            <ProtectedRoute>
              <InvoicePrint />
            </ProtectedRoute>
          } />
          
          <Route path="/print" element={
            <ProtectedRoute>
              <Print />
            </ProtectedRoute>
          } />
          
          <Route path="/history" element={
            <ProtectedRoute>
              <History />
            </ProtectedRoute>
          } />
          
          <Route path="/settings" element={
            <ProtectedRoute>
              <Settings />
            </ProtectedRoute>
          } />

          <Route path="/customer-payments" element={
            <ProtectedRoute>
              <CustomerPayments />
            </ProtectedRoute>
          } />
          
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Router>
      <PWAInstallPrompt />
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
