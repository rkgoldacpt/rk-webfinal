// Simplified database service using IndexedDB for offline storage

export interface ShopConfig {
  id: string;
  name: string;
  address: string;
  mobile: string;
  gstin?: string;
  updatedAt: number;
}

export interface Customer {
  id: string;
  name: string;
  mobile: string;
  address?: string;
  createdAt: number;
}

export interface JewelryItem {
  id: string;
  name: string;
  grossWeight: number; // in grams
  wastage: number; // percentage
  goldRate: number; // Rs/g
  labRate: number; // Rs
  netWeight?: number; // calculated
  amount?: number; // calculated
}

export interface PaymentDetails {
  mode: 'CASH' | 'PHONEPE' | 'DISCOUNT';
  phonePeReceiver?: 'SHANKAR' | 'RAMAKRISHNA' | 'PAVAN' | 'ARAVIND' | 'OTHERS';
  customReceiverName?: string; // Used when phonePeReceiver is 'OTHERS'
  amount: number;
  timestamp: number;
}

export interface Invoice {
  id: string;
  customerId: string;
  customerName: string; // Denormalized for easier display
  customerMobile: string; // Denormalized for easier display
  items: JewelryItem[];
  totalAmount: number;
  paidAmount: number;
  dueAmount: number;
  invoiceDate: number; // timestamp
  notes?: string;
  payments: PaymentDetails[]; // Track all payments
  serialNumber?: number; // Editable and auto-incrementing serial number
}

export interface DailyRevenue {
  id: string;
  date: string; // YYYY-MM-DD format
  totalAmount: number;
  lastReset: number; // timestamp
}

class DatabaseService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private DB_NAME = 'RKJewellersDB';
  private DB_VERSION = 2; // Increment version to trigger upgrade

  constructor() {
    this.initDB();
  }

  private initDB(): Promise<IDBDatabase> {
    if (!this.dbPromise) {
      this.dbPromise = new Promise((resolve, reject) => {
        if (!('indexedDB' in window)) {
          reject('IndexedDB is not supported in this browser');
          return;
        }

        const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

        request.onerror = (event) => {
          console.error('Database error:', (event.target as IDBOpenDBRequest).error);
          reject('Database error: ' + (event.target as IDBOpenDBRequest).error);
        };

        request.onupgradeneeded = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log('Database upgrade needed, version:', event.oldVersion, '->', event.newVersion);

          // Create object stores
          if (!db.objectStoreNames.contains('shop')) {
            const shopStore = db.createObjectStore('shop', { keyPath: 'id' });
            console.log('Created shop store');
          }

          if (!db.objectStoreNames.contains('customers')) {
            const customerStore = db.createObjectStore('customers', { keyPath: 'id' });
            customerStore.createIndex('name', 'name', { unique: false });
            customerStore.createIndex('mobile', 'mobile', { unique: true });
            console.log('Created customers store');
          }

          if (!db.objectStoreNames.contains('invoices')) {
            const invoiceStore = db.createObjectStore('invoices', { keyPath: 'id' });
            invoiceStore.createIndex('customerId', 'customerId', { unique: false });
            invoiceStore.createIndex('invoiceDate', 'invoiceDate', { unique: false });
            console.log('Created invoices store');
          }

          if (!db.objectStoreNames.contains('dailyRevenue')) {
            const revenueStore = db.createObjectStore('dailyRevenue', { keyPath: 'id' });
            revenueStore.createIndex('date', 'date', { unique: true });
            console.log('Created dailyRevenue store');
          }
        };

        request.onsuccess = (event) => {
          const db = (event.target as IDBOpenDBRequest).result;
          console.log('Database opened successfully');
          resolve(db);
        };
      });
    }
    return this.dbPromise;
  }

  // Shop configuration methods
  async getShopConfig(): Promise<ShopConfig | undefined> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('shop', 'readonly');
      const store = tx.objectStore('shop');
      const request = store.get('shop');

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting shop configuration');
    });
  }

  async updateShopConfig(config: Omit<ShopConfig, 'id' | 'updatedAt'>): Promise<ShopConfig> {
    const db = await this.initDB();
    const shopConfig: ShopConfig = {
      ...config,
      id: 'shop',
      updatedAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('shop', 'readwrite');
      const store = tx.objectStore('shop');
      const request = store.put(shopConfig);

      request.onsuccess = () => resolve(shopConfig);
      request.onerror = () => reject('Error updating shop configuration');
    });
  }

  // Customer methods
  async addCustomer(customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> {
    const db = await this.initDB();
    const newCustomer: Customer = {
      ...customer,
      id: crypto.randomUUID(),
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('customers', 'readwrite');
      const store = tx.objectStore('customers');
      const request = store.add(newCustomer);

      request.onsuccess = () => resolve(newCustomer);
      request.onerror = () => reject('Error adding customer');
    });
  }

  async getCustomers(): Promise<Customer[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting customers');
    });
  }

  async searchCustomers(query: string): Promise<Customer[]> {
    const allCustomers = await this.getCustomers();
    if (!query) return allCustomers;
    
    const lowerQuery = query.toLowerCase();
    return allCustomers.filter(customer => 
      customer.name.toLowerCase().includes(lowerQuery) || 
      customer.mobile.includes(query)
    );
  }

  async getCustomerById(id: string): Promise<Customer | undefined> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customers', 'readonly');
      const store = tx.objectStore('customers');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting customer');
    });
  }

  async updateCustomer(id: string, updates: Partial<Omit<Customer, 'id' | 'createdAt'>>): Promise<Customer> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('customers', 'readwrite');
      const store = tx.objectStore('customers');
      
      // First get the existing customer
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingCustomer = getRequest.result;
        if (!existingCustomer) {
          reject('Customer not found');
          return;
        }
        
        // Update the customer with new values
        const updatedCustomer = {
          ...existingCustomer,
          ...updates
        };
        
        // Save the updated customer
        const updateRequest = store.put(updatedCustomer);
        
        updateRequest.onsuccess = () => resolve(updatedCustomer);
        updateRequest.onerror = () => reject('Error updating customer');
      };
      
      getRequest.onerror = () => reject('Error getting customer');
    });
  }

  // Invoice methods
  async addInvoice(invoice: Omit<Invoice, 'id'>): Promise<Invoice> {
    const db = await this.initDB();
    const newInvoice: Invoice = {
      ...invoice,
      id: crypto.randomUUID()
    };

    return new Promise((resolve, reject) => {
      const tx = db.transaction('invoices', 'readwrite');
      const store = tx.objectStore('invoices');
      const request = store.add(newInvoice);

      request.onsuccess = () => {
        console.log('Invoice added successfully');
        resolve(newInvoice);
      };
      
      request.onerror = (event) => {
        console.error('Error adding invoice:', (event.target as IDBRequest).error);
        reject('Error adding invoice');
      };
    });
  }

  async getInvoices(): Promise<Invoice[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('invoices', 'readonly');
      const store = tx.objectStore('invoices');
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting invoices');
    });
  }

  async getInvoicesByCustomerId(customerId: string): Promise<Invoice[]> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('invoices', 'readonly');
      const store = tx.objectStore('invoices');
      const index = store.index('customerId');
      const request = index.getAll(customerId);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting customer invoices');
    });
  }

  async getInvoiceById(id: string): Promise<Invoice | undefined> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('invoices', 'readonly');
      const store = tx.objectStore('invoices');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject('Error getting invoice');
    });
  }

  async updateInvoice(id: string, updates: Partial<Omit<Invoice, 'id'>>): Promise<Invoice> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('invoices', 'readwrite');
      const store = tx.objectStore('invoices');
      
      // First get the existing invoice
      const getRequest = store.get(id);
      
      getRequest.onsuccess = () => {
        const existingInvoice = getRequest.result;
        if (!existingInvoice) {
          reject('Invoice not found');
          return;
        }
        
        // Update the invoice with new values
        const updatedInvoice = {
          ...existingInvoice,
          ...updates
        };
        
        // Save the updated invoice
        const updateRequest = store.put(updatedInvoice);
        
        updateRequest.onsuccess = () => {
          console.log('Invoice updated successfully');
          resolve(updatedInvoice);
        };
        
        updateRequest.onerror = (event) => {
          console.error('Error updating invoice:', (event.target as IDBRequest).error);
          reject('Error updating invoice');
        };
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting invoice:', (event.target as IDBRequest).error);
        reject('Error getting invoice');
      };
    });
  }
  
  // Data export functionality
  async exportCustomersToCSV(): Promise<string> {
    const customers = await this.getCustomers();
    
    // Define headers
    const headers = ['ID', 'Name', 'Mobile', 'Address', 'Created Date'];
    
    // Format data rows
    const rows = customers.map(customer => [
      customer.id,
      customer.name,
      customer.mobile,
      customer.address || '',
      new Date(customer.createdAt).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })
    ]);
    
    // Combine headers and rows
    const csv = [headers, ...rows]
      .map(row => row.map(value => `"${value}"`).join(','))
      .join('\n');
      
    return csv;
  }
  
  async exportInvoicesToCSV(): Promise<string> {
    try {
      console.log('Fetching invoices for export...');
      const invoices = await this.getInvoices();
      console.log(`Found ${invoices.length} invoices to export`);
      
      // Define headers
      const headers = [
        'Invoice ID', 
        'Customer Name', 
        'Mobile', 
        'Date', 
        'Total Amount', 
        'Paid Amount', 
        'Due Amount', 
        'Items Count',
        'Payment Mode',
        'Payment Receiver'
      ];
      
      // Format data rows
      const rows = invoices.map(invoice => {
        try {
          const lastPayment = invoice.payments?.[invoice.payments.length - 1];
          return [
            invoice.id || '',
            invoice.customerName || '',
            invoice.customerMobile || '',
            new Date(invoice.invoiceDate).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' }),
            invoice.totalAmount?.toLocaleString('en-IN') || '0',
            invoice.paidAmount?.toLocaleString('en-IN') || '0',
            invoice.dueAmount?.toLocaleString('en-IN') || '0',
            invoice.items?.length || 0,
            lastPayment?.mode || 'N/A',
            lastPayment?.mode === 'PHONEPE' ? 
              (lastPayment.phonePeReceiver === 'OTHERS' ? 
                lastPayment.customReceiverName || lastPayment.phonePeReceiver : 
                lastPayment.phonePeReceiver) : 
              'N/A'
          ];
        } catch (err) {
          console.error('Error formatting invoice row:', err, invoice);
          // Return a row with default values if there's an error
          return [
            invoice.id || '',
            'Error',
            'Error',
            'Error',
            '0',
            '0',
            '0',
            '0',
            'N/A',
            'N/A'
          ];
        }
      });
      
      // Combine headers and rows
      const csv = [headers, ...rows]
        .map(row => row.map(value => `"${String(value).replace(/"/g, '""')}"`).join(','))
        .join('\n');
      
      console.log('CSV generation completed successfully');
      return csv;
      
    } catch (error) {
      console.error('Error in exportInvoicesToCSV:', error);
      throw new Error('Failed to export invoices to CSV');
    }
  }

  // Daily Revenue methods
  async getDailyRevenue(): Promise<DailyRevenue | undefined> {
    const db = await this.initDB();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRevenue', 'readonly');
      const store = tx.objectStore('dailyRevenue');
      
      const request = store.get(today);
      
      request.onsuccess = () => {
        console.log('Daily revenue retrieved:', request.result);
        resolve(request.result);
      };
      
      request.onerror = (event) => {
        console.error('Error getting daily revenue:', (event.target as IDBRequest).error);
        reject('Error getting daily revenue');
      };
    });
  }

  async updateDailyRevenue(amount: number): Promise<void> {
    const db = await this.initDB();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRevenue', 'readwrite');
      const store = tx.objectStore('dailyRevenue');
      
      // First try to get today's record
      const getRequest = store.get(today);
      
      getRequest.onsuccess = () => {
        const existingRevenue = getRequest.result;
        const newRevenue: DailyRevenue = {
          id: today,
          date: today,
          totalAmount: (existingRevenue?.totalAmount || 0) + amount,
          lastReset: existingRevenue?.lastReset || Date.now()
        };
        
        console.log('Updating daily revenue:', newRevenue);
        
        const putRequest = store.put(newRevenue);
        
        putRequest.onsuccess = () => {
          console.log('Daily revenue updated successfully');
          resolve();
        };
        
        putRequest.onerror = (event) => {
          console.error('Error updating daily revenue:', (event.target as IDBRequest).error);
          reject('Error updating daily revenue');
        };
      };
      
      getRequest.onerror = (event) => {
        console.error('Error getting daily revenue:', (event.target as IDBRequest).error);
        reject('Error getting daily revenue');
      };
    });
  }

  async resetDailyRevenue(): Promise<void> {
    const db = await this.initDB();
    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
    
    return new Promise((resolve, reject) => {
      const tx = db.transaction('dailyRevenue', 'readwrite');
      const store = tx.objectStore('dailyRevenue');
      
      const newRevenue: DailyRevenue = {
        id: today,
        date: today,
        totalAmount: 0,
        lastReset: Date.now()
      };
      
      console.log('Resetting daily revenue:', newRevenue);
      
      const request = store.put(newRevenue);
      
      request.onsuccess = () => {
        console.log('Daily revenue reset successfully');
        resolve();
      };
      
      request.onerror = (event) => {
        console.error('Error resetting daily revenue:', (event.target as IDBRequest).error);
        reject('Error resetting daily revenue');
      };
    });
  }

  async resetAllInvoices(): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Starting to reset all invoices...');
        const tx = db.transaction('invoices', 'readwrite');
        const store = tx.objectStore('invoices');
        const request = store.clear();
        
        request.onsuccess = () => {
          console.log('All invoices reset successfully');
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Error resetting invoices:', (event.target as IDBRequest).error);
          reject('Failed to reset invoices');
        };
      } catch (error) {
        console.error('Error in resetAllInvoices:', error);
        reject('Failed to reset invoices');
      }
    });
  }

  // Delete a single invoice
  async deleteInvoice(id: string): Promise<void> {
    const db = await this.initDB();
    
    return new Promise((resolve, reject) => {
      try {
        console.log('Deleting invoice:', id);
        const tx = db.transaction('invoices', 'readwrite');
        const store = tx.objectStore('invoices');
        const request = store.delete(id);
        
        request.onsuccess = () => {
          console.log('Invoice deleted successfully');
          resolve();
        };
        
        request.onerror = (event) => {
          console.error('Error deleting invoice:', (event.target as IDBRequest).error);
          reject('Failed to delete invoice');
        };
      } catch (error) {
        console.error('Error in deleteInvoice:', error);
        reject('Failed to delete invoice');
      }
    });
  }
}

// Singleton instance
export const db = new DatabaseService();
