import React, { useState, useEffect } from "react";
import { Header } from "@/components/Header";
import { CustomerForm } from "@/components/CustomerForm";
import { EditCustomerForm } from "@/components/EditCustomerForm";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SearchIcon, PencilIcon } from "lucide-react";
import { db, Customer } from "@/lib/db";
import { formatDate, downloadCSV } from "@/lib/utils";
import { toast } from "sonner";

const CustomersPage = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [editingCustomerId, setEditingCustomerId] = useState<string | null>(null);
  
  // Load customers on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const allCustomers = await db.getCustomers();
        setCustomers(allCustomers);
        setFilteredCustomers(allCustomers);
      } catch (error) {
        console.error("Error loading customers:", error);
        toast.error("Failed to load customers");
      }
    };
    
    loadCustomers();
  }, []);
  
  // Filter customers when search query changes
  useEffect(() => {
    if (!searchQuery) {
      setFilteredCustomers(customers);
      return;
    }
    
    const query = searchQuery.toLowerCase();
    const filtered = customers.filter(
      customer => 
        customer.name.toLowerCase().includes(query) || 
        customer.mobile.includes(searchQuery)
    );
    
    setFilteredCustomers(filtered);
  }, [searchQuery, customers]);
  
  // Handle customer added
  const handleCustomerAdded = async () => {
    try {
      const allCustomers = await db.getCustomers();
      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);
      toast.success("Customer added successfully");
    } catch (error) {
      console.error("Error refreshing customers:", error);
    }
  };

  // Handle customer updated
  const handleCustomerUpdated = async () => {
    try {
      const allCustomers = await db.getCustomers();
      setCustomers(allCustomers);
      setFilteredCustomers(allCustomers);
      setEditingCustomerId(null);
      toast.success("Customer updated successfully");
    } catch (error) {
      console.error("Error refreshing customers:", error);
    }
  };
  
  // Export customers to CSV
  const handleExportCustomers = async () => {
    try {
      const csv = await db.exportCustomersToCSV();
      downloadCSV(csv, "rk_customers.csv");
      toast.success("Customers exported successfully");
    } catch (error) {
      console.error("Error exporting customers:", error);
      toast.error("Failed to export customers");
    }
  };
  
  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-serif font-bold mb-2">Customers</h1>
            <p className="text-muted-foreground">Manage your customer database</p>
          </div>
          
          <Button 
            onClick={handleExportCustomers}
            variant="outline"
            className="border-gold-200 hover:bg-gold-50 text-gold-800"
          >
            Export Customers
          </Button>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Customer list */}
          <div className="lg:col-span-2 space-y-6">
            <div className="flex items-center space-x-2">
              <div className="relative flex-1">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  type="search"
                  placeholder="Search customers by name or mobile..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>
            
            {filteredCustomers.length === 0 ? (
              <Card className="border border-dashed border-muted bg-muted/20 p-8 text-center">
                <CardContent className="pt-6">
                  <p className="text-muted-foreground">
                    {searchQuery
                      ? "No customers matching your search"
                      : "No customers found. Add your first customer using the form."}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  Showing {filteredCustomers.length} {filteredCustomers.length === 1 ? 'customer' : 'customers'}
                </p>
                
                {filteredCustomers.map((customer) => (
                  <Card key={customer.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex justify-between">
                        <div>
                          <CardTitle className="text-lg">{customer.name}</CardTitle>
                          <p className="text-sm text-muted-foreground">{customer.mobile}</p>
                          {customer.address && (
                            <p className="text-xs text-muted-foreground mt-1">{customer.address}</p>
                          )}
                        </div>
                        <div className="flex flex-col items-end">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingCustomerId(customer.id)}
                            className="text-gold-600 hover:text-gold-800"
                          >
                            <PencilIcon size={16} className="mr-1" />
                            Edit
                          </Button>
                          <div className="text-right text-xs text-muted-foreground">
                            Added on {formatDate(customer.createdAt)}
                          </div>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </div>
          
          {/* Customer form */}
          <div>
            {editingCustomerId ? (
              <EditCustomerForm 
                customerId={editingCustomerId} 
                onSuccess={handleCustomerUpdated}
              />
            ) : (
              <CustomerForm onSuccess={handleCustomerAdded} />
            )}
          </div>
        </div>
      </main>
    </div>
  );
};

export default CustomersPage;
