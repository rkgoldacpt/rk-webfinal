
import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { toast } from "sonner";
import { db } from "@/lib/db";

interface CustomerFormProps {
  onSuccess?: (customerId: string) => void;
}

export const CustomerForm: React.FC<CustomerFormProps> = ({ onSuccess }) => {
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
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
      
      // Add customer to database
      const newCustomer = await db.addCustomer({
        name: name.trim(),
        mobile: mobile.trim(),
        address: address.trim()
      });
      
      toast.success("Customer added successfully");
      
      // Reset form
      setName('');
      setMobile('');
      setAddress('');
      
      // Call success callback if provided
      if (onSuccess) {
        onSuccess(newCustomer.id);
      }
    } catch (error) {
      console.error("Error adding customer:", error);
      toast.error("Failed to add customer. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <Card className="p-6 shadow-md">
      <h2 className="text-xl font-serif font-semibold mb-4">Add New Customer</h2>
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
          {isSubmitting ? "Saving..." : "Add Customer"}
        </Button>
      </form>
    </Card>
  );
};
