
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { db, Invoice, Customer } from "@/lib/db";
import { generateInvoiceHTML } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeftIcon } from "lucide-react";

const InvoicePrintPage = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  
  const [isLoading, setIsLoading] = useState(true);
  
  // Load invoice and customer data, then print
  useEffect(() => {
    const loadAndPrint = async () => {
      if (!invoiceId) return;
      
      try {
        setIsLoading(true);
        
        // Get invoice data
        const invoiceData = await db.getInvoiceById(invoiceId);
        
        if (!invoiceData) {
          toast.error("Invoice not found");
          navigate("/invoices");
          return;
        }
        
        // Get customer data
        const customerData = await db.getCustomerById(invoiceData.customerId);
        if (!customerData) {
          toast.error("Customer information not found");
          navigate(`/invoice/${invoiceId}`);
          return;
        }
        
        // Generate HTML and display in iframe
        const invoiceHTML = generateInvoiceHTML(invoiceData, customerData);
        
        // Set the content and print
        const printContainer = document.getElementById('print-container') as HTMLIFrameElement;
        if (printContainer && printContainer.contentWindow) {
          const iframeDoc = printContainer.contentWindow.document;
          iframeDoc.open();
          iframeDoc.write(invoiceHTML);
          iframeDoc.close();
          
          // Trigger print when loaded
          printContainer.onload = () => {
            setTimeout(() => {
              printContainer.contentWindow?.print();
            }, 500);
          };
        }
      } catch (error) {
        console.error("Error printing invoice:", error);
        toast.error("Failed to print invoice");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadAndPrint();
  }, [invoiceId, navigate]);
  
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <div className="p-4 border-b flex items-center">
        <Button 
          variant="ghost" 
          size="sm"
          onClick={() => navigate(-1)}
        >
          <ArrowLeftIcon size={16} className="mr-1" />
          Back
        </Button>
        <h1 className="text-lg font-medium ml-4">Invoice Print Preview</h1>
      </div>
      
      <div className="flex-1 p-4 flex flex-col items-center justify-center">
        {isLoading ? (
          <p className="text-muted-foreground">Preparing invoice for printing...</p>
        ) : (
          <div className="space-y-4">
            <Button
              onClick={() => {
                const printContainer = document.getElementById('print-container') as HTMLIFrameElement;
                if (printContainer && printContainer.contentWindow) {
                  printContainer.contentWindow.print();
                }
              }}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              Print Again
            </Button>
            <p className="text-sm text-muted-foreground text-center">
              If the print dialog doesn't appear automatically, click the button above to print.
            </p>
          </div>
        )}
        
        <iframe 
          id="print-container" 
          title="Invoice Print Preview"
          className="w-full max-w-3xl h-[600px] mt-6 border rounded-md"
        />
      </div>
    </div>
  );
};

export default InvoicePrintPage;
