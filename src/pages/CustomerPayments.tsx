import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { db, Invoice, Customer } from "@/lib/db";
import type { PaymentDetails } from "@/lib/db";
import { formatCurrency, formatDate, generateInvoiceWhatsAppMessage, shareInvoicePDF } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SearchIcon, FileTextIcon, CoinsIcon, UserIcon, PhoneIcon, MapPinIcon, Share2Icon, FileIcon } from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const CustomerPaymentsPage = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [searchMode, setSearchMode] = useState<'customer' | 'invoice'>('customer');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [customerInvoices, setCustomerInvoices] = useState<Invoice[]>([]);
  const [paymentAmount, setPaymentAmount] = useState<number>(0);
  const [paymentMode, setPaymentMode] = useState<'CASH' | 'PHONEPE'>('CASH');
  const [phonePeReceiver, setPhonePeReceiver] = useState<'SHANKAR' | 'RAMAKRISHNA' | 'PAVAN' | 'ARAVIND' | 'OTHERS'>('ARAVIND');
  const [customReceiverName, setCustomReceiverName] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedInvoices, setSelectedInvoices] = useState<Set<string>>(new Set());
  const [isMarkingCleared, setIsMarkingCleared] = useState(false);
  const [matchingInvoices, setMatchingInvoices] = useState<{[customerId: string]: Invoice[]}>({});

  // Load all customers
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const allCustomers = await db.getCustomers();
        setCustomers(allCustomers);
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Failed to load customers");
      }
    };
    loadCustomers();
  }, []);

  // Load customer invoices when selected
  useEffect(() => {
    const loadCustomerInvoices = async () => {
      if (!selectedCustomer) return;

      try {
        const invoices = await db.getInvoicesByCustomerId(selectedCustomer.id);
        // Sort by date, newest first
        const sortedInvoices = invoices.sort((a, b) => b.invoiceDate - a.invoiceDate);
        setCustomerInvoices(sortedInvoices);
      } catch (error) {
        console.error("Error loading customer invoices:", error);
        toast.error("Failed to load customer invoices");
      }
    };
    loadCustomerInvoices();
  }, [selectedCustomer]);

  // Handle search mode change
  const handleSearchModeChange = (mode: 'customer' | 'invoice') => {
    setSearchMode(mode);
    setSearchQuery('');
    setFilteredCustomers([]);
    setMatchingInvoices({});
  };

  // Handle search
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    if (!query) {
      setFilteredCustomers([]);
      setMatchingInvoices({});
      return;
    }

    try {
      if (searchMode === 'invoice') {
        // Search only for invoices
        const allInvoices = await db.getInvoices();
        const matchingInvoicesByCustomer: {[customerId: string]: Invoice[]} = {};
        
        allInvoices.forEach(inv => {
          if (inv.id.toLowerCase().includes(query.toLowerCase())) {
            if (!matchingInvoicesByCustomer[inv.customerId]) {
              matchingInvoicesByCustomer[inv.customerId] = [];
            }
            matchingInvoicesByCustomer[inv.customerId].push(inv);
          }
        });

        if (Object.keys(matchingInvoicesByCustomer).length > 0) {
          const matchingCustomers = await Promise.all(
            Object.keys(matchingInvoicesByCustomer).map(id => db.getCustomerById(id))
          );
          setFilteredCustomers(matchingCustomers.filter((c): c is Customer => c !== null));
          setMatchingInvoices(matchingInvoicesByCustomer);
        } else {
          setFilteredCustomers([]);
          setMatchingInvoices({});
        }
      } else {
        // Search for customers by name or mobile
        const matchingCustomers = customers.filter(
          customer => 
            customer.name.toLowerCase().includes(query.toLowerCase()) ||
            customer.mobile.includes(query)
        );
        setFilteredCustomers(matchingCustomers);
        setMatchingInvoices({});
      }
    } catch (error) {
      console.error("Error searching:", error);
      toast.error("Failed to search");
    }
  };

  // Handle customer selection
  const handleSelectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setSearchQuery(customer.name); // Update search input with selected customer name
    setFilteredCustomers([]); // Clear filtered list
  };

  // Calculate total amounts including discounts separately
  const totalAmount = customerInvoices.reduce((sum, invoice) => sum + invoice.totalAmount, 0);
  const totalPaidAmount = customerInvoices.reduce((sum, invoice) => 
    sum + invoice.payments.reduce((pSum, p) => p.mode !== 'DISCOUNT' ? pSum + p.amount : pSum, 0), 0
  );
  const totalDiscountAmount = customerInvoices.reduce((sum, invoice) => 
    sum + invoice.payments.reduce((pSum, p) => p.mode === 'DISCOUNT' ? pSum + p.amount : pSum, 0), 0
  );
  const totalDueAmount = customerInvoices.reduce((sum, invoice) => sum + invoice.dueAmount, 0);

  // Calculate total due amount for selected invoices
  const selectedInvoicesDueAmount = customerInvoices
    .filter(invoice => selectedInvoices.has(invoice.id))
    .reduce((sum, invoice) => sum + invoice.dueAmount, 0);

  // Handle invoice selection
  const toggleInvoiceSelection = (invoiceId: string) => {
    const newSelection = new Set(selectedInvoices);
    if (newSelection.has(invoiceId)) {
      newSelection.delete(invoiceId);
    } else {
      newSelection.add(invoiceId);
    }
    setSelectedInvoices(newSelection);
    setPaymentAmount(0); // Reset payment amount when selection changes
  };

  // Handle marking invoice as cleared
  const handleMarkCleared = async (invoiceId: string) => {
    try {
      setIsMarkingCleared(true);
      const invoice = customerInvoices.find(inv => inv.id === invoiceId);
      if (!invoice) return;

      // Create payment details for clearing with discount
      const payment: PaymentDetails = {
        mode: 'DISCOUNT',
        amount: invoice.dueAmount,
        timestamp: Date.now()
      };

      // Update invoice
      await db.updateInvoice(invoice.id, {
        paidAmount: invoice.totalAmount,
        dueAmount: 0,
        payments: [...invoice.payments, payment]
      });

      // Don't update daily revenue for discounts
      
      // Refresh customer invoices
      const updatedInvoices = await db.getInvoicesByCustomerId(selectedCustomer!.id);
      setCustomerInvoices(updatedInvoices.sort((a, b) => b.invoiceDate - a.invoiceDate));

      toast.success("Invoice cleared with discount");
    } catch (error) {
      console.error("Error marking invoice as cleared:", error);
      toast.error("Failed to mark invoice as cleared");
    } finally {
      setIsMarkingCleared(false);
    }
  };

  // Handle payment submission
  const handlePayment = async () => {
    if (!selectedCustomer) {
      toast.error("Please select a customer");
      return;
    }

    if (selectedInvoices.size === 0) {
      toast.error("Please select at least one invoice");
      return;
    }

    if (paymentAmount <= 0) {
      toast.error("Please enter a valid payment amount");
      return;
    }

    if (paymentAmount > selectedInvoicesDueAmount) {
      toast.error("Payment amount cannot exceed total due amount");
      return;
    }

    if (paymentMode === 'PHONEPE' && phonePeReceiver === 'OTHERS' && !customReceiverName.trim()) {
      toast.error("Please enter the receiver's name");
      return;
    }

    try {
      setIsProcessing(true);

      // Create payment details
      const payment: PaymentDetails = {
        mode: paymentMode,
        amount: paymentAmount,
        timestamp: Date.now()
      };

      if (paymentMode === 'PHONEPE') {
        payment.phonePeReceiver = phonePeReceiver;
        if (phonePeReceiver === 'OTHERS') {
          payment.customReceiverName = customReceiverName.trim();
        }
      }

      // Distribute payment across selected invoices
      let remainingPayment = paymentAmount;
      const selectedInvoicesList = customerInvoices.filter(invoice => selectedInvoices.has(invoice.id));
      
      for (const invoice of selectedInvoicesList) {
        if (remainingPayment <= 0) break;
        if (invoice.dueAmount <= 0) continue;

        const paymentForInvoice = Math.min(remainingPayment, invoice.dueAmount);
        const newPaidAmount = invoice.paidAmount + paymentForInvoice;
        const newDueAmount = invoice.totalAmount - newPaidAmount;

        await db.updateInvoice(invoice.id, {
          paidAmount: newPaidAmount,
          dueAmount: newDueAmount,
          payments: [...invoice.payments, { ...payment, amount: paymentForInvoice }]
        });

        remainingPayment -= paymentForInvoice;
      }

      // Update daily revenue
      await db.updateDailyRevenue(paymentAmount);

      // Refresh customer invoices
      const updatedInvoices = await db.getInvoicesByCustomerId(selectedCustomer.id);
      setCustomerInvoices(updatedInvoices.sort((a, b) => b.invoiceDate - a.invoiceDate));

      // Reset form
      setPaymentAmount(0);
      setPaymentMode('CASH');
      setPhonePeReceiver('ARAVIND');
      setCustomReceiverName('');
      setSelectedInvoices(new Set());

      toast.success("Payment recorded successfully");
    } catch (error) {
      console.error("Error recording payment:", error);
      toast.error("Failed to record payment");
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold mb-2">Customer Payments</h1>
          <p className="text-muted-foreground">Record payments and view payment history</p>
        </div>

        {/* Customer Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-lg font-serif flex items-center">
              <SearchIcon className="h-5 w-5 mr-2 text-gold-500" />
              Search
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Tabs value={searchMode} onValueChange={(value: 'customer' | 'invoice') => handleSearchModeChange(value)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="customer">Search Customer</TabsTrigger>
                  <TabsTrigger value="invoice">Search Invoice</TabsTrigger>
                </TabsList>
              </Tabs>

              <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="search"
                  placeholder={searchMode === 'customer' ? 
                    "Search by customer name or mobile..." : 
                    "Search by invoice number..."
                  }
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="pl-10"
                />
                
                {/* Customer Search Results */}
                {filteredCustomers.length > 0 && (
                  <Card className="absolute z-10 w-full mt-1 shadow-lg">
                    <ScrollArea className="max-h-64">
                      <CardContent className="p-2">
                        {filteredCustomers.map((customer) => (
                          <div
                            key={customer.id}
                            onClick={() => handleSelectCustomer(customer)}
                            className="p-3 hover:bg-gold-50 rounded-lg cursor-pointer transition-colors"
                          >
                            <div className="flex items-start gap-3">
                              <UserIcon className="w-5 h-5 text-gold-500 mt-1" />
                              <div className="flex-1">
                                <p className="font-medium">{customer.name}</p>
                                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                  <PhoneIcon className="w-3 h-3" />
                                  <span>{customer.mobile}</span>
                                </div>
                                {customer.address && (
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                                    <MapPinIcon className="w-3 h-3" />
                                    <span>{customer.address}</span>
                                  </div>
                                )}
                                {/* Show matching invoices */}
                                {matchingInvoices[customer.id]?.map((inv) => (
                                  <div key={inv.id} className="mt-2 p-2 bg-gold-50 rounded text-sm">
                                    <div className="flex justify-between items-center">
                                      <span className="font-medium text-gold-800">Invoice #{inv.id.substring(0, 8)}</span>
                                      <span>{formatCurrency(inv.totalAmount)}</span>
                                    </div>
                                    <div className="flex justify-between text-muted-foreground">
                                      <span>{formatDate(inv.invoiceDate)}</span>
                                      <span>Due: {formatCurrency(inv.dueAmount)}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        ))}
                      </CardContent>
                    </ScrollArea>
                  </Card>
                )}
              </div>
            </div>
          </CardContent>
        </Card>

        {selectedCustomer && (
          <div className="space-y-8">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif flex items-center">
                  <CoinsIcon className="h-5 w-5 mr-2 text-gold-500" />
                  Customer Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <Label>Name</Label>
                    <p className="font-medium">{selectedCustomer.name}</p>
                  </div>
                  <div>
                    <Label>Mobile</Label>
                    <p className="font-medium">{selectedCustomer.mobile}</p>
                  </div>
                  {selectedCustomer.address && (
                    <div className="md:col-span-2">
                      <Label>Address</Label>
                      <p className="font-medium">{selectedCustomer.address}</p>
                    </div>
                  )}
                </div>

                {/* Payment Summary */}
                <div className="grid grid-cols-4 gap-4 mt-6 pt-6 border-t">
                  <div className="text-center p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Total Amount</p>
                    <p className="text-lg font-medium text-gold-800">{formatCurrency(totalAmount)}</p>
                  </div>
                  <div className="text-center p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Paid Amount</p>
                    <p className="text-lg font-medium text-green-600">{formatCurrency(totalPaidAmount)}</p>
                  </div>
                  <div className="text-center p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Discount</p>
                    <p className="text-lg font-medium text-purple-600">{formatCurrency(totalDiscountAmount)}</p>
                  </div>
                  <div className="text-center p-4 bg-gold-50 rounded-lg">
                    <p className="text-sm text-muted-foreground mb-1">Due Amount</p>
                    <p className="text-lg font-medium text-red-500">{formatCurrency(totalDueAmount)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Payment Form */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg font-serif">Record Payment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label>Select Invoices to Pay</Label>
                      <div className="mt-2 space-y-2 border rounded-lg p-3">
                        {customerInvoices
                          .filter(invoice => invoice.dueAmount > 0)
                          .map(invoice => (
                            <div key={invoice.id} className="flex items-center space-x-3">
                              <Checkbox
                                checked={selectedInvoices.has(invoice.id)}
                                onCheckedChange={() => toggleInvoiceSelection(invoice.id)}
                                id={`invoice-${invoice.id}`}
                              />
                              <label
                                htmlFor={`invoice-${invoice.id}`}
                                className="text-sm flex-1 flex justify-between cursor-pointer"
                              >
                                <span>Invoice #{invoice.id.substring(0, 8)}</span>
                                <span className="text-gold-800">{formatCurrency(invoice.dueAmount)}</span>
                              </label>
                            </div>
                          ))}
                      </div>
                      {selectedInvoices.size > 0 && (
                        <p className="text-sm text-muted-foreground mt-2">
                          Selected Due Amount: {formatCurrency(selectedInvoicesDueAmount)}
                        </p>
                      )}
                    </div>

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
                            <SelectValue placeholder="Select receiver" />
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
                    )}

                    {paymentMode === 'PHONEPE' && phonePeReceiver === 'OTHERS' && (
                      <div>
                        <Label>Receiver Name</Label>
                        <Input
                          value={customReceiverName}
                          onChange={(e) => setCustomReceiverName(e.target.value)}
                          placeholder="Enter receiver's name"
                        />
                      </div>
                    )}

                    <div>
                      <Label>Payment Amount</Label>
                      <Input
                        type="number"
                        value={paymentAmount || ''}
                        onChange={(e) => setPaymentAmount(parseFloat(e.target.value) || 0)}
                        placeholder="Enter amount"
                      />
                    </div>

                    <Button
                      onClick={handlePayment}
                      disabled={isProcessing || paymentAmount <= 0 || paymentAmount > selectedInvoicesDueAmount || selectedInvoices.size === 0}
                      className="w-full bg-gold-500 hover:bg-gold-600 text-black"
                    >
                      {isProcessing ? "Processing..." : "Record Payment"}
                    </Button>
                  </div>

                  <div>
                    <Label className="flex items-center gap-2 mb-4">
                      <FileTextIcon className="w-4 h-4 text-gold-500" />
                      Payment History
                    </Label>
                    <ScrollArea className="h-[400px] pr-4">
                      <div className="space-y-4">
                        {customerInvoices.map((invoice) => (
                          <Card key={invoice.id} className={`border-gold-100 ${invoice.dueAmount === 0 ? 'bg-green-50' : ''}`}>
                            <CardContent className="p-4">
                              <div className="flex justify-between items-start">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="font-medium">Invoice #{invoice.id.substring(0, 8)}</p>
                                    {invoice.dueAmount === 0 && (
                                      <span className="px-2 py-0.5 text-xs font-medium text-green-700 bg-green-100 rounded-full">
                                        Cleared
                                      </span>
                                    )}
                                  </div>
                                  <p className="text-sm text-muted-foreground">
                                    {formatDate(invoice.invoiceDate)}
                                  </p>
                                </div>
                                <div className="text-right">
                                  <p className="font-medium text-gold-800">
                                    {formatCurrency(invoice.totalAmount)}
                                  </p>
                                  <div className="flex flex-col gap-1">
                                    <p className="text-sm text-green-600">
                                      Paid: {formatCurrency(invoice.payments.reduce((sum, p) => p.mode !== 'DISCOUNT' ? sum + p.amount : sum, 0))}
                                    </p>
                                    {invoice.payments.some(p => p.mode === 'DISCOUNT') && (
                                      <p className="text-sm text-purple-600">
                                        Discount: {formatCurrency(invoice.payments.reduce((sum, p) => p.mode === 'DISCOUNT' ? sum + p.amount : sum, 0))}
                                      </p>
                                    )}
                                    {invoice.dueAmount > 0 && (
                                      <p className="text-sm text-red-500">
                                        Due: {formatCurrency(invoice.dueAmount)}
                                      </p>
                                    )}
                                  </div>
                                </div>
                              </div>
                              
                              {/* Payment Timeline */}
                              {invoice.payments.length > 0 && (
                                <div className="mt-3 pt-3 border-t">
                                  <p className="text-sm text-muted-foreground mb-2">Payment Timeline</p>
                                  <div className="space-y-2">
                                    {invoice.payments.map((payment, index) => (
                                      <div key={index} className="flex justify-between text-sm">
                                        <div className="flex items-center gap-2">
                                          <span className={payment.mode === 'DISCOUNT' ? 'text-purple-600' : 'text-gold-600'}>
                                            {payment.mode === 'PHONEPE' ? 
                                              `PhonePe (${payment.phonePeReceiver === 'OTHERS' ? 
                                                payment.customReceiverName : 
                                                payment.phonePeReceiver})` : 
                                              payment.mode === 'DISCOUNT' ? 'Discount' : 'Cash'}
                                          </span>
                                          <span className="text-muted-foreground">
                                            {new Date(payment.timestamp).toLocaleDateString()}
                                          </span>
                                        </div>
                                        <span className={`font-medium ${payment.mode === 'DISCOUNT' ? 'text-purple-600' : ''}`}>
                                          {formatCurrency(payment.amount)}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              )}

                              <div className="mt-3 flex justify-between items-center">
                                <div className="flex gap-2">
                                  {invoice.dueAmount > 0 && (
                                    <AlertDialog>
                                      <AlertDialogTrigger asChild>
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="border-green-200 hover:bg-green-50 text-green-700"
                                        >
                                          Mark as Cleared
                                        </Button>
                                      </AlertDialogTrigger>
                                      <AlertDialogContent>
                                        <AlertDialogHeader>
                                          <AlertDialogTitle>Clear Invoice with Discount?</AlertDialogTitle>
                                          <AlertDialogDescription>
                                            This will clear the remaining balance of {formatCurrency(invoice.dueAmount)} as a discount.
                                            This action cannot be undone and will not affect your daily revenue.
                                          </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                                          <AlertDialogAction
                                            onClick={() => handleMarkCleared(invoice.id)}
                                            className="bg-purple-600 hover:bg-purple-700"
                                          >
                                            Clear with Discount
                                          </AlertDialogAction>
                                        </AlertDialogFooter>
                                      </AlertDialogContent>
                                    </AlertDialog>
                                  )}
                                </div>
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="border-gold-200 hover:bg-gold-50"
                                    onClick={() => {
                                      const message = generateInvoiceWhatsAppMessage(invoice, selectedCustomer!);
                                      const whatsappUrl = `https://wa.me/${selectedCustomer!.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
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
                                        await shareInvoicePDF(invoice, selectedCustomer!);
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
                                    View
                                  </Button>
                                </div>
                              </div>
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    </ScrollArea>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {searchQuery && filteredCustomers.length === 0 && !selectedCustomer && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              No customer found
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default CustomerPaymentsPage; 