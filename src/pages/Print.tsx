import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { ArrowLeftIcon, PrinterIcon } from "lucide-react";

const PrintPage = () => {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(true);
  const [invoiceHTML, setInvoiceHTML] = useState<string>('');

  useEffect(() => {
    // Get invoice HTML from sessionStorage
    const storedHTML = sessionStorage.getItem('printInvoiceHTML');
    
    if (!storedHTML) {
      toast.error("No invoice data found");
      navigate(-1);
      return;
    }

    setInvoiceHTML(storedHTML);
    setIsLoading(false);

    // Auto-print after a short delay
    setTimeout(() => {
      try {
        window.print();
      } catch (error) {
        console.error('Auto-print failed:', error);
      }
    }, 1000);
  }, [navigate]);

  const handlePrint = () => {
    try {
      window.print();
    } catch (error) {
      console.error('Print failed:', error);
      toast.error("Please use your browser's print option (Menu > Print)");
    }
  };

  const handleBack = () => {
    // Clear the stored HTML
    sessionStorage.removeItem('printInvoiceHTML');
    navigate(-1);
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-muted-foreground">Preparing invoice for printing...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print controls - hidden when printing */}
      <div className="print:hidden p-4 border-b flex items-center justify-between">
        <div className="flex items-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={handleBack}
          >
            <ArrowLeftIcon size={16} className="mr-1" />
            Back
          </Button>
          <h1 className="text-lg font-medium ml-4">Print Invoice</h1>
        </div>
        
        <Button
          onClick={handlePrint}
          className="bg-gold-500 hover:bg-gold-600 text-black"
        >
          <PrinterIcon size={16} className="mr-2" />
          Print
        </Button>
      </div>

      {/* Print content */}
      <div 
        className="p-4"
        dangerouslySetInnerHTML={{ __html: invoiceHTML }}
      />
    </div>
  );
};

export default PrintPage; 