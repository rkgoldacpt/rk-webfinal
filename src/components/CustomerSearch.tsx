
import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { 
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList
} from "@/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { SearchIcon, XIcon } from "lucide-react";
import { Customer, db } from "@/lib/db";

interface CustomerSearchProps {
  onSelectCustomer: (customer: Customer) => void;
  selectedCustomer?: Customer;
}

export const CustomerSearch: React.FC<CustomerSearchProps> = ({ 
  onSelectCustomer,
  selectedCustomer
}) => {
  const [open, setOpen] = useState(false);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  
  // Load customers on mount
  useEffect(() => {
    const loadCustomers = async () => {
      try {
        const allCustomers = await db.getCustomers();
        setCustomers(allCustomers);
      } catch (error) {
        console.error("Error loading customers:", error);
      }
    };
    
    loadCustomers();
  }, []);
  
  // Search customers based on query
  const handleSearch = async (query: string) => {
    setSearchQuery(query);
    try {
      const results = await db.searchCustomers(query);
      setCustomers(results);
    } catch (error) {
      console.error("Error searching customers:", error);
    }
  };
  
  // Clear selected customer
  const handleClear = () => {
    onSelectCustomer({
      id: '',
      name: '',
      mobile: '',
      createdAt: 0
    });
  };
  
  return (
    <div className="flex flex-col space-y-2">
      {selectedCustomer?.id ? (
        <div className="flex items-center justify-between p-3 bg-gold-50 border border-gold-200 rounded-md">
          <div>
            <p className="font-medium">{selectedCustomer.name}</p>
            <p className="text-sm text-muted-foreground">{selectedCustomer.mobile}</p>
          </div>
          <Button variant="ghost" size="sm" onClick={handleClear}>
            <XIcon size={16} />
          </Button>
        </div>
      ) : (
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              role="combobox"
              className="justify-between w-full border-gold-200 hover:bg-gold-50 hover:text-gold-800"
            >
              <div className="flex items-center">
                <SearchIcon size={16} className="mr-2 text-muted-foreground" />
                <span>{searchQuery || 'Search customers...'}</span>
              </div>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="p-0 w-[300px]">
            <Command>
              <CommandInput 
                placeholder="Search by name or mobile..." 
                onValueChange={handleSearch}
              />
              <CommandList>
                <CommandEmpty>No customers found</CommandEmpty>
                <CommandGroup heading="Results">
                  {customers.map((customer) => (
                    <CommandItem
                      key={customer.id}
                      onSelect={() => {
                        onSelectCustomer(customer);
                        setOpen(false);
                      }}
                    >
                      <div className="flex flex-col">
                        <span>{customer.name}</span>
                        <span className="text-xs text-muted-foreground">{customer.mobile}</span>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
};
