import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatCurrency, formatDate } from "@/lib/utils";
import { db, Invoice, DailyRevenue } from "@/lib/db";
import { FileTextIcon, UsersIcon, CheckIcon, PrinterIcon, RefreshCcwIcon, TrashIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { toast } from "sonner";
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

const Index = () => {
  const [recentInvoices, setRecentInvoices] = useState<Invoice[]>([]);
  const [customerCount, setCustomerCount] = useState(0);
  const [invoiceCount, setInvoiceCount] = useState(0);
  const [totalRevenue, setTotalRevenue] = useState(0);
  const [dailyRevenue, setDailyRevenue] = useState<DailyRevenue | null>(null);
  const [isResetting, setIsResetting] = useState(false);
  const [isResettingTotal, setIsResettingTotal] = useState(false);
  const [isResetDialogOpen, setIsResetDialogOpen] = useState(false);
  const [resetPassword, setResetPassword] = useState("");
  const [passwordError, setPasswordError] = useState(false);
  const [isDailyResetDialogOpen, setIsDailyResetDialogOpen] = useState(false);
  const [isTotalResetDialogOpen, setIsTotalResetDialogOpen] = useState(false);
  const [dailyResetPassword, setDailyResetPassword] = useState("");
  const [totalResetPassword, setTotalResetPassword] = useState("");
  const [dailyPasswordError, setDailyPasswordError] = useState(false);
  const [totalPasswordError, setTotalPasswordError] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    // Check authentication
    const isAuthenticated = localStorage.getItem("isAuthenticated");
    if (!isAuthenticated) {
      navigate("/login");
      return;
    }

    const loadData = async () => {
      try {
        // Get customers count
        const customers = await db.getCustomers();
        setCustomerCount(customers.length);
        
        // Get all invoices
        const invoices = await db.getInvoices();
        setInvoiceCount(invoices.length);
        
        // Calculate total revenue
        const revenue = invoices.reduce((sum, invoice) => sum + invoice.paidAmount, 0);
        setTotalRevenue(revenue);
        
        // Get recent invoices (last 5)
        const sorted = [...invoices].sort((a, b) => b.invoiceDate - a.invoiceDate);
        setRecentInvoices(sorted.slice(0, 5));

        // Get daily revenue
        const dailyRevenue = await db.getDailyRevenue();
        setDailyRevenue(dailyRevenue || {
          id: new Date().toISOString().split('T')[0],
          date: new Date().toISOString().split('T')[0],
          totalAmount: 0,
          lastReset: Date.now()
        });
      } catch (error) {
        console.error("Error loading dashboard data:", error);
        toast.error("Failed to load dashboard data");
      }
    };
    
    loadData();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem("isAuthenticated");
    navigate("/login");
  };

  const handleResetDailyRevenue = async () => {
    try {
      if (dailyResetPassword !== "0077") {
        setDailyPasswordError(true);
        toast.error("Incorrect password");
        return;
      }

      setIsResetting(true);
      await db.resetDailyRevenue();
      
      // Update the state
      const newRevenue = await db.getDailyRevenue();
      setDailyRevenue(newRevenue || null);
      
      toast.success("Daily revenue has been reset");
      setDailyResetPassword("");
      setDailyPasswordError(false);
      setIsDailyResetDialogOpen(false);
    } catch (error) {
      console.error("Error resetting daily revenue:", error);
      toast.error("Failed to reset daily revenue");
    } finally {
      setIsResetting(false);
    }
  };

  const handleResetTotalRevenue = async () => {
    try {
      if (totalResetPassword !== "0077") {
        setTotalPasswordError(true);
        toast.error("Incorrect password");
        return;
      }

      setIsResettingTotal(true);
      // Get all invoices
      const invoices = await db.getInvoices();
      
      // Update each invoice to set paidAmount to 0
      for (const invoice of invoices) {
        await db.updateInvoice(invoice.id, {
          paidAmount: 0,
          dueAmount: invoice.totalAmount
        });
      }
      
      // Update the state
      setTotalRevenue(0);
      
      toast.success("Total revenue has been reset to zero");
      setTotalResetPassword("");
      setTotalPasswordError(false);
      setIsTotalResetDialogOpen(false);
    } catch (error) {
      console.error("Error resetting total revenue:", error);
      toast.error("Failed to reset total revenue");
    } finally {
      setIsResettingTotal(false);
    }
  };

  const getLastResetTime = () => {
    if (!dailyRevenue?.lastReset) return "Not reset today";
    return new Date(dailyRevenue.lastReset).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    });
  };

  // Handle reset all data
  const handleResetAll = async () => {
    try {
      if (resetPassword !== "0077") {
        setPasswordError(true);
        toast.error("Incorrect password");
        return;
      }

      setIsResetting(true);
      await db.resetAllInvoices();
      
      // Reset states
      setRecentInvoices([]);
      setCustomerCount(0);
      setInvoiceCount(0);
      setTotalRevenue(0);
      setDailyRevenue({
        id: new Date().toISOString().split('T')[0],
        date: new Date().toISOString().split('T')[0],
        totalAmount: 0,
        lastReset: Date.now()
      });

      toast.success("All data has been reset");
      setResetPassword("");
      setPasswordError(false);
      setIsResetDialogOpen(false);
    } catch (error) {
      console.error("Error resetting data:", error);
      toast.error("Failed to reset data");
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
            <h1 className="text-3xl font-serif font-bold mb-2">Dashboard</h1>
            <p className="text-muted-foreground">Welcome to RK Jewellers Billing System</p>
          </div>
          
          <div className="flex gap-3">
            <Button
              onClick={handleLogout}
              variant="outline"
              className="border-gold-200 hover:bg-gold-50"
            >
              Logout
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
              <AlertDialogTitle>Reset All Data?</AlertDialogTitle>
              <AlertDialogDescription className="space-y-4">
                <p>This action cannot be undone. This will permanently delete all data including:</p>
                <ul className="list-disc list-inside space-y-1 text-sm">
                  <li>All invoices and transaction history</li>
                  <li>Daily revenue records</li>
                  <li>All customer information</li>
                </ul>
                <div className="space-y-2 pt-2">
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
                onClick={handleResetAll}
                disabled={isResetting || !resetPassword}
                className="bg-red-500 hover:bg-red-600"
              >
                {isResetting ? "Resetting..." : "Reset All"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
        
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-gold-50 to-gold-100 border-gold-200">
            <CardHeader className="pb-2">
              <CardDescription>Total Customers</CardDescription>
              <CardTitle className="text-3xl">{customerCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <UsersIcon className="text-gold-500" size={24} />
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-jewel-50 to-jewel-100 border-jewel-200">
            <CardHeader className="pb-2">
              <CardDescription>Total Invoices</CardDescription>
              <CardTitle className="text-3xl">{invoiceCount}</CardTitle>
            </CardHeader>
            <CardContent>
              <FileTextIcon className="text-jewel-500" size={24} />
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
            <CardHeader className="pb-2">
              <CardDescription>Total Revenue</CardDescription>
              <CardTitle className="text-3xl">{formatCurrency(totalRevenue)}</CardTitle>
            </CardHeader>
            <CardContent>
              <CheckIcon className="text-green-500" size={24} />
            </CardContent>
          </Card>
        </div>
        
        {/* Daily Revenue Card */}
        <Card className="mb-8 border-gold-200">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-serif">Today's Revenue</CardTitle>
                <CardDescription>
                  Last reset: {getLastResetTime()}
                </CardDescription>
              </div>
              <AlertDialog 
                open={isDailyResetDialogOpen} 
                onOpenChange={(open) => {
                  setIsDailyResetDialogOpen(open);
                  if (!open) {
                    setDailyResetPassword("");
                    setDailyPasswordError(false);
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gold-200 hover:bg-gold-50"
                    disabled={isResetting}
                  >
                    <RefreshCcwIcon size={16} className="mr-2" />
                    Reset Revenue
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Today's Revenue?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>This will reset today's revenue counter to zero. This action cannot be undone.
                      Make sure you have recorded the current revenue before resetting.</p>
                      <div className="space-y-2">
                        <Label htmlFor="dailyResetPassword">Enter password to confirm:</Label>
                        <Input
                          id="dailyResetPassword"
                          type="password"
                          value={dailyResetPassword}
                          onChange={(e) => {
                            setDailyResetPassword(e.target.value);
                            setDailyPasswordError(false);
                          }}
                          className={dailyPasswordError ? "border-red-500" : ""}
                          placeholder="Enter password"
                        />
                        {dailyPasswordError && (
                          <p className="text-sm text-red-500">Incorrect password</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResetting}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetDailyRevenue}
                      disabled={isResetting || !dailyResetPassword}
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                    >
                      {isResetting ? "Resetting..." : "Reset Revenue"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gold-500">
              {formatCurrency(dailyRevenue?.totalAmount || 0)}
            </div>
          </CardContent>
        </Card>
        
        {/* Total Revenue Card */}
        <Card className="border-gold-200">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-serif">Total Revenue</CardTitle>
                <CardDescription>All-time revenue from all invoices</CardDescription>
              </div>
              <AlertDialog 
                open={isTotalResetDialogOpen} 
                onOpenChange={(open) => {
                  setIsTotalResetDialogOpen(open);
                  if (!open) {
                    setTotalResetPassword("");
                    setTotalPasswordError(false);
                  }
                }}
              >
                <AlertDialogTrigger asChild>
                  <Button
                    variant="outline"
                    size="sm"
                    className="border-gold-200 hover:bg-gold-50"
                    disabled={isResettingTotal}
                  >
                    <RefreshCcwIcon size={16} className="mr-2" />
                    Reset Total
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Reset Total Revenue?</AlertDialogTitle>
                    <AlertDialogDescription className="space-y-4">
                      <p>This will reset the total revenue counter to zero for all invoices.
                      This action cannot be undone. Make sure you have recorded the current
                      total revenue before resetting.</p>
                      <div className="space-y-2">
                        <Label htmlFor="totalResetPassword">Enter password to confirm:</Label>
                        <Input
                          id="totalResetPassword"
                          type="password"
                          value={totalResetPassword}
                          onChange={(e) => {
                            setTotalResetPassword(e.target.value);
                            setTotalPasswordError(false);
                          }}
                          className={totalPasswordError ? "border-red-500" : ""}
                          placeholder="Enter password"
                        />
                        {totalPasswordError && (
                          <p className="text-sm text-red-500">Incorrect password</p>
                        )}
                      </div>
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel disabled={isResettingTotal}>Cancel</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleResetTotalRevenue}
                      disabled={isResettingTotal || !totalResetPassword}
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                    >
                      {isResettingTotal ? "Resetting..." : "Reset Total"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold text-gold-500">
              {formatCurrency(totalRevenue)}
            </div>
          </CardContent>
        </Card>
        
        {/* Recent Transactions */}
        <h2 className="text-2xl font-serif font-semibold mb-4">Recent Transactions</h2>
        
        {recentInvoices.length === 0 ? (
          <Card className="border border-dashed border-muted bg-muted/20 p-8 text-center">
            <CardContent className="pt-4 px-0">
              <div className="flex flex-col items-center justify-center space-y-3">
                <FileTextIcon size={48} className="text-muted-foreground/50" />
                <p className="text-muted-foreground">No invoices found. Create your first bill now!</p>
                <Button 
                  onClick={() => navigate("/new-invoice")}
                  className="bg-gold-500 hover:bg-gold-600 text-black mt-2"
                >
                  Create New Bill
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {recentInvoices.map((invoice) => (
              <Card 
                key={invoice.id} 
                className="hover:shadow-md transition-shadow border-gold-100"
                onClick={() => navigate(`/invoice/${invoice.id}`)}
              >
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <CardTitle className="text-lg">{invoice.customerName}</CardTitle>
                      <CardDescription>{invoice.customerMobile}</CardDescription>
                    </div>
                    <div className="text-right">
                      <p className="text-sm text-muted-foreground">{formatDate(invoice.invoiceDate)}</p>
                      <p className="font-semibold text-gold-800">{formatCurrency(invoice.totalAmount)}</p>
                    </div>
                  </div>
                </CardHeader>
                <CardFooter className="pt-2 border-t flex justify-between items-center">
                  <p className="text-sm">
                    <span className="text-muted-foreground">Items:</span> {invoice.items.length}
                  </p>
                  <Button 
                    size="sm" 
                    variant="outline"
                    className="border-gold-200 hover:bg-gold-50"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/invoice/${invoice.id}/print`);
                    }}
                  >
                    <PrinterIcon size={14} className="mr-1" />
                    Print
                  </Button>
                </CardFooter>
              </Card>
            ))}
            
            {invoiceCount > recentInvoices.length && (
              <div className="text-center pt-2">
                <Button variant="link" onClick={() => navigate("/invoices")}>
                  View All Invoices
                </Button>
              </div>
            )}
          </div>
        )}
        
        {/* Empty State / Getting Started */}
        {customerCount === 0 && invoiceCount === 0 && (
          <div className="mt-8">
            <Card className="border-gold-200 bg-gold-50/30">
              <CardHeader>
                <CardTitle className="text-xl font-serif">Getting Started</CardTitle>
                <CardDescription>Complete these steps to set up your billing system</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start gap-4 p-3 rounded-lg bg-white border border-gold-100">
                  <div className="bg-gold-100 rounded-full p-2 mt-1">
                    <UsersIcon size={20} className="text-gold-700" />
                  </div>
                  <div>
                    <h3 className="font-medium">Add your first customer</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Start by adding your customers to the database
                    </p>
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="border-gold-200 hover:bg-gold-100"
                      onClick={() => navigate("/customers")}
                    >
                      Add Customer
                    </Button>
                  </div>
                </div>
                
                <div className="flex items-start gap-4 p-3 rounded-lg bg-white border border-gold-100">
                  <div className="bg-gold-100 rounded-full p-2 mt-1">
                    <FileTextIcon size={20} className="text-gold-700" />
                  </div>
                  <div>
                    <h3 className="font-medium">Create your first invoice</h3>
                    <p className="text-sm text-muted-foreground mb-2">
                      Generate bills for your jewelry sales
                    </p>
                    <Button 
                      size="sm" 
                      className="bg-gold-500 hover:bg-gold-600 text-black"
                      onClick={() => navigate("/new-invoice")}
                    >
                      Create Bill
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
        
        {/* Footer / Branding */}
        <footer className="mt-16 pt-8 border-t border-muted text-center text-sm text-muted-foreground">
          <Logo size="sm" className="justify-center mb-2" />
          <p>RK Jewellers Billing System</p>
          <p className="text-xs mt-1">© 2025 RK Jewellers. All rights reserved.</p>
        </footer>
      </main>
    </div>
  );
};

export default Index;
