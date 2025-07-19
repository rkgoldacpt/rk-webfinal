import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { db, Invoice } from "@/lib/db";
import { formatCurrency, formatDate, downloadCSV } from "@/lib/utils";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { SearchIcon, CalendarIcon, FileTextIcon, ArrowRightIcon, PrinterIcon, TrashIcon } from "lucide-react";
import { Label } from "@/components/ui/label";

const InvoicesPage = () => {
  const navigate = useNavigate();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [sortField, setSortField] = useState<string>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [invoiceToDelete, setInvoiceToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  
  // Load invoices on mount
  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const allInvoices = await db.getInvoices();
        setInvoices(allInvoices);
        setFilteredInvoices(allInvoices);
      } catch (error) {
        console.error("Error loading invoices:", error);
        toast.error("Failed to load invoices");
      }
    };
    
    loadInvoices();
  }, []);
  
  // Filter and sort invoices when dependencies change
  useEffect(() => {
    let result = [...invoices];
    
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        invoice => 
          invoice.customerName.toLowerCase().includes(query) || 
          invoice.customerMobile.includes(searchQuery) ||
          invoice.id.toLowerCase().includes(query)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;
      
      switch (sortField) {
        case "date":
          comparison = a.invoiceDate - b.invoiceDate;
          break;
        case "name":
          comparison = a.customerName.localeCompare(b.customerName);
          break;
        case "amount":
          comparison = a.totalAmount - b.totalAmount;
          break;
        default:
          comparison = 0;
      }
      
      return sortDirection === "asc" ? comparison : -comparison;
    });
    
    setFilteredInvoices(result);
  }, [invoices, searchQuery, sortField, sortDirection]);
  
  // Export invoices to CSV
  const handleExportInvoices = async () => {
    try {
      if (invoices.length === 0) {
        toast.error("No invoices to export");
        return;
      }

      console.log('Starting invoice export...');
      const csv = await db.exportInvoicesToCSV();
      console.log('CSV generated successfully');
      
      // Create a Blob and download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `rk_invoices_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success("Invoices exported successfully");
    } catch (error) {
      console.error("Error exporting invoices:", error);
      toast.error("Failed to export invoices. Please try again.");
    }
  };
  
  // Handle reset all invoices
  const handleResetInvoices = async () => {
    try {
      if (resetPassword !== "0077") {
        setPasswordError(true);
        toast.error("Incorrect password");
        return;
      }

      setIsResetting(true);
      await db.resetAllInvoices();
      setInvoices([]);
      setFilteredInvoices([]);
      toast.success("All invoices have been reset");
      setResetPassword("");
      setPasswordError(false);
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error("Error resetting invoices:", error);
      toast.error("Failed to reset invoices");
    } finally {
      setIsResetting(false);
    }
  };

  const handleDeleteInvoice = async () => {
    try {
      if (!invoiceToDelete) return;

      setIsDeleting(true);
      await db.deleteInvoice(invoiceToDelete);
      
      // Update the invoices list
      const updatedInvoices = invoices.filter(inv => inv.id !== invoiceToDelete);
      setInvoices(updatedInvoices);
      setFilteredInvoices(updatedInvoices);
      
      toast.success("Invoice deleted successfully");
      setInvoiceToDelete(null);
    } catch (error) {
      console.error("Error deleting invoice:", error);
      toast.error("Failed to delete invoice");
    } finally {
      setIsDeleting(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Invoices</h1>
            <p className="text-muted-foreground">View and manage all your invoices</p>
          </div>
          
          <div className="flex gap-3">
            <Button 
              onClick={handleExportInvoices}
              variant="outline"
              className="border-gold-200 hover:bg-gold-50 text-gold-800"
            >
              Export Invoices
            </Button>
            
            <Button 
              onClick={() => navigate("/new-invoice")}
              className="bg-gold-500 hover:bg-gold-600 text-black"
            >
              New Invoice
            </Button>

            <Button 
              onClick={() => setIsResetDialogOpen(true)}
              variant="destructive"
              className="bg-red-500 hover:bg-red-600"
              disabled={isResetting || invoices.length === 0}
            >
              <TrashIcon size={16} className="mr-1" />
              Reset All
            </Button>
          </div>
        </div>
        
        {/* Reset Confirmation Dialog */}
        <AlertDialog open={isResetDialogOpen} onOpenChange={(open) => {
          setIsResetDialogOpen(open);
          if (!open) {
            setResetPassword("");
            setPasswordError(false);
          }
        }}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Reset All Invoices?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>This action cannot be undone. This will permanently delete all invoices
                and their associated data.</p>
                <div className="space-y-2">
                  <Label htmlFor="resetPassword">Enter password to confirm:</Label>
                  <Input
                    id="resetPassword"
                    type="password"
                    value={resetPassword}
                    onChange={(e) => {
                      setResetPassword(e.target.value);
                      setPasswordError(false);
                    }}
                    className={passwordError ? "border-red-500" : ""}
                    placeholder="Enter password"
                  />
                  {passwordError && (
                    <p className="text-sm text-red-500">Incorrect password</p>
                  )}
                </div>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleResetInvoices}
                disabled={isResetting || !resetPassword}
                className="bg-red-500 hover:bg-red-600"
              >
                {isResetting ? "Resetting..." : "Reset All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Filters and Sorting */}
        <div className="flex flex-col sm:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              type="search"
              placeholder="Search by customer name or mobile..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          
          <div className="flex gap-2">
            <Select value={sortField} onValueChange={setSortField}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date">Date</SelectItem>
                <SelectItem value="name">Customer Name</SelectItem>
                <SelectItem value="amount">Amount</SelectItem>
              </SelectContent>
            </Select>
            
            <Button 
              variant="outline" 
              size="icon"
              onClick={() => setSortDirection(sortDirection === "asc" ? "desc" : "asc")}
              className="w-10"
            >
              {sortDirection === "asc" ? "↑" : "↓"}
            </Button>
          </div>
        </div>
        
        {/* Delete Confirmation Dialog */}
        <AlertDialog 
          open={!!invoiceToDelete} 
          onOpenChange={(open) => {
            if (!open) {
              setInvoiceToDelete(null);
            }
          }}
        >
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Invoice?</AlertDialogTitle>
              <AlertDialogDescription>
                <p>This action cannot be undone. This will permanently delete the invoice
                and its associated data.</p>
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteInvoice}
                disabled={isDeleting}
                className="bg-red-500 hover:bg-red-600"
              >
                {isDeleting ? "Deleting..." : "Delete Invoice"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Invoices List */}
        {filteredInvoices.length === 0 ? (
          <Card className="border border-dashed border-muted bg-muted/20 p-8 text-center">
            <CardContent className="pt-6">
              <FileTextIcon className="mx-auto h-10 w-10 text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">
                {searchQuery
                  ? "No invoices matching your search"
                  : "No invoices found. Create your first invoice using the 'New Invoice' button."}
              </p>
              
              {!searchQuery && (
                <Button 
                  onClick={() => navigate("/new-invoice")}
                  className="bg-gold-500 hover:bg-gold-600 text-black mt-4"
                >
                  Create First Invoice
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Showing {filteredInvoices.length} {filteredInvoices.length === 1 ? 'invoice' : 'invoices'}
            </p>
            
            {filteredInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className="hover:shadow-md transition-shadow border-gold-100"
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-start">
                    <div className="space-y-1">
                      <h3 className="font-medium text-lg">{invoice.customerName}</h3>
                      <p className="text-sm text-muted-foreground">{invoice.customerMobile}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-muted-foreground flex items-center justify-end">
                        <CalendarIcon size={12} className="mr-1" />
                        {formatDate(invoice.invoiceDate)}
                      </p>
                      <p className="font-semibold text-gold-800">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-3 border-t flex justify-between">
                  <div className="flex items-center gap-4">
                    <p className="text-sm">
                      <span className="text-muted-foreground">Items:</span> {invoice.items.length}
                    </p>
                    <p className="text-sm">
                      <span className="text-muted-foreground">Status:</span> 
                      <span className={invoice.dueAmount > 0 ? 'text-amber-600 ml-1' : 'text-green-600 ml-1'}>
                        {invoice.dueAmount > 0 ? 'Partially Paid' : 'Fully Paid'}
                      </span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      variant="destructive"
                      className="bg-red-500 hover:bg-red-600"
                      onClick={(e) => {
                        e.stopPropagation();
                        setInvoiceToDelete(invoice.id);
                      }}
                    >
                      <TrashIcon size={14} className="mr-1" />
                      Delete
                    </Button>
                    <Button 
                      size="sm" 
                      variant="outline"
                      className="border-gold-200 hover:bg-gold-50"
                      onClick={() => navigate(`/invoice/${invoice.id}/print`)}
                    >
                      <PrinterIcon size={14} className="mr-1" />
                      Print
                    </Button>
                    <Button 
                      size="sm"
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                      onClick={() => navigate(`/invoice/${invoice.id}`)}
                    >
                      View
                      <ArrowRightIcon size={14} className="ml-1" />
                    </Button>
                  </div>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default InvoicesPage;
