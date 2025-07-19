import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { JewelryItem, Invoice, Customer } from "./db";
import html2pdf from 'html2pdf.js';
import html2canvas from 'html2canvas';
import { jsPDF } from 'jspdf';
import { toast } from "sonner";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Calculate net weight based on gross weight and wastage
export function calculateNetWeight(grossWeight: number, wastage: number): number {
  // Net weight = Gross weight + (Gross weight * Wastage / 100)
  return grossWeight + (grossWeight * wastage / 100);
}

// Calculate item amount based on net weight, gold rate, and lab rate
export function calculateItemAmount(netWeight: number, goldRate: number, labRate: number): number {
  return (netWeight * goldRate) + labRate;
}

// Calculate totals for an invoice
export function calculateInvoiceTotals(items: JewelryItem[]): {
  totalAmount: number;
} {
  let totalAmount = 0;
  
  for (const item of items) {
    const netWeight = calculateNetWeight(item.grossWeight, item.wastage);
    const amount = calculateItemAmount(netWeight, item.goldRate, item.labRate);
    totalAmount += amount;
  }
  
  return { totalAmount };
}

// Format currency in Indian Rupee format
export function formatCurrency(amount: number): string {
  return amount.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
    minimumFractionDigits: 0
  });
}

// Format date in Indian format
export function formatDate(date: number | Date): string {
  return new Date(date).toLocaleString('en-IN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Asia/Kolkata'
  });
}

// Generate printable invoice HTML
export function generateInvoiceHTML(invoice: Invoice, customer: Customer): string {
  const invoiceDate = formatDate(invoice.invoiceDate);

  // Calculate item details with formatting
  const itemsHTML = invoice.items.map((item, index) => {
    const netWeight = calculateNetWeight(item.grossWeight, item.wastage);
    const amount = calculateItemAmount(netWeight, item.goldRate, item.labRate);
    return `
      <tr>
        <td>${index + 1}</td>
        <td>${item.name}</td>
        <td>${item.grossWeight.toFixed(3)} g</td>
        <td>${item.wastage}%</td>
        <td>${netWeight.toFixed(3)} g</td>
        <td>${formatCurrency(item.goldRate)}</td>
        <td>${formatCurrency(item.labRate)}</td>
        <td>${formatCurrency(amount)}</td>
      </tr>
    `;
  }).join('');

  // Add payment details section
  const paymentDetailsHTML = invoice.payments.map(payment => `
    <div class="payment-row">
      <div class="payment-info">
        <span class="${payment.mode === 'DISCOUNT' ? 'discount-text' : ''}">${
          payment.mode === 'PHONEPE' ? 
            `PhonePe (${payment.phonePeReceiver === 'OTHERS' ? payment.customReceiverName : payment.phonePeReceiver})` : 
            payment.mode === 'DISCOUNT' ? 'Discount' : 'Cash'
        }</span>
        <span class="payment-date">${new Date(payment.timestamp).toLocaleString('en-IN', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Kolkata'
        })}</span>
      </div>
      <span class="${payment.mode === 'DISCOUNT' ? 'discount-amount' : ''}">${formatCurrency(payment.amount)}</span>
    </div>
  `).join('');

  // Use logo and watermark if available
  const logoImg = '/logo.JPG'; // fallback to text if not found
  const watermarkImg = '/watermark.png'; // fallback to text if not found

  // Create the full HTML document
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>Invoice #${invoice.id.substring(0, 8)}</title>
      <style>
        @media print {
          @page {
            size: 4in 6in;
            margin: 0;
          }
          html, body {
            width: 4in;
            height: 6in;
            margin: 0;
            padding: 0;
            overflow: hidden;
          }
          body, .invoice-content {
            box-sizing: border-box;
            width: 4in;
            height: 6in;
            max-width: 4in;
            max-height: 6in;
            overflow: hidden;
          }
          .invoice-content {
            display: flex;
            flex-direction: column;
            height: 6in;
            width: 4in;
            transform-origin: top left;
            page-break-inside: avoid;
            page-break-before: avoid;
            page-break-after: avoid;
          }
          table, tr, td, th, div, p, h1, h2, h3, h4, h5, h6 {
            page-break-inside: avoid !important;
            page-break-before: avoid !important;
            page-break-after: avoid !important;
          }
        }
        body {
          font-family: 'Segoe UI', Arial, sans-serif;
          margin: 0;
          padding: 4px;
          color: #222;
          background: #fff;
          min-height: 6in;
          min-width: 4in;
          box-sizing: border-box;
          font-size: 8px;
        }
        .watermark-img {
          position: fixed;
          top: 50%;
          left: 50%;
          width: 80%;
          max-width: 250px;
          opacity: 0.08;
          z-index: 0;
          transform: translate(-50%, -50%);
          pointer-events: none;
          user-select: none;
        }
        .invoice-content {
          position: relative;
          z-index: 1;
          background: rgba(255,255,255,0.96);
          border-radius: 8px;
          box-shadow: 0 2px 8px rgba(191,149,63,0.08);
        }
        .invoice-header {
          text-align: center;
          margin-bottom: 6px;
          position: relative;
        }
        .serial-badge {
          display: inline-block;
          background: #BF953F;
          color: #fff;
          font-weight: bold;
          font-size: 10px;
          border-radius: 12px;
          padding: 2px 10px;
          margin-bottom: 2px;
          letter-spacing: 1px;
          box-shadow: 0 1px 4px rgba(191,149,63,0.12);
        }
        .logo-img {
          max-width: 32px;
          max-height: 32px;
          margin: 0 auto 2px auto;
          display: block;
        }
        .logo {
          font-size: 12px;
          font-weight: bold;
          color: #BF953F;
          letter-spacing: 1px;
        }
        .shop-address {
          font-size: 7px;
          color: #666;
        }
        .invoice-title {
          font-size: 10px;
          margin: 4px 0;
          border-bottom: 1px solid #ddd;
          padding-bottom: 2px;
          color: #BF953F;
          font-weight: 600;
        }
        .customer-info {
          display: flex;
          justify-content: space-between;
          margin-bottom: 4px;
        }
        .customer-details, .invoice-details {
          width: 48%;
        }
        .invoice-details p {
          margin: 2px 0;
        }
        table {
          width: 100%;
          border-collapse: collapse;
          margin-bottom: 4px;
        }
        th, td {
          border: 1px solid #ddd;
          padding: 2px;
          text-align: left;
          font-size: 8px;
        }
        th {
          background-color: #f8f5ee;
          color: #BF953F;
        }
        .totals {
          width: 100%;
          margin-left: auto;
        }
        .totals-row {
          display: flex;
          justify-content: space-between;
          padding: 2px 0;
          border-bottom: 1px solid #eee;
          font-size: 8px;
        }
        .totals-row.grand-total {
          font-weight: bold;
          border-top: 2px solid #BF953F;
          border-bottom: 2px solid #BF953F;
          color: #BF953F;
        }
        .footer {
          margin-top: 6px;
          display: flex;
          justify-content: space-between;
        }
        .signature {
          width: 48%;
        }
        .signature-line {
          margin-top: 6px;
          border-top: 1px solid #ddd;
          padding-top: 1px;
        }
        .payment-row {
          display: flex;
          justify-content: space-between;
          margin-bottom: 2px;
          padding: 2px;
          border: 1px solid #eee;
          border-radius: 1px;
          font-size: 8px;
        }
        .payment-info {
          display: flex;
          gap: 2px;
        }
        .payment-date {
          color: #666;
          font-size: 0.7em;
        }
        .discount-text {
          color: #9333ea;
          font-weight: 500;
        }
        .discount-amount {
          color: #9333ea;
          font-weight: 500;
        }
      </style>
      <script>
        // Auto-scale .invoice-content to fit 4x6in if content is too large
        window.onload = function() {
          var content = document.querySelector('.invoice-content');
          if (!content) return;
          var parent = content.parentElement;
          var maxW = parent ? parent.offsetWidth : 384; // 4in at 96dpi
          var maxH = parent ? parent.offsetHeight : 576; // 6in at 96dpi
          var scaleW = maxW / content.scrollWidth;
          var scaleH = maxH / content.scrollHeight;
          var scale = Math.min(1, scaleW, scaleH);
          if (scale < 1) {
            content.style.transform = 'scale(' + scale + ')';
          } else {
            content.style.transform = 'scale(1)';
          }
        };
      </script>
    </head>
    <body>
      <img src="${watermarkImg}" class="watermark-img" alt="Watermark" />
      <div class="invoice-content">
        <div class="invoice-header">
          <div class="serial-badge">Serial No: ${invoice.serialNumber ?? 'N/A'}</div>
          <img src="${logoImg}" alt="Logo" class="logo-img" onerror="this.style.display='none'" />
          <div class="logo">RK Jewellers</div>
          <div class="shop-address">Main Road, Achampet, Telangana</div>
          <div class="shop-contact">Tel: +91 9440370408, +91 9490324969</div>
        </div>
        <div class="invoice-title">INVOICE</div>
        <div class="customer-info">
          <div class="customer-details">
            <h3>Customer Details</h3>
            <p><strong>Name:</strong> ${customer.name}</p>
            <p><strong>Mobile:</strong> ${customer.mobile}</p>
            ${customer.address ? `<p><strong>Address:</strong> ${customer.address}</p>` : ''}
          </div>
          <div class="invoice-details">
            <h3>Invoice Details</h3>
            <p><strong>Invoice #:</strong> ${invoice.id.substring(0, 8).toUpperCase()}</p>
            <p><strong>Date:</strong> ${invoiceDate}</p>
          </div>
        </div>
        <h3>Item Details</h3>
        <table>
          <thead>
            <tr>
              <th>S.No</th>
              <th>Item</th>
              <th>Gross Weight</th>
              <th>Wastage</th>
              <th>Net Weight</th>
              <th>Gold Rate</th>
              <th>Lab Rate</th>
              <th>Amount</th>
            </tr>
          </thead>
          <tbody>
            ${itemsHTML}
          </tbody>
        </table>
        <div class="payment-details">
          <h3>Payment Details</h3>
          ${paymentDetailsHTML}
        </div>
        <div class="totals">
          <div class="totals-row">
            <span>Total Amount:</span>
            <span>${formatCurrency(invoice.totalAmount)}</span>
          </div>
          <div class="totals-row">
            <span>Paid Amount:</span>
            <span>${formatCurrency(invoice.payments.reduce((sum, p) => p.mode !== 'DISCOUNT' ? sum + p.amount : sum, 0))}</span>
          </div>
          <div class="totals-row">
            <span>Discount:</span>
            <span class="discount-amount">${formatCurrency(invoice.payments.reduce((sum, p) => p.mode === 'DISCOUNT' ? sum + p.amount : sum, 0))}</span>
          </div>
          <div class="totals-row grand-total">
            <span>Due Amount:</span>
            <span>${formatCurrency(invoice.dueAmount)}</span>
          </div>
        </div>
        <div class="footer">
          <div class="signature">
            <div class="signature-line">Customer Signature</div>
          </div>
          <div class="signature">
            <div class="signature-line">Authorized Signature</div>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Simple test function to check if PDF generation works
export async function testPDFGeneration(): Promise<void> {
  try {
    toast.info('Testing PDF generation...');
    
    // Create a simple test HTML
    const testHTML = `
      <div style="padding: 20px; font-family: Arial, sans-serif;">
        <h1>Test Invoice</h1>
        <p>This is a test to check if PDF generation works.</p>
        <p>Date: ${new Date().toLocaleString()}</p>
      </div>
    `;
    
    // Create a temporary div
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = testHTML;
    document.body.appendChild(tempDiv);
    
    // Wait a moment
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Try to generate PDF
    const opt = {
      margin: 10,
      filename: 'test_invoice.pdf',
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: true
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };
    
    await html2pdf().set(opt).from(tempDiv).save();
    
    // Clean up
    document.body.removeChild(tempDiv);
    
    toast.success('PDF test successful!');
    
  } catch (error) {
    console.error('PDF test failed:', error);
    toast.error(`PDF test failed: ${error.message}`);
  }
}

// Function to generate and download PDF for mobile devices
export async function generateAndDownloadPDF(invoice: Invoice, customer: Customer): Promise<void> {
  try {
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(invoice, customer);
    
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.top = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.innerHTML = invoiceHTML;
    document.body.appendChild(tempDiv);
    
    // Wait for content to render
    await new Promise(resolve => setTimeout(resolve, 500));
    
    // Use html2pdf.js for simpler PDF generation
    const opt = {
      margin: 10,
      filename: `RK_Jewellers_Invoice_${invoice.id.substring(0, 8)}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { 
        scale: 2,
        useCORS: true,
        logging: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait' 
      }
    };
    
    // Generate and download PDF
    await html2pdf().set(opt).from(tempDiv).save();
    
    // Clean up
    document.body.removeChild(tempDiv);
    
    toast.success('PDF downloaded successfully! You can now print it.');
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    
    // Fallback: try to show the invoice in a new window for manual printing
    try {
      const invoiceHTML = generateInvoiceHTML(invoice, customer);
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        toast.info('Invoice opened in new window. Please use browser print option.');
      } else {
        toast.error('Failed to generate PDF. Please try again.');
      }
    } catch (fallbackError) {
      console.error('Fallback also failed:', fallbackError);
      toast.error('Failed to generate PDF. Please try again.');
    }
    
    throw error;
  }
}

// Function to print an invoice
export function printInvoice(invoiceHTML: string): void {
  // Check if running on mobile
  const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

  if (isMobile) {
    // For mobile devices, navigate to a dedicated print page
    // Store the invoice HTML in sessionStorage
    sessionStorage.setItem('printInvoiceHTML', invoiceHTML);
    
    // Navigate to the print page
    window.location.href = '/print';
  } else {
    // For desktop, use the existing window approach
    const printWindow = window.open('', '_blank', 'height=600,width=800');
    
    if (printWindow) {
      printWindow.document.write(invoiceHTML);
      printWindow.document.close();
      
      // Wait for resources to load before printing
      printWindow.onload = function() {
        printWindow.focus();
        printWindow.print();
        // Close the window after print or when closed
        printWindow.onafterprint = function() {
          printWindow.close();
        };
      };
    }
  }
}

// Export data to a CSV file
export function downloadCSV(csvContent: string, fileName: string): void {
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  
  link.setAttribute('href', url);
  link.setAttribute('download', fileName);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

// Generate WhatsApp message for invoice
export function generateInvoiceWhatsAppMessage(invoice: Invoice, customer: Customer): string {
  const invoiceDate = formatDate(invoice.invoiceDate);
  const paidAmount = invoice.payments.reduce((sum, p) => p.mode !== 'DISCOUNT' ? sum + p.amount : sum, 0);
  const discountAmount = invoice.payments.reduce((sum, p) => p.mode === 'DISCOUNT' ? sum + p.amount : sum, 0);

  let message = `*RK Jewellers - Invoice #${invoice.id.substring(0, 8)}*\n\n`;
  message += `*Customer:* ${customer.name}\n`;
  message += `*Mobile:* ${customer.mobile}\n`;
  if (customer.address) message += `*Address:* ${customer.address}\n`;
  message += `*Date:* ${invoiceDate}\n\n`;
  
  message += `*Items:*\n`;
  invoice.items.forEach((item, index) => {
    const netWeight = calculateNetWeight(item.grossWeight, item.wastage);
    const amount = calculateItemAmount(netWeight, item.goldRate, item.labRate);
    message += `${index + 1}. ${item.name}\n`;
    message += `   Gross: ${item.grossWeight.toFixed(3)}g, Wastage: ${item.wastage}%\n`;
    message += `   Net: ${netWeight.toFixed(3)}g, Gold Rate: ${formatCurrency(item.goldRate)}\n`;
    message += `   Lab Rate: ${formatCurrency(item.labRate)}, Amount: ${formatCurrency(amount)}\n\n`;
  });

  message += `*Payment Details:*\n`;
  message += `Total Amount: ${formatCurrency(invoice.totalAmount)}\n`;
  message += `Paid Amount: ${formatCurrency(paidAmount)}\n`;
  if (discountAmount > 0) {
    message += `Discount: ${formatCurrency(discountAmount)}\n`;
  }
  message += `Due Amount: ${formatCurrency(invoice.dueAmount)}\n\n`;

  message += `*Payments:*\n`;
  invoice.payments.forEach((payment, index) => {
    message += `${index + 1}. ${payment.mode === 'PHONEPE' ? 
      `PhonePe (${payment.phonePeReceiver === 'OTHERS' ? payment.customReceiverName : payment.phonePeReceiver})` : 
      payment.mode === 'DISCOUNT' ? 'Discount' : 'Cash'}\n`;
    message += `   Amount: ${formatCurrency(payment.amount)}\n`;
    message += `   Date: ${new Date(payment.timestamp).toLocaleString('en-IN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    })}\n\n`;
  });

  message += `Thank you for your business!\n`;
  message += `RK Jewellers\n`;
  message += `Main Road, Achampet, Telangana\n`;
  message += `Tel: +91 9440370408, +91 9490324969`;

  return message;
}

// Generate and share PDF via WhatsApp
export async function shareInvoicePDF(invoice: Invoice, customer: Customer): Promise<void> {
  try {
    // Generate invoice HTML
    const invoiceHTML = generateInvoiceHTML(invoice, customer);
    
    // Create a temporary div to render the HTML
    const tempDiv = document.createElement('div');
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.innerHTML = invoiceHTML;
    document.body.appendChild(tempDiv);
    
    // Wait for images to load
    await new Promise(resolve => {
      const images = tempDiv.getElementsByTagName('img');
      if (images.length === 0) {
        resolve(true);
        return;
      }
      
      let loadedImages = 0;
      for (let i = 0; i < images.length; i++) {
        images[i].onload = () => {
          loadedImages++;
          if (loadedImages === images.length) {
            resolve(true);
          }
        };
      }
    });
    
    // Convert to canvas
    const canvas = await html2canvas(tempDiv, {
      scale: 2,
      useCORS: true,
      logging: false
    });
    
    // Create PDF
    const pdf = new jsPDF('p', 'mm', 'a4');
    const imgWidth = 210; // A4 width in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    
    // Add image to PDF
    pdf.addImage(canvas.toDataURL('image/jpeg', 1.0), 'JPEG', 0, 0, imgWidth, imgHeight);
    
    // Create WhatsApp message
    let whatsappMessage = `*RK Jewellers - Invoice #${invoice.id.substring(0, 8)}*\n\n`;
    whatsappMessage += `Thank you for your business!\n`;
    whatsappMessage += `RK Jewellers\n`;
    whatsappMessage += `Main Road, Achampet, Telangana\n`;
    whatsappMessage += `Tel: +91 9440370408, +91 9490324969`;

    // Check if running on mobile
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

    if (isMobile) {
      // For mobile devices, use the native sharing API
      try {
        // Convert PDF to Blob
        const pdfBlob = pdf.output('blob');
        const file = new File([pdfBlob], `RK_Jewellers_Invoice_${invoice.id.substring(0, 8)}.pdf`, { type: 'application/pdf' });

        // Use native sharing if available
        if (navigator.share) {
          await navigator.share({
            files: [file],
            title: `RK Jewellers Invoice #${invoice.id.substring(0, 8)}`,
            text: whatsappMessage
          });
        } else {
          // Fallback to direct WhatsApp sharing
          const formData = new FormData();
          formData.append('file', file);
          formData.append('text', whatsappMessage);
          formData.append('phone', customer.mobile.replace(/\D/g, ''));

          // Use WhatsApp business API endpoint
          const whatsappUrl = `whatsapp://send?phone=${customer.mobile.replace(/\D/g, '')}&text=${encodeURIComponent(whatsappMessage)}`;
          window.location.href = whatsappUrl;
        }
      } catch (error) {
        console.error('Error sharing:', error);
        // Fallback to downloading
        pdf.save(`RK_Jewellers_Invoice_${invoice.id.substring(0, 8)}.pdf`);
        const whatsappUrl = `whatsapp://send?phone=${customer.mobile.replace(/\D/g, '')}&text=${encodeURIComponent(whatsappMessage)}`;
        window.location.href = whatsappUrl;
      }
    } else {
      // For desktop, download PDF and open WhatsApp Web
      pdf.save(`RK_Jewellers_Invoice_${invoice.id.substring(0, 8)}.pdf`);
      const whatsappUrl = `https://wa.me/${customer.mobile.replace(/\D/g, '')}?text=${encodeURIComponent(whatsappMessage)}`;
      window.open(whatsappUrl, '_blank');
      toast.success('PDF downloaded successfully. Please share it manually through WhatsApp.');
    }
    
    // Clean up
    document.body.removeChild(tempDiv);
    
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw error;
  }
}
