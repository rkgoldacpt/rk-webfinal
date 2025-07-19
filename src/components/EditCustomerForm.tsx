import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { db, Customer } from "@/lib/db";

interface EditCustomerFormProps {
  customerId: string;
  onSuccess?: () => void;
}

export const EditCustomerForm: React.FC<EditCustomerFormProps> = ({ customerId, onSuccess }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // Load customer data
  useEffect(() => {
    const loadCustomer = async () => {
      try {
        const customer = await db.getCustomerById(customerId);
        if (customer) {
          setName(customer.name);
          setMobile(customer.mobile);
          setAddress(customer.address || '');
        }
      } catch (error) {
        console.error("Error loading customer:", error);
        toast.error("Failed to load customer details");
      }
    };
    
    loadCustomer();
  }, [customerId]);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!name.trim()) {
      toast.error("Customer name is required");
      return;
    }
    
    if (!mobile.trim() || !/^\d{10}$/.test(mobile)) {
      toast.error("Please enter a valid 10-digit mobile number");
      return;
    }
    
    try {
      setIsSubmitting(true);
      
      // Update customer in database
      await db.updateCustomer(customerId, {
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim()
      });
      
      toast.success("Customer updated successfully");
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess();
      }
    } catch (error) {
      console.error("Error updating customer:", error);
      toast.error("Failed to update customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="p-6 shadow-md">
      <h2 className="text-xl font-serif font-semibold mb-4">Edit Customer</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name">Customer Name</Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter customer name"
            required
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="mobile">Mobile Number</Label>
          <Input
            id="mobile"
            value={mobile}
            onChange={(e) => setMobile(e.target.value.replace(/\D/g, '').slice(0, 10))}
            placeholder="10-digit mobile number"
            required
            pattern="\d{10}"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="address">Address (Optional)</Label>
          <Input
            id="address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Enter address"
          />
        </div>
        
        <Button
          type="submit"
          className="w-full bg-gold-500 hover:bg-gold-600 text-black"
          disabled={isSubmitting}
        >
          {isSubmitting ? "Saving..." : "Update Customer"}
        </Button>
      </form>
    </Card>
  );
}; 