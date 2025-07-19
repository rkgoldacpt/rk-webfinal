import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { db, Invoice, Customer } from "@/lib/db";
import { formatCurrency, formatDate, generateInvoiceHTML, printInvoice, generateInvoiceWhatsAppMessage, shareInvoicePDF, generateAndDownloadPDF, testPDFGeneration } from "@/lib/utils";
import { toast } from "sonner";
import { ArrowLeftIcon, FileTextIcon, PrinterIcon, Share2Icon, FileIcon } from "lucide-react";

const InvoiceDetailPage = () => {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();
  
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Load invoice and customer data
  useEffect(() => {
    const loadData = async () => {
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
        
        setInvoice(invoiceData);
        
        // Get customer data
        const customerData = await db.getCustomerById(invoiceData.customerId);
        if (customerData) {
          setCustomer(customerData);
        }
        
      } catch (error) {
        console.error("Error loading invoice data:", error);
        toast.error("Failed to load invoice");
      } finally {
        setIsLoading(false);
      }
    };
    
    loadData();
  }, [invoiceId, navigate]);
  
  // Handle print invoice
  const handlePrintInvoice = async () => {
    if (!invoice || !customer) {
      toast.error("Invoice data not available");
      return;
    }
    
    try {
      // Check if running on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, generate and download PDF
        await generateAndDownloadPDF(invoice, customer);
      } else {
        // For desktop, use the existing print approach
        const invoiceHTML = generateInvoiceHTML(invoice, customer);
        printInvoice(invoiceHTML);
      }
    } catch (error) {
      console.error("Error printing invoice:", error);
      toast.error("Failed to print invoice");
    }
  };
  
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Loading invoice data...</p>
        </main>
      </div>
    );
  }
  
  if (!invoice) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <p className="text-center text-muted-foreground">Invoice not found</p>
        </main>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={() => navigate(-1)}
              className="mr-2"
            >
              <ArrowLeftIcon size={16} className="mr-1" />
              Back
            </Button>
            
            <div>
              <h1 className="text-3xl font-serif font-bold mb-1">Invoice Details</h1>
              <p className="text-muted-foreground">Invoice #{invoice.id.substring(0, 8).toUpperCase()}</p>
            </div>
          </div>
          
          <div className="flex gap-2">
            <Button 
              onClick={handlePrintInvoice}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              <PrinterIcon size={16} className="mr-2" />
              Print Invoice
            </Button>
            
            <Button 
              onClick={testPDFGeneration}
              variant="outline"
              className="border-blue-200 hover:bg-blue-50"
            >
              Test PDF
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            {/* Invoice Overview */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xl font-serif">Invoice Overview</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-y-3">
                  <div>
                    <p className="text-sm text-muted-foreground">Invoice Date</p>
                    <p className="font-medium">{formatDate(invoice.invoiceDate)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className={`font-medium ${invoice.dueAmount > 0 ? 'text-amber-600' : 'text-green-600'}`}>
                      {invoice.dueAmount > 0 ? 'Partially Paid' : 'Fully Paid'}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Amount</p>
                    <p className="font-medium">{formatCurrency(invoice.totalAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Paid Amount</p>
                    <p className="font-medium">
                      {formatCurrency(invoice.payments.reduce((sum, p) => p.mode !== 'DISCOUNT' ? sum + p.amount : sum, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Discount</p>
                    <p className="font-medium text-purple-600">
                      {formatCurrency(invoice.payments.reduce((sum, p) => p.mode === 'DISCOUNT' ? sum + p.amount : sum, 0))}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Due Amount</p>
                    <p className="font-medium">{formatCurrency(invoice.dueAmount)}</p>
                  </div>
                </div>
                
                {invoice.notes && (
                  <div className="mt-4 pt-4 border-t">
                    <p className="text-sm text-muted-foreground">Notes</p>
                    <p className="mt-1">{invoice.notes}</p>
                  </div>
                )}
              </CardContent>
            </Card>
            
            {/* Payment Details */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xl font-serif">Payment Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  {invoice.payments.map((payment, index) => (
                    <div key={index} className="flex justify-between items-center p-3 rounded-lg border bg-card">
                      <div>
                        <p className={`font-medium ${payment.mode === 'DISCOUNT' ? 'text-purple-600' : ''}`}>
                          {payment.mode === 'PHONEPE' ? (
                            <>
                              PhonePe ({payment.phonePeReceiver === 'OTHERS' ? payment.customReceiverName : payment.phonePeReceiver})
                            </>
                          ) : payment.mode === 'DISCOUNT' ? 'Discount' : 'Cash'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.timestamp).toLocaleString('en-IN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Kolkata'
                          })}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className={`font-medium ${payment.mode === 'DISCOUNT' ? 'text-purple-600' : 'text-gold-800'}`}>
                          {formatCurrency(payment.amount)}
                        </p>
                      </div>
                    </div>
                  ))}

                  {invoice.dueAmount > 0 && (
                    <div className="flex justify-between items-center p-3 rounded-lg border border-destructive/50 bg-destructive/10">
                      <div>
                        <p className="font-medium text-destructive">Due Amount</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium text-destructive">{formatCurrency(invoice.dueAmount)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
            
            {/* Items List */}
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xl font-serif">Item Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse">
                    <thead>
                      <tr className="text-left text-sm text-muted-foreground border-b">
                        <th className="pb-2 font-medium">Item</th>
                        <th className="pb-2 font-medium">Gross Weight</th>
                        <th className="pb-2 font-medium">Wastage</th>
                        <th className="pb-2 font-medium">Gold Rate</th>
                        <th className="pb-2 font-medium">Lab Rate</th>
                        <th className="pb-2 font-medium">Amount</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {invoice.items.map((item, index) => {
                        const netWeight = item.grossWeight + (item.grossWeight * item.wastage / 100);
                        const amount = (netWeight * item.goldRate) + item.labRate;
                        
                        return (
                          <tr key={item.id} className="text-sm">
                            <td className="py-3 font-medium">{item.name}</td>
                            <td className="py-3">{item.grossWeight.toFixed(3)} g</td>
                            <td className="py-3">{item.wastage}%</td>
                            <td className="py-3">{formatCurrency(item.goldRate)}/g</td>
                            <td className="py-3">{formatCurrency(item.labRate)}</td>
                            <td className="py-3 font-medium">{formatCurrency(amount)}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                
                <div className="mt-6 pt-4 border-t flex justify-end">
                  <div className="w-64 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Amount:</span>
                      <span className="font-medium">{formatCurrency(invoice.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid Amount:</span>
                      <span className="font-medium">
                        {formatCurrency(invoice.payments.reduce((sum, p) => p.mode !== 'DISCOUNT' ? sum + p.amount : sum, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Discount:</span>
                      <span className="font-medium text-purple-600">
                        {formatCurrency(invoice.payments.reduce((sum, p) => p.mode === 'DISCOUNT' ? sum + p.amount : sum, 0))}
                      </span>
                    </div>
                    <div className="flex justify-between font-medium pt-2 border-t">
                      <span>Due Amount:</span>
                      <span className="text-gold-800">{formatCurrency(invoice.dueAmount)}</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Customer Information */}
          <div>
            <Card>
              <CardHeader className="pb-3 border-b">
                <CardTitle className="text-xl font-serif">Customer Details</CardTitle>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Name</p>
                    <p className="font-medium">{invoice.customerName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Mobile</p>
                    <p className="font-medium">{invoice.customerMobile}</p>
                  </div>
                  {customer?.address && (
                    <div>
                      <p className="text-sm text-muted-foreground">Address</p>
                      <p className="font-medium">{customer.address}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
        
        <div className="mt-8 flex justify-end gap-2">
          <Button
            variant="outline"
            size="sm"
            className="border-gold-200 hover:bg-gold-50"
            onClick={() => {
              const message = generateInvoiceWhatsAppMessage(invoice, customer);
              const whatsappUrl = `https://wa.me/${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
              window.open(whatsappUrl, '_blank');
            }}
          >
            <Share2Icon size={14} className="mr-1" />
            Share Text
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gold-200 hover:bg-gold-50"
            onClick={async () => {
              try {
                await shareInvoicePDF(invoice, customer);
              } catch (error) {
                console.error('Error sharing PDF:', error);
                toast.error('Failed to share PDF');
              }
            }}
          >
            <FileIcon size={14} className="mr-1" />
            Share PDF
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="border-gold-200 hover:bg-gold-50"
            onClick={() => navigate(`/invoice/${invoice.id}`)}
          >
            <FileTextIcon size={14} className="mr-1" />
            View Invoice
          </Button>
        </div>
      </main>
    </div>
  );
};

export default InvoiceDetailPage;
