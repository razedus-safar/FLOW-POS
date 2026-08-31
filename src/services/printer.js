/**
 * FlowPOS Hardware Receipt Printer & ESC/POS Peripheral Service
 * Supports:
 * - 80mm & 58mm High-Density Thermal Printers
 * - Standard System Web Print (with zero-margin thermal emulation)
 * - Web Bluetooth ESC/POS Direct Print (for mobile wireless thermal printers)
 * - WebUSB ESC/POS Direct Print (for USB POS thermal receipt printers)
 * - Network IP Thermal Receipt Printers
 * - Electronic Cash Drawer Kick Cues
 */

import { settingsService } from './settings.js';
import { toast } from '../components/Toast.js';
import { formatCurrency } from '../utils/currency.js';

class HardwarePrinterService {
  constructor() {
    this.bluetoothDevice = null;
    this.bluetoothCharacteristic = null;
    this.usbDevice = null;
  }

  getHardwareSettings() {
    const s = settingsService.getSettings();
    return s.hardware || {
      printerType: 'thermal_80mm',
      printerInterface: 'browser',
      printerIp: '192.168.1.100',
      printerPort: 9100,
      autoPrintReceipt: false,
      printStoreLogo: true,
      printBarcodeOnReceipt: true,
      cashDrawerKick: true
    };
  }

  /**
   * Kick Cash Drawer electronically
   */
  async kickCashDrawer() {
    const hw = this.getHardwareSettings();
    if (!hw.cashDrawerKick) return;

    try {
      if (hw.printerInterface === 'bluetooth' && this.bluetoothCharacteristic) {
        // ESC p 0 25 250 (Pulse to cash drawer connector)
        const kickBytes = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        await this.bluetoothCharacteristic.writeValue(kickBytes);
      } else if (hw.printerInterface === 'usb' && this.usbDevice) {
        const kickBytes = new Uint8Array([0x1B, 0x70, 0x00, 0x19, 0xFA]);
        await this.usbDevice.transferOut(1, kickBytes);
      }
      console.log('Cash drawer kick pulse executed.');
    } catch (err) {
      console.warn('Cash drawer kick failed:', err);
    }
  }

  /**
   * Print Order Receipt
   */
  async printReceipt(orderData) {
    const hw = this.getHardwareSettings();

    // 1. Kick cash drawer if enabled and paid with cash
    if (orderData.payment_method === 'CASH' || orderData.payment_method === 'cash') {
      this.kickCashDrawer();
    }

    if (hw.printerInterface === 'bluetooth') {
      return this.printViaBluetooth(orderData);
    } else if (hw.printerInterface === 'usb') {
      return this.printViaUSB(orderData);
    } else if (hw.printerInterface === 'network') {
      return this.printViaNetwork(orderData);
    } else {
      // Default: System / Browser Print Window
      return this.printViaBrowser(orderData);
    }
  }

  /**
   * Browser / System Thermal Print
   */
  printViaBrowser(orderData) {
    const settings = settingsService.getSettings();
    const store = settings.store || {};
    const hw = this.getHardwareSettings();
    const is58mm = hw.printerType === 'thermal_58mm';
    const paperWidth = is58mm ? '58mm' : '80mm';

    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    document.body.appendChild(printFrame);

    const receiptHtml = this.generateReceiptHTML(orderData, store, hw, paperWidth);

    const doc = printFrame.contentWindow.document;
    doc.open();
    doc.write(receiptHtml);
    doc.close();

    printFrame.contentWindow.focus();
    setTimeout(() => {
      printFrame.contentWindow.print();
      setTimeout(() => printFrame.remove(), 2000);
    }, 250);

    return true;
  }

  /**
   * Generate HTML for Thermal Printing
   */
  generateReceiptHTML(order, store, hw, paperWidth) {
    const items = order.items || [];
    const dateStr = order.created_at ? new Date(order.created_at).toLocaleString() : new Date().toLocaleString();
    const subtotal = order.subtotal || order.total || 0;
    const tax = order.tax_amount || 0;
    const discount = order.discount_amount || 0;
    const total = order.total || 0;
    const receiptNum = order.order_number || order.id || 'REC-1001';

    const itemsRows = items.map(item => `
      <tr style="border-bottom: 1px dashed #ddd;">
        <td style="padding: 4px 0; text-align: left;">
          <div style="font-weight: bold;">${item.product_name || item.name}</div>
          <div style="font-size: 11px; color: #555;">${item.quantity} x ${formatCurrency(item.unit_price || item.price)}</div>
        </td>
        <td style="padding: 4px 0; text-align: right; font-weight: bold; vertical-align: top;">
          ${formatCurrency(item.total_price || (item.quantity * item.price))}
        </td>
      </tr>
    `).join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Receipt - ${receiptNum}</title>
          <style>
            @page {
              size: ${paperWidth} auto;
              margin: 0;
            }
            body {
              font-family: 'Courier New', Courier, monospace, -apple-system, sans-serif;
              font-size: 12px;
              line-height: 1.35;
              color: #000;
              background: #fff;
              margin: 0;
              padding: ${paperWidth === '58mm' ? '6px 4px' : '10px 8px'};
              width: ${paperWidth};
              box-sizing: border-box;
            }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .font-bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 8px 0; }
            .double-divider { border-top: 2px solid #000; margin: 8px 0; }
            table { width: 100%; border-collapse: collapse; }
            .logo-img { max-width: 64px; max-height: 64px; border-radius: 8px; margin: 0 auto 6px; display: block; filter: grayscale(100%); }
          </style>
        </head>
        <body>
          <div class="text-center">
            ${hw.printStoreLogo && store.logo ? `<img src="${store.logo}" class="logo-img" alt="Logo" />` : ''}
            <h2 style="margin: 0 0 2px; font-size: 16px; font-weight: 900;">${store.name || 'FlowPOS Store'}</h2>
            <div style="font-size: 10px; color: #333;">${store.tagline || 'Retail Operating Station'}</div>
            ${store.phone ? `<div style="font-size: 10px;">Tel: ${store.phone}</div>` : ''}
            ${store.address ? `<div style="font-size: 10px;">${store.address}</div>` : ''}
            ${store.taxId ? `<div style="font-size: 10px;">Tax ID: ${store.taxId}</div>` : ''}
          </div>

          <div class="divider"></div>

          <div style="font-size: 10px; display: flex; justify-content: space-between;">
            <span>Ref: <strong>${receiptNum}</strong></span>
            <span>${dateStr}</span>
          </div>
          ${order.cashier_name ? `<div style="font-size: 10px;">Cashier: ${order.cashier_name}</div>` : ''}

          <div class="divider"></div>

          <table>
            <thead>
              <tr style="border-bottom: 1px solid #000; font-size: 10px;">
                <th style="text-align: left; padding: 2px 0;">ITEM</th>
                <th style="text-align: right; padding: 2px 0;">TOTAL</th>
              </tr>
            </thead>
            <tbody>
              ${itemsRows}
            </tbody>
          </table>

          <div class="divider"></div>

          <table style="font-size: 11px;">
            <tr>
              <td style="padding: 2px 0;">Subtotal</td>
              <td class="text-right">${formatCurrency(subtotal)}</td>
            </tr>
            ${discount > 0 ? `
              <tr style="color: #444;">
                <td style="padding: 2px 0;">Discount</td>
                <td class="text-right">-${formatCurrency(discount)}</td>
              </tr>
            ` : ''}
            ${tax > 0 ? `
              <tr>
                <td style="padding: 2px 0;">Tax</td>
                <td class="text-right">${formatCurrency(tax)}</td>
              </tr>
            ` : ''}
            <tr style="font-size: 14px; font-weight: 900; border-top: 1px solid #000;">
              <td style="padding: 6px 0;">TOTAL</td>
              <td class="text-right" style="padding: 6px 0;">${formatCurrency(total)}</td>
            </tr>
          </table>

          <div class="divider"></div>

          <div style="font-size: 10px;">
            <div>Payment: <strong>${order.payment_method || 'CASH'}</strong></div>
            ${order.amount_tendered ? `<div>Tendered: ${formatCurrency(order.amount_tendered)}</div>` : ''}
            ${order.change_due ? `<div>Change: ${formatCurrency(order.change_due)}</div>` : ''}
          </div>

          ${store.receiptFooter ? `
            <div class="divider"></div>
            <div class="text-center" style="font-size: 9.5px; color: #444; white-space: pre-line;">
              ${store.receiptFooter}
            </div>
          ` : ''}

          <div class="text-center" style="margin-top: 10px; font-size: 9px; color: #777;">
            Powered by FlowPOS Touch OS
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Web Bluetooth ESC/POS Direct Print
   */
  async printViaBluetooth(orderData) {
    try {
      if (!navigator.bluetooth) {
        toast.error('Web Bluetooth is not supported in this browser. Please use Chrome/Edge or standard print.');
        return this.printViaBrowser(orderData);
      }

      if (!this.bluetoothCharacteristic) {
        toast.info('Requesting Bluetooth Thermal Printer connection…');
        const device = await navigator.bluetooth.requestDevice({
          filters: [{ services: ['000018f0-0000-1000-8000-00805f9b34fb'] }],
          optionalServices: ['000018f0-0000-1000-8000-00805f9b34fb', 'e7810a71-73ae-499d-8c15-faa9aef0c3f2']
        });

        const server = await device.gatt.connect();
        const service = await server.getPrimaryService('000018f0-0000-1000-8000-00805f9b34fb');
        const characteristic = await service.getCharacteristic('00002af1-0000-1000-8000-00805f9b34fb');

        this.bluetoothDevice = device;
        this.bluetoothCharacteristic = characteristic;
      }

      const escposData = this.buildEscPosBytes(orderData);
      await this.bluetoothCharacteristic.writeValue(escposData);
      toast.success('Receipt sent to Bluetooth Thermal Printer!');
      return true;
    } catch (err) {
      console.error('Bluetooth Print Error:', err);
      toast.warning('Bluetooth printing unavailable, switching to browser print…');
      return this.printViaBrowser(orderData);
    }
  }

  /**
   * WebUSB ESC/POS Direct Print
   */
  async printViaUSB(orderData) {
    try {
      if (!navigator.usb) {
        toast.error('WebUSB is not supported in this browser.');
        return this.printViaBrowser(orderData);
      }

      if (!this.usbDevice) {
        const device = await navigator.usb.requestDevice({ filters: [] });
        await device.open();
        await device.selectConfiguration(1);
        await device.claimInterface(0);
        this.usbDevice = device;
      }

      const escposData = this.buildEscPosBytes(orderData);
      await this.usbDevice.transferOut(1, escposData);
      toast.success('Receipt sent to USB Thermal Printer!');
      return true;
    } catch (err) {
      console.error('USB Print Error:', err);
      return this.printViaBrowser(orderData);
    }
  }

  /**
   * Network IP Thermal Print Endpoint
   */
  async printViaNetwork(orderData) {
    const hw = this.getHardwareSettings();
    const url = `http://${hw.printerIp || '192.168.1.100'}:${hw.printerPort || 9100}/print`;

    try {
      const resp = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ order: orderData, settings: settingsService.getSettings() })
      });
      if (resp.ok) {
        toast.success(`Sent to Network IP Printer (${hw.printerIp})`);
        return true;
      }
      throw new Error('Network printer returned non-OK status');
    } catch (err) {
      console.warn('Network Print Error:', err);
      toast.warning('Network printer unreachable, opening system print…');
      return this.printViaBrowser(orderData);
    }
  }

  /**
   * Build Raw ESC/POS Byte Buffer
   */
  buildEscPosBytes(order) {
    const settings = settingsService.getSettings();
    const store = settings.store || {};
    const items = order.items || [];
    const encoder = new TextEncoder();
    const bytes = [];

    // Init printer: ESC @
    bytes.push(0x1B, 0x40);

    // Center alignment: ESC a 1
    bytes.push(0x1B, 0x61, 0x01);

    // Double height & width: ESC ! 0x30
    bytes.push(0x1B, 0x21, 0x30);
    bytes.push(...encoder.encode(`${store.name || 'FlowPOS Store'}\n`));

    // Normal text: ESC ! 0x00
    bytes.push(0x1B, 0x21, 0x00);
    if (store.tagline) bytes.push(...encoder.encode(`${store.tagline}\n`));
    if (store.phone) bytes.push(...encoder.encode(`Tel: ${store.phone}\n`));
    if (store.address) bytes.push(...encoder.encode(`${store.address}\n`));
    bytes.push(...encoder.encode('--------------------------------\n'));

    // Left alignment: ESC a 0
    bytes.push(0x1B, 0x61, 0x00);
    bytes.push(...encoder.encode(`Ref: ${order.order_number || order.id || 'REC-1001'}\n`));
    bytes.push(...encoder.encode(`Date: ${new Date().toLocaleString()}\n`));
    bytes.push(...encoder.encode('--------------------------------\n'));

    // Items
    items.forEach(item => {
      const name = (item.product_name || item.name || 'Item').substring(0, 18);
      const totalStr = formatCurrency(item.total_price || (item.quantity * item.price));
      const line = `${item.quantity}x ${name}`.padEnd(20, ' ') + totalStr.padStart(12, ' ') + '\n';
      bytes.push(...encoder.encode(line));
    });

    bytes.push(...encoder.encode('--------------------------------\n'));

    // Total Double Size
    bytes.push(0x1B, 0x21, 0x20);
    const totalLine = `TOTAL: ${formatCurrency(order.total || 0)}\n`;
    bytes.push(...encoder.encode(totalLine));
    bytes.push(0x1B, 0x21, 0x00);

    bytes.push(...encoder.encode(`Payment: ${order.payment_method || 'CASH'}\n`));
    bytes.push(...encoder.encode('--------------------------------\n'));

    // Footer
    bytes.push(0x1B, 0x61, 0x01);
    if (store.receiptFooter) {
      bytes.push(...encoder.encode(`${store.receiptFooter}\n`));
    }
    bytes.push(...encoder.encode('Thank You for Shopping Local!\n\n\n'));

    // Cut Paper: GS V 65 0
    bytes.push(0x1D, 0x56, 0x41, 0x00);

    return new Uint8Array(bytes);
  }

  /**
   * Diagnostic Test Print
   */
  async printTestReceipt() {
    const sampleOrder = {
      order_number: 'TEST-DIAG-' + Math.floor(1000 + Math.random() * 9000),
      created_at: new Date().toISOString(),
      cashier_name: 'Admin Station #1',
      items: [
        { product_name: 'Hardware Diagnostic Item A', quantity: 2, unit_price: 15.00, total_price: 30.00 },
        { product_name: 'Thermal Test Roll 80mm', quantity: 1, unit_price: 8.50, total_price: 8.50 }
      ],
      subtotal: 38.50,
      tax_amount: 3.27,
      discount_amount: 0,
      total: 41.77,
      payment_method: 'CASH',
      amount_tendered: 50.00,
      change_due: 8.23
    };

    return this.printReceipt(sampleOrder);
  }

  generateReceiptText(orderData) {
    const s = settingsService.getSettings();
    const store = s.store || {};
    const lines = [
      store.name || 'FlowPOS Store',
      store.tagline || 'Retail OS',
      '--------------------------------',
      `Order: ${orderData.order_number || 'ORD'}`,
      `Date:  ${new Date(orderData.created_at || Date.now()).toLocaleString()}`,
      `Staff: ${orderData.cashier_name || 'Cashier'}`,
      '--------------------------------'
    ];
    (orderData.items || []).forEach(item => {
      lines.push(`${item.quantity}x ${item.product_name}  ${formatCurrency(item.unit_price * item.quantity)}`);
    });
    lines.push('--------------------------------');
    lines.push(`Total: ${formatCurrency(orderData.total_amount || orderData.total || 0)}`);
    lines.push('--------------------------------');
    lines.push(store.receiptFooter || 'Thank you for your business!');
    return lines.join('\n');
  }
}

export const hardwarePrinter = new HardwarePrinterService();
export const thermalPrinter = hardwarePrinter;
