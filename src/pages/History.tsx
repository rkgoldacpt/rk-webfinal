import React, { useEffect, useState } from "react";
import { Header } from "@/components/Header";
import { db, Invoice } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { FileTextIcon, TrashIcon } from "lucide-react";
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
import { toast } from "sonner";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const HistoryPage = () => {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const loadInvoices = async () => {
      try {
        const allInvoices = await db.getInvoices();
        // Sort invoices by date, newest first
        const sortedInvoices = allInvoices.sort((a, b) => b.invoiceDate - a.invoiceDate);
        setInvoices(sortedInvoices);
      } catch (error) {
        console.error("Error loading invoices:", error);
        toast.error("Failed to load invoices");
      }
    };

    loadInvoices();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
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

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Transaction History</h1>
            <p className="text-muted-foreground">View all past transactions and invoices</p>
          </div>

          <Button 
            onClick={() => setIsResetDialogOpen(true)}
            variant="destructive"
            className="bg-red-500 hover:bg-red-600"
            disabled={isResetting || invoices.length === 0}
          >
            <TrashIcon size={16} className="mr-1" />
            Reset History
          </Button>
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
              <AlertDialogTitle>Reset All History?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>This action cannot be undone. This will permanently delete all historical
                invoice data.</p>
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

        <div className="space-y-4">
          {invoices.map((invoice) => (
            <Card key={invoice.id} className="hover:shadow-md transition-shadow">
              <CardHeader className="pb-4">
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="font-serif text-lg mb-1">
                      {invoice.customerName}
                    </CardTitle>
                    <div className="text-sm text-muted-foreground">
                      {format(new Date(invoice.invoiceDate), "dd MMM yyyy, hh:mm a")}
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/invoice/${invoice.id}`)}
                    className="flex items-center gap-2"
                  >
                    <FileTextIcon size={16} />
                    View Invoice
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-muted-foreground">Total Amount</div>
                    <div className="font-medium">{formatCurrency(invoice.totalAmount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Paid Amount</div>
                    <div className="font-medium">{formatCurrency(invoice.paidAmount)}</div>
                  </div>
                  <div>
                    <div className="text-sm text-muted-foreground">Due Amount</div>
                    <div className="font-medium text-red-500">
                      {formatCurrency(invoice.dueAmount)}
                    </div>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="text-sm text-muted-foreground">Items</div>
                  <div className="text-sm">
                    {invoice.items.map((item, index) => (
                      <span key={index} className="mr-2">
                        • {item.name || "Item"} ({item.grossWeight}g)
                        {index < invoice.items.length - 1 ? "," : ""}
                      </span>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}

          {invoices.length === 0 && (
            <Card>
              <CardContent className="py-8 text-center text-muted-foreground">
                No transactions found
              </CardContent>
            </Card>
          )}
        </div>
      </main>
    </div>
  );
};

export default HistoryPage; 