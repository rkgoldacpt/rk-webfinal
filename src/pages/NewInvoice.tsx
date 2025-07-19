import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CustomerSearch } from "@/components/CustomerSearch";
import { CustomerForm } from "@/components/CustomerForm";
import { JewelryItemForm } from "@/components/JewelryItemForm";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Customer, db, JewelryItem, Invoice, PaymentDetails } from "@/lib/db";
import { calculateInvoiceTotals, formatCurrency, generateInvoiceHTML, printInvoice, generateAndDownloadPDF } from "@/lib/utils";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { FileTextIcon, PrinterIcon, CoinsIcon } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const NewInvoicePage = () => {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | undefined>();
  const [jewelryItems, setJewelryItems] = useState<JewelryItem[]>([]);
  const [paidAmount, setPaidAmount] = useState<number>(0);
  const [notes, setNotes] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'PHONEPE'>('CASH');
  const [phonePeReceiver, setPhonePeReceiver] = useState<'SHANKAR' | 'RAMAKRISHNA' | 'PAVAN' | 'ARAVIND' | 'OTHERS'>('ARAVIND');
  const [customReceiverName, setCustomReceiverName] = useState<string>('');
  const [serialNumber, setSerialNumber] = useState<number | undefined>(undefined);
  
  // Auto-increment serial number on mount
  useEffect(() => {
    async function fetchNextSerial() {
      const allInvoices = await db.getInvoices();
      const maxSerial = allInvoices.reduce((max, inv) => inv.serialNumber && inv.serialNumber > max ? inv.serialNumber : max, 0);
      setSerialNumber(maxSerial + 1);
    }
    fetchNextSerial();
  }, []);
  
  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
  };
  
  // Handle customer creation
  const handleCustomerCreated = async (customerId: string) => {
    try {
      const customer = await db.getCustomerById(customerId);
      if (customer) {
        setSelectedCustomer(customer);
        toast.success("Customer selected");
      }
    } catch (error) {
      console.error("Error selecting customer:", error);
      toast.error("Failed to select customer");
    }
  };
  
  // Handle form submission
  const handleSubmit = async () => {
    if (!selectedCustomer?.id) {
      toast.error("Please select a customer");
      return;
    }
    
    if (jewelryItems.length === 0) {
      toast.error("Please add at least one jewelry item");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Calculate totals
      const { totalAmount } = calculateInvoiceTotals(jewelryItems);
      const dueAmount = totalAmount - paidAmount;
      
      // Create payment details
      const payment: PaymentDetails = {
        mode: paymentMode,
        amount: paidAmount,
        timestamp: Date.now()
      };
      
      if (paymentMode === 'PHONEPE') {
        payment.phonePeReceiver = phonePeReceiver;
        if (phonePeReceiver === 'OTHERS') {
          if (!customReceiverName.trim()) {
            toast.error("Please enter the receiver's name");
            return;
          }
          payment.customReceiverName = customReceiverName.trim();
        }
      }
      
      // Create new invoice
      const newInvoice = await db.addInvoice({
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        items: jewelryItems,
        totalAmount,
        paidAmount,
        dueAmount,
        invoiceDate: Date.now(),
        notes,
        payments: [payment],
        serialNumber: serialNumber || 1
      });

      // Update daily revenue
      await db.updateDailyRevenue(paidAmount);
      
      toast.success("Invoice created successfully");
      navigate(`/invoice/${newInvoice.id}`);
      
    } catch (error) {
      console.error("Error creating invoice:", error);
      toast.error("Failed to create invoice");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Generate and print invoice preview
  const handlePrintPreview = async () => {
    if (!selectedCustomer?.id) {
      toast.error("Please select a customer");
      return;
    }
    
    if (jewelryItems.length === 0) {
      toast.error("Please add at least one jewelry item");
      return;
    }
    
    try {
      // Calculate totals
      const { totalAmount } = calculateInvoiceTotals(jewelryItems);
      const dueAmount = totalAmount - paidAmount;
      
      // Create invoice object for preview
      const invoicePreview: Invoice = {
        id: 'preview',
        customerId: selectedCustomer.id,
        customerName: selectedCustomer.name,
        customerMobile: selectedCustomer.mobile,
        items: jewelryItems,
        totalAmount,
        paidAmount,
        dueAmount,
        invoiceDate: Date.now(),
        notes,
        payments: [{
          mode: paymentMode,
          amount: paidAmount,
          timestamp: Date.now(),
          ...(paymentMode === 'PHONEPE' && {
            phonePeReceiver,
            ...(phonePeReceiver === 'OTHERS' && { customReceiverName })
          })
        }]
      };
      
      // Check if running on mobile
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // For mobile devices, generate and download PDF
        await generateAndDownloadPDF(invoicePreview, selectedCustomer);
      } else {
        // For desktop, use the existing print approach
        const invoiceHTML = generateInvoiceHTML(invoicePreview, selectedCustomer);
        printInvoice(invoiceHTML);
      }
      
    } catch (error) {
      console.error("Error generating invoice preview:", error);
      toast.error("Failed to generate preview. Please try again.");
    }
  };
  
  // Calculate totals
  const { totalAmount } = calculateInvoiceTotals(jewelryItems);
  const dueAmount = totalAmount - paidAmount;
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-4 md:py-8">
        <div className="mb-6 md:mb-8">
          <h1 className="text-2xl md:text-3xl font-serif font-bold mb-2 gold-text">New Invoice</h1>
          <p className="text-muted-foreground">Create a new bill for your customer</p>
        </div>
        
        <div className="space-y-6 md:space-y-8">
          {/* Customer Selection */}
          <Card className="border-gold-200 overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-gold-50 to-transparent">
              <CardTitle className="text-lg md:text-xl font-serif flex items-center">
                <CoinsIcon className="h-5 w-5 mr-2 text-gold-500" />
                Customer Information
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-4 md:pt-6">
              <Tabs defaultValue="search">
                <TabsList className="mb-4 w-full md:w-auto">
                  <TabsTrigger value="search" className="flex-1 md:flex-initial">Search Customer</TabsTrigger>
                  <TabsTrigger value="add" className="flex-1 md:flex-initial">Add New Customer</TabsTrigger>
                </TabsList>
                
                <TabsContent value="search">
                  <CustomerSearch 
                    onSelectCustomer={handleSelectCustomer}
                    selectedCustomer={selectedCustomer}
                  />
                </TabsContent>
                
                <TabsContent value="add">
                  <CustomerForm onSuccess={handleCustomerCreated} />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          {/* Item Entry */}
          <JewelryItemForm items={jewelryItems} onChange={setJewelryItems} />
          
          {/* Payment Details */}
          <Card className="border-gold-200">
            <CardHeader className="bg-gradient-to-r from-gold-50 to-transparent">
              <CardTitle className="text-lg md:text-xl font-serif">Payment Details</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <Label>Payment Mode</Label>
                    <Select
                      value={paymentMode}
                      onValueChange={(value: 'CASH' | 'PHONEPE') => {
                        setPaymentMode(value);
                        if (value === 'CASH') {
                          setPhonePeReceiver('ARAVIND');
                          setCustomReceiverName('');
                        }
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select payment mode" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="CASH">Cash</SelectItem>
                        <SelectItem value="PHONEPE">PhonePe</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {paymentMode === 'PHONEPE' && (
                    <div className="space-y-4">
                      <div>
                        <Label>PhonePe Receiver</Label>
                        <Select
                          value={phonePeReceiver}
                          onValueChange={(value: 'SHANKAR' | 'RAMAKRISHNA' | 'PAVAN' | 'ARAVIND' | 'OTHERS') => {
                            setPhonePeReceiver(value);
                            if (value !== 'OTHERS') {
                              setCustomReceiverName('');
                            }
                          }}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select who received the payment" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="SHANKAR">Shankar</SelectItem>
                            <SelectItem value="RAMAKRISHNA">Ramakrishna</SelectItem>
                            <SelectItem value="PAVAN">Pavan</SelectItem>
                            <SelectItem value="ARAVIND">Aravind</SelectItem>
                            <SelectItem value="OTHERS">Others</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {phonePeReceiver === 'OTHERS' && (
                        <div>
                          <Label>Receiver Name</Label>
                          <Input
                            placeholder="Enter receiver's name"
                            value={customReceiverName}
                            onChange={(e) => setCustomReceiverName(e.target.value)}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <Label htmlFor="paid-amount">Paid Amount</Label>
                    <Input
                      id="paid-amount"
                      type="number"
                      step="0.01"
                      value={paidAmount || ''}
                      onChange={(e) => setPaidAmount(parseFloat(e.target.value) || 0)}
                      className="w-full"
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="due-amount">Due Amount</Label>
                    <div className="p-2 border rounded-md bg-gradient-to-r from-gold-50 to-gold-100 text-gold-800 font-medium">
                      {formatCurrency(dueAmount)}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Add any additional notes here..."
                    className="h-[130px]"
                  />
                  {/* Serial Number Field */}
                  <div className="mt-4">
                    <Label htmlFor="serial-number">Serial Number</Label>
                    <Input
                      id="serial-number"
                      type="number"
                      value={serialNumber || ''}
                      onChange={e => setSerialNumber(parseInt(e.target.value) || 1)}
                      className="w-full"
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          {/* Action Buttons */}
          <div className={`flex ${isMobile ? 'flex-col' : 'justify-end'} gap-4`}>
            {isMobile ? (
              <>
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedCustomer?.id || jewelryItems.length === 0}
                  className="bg-gold-500 hover:bg-gold-600 text-black w-full"
                >
                  <FileTextIcon size={16} className="mr-2" />
                  {isSubmitting ? "Saving..." : "Save Invoice"}
                </Button>
                
                <Button
                  variant="outline"
                  onClick={handlePrintPreview}
                  disabled={isSubmitting || !selectedCustomer?.id || jewelryItems.length === 0}
                  className="border-gold-200 hover:bg-gold-50 w-full"
                >
                  <PrinterIcon size={16} className="mr-2" />
                  Preview
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="outline"
                  onClick={handlePrintPreview}
                  disabled={isSubmitting || !selectedCustomer?.id || jewelryItems.length === 0}
                  className="border-gold-200 hover:bg-gold-50"
                >
                  <PrinterIcon size={16} className="mr-2" />
                  Preview
                </Button>
                
                <Button
                  onClick={handleSubmit}
                  disabled={isSubmitting || !selectedCustomer?.id || jewelryItems.length === 0}
                  className="bg-gold-500 hover:bg-gold-600 text-black ml-2"
                >
                  <FileTextIcon size={16} className="mr-2" />
                  {isSubmitting ? "Saving..." : "Save Invoice"}
                </Button>
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default NewInvoicePage;
