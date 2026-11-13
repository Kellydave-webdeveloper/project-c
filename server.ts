import express, { Request, Response, NextFunction } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import type { AppDataStore, PaymentMethod, PaymentInvoice, PaymentProof, BusinessProfile, PaymentRequest, PaymentField } from './src/types/payment.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_DIR = path.resolve(__dirname, 'data');
const DATA_FILE = path.resolve(DATA_DIR, 'store.json');

// Initial seed data with multiple accounts to demonstrate quick switching
const DEFAULT_STORE: AppDataStore = {
  business: {
    name: 'Intermediary Payment Network',
    tagline: 'Intermediary Payment Network · Secure Direct Settlement',
    logoUrl: '/natwest-logo.svg',
    supportEmail: 'settlement@intermediarynetwork.org',
    supportPhone: '+44 3457 888 444',
    defaultCurrency: 'USD',
    defaultAmount: 250.00,
    defaultProductTitle: 'Intermediary Payment Network Deliverable',
    defaultProductDescription: 'Verified corporate and private direct settlement transaction cleared through Intermediary Payment Network desk.',
    adminPin: 'SECRETadmin1234',
    customNotice: 'All payments are directly verified and cleared by our Intermediary Payment Network settlement team.',
    defaultSectionHeader: 'International Payment Summary',
    allowOpenAmount: false,
    verifiedMerchant: true,
  },
  methods: [
    {
      id: 'method-paypal-primary',
      name: 'PayPal (Primary Account)',
      type: 'paypal',
      accountHandle: 'payments.apex@outlook.com',
      accountHolder: 'Apex Studio LLC',
      instructions: 'Send via PayPal to our direct business email. In the memo/notes, please write your Invoice # or Name so we can instantly match your payment.',
      fields: [
        { id: 'f-pp-email', label: 'PayPal Email', value: 'payments.apex@outlook.com', copyable: true },
        { id: 'f-pp-holder', label: 'Account Name', value: 'Apex Studio LLC', copyable: false },
        { id: 'f-pp-type', label: 'Transfer Type', value: 'Friends & Family or Goods & Services', copyable: false }
      ],
      qrData: 'https://paypal.me/apexstudio',
      isActive: true,
      isPrimary: true,
      feeNote: 'Zero additional merchant surcharge',
      category: 'digital',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-03T04:30:00.000Z',
    },
    {
      id: 'method-paypal-backup',
      name: 'PayPal (Secondary / Backup)',
      type: 'paypal',
      accountHandle: 'apex.backup.pay@gmail.com',
      accountHolder: 'Apex Global Holdings Ltd',
      instructions: 'Alternative PayPal address for fast clearing. Send payment and enter reference below.',
      fields: [
        { id: 'f-pp2-email', label: 'PayPal Email', value: 'apex.backup.pay@gmail.com', copyable: true },
        { id: 'f-pp2-holder', label: 'Account Name', value: 'Apex Global Holdings Ltd', copyable: false }
      ],
      qrData: 'https://paypal.me/apexglobalpay',
      isActive: false, // Inactive by default, admin can switch to it with 1 click
      isPrimary: false,
      feeNote: 'Backup payment channel',
      category: 'digital',
      createdAt: '2026-11-01T11:00:00.000Z',
      updatedAt: '2026-11-02T12:00:00.000Z',
    },
    {
      id: 'method-zelle',
      name: 'Zelle Direct',
      type: 'zelle',
      accountHandle: 'billing@apexstudio.io',
      accountHolder: 'Apex Studio LLC',
      instructions: 'Open your banking app (Chase, BoA, Wells Fargo, etc.) and send to our registered Zelle email address or phone number.',
      fields: [
        { id: 'f-z-email', label: 'Zelle Email', value: 'billing@apexstudio.io', copyable: true },
        { id: 'f-z-phone', label: 'Zelle Phone', value: '+1 (415) 890-2341', copyable: true },
        { id: 'f-z-holder', label: 'Recipient Name', value: 'Apex Studio LLC', copyable: false }
      ],
      isActive: true,
      isPrimary: false,
      feeNote: 'Instant bank-to-bank settlement',
      category: 'digital',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-03T02:00:00.000Z',
    },
    {
      id: 'method-cashapp',
      name: 'Cash App',
      type: 'cashapp',
      accountHandle: '$ApexStudioPay',
      accountHolder: 'Apex Studio',
      instructions: 'Send directly to our official $Cashtag. Please add your Invoice reference in the "For" field.',
      fields: [
        { id: 'f-ca-tag', label: 'Cashtag', value: '$ApexStudioPay', copyable: true },
        { id: 'f-ca-url', label: 'Web Link', value: 'https://cash.app/$ApexStudioPay', copyable: true }
      ],
      qrData: 'https://cash.app/$ApexStudioPay',
      isActive: true,
      isPrimary: false,
      feeNote: 'Instant mobile transfer',
      category: 'digital',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-02T15:00:00.000Z',
    },
    {
      id: 'method-bank-wire',
      name: 'Bank Wire / ACH Domestic & SWIFT',
      type: 'bank_wire',
      accountHandle: 'JPMorgan Chase NA (Acct ending 4918)',
      accountHolder: 'Apex Studio LLC',
      instructions: 'For domestic wire, ACH direct deposit, or international wire. Quote your invoice number in payment description.',
      fields: [
        { id: 'f-bw-bank', label: 'Bank Name', value: 'JPMorgan Chase Bank, N.A.', copyable: true },
        { id: 'f-bw-routing', label: 'Routing (ABA / Wire)', value: '021000021', copyable: true },
        { id: 'f-bw-acct', label: 'Account Number', value: '8492049182', copyable: true },
        { id: 'f-bw-swift', label: 'SWIFT / BIC', value: 'CHASUS33XXX', copyable: true },
        { id: 'f-bw-address', label: 'Bank Address', value: '270 Park Ave, New York, NY 10017', copyable: false }
      ],
      isActive: true,
      isPrimary: false,
      feeNote: 'No limit on transaction size',
      category: 'bank',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    },
    {
      id: 'method-crypto-usdt',
      name: 'Crypto (USDT / USDC ERC-20)',
      type: 'crypto',
      accountHandle: '0x71C8A3E9b98048fD9764585B5F3Eec0707D87a21',
      accountHolder: 'Apex Treasury Multi-Sig',
      instructions: 'Send strictly USDT or USDC on Ethereum (ERC-20) network. Copy the exact wallet address or scan the QR code.',
      fields: [
        { id: 'f-cr-network', label: 'Network', value: 'Ethereum Mainnet (ERC-20)', copyable: false },
        { id: 'f-cr-addr', label: 'Wallet Address', value: '0x71C8A3E9b98048fD9764585B5F3Eec0707D87a21', copyable: true }
      ],
      qrData: 'ethereum:0x71C8A3E9b98048fD9764585B5F3Eec0707D87a21',
      isActive: true,
      isPrimary: false,
      feeNote: 'Blockchain confirmed',
      category: 'crypto',
      createdAt: '2026-11-01T10:00:00.000Z',
      updatedAt: '2026-11-01T10:00:00.000Z',
    }
  ],
  invoices: [
    {
      id: 'INV-2026-881',
      trackingId: 'TRK-88100',
      title: 'Full Design System & Prototype',
      description: 'Milestone 2 deliverable: Component token architecture, Figma library & high-fidelity interactive flow.',
      amount: 1450.00,
      currency: 'USD',
      customerName: 'Sarah Jenkins',
      customerEmail: 'sarah.j@novadesign.io',
      status: 'pending',
      dueDate: '2026-11-15',
      createdAt: '2026-11-02T14:20:00.000Z',
    },
    {
      id: 'INV-2026-882',
      trackingId: 'TRK-88200',
      title: 'Performance Optimization & Server Setup',
      description: 'Infrastructure hardening, CDN setup, database indexing and speed audits.',
      amount: 850.00,
      currency: 'USD',
      customerName: 'Marcus Vance',
      customerEmail: 'm.vance@vancetech.com',
      status: 'verified',
      dueDate: '2026-11-08',
      createdAt: '2026-11-01T09:15:00.000Z',
      proofId: 'proof-882-demo'
    }
  ],
  proofs: [
    {
      id: 'proof-882-demo',
      invoiceId: 'INV-2026-882',
      methodId: 'method-zelle',
      methodName: 'Zelle Direct',
      senderName: 'Marcus Vance',
      senderEmail: 'm.vance@vancetech.com',
      amount: 850.00,
      currency: 'USD',
      transactionReference: 'ZEL-994821034',
      customerNotes: 'Sent from Chase Bank at 10:14 AM.',
      submittedAt: '2026-11-01T14:25:00.000Z',
      status: 'verified',
      verifiedAt: '2026-11-01T14:40:00.000Z',
      adminNotes: 'Payment verified in Chase account. Invoice marked paid.'
    }
  ],
  paymentRequests: []
};

// Storage helper functions
function loadStore(): AppDataStore {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    if (!fs.existsSync(DATA_FILE)) {
      fs.writeFileSync(DATA_FILE, JSON.stringify(DEFAULT_STORE, null, 2), 'utf-8');
      return DEFAULT_STORE;
    }
    const raw = fs.readFileSync(DATA_FILE, 'utf-8');
    const parsed = JSON.parse(raw);
    return {
      business: { ...DEFAULT_STORE.business, ...parsed.business },
      methods: parsed.methods || DEFAULT_STORE.methods,
      invoices: parsed.invoices || DEFAULT_STORE.invoices,
      proofs: parsed.proofs || DEFAULT_STORE.proofs,
      paymentRequests: parsed.paymentRequests || DEFAULT_STORE.paymentRequests || [],
    };
  } catch (err) {
    console.error('Error loading store, using default:', err);
    return DEFAULT_STORE;
  }
}

function saveStore(data: AppDataStore) {
  try {
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error writing store to disk:', err);
  }
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Support up to 15MB for receipt image uploads
  app.use(express.json({ limit: '15mb' }));
  app.use(express.urlencoded({ extended: true, limit: '15mb' }));

  // Helper middleware to check Admin authentication
  const requireAdmin = (req: Request, res: Response, next: NextFunction) => {
    const store = loadStore();
    const pin = req.headers['x-admin-pin'] || req.headers['authorization']?.replace('Bearer ', '');
    if (!pin || pin !== store.business.adminPin) {
      return res.status(401).json({ error: 'Unauthorized: Invalid Admin PIN' });
    }
    next();
  };

  // -------------------------------------------------------------
  // PUBLIC ROUTES (For Customers)
  // -------------------------------------------------------------

  // Public config: only business metadata and active payment methods (no admin pin)
  app.get('/api/public/config', (req: Request, res: Response) => {
    const store = loadStore();
    const { adminPin, ...publicBusiness } = store.business;
    const activeMethods = store.methods.filter((m) => m.isActive);

    res.json({
      business: publicBusiness,
      activeMethods,
      availableMethodsCount: activeMethods.length,
      timestamp: new Date().toISOString()
    });
  });

  // Helper to find invoice by tracking ID or invoice ID in store
  function findInvoice(store: AppDataStore, rawId: string): PaymentInvoice | undefined {
    if (!rawId) return undefined;
    const queryId = rawId.trim().toLowerCase();
    return store.invoices.find((i) => 
      i.id.toLowerCase() === queryId || 
      (i.trackingId && i.trackingId.toLowerCase() === queryId)
    );
  }

  // Public invoice / tracking ID view
  app.get('/api/public/invoices/:id', (req: Request, res: Response) => {
    const store = loadStore();
    const invoice = findInvoice(store, req.params.id);
    if (!invoice) {
      return res.status(404).json({
        error: 'Payment not found error: Tracking ID does not exist in the settlement registry.'
      });
    }

    const { adminPin, ...publicBusiness } = store.business;
    let allowedMethods = store.methods.filter((m) => m.isActive);
    if (invoice.allowedMethodIds && invoice.allowedMethodIds.length > 0) {
      allowedMethods = allowedMethods.filter((m) => invoice.allowedMethodIds?.includes(m.id));
    }

    // Find any proof submitted for this invoice
    const proof = store.proofs.find((p) => p.invoiceId === invoice.id);

    res.json({
      business: publicBusiness,
      invoice,
      allowedMethods,
      proof: proof ? {
        id: proof.id,
        methodName: proof.methodName,
        senderName: proof.senderName,
        amount: proof.amount,
        currency: proof.currency,
        submittedAt: proof.submittedAt,
        status: proof.status,
        transactionReference: proof.transactionReference
      } : null
    });
  });

  // Workflow step 1: Customer submits verified Tracking ID to request secure payment details from Admin desk
  app.post('/api/public/invoices/:id/request-details', (req: Request, res: Response) => {
    const store = loadStore();
    const invoice = findInvoice(store, req.params.id);
    if (!invoice) {
      return res.status(404).json({
        error: 'Payment not found error: Tracking ID does not exist in the settlement registry.'
      });
    }

    // Set to waiting so admin sees client in live waiting desk every time (even if existing ID is reused)
    invoice.status = 'waiting';
    invoice.lastRequestedAt = new Date().toISOString();
    saveStore(store);

    res.json({ success: true, invoice });
  });

  // Customer submit proof of payment
  app.post('/api/public/submit-proof', (req: Request, res: Response) => {
    const store = loadStore();
    const {
      invoiceId,
      methodId,
      senderName,
      senderEmail,
      senderPhone,
      amount,
      currency,
      transactionReference,
      receiptImage,
      customerNotes
    } = req.body;

    if (!receiptImage || typeof receiptImage !== 'string' || !receiptImage.trim()) {
      return res.status(400).json({ error: 'Attaching a screenshot or receipt is compulsory to confirm payment transfer' });
    }

    const linkedInvoice = invoiceId ? store.invoices.find((i) => i.id === invoiceId) : undefined;

    const finalName = (senderName && typeof senderName === 'string' && senderName.trim())
      || (transactionReference && typeof transactionReference === 'string' && transactionReference.trim())
      || linkedInvoice?.customerName
      || 'Direct Client';

    const finalEmail = (senderEmail && typeof senderEmail === 'string' && senderEmail.trim())
      || linkedInvoice?.customerEmail
      || `${finalName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@settlement.local`;

    const finalRef = (transactionReference && typeof transactionReference === 'string' && transactionReference.trim())
      || linkedInvoice?.paymentRefCode
      || linkedInvoice?.trackingId
      || `TX-${Math.floor(100000 + Math.random() * 900000)}`;

    const finalAmount = amount !== undefined && !isNaN(parseFloat(amount))
      ? parseFloat(amount)
      : (linkedInvoice?.amount || store.business.defaultAmount || 250);

    const method = store.methods.find((m) => m.id === methodId);
    const methodName = method ? method.name : 'Direct Transfer';

    const newProof: PaymentProof = {
      id: `proof-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceId: invoiceId || undefined,
      methodId: methodId || 'custom',
      methodName,
      senderName: finalName,
      senderEmail: finalEmail,
      senderPhone: senderPhone || undefined,
      amount: finalAmount,
      currency: currency || linkedInvoice?.currency || store.business.defaultCurrency || 'USD',
      transactionReference: finalRef,
      receiptImage: receiptImage || undefined,
      customerNotes: customerNotes || undefined,
      submittedAt: new Date().toISOString(),
      status: 'pending'
    };

    store.proofs.unshift(newProof);

    // If attached to an invoice, update invoice status
    if (invoiceId && linkedInvoice) {
      linkedInvoice.status = 'submitted';
      linkedInvoice.proofId = newProof.id;
    }

    saveStore(store);

    res.json({ success: true, proof: newProof });
  });

  // Check proof status
  app.get('/api/public/proof/:id', (req: Request, res: Response) => {
    const store = loadStore();
    const proof = store.proofs.find((p) => p.id === req.params.id);
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }
    res.json({
      id: proof.id,
      invoiceId: proof.invoiceId,
      status: proof.status,
      methodName: proof.methodName,
      amount: proof.amount,
      currency: proof.currency,
      submittedAt: proof.submittedAt,
      verifiedAt: proof.verifiedAt
    });
  });

  // -------------------------------------------------------------
  // LIVE PAYMENT REQUESTS (Customer Rail Selection & Dynamic Assignment)
  // -------------------------------------------------------------

  // Customer selects a payment rail: initiates a 60-second request for dynamic details
  app.post('/api/public/payment-requests', (req: Request, res: Response) => {
    const store = loadStore();
    const { methodId, invoiceId, customerName, customerEmail, amount, currency } = req.body;

    const method = store.methods.find((m) => m.id === methodId);
    if (!method) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const now = Date.now();
    // 120-second (2 minutes) countdown
    const expiresAt = new Date(now + 120 * 1000).toISOString();

    const newRequest: PaymentRequest = {
      id: `req-${now}-${Math.random().toString(36).substring(2, 7)}`,
      invoiceId: invoiceId || undefined,
      methodId: method.id,
      methodName: method.name,
      methodType: method.type,
      customerName: customerName || undefined,
      customerEmail: customerEmail || undefined,
      amount: amount !== undefined ? parseFloat(amount) : (store.business.defaultAmount ?? 250),
      currency: currency || store.business.defaultCurrency || 'USD',
      status: 'pending',
      createdAt: new Date(now).toISOString(),
      expiresAt,
      // Default draft details from the template
      assignedDetails: {
        accountHandle: method.accountHandle,
        accountHolder: method.accountHolder,
        instructions: method.instructions,
        fields: method.fields || [],
        qrData: method.qrData,
        feeNote: method.feeNote,
      },
    };

    if (!store.paymentRequests) {
      store.paymentRequests = [];
    }
    store.paymentRequests.unshift(newRequest);
    if (store.paymentRequests.length > 50) {
      store.paymentRequests = store.paymentRequests.slice(0, 50);
    }

    saveStore(store);
    res.json({ success: true, request: newRequest });
  });

  // Customer polls request status every 1 second during 60s countdown
  app.get('/api/public/payment-requests/:id', (req: Request, res: Response) => {
    const store = loadStore();
    if (!store.paymentRequests) store.paymentRequests = [];
    const request = store.paymentRequests.find((r) => r.id === req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    // Auto expire if 60 seconds passed and still pending
    if (request.status === 'pending') {
      const now = Date.now();
      const exp = new Date(request.expiresAt).getTime();
      if (now > exp) {
        request.status = 'expired';
        saveStore(store);
      }
    }

    res.json({ success: true, request });
  });

  // -------------------------------------------------------------
  // ADMIN ROUTES (Protected by PIN)
  // -------------------------------------------------------------

  // Admin PIN verification
  app.post('/api/admin/auth', (req: Request, res: Response) => {
    const store = loadStore();
    const { pin } = req.body;
    if (pin === store.business.adminPin) {
      return res.json({ success: true, token: pin });
    }
    return res.status(401).json({ success: false, error: 'Invalid credentials. Access denied.' });
  });

  // Full admin data view
  app.get('/api/admin/data', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    res.json(store);
  });

  // Update business profile & PIN
  app.put('/api/admin/business', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const {
      name,
      tagline,
      supportEmail,
      supportPhone,
      defaultCurrency,
      defaultAmount,
      adminPin,
      customNotice,
      allowOpenAmount,
      verifiedMerchant
    } = req.body;

    store.business = {
      ...store.business,
      name: name ?? store.business.name,
      tagline: tagline ?? store.business.tagline,
      supportEmail: supportEmail ?? store.business.supportEmail,
      supportPhone: supportPhone ?? store.business.supportPhone,
      defaultCurrency: defaultCurrency ?? store.business.defaultCurrency,
      defaultAmount: defaultAmount !== undefined ? parseFloat(defaultAmount) : store.business.defaultAmount,
      adminPin: adminPin ? adminPin.trim() : store.business.adminPin,
      customNotice: customNotice ?? store.business.customNotice,
      defaultSectionHeader: req.body.defaultSectionHeader !== undefined ? req.body.defaultSectionHeader : store.business.defaultSectionHeader,
      allowOpenAmount: allowOpenAmount !== undefined ? allowOpenAmount : store.business.allowOpenAmount,
      verifiedMerchant: verifiedMerchant !== undefined ? verifiedMerchant : store.business.verifiedMerchant,
    };

    saveStore(store);
    res.json({ success: true, business: store.business });
  });

  // Add new payment method
  app.post('/api/admin/methods', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const {
      name,
      type,
      accountHandle,
      accountHolder,
      instructions,
      fields,
      qrData,
      isActive,
      isPrimary,
      feeNote,
      category
    } = req.body;

    if (!name || !accountHandle) {
      return res.status(400).json({ error: 'Name and Account Handle are required' });
    }

    const newId = `method-${type || 'custom'}-${Date.now().toString(36)}`;

    // If set as primary, unmark other primaries
    if (isPrimary) {
      store.methods.forEach((m) => (m.isPrimary = false));
    }

    const newMethod: PaymentMethod = {
      id: newId,
      name,
      type: type || 'custom',
      accountHandle,
      accountHolder: accountHolder || store.business.name,
      instructions: instructions || 'Send payment to the account details shown above.',
      fields: fields || [],
      qrData: qrData || (type === 'cashapp' ? `https://cash.app/${accountHandle}` : undefined),
      isActive: isActive !== undefined ? isActive : true,
      isPrimary: isPrimary || false,
      feeNote: feeNote || 'Direct transfer',
      category: category || 'digital',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    store.methods.push(newMethod);
    saveStore(store);
    res.json({ success: true, method: newMethod });
  });

  // Update existing payment method (e.g. switch PayPal account in 15 mins)
  app.put('/api/admin/methods/:id', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const index = store.methods.findIndex((m) => m.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Payment method not found' });
    }

    const current = store.methods[index];
    const updates = req.body;

    if (updates.isPrimary) {
      store.methods.forEach((m) => {
        if (m.id !== current.id) m.isPrimary = false;
      });
    }

    store.methods[index] = {
      ...current,
      ...updates,
      id: current.id,
      updatedAt: new Date().toISOString(),
    };

    saveStore(store);
    res.json({ success: true, method: store.methods[index] });
  });

  // Quick toggle active / primary
  app.patch('/api/admin/methods/:id/toggle', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const method = store.methods.find((m) => m.id === req.params.id);
    if (!method) {
      return res.status(404).json({ error: 'Method not found' });
    }

    const { action } = req.body; // 'toggleActive' | 'setPrimary' | 'duplicate'
    if (action === 'toggleActive') {
      method.isActive = !method.isActive;
      method.updatedAt = new Date().toISOString();
    } else if (action === 'setPrimary') {
      store.methods.forEach((m) => (m.isPrimary = false));
      method.isPrimary = true;
      method.isActive = true;
      method.updatedAt = new Date().toISOString();
    } else if (action === 'duplicate') {
      const duplicate: PaymentMethod = {
        ...method,
        id: `method-${method.type}-${Date.now().toString(36)}`,
        name: `${method.name} (Copy)`,
        isPrimary: false,
        isActive: false, // Inactive ready for new details
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      store.methods.push(duplicate);
      saveStore(store);
      return res.json({ success: true, method: duplicate });
    }

    saveStore(store);
    res.json({ success: true, method });
  });

  // Delete payment method
  app.delete('/api/admin/methods/:id', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const initialLen = store.methods.length;
    store.methods = store.methods.filter((m) => m.id !== req.params.id);
    if (store.methods.length === initialLen) {
      return res.status(404).json({ error: 'Method not found' });
    }
    saveStore(store);
    res.json({ success: true, count: store.methods.length });
  });

  // Create payment invoice / payment link
  app.post('/api/admin/invoices', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const { title, description, amount, currency, customerName, customerEmail, dueDate, allowedMethodIds, trackingId, headerText, assignedBankDetails, paymentRefCode } = req.body;

    if (!title || !amount) {
      return res.status(400).json({ error: 'Title and amount are required' });
    }

    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const invoiceId = `INV-${new Date().getFullYear()}-${randomSuffix}`;
    
    // Generate clean unique tracking ID if not provided (e.g. TRK-84920 or user custom)
    const generatedTrackingId = trackingId && trackingId.trim()
      ? trackingId.trim().toUpperCase()
      : `TRK-${Math.floor(10000 + Math.random() * 90000)}`;

    const newInvoice: PaymentInvoice = {
      id: invoiceId,
      trackingId: generatedTrackingId,
      headerText: headerText !== undefined ? headerText : '',
      title,
      description: description || '',
      amount: parseFloat(amount),
      currency: currency || store.business.defaultCurrency,
      customerName: customerName || '',
      customerEmail: customerEmail || '',
      status: 'pending',
      dueDate: dueDate || '',
      allowedMethodIds: allowedMethodIds && allowedMethodIds.length > 0 ? allowedMethodIds : undefined,
      assignedBankDetails: assignedBankDetails ? {
        methodId: assignedBankDetails.methodId,
        bankName: assignedBankDetails.bankName || 'Intermediary Payment Network Clearing',
        accountHolder: assignedBankDetails.accountHolder || store.business.name || 'Intermediary Payment Network',
        accountNumber: assignedBankDetails.accountNumber || '',
        sortCodeOrRouting: assignedBankDetails.sortCodeOrRouting || '',
        swiftOrIban: assignedBankDetails.swiftOrIban || '',
        instructions: assignedBankDetails.instructions || 'Please transfer the exact amount and quote your Reference Code.',
        accountHandle: assignedBankDetails.accountHandle || assignedBankDetails.accountNumber || '',
        fields: Array.isArray(assignedBankDetails.fields) ? assignedBankDetails.fields : [],
        qrData: assignedBankDetails.qrData,
      } : undefined,
      paymentRefCode: paymentRefCode || `NW-${Math.floor(10000 + Math.random() * 90000)}`,
      createdAt: new Date().toISOString(),
    };

    store.invoices.unshift(newInvoice);
    saveStore(store);
    res.json({ success: true, invoice: newInvoice });
  });

  // Update payment invoice (allows admin to update total amount and details)
  app.put('/api/admin/invoices/:id', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const index = store.invoices.findIndex((i) => i.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Invoice not found' });
    }

    const current = store.invoices[index];
    const { title, description, amount, currency, customerName, customerEmail, dueDate, allowedMethodIds, status, trackingId, headerText, assignedBankDetails, paymentRefCode } = req.body;

    store.invoices[index] = {
      ...current,
      trackingId: trackingId !== undefined ? (trackingId ? trackingId.trim().toUpperCase() : undefined) : current.trackingId,
      headerText: headerText !== undefined ? headerText : current.headerText,
      title: title !== undefined ? title : current.title,
      description: description !== undefined ? description : current.description,
      amount: amount !== undefined ? parseFloat(amount) : current.amount,
      currency: currency || current.currency,
      customerName: customerName !== undefined ? customerName : current.customerName,
      customerEmail: customerEmail !== undefined ? customerEmail : current.customerEmail,
      dueDate: dueDate !== undefined ? dueDate : current.dueDate,
      allowedMethodIds: allowedMethodIds !== undefined ? allowedMethodIds : current.allowedMethodIds,
      status: status || current.status,
      assignedBankDetails: assignedBankDetails !== undefined ? assignedBankDetails : current.assignedBankDetails,
      paymentRefCode: paymentRefCode !== undefined ? paymentRefCode : current.paymentRefCode,
    };

    saveStore(store);
    res.json({ success: true, invoice: store.invoices[index] });
  });

  // Workflow step 4: Admin pushes dynamic Amount, Bank Details & Reference Code to customer Unique ID
  app.put('/api/admin/invoices/:id/push-details', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const queryId = req.params.id.trim().toLowerCase();
    const invoice = store.invoices.find((i) => 
      i.id.toLowerCase() === queryId || 
      (i.trackingId && i.trackingId.toLowerCase() === queryId)
    );

    if (!invoice) {
      return res.status(404).json({ error: 'Unique ID / Invoice record not found' });
    }

    const { amount, currency, bankDetails, paymentRefCode, title, description, headerText, customerName, senderName, feeAmount, amountTendered, amountToReceive, transactionDate } = req.body;

    if (amount !== undefined && !isNaN(parseFloat(amount))) {
      invoice.amount = parseFloat(amount);
    }
    if (currency) {
      invoice.currency = currency;
    }
    if (headerText !== undefined) {
      invoice.headerText = headerText;
    }
    if (title) {
      invoice.title = title;
    }
    if (description !== undefined) {
      invoice.description = description;
    }
    if (customerName !== undefined) {
      invoice.customerName = customerName;
    }
    if (senderName !== undefined) {
      invoice.senderName = senderName;
    }
    if (feeAmount !== undefined && !isNaN(parseFloat(feeAmount))) {
      invoice.feeAmount = parseFloat(feeAmount);
    }
    if (amountTendered !== undefined && !isNaN(parseFloat(amountTendered))) {
      invoice.amountTendered = parseFloat(amountTendered);
    }
    if (amountToReceive !== undefined && !isNaN(parseFloat(amountToReceive))) {
      invoice.amountToReceive = parseFloat(amountToReceive);
    }
    if (transactionDate !== undefined) {
      invoice.transactionDate = transactionDate;
    }

    // Set assigned Bank Details
    if (bankDetails) {
      invoice.assignedBankDetails = {
        methodId: bankDetails.methodId,
        bankName: bankDetails.bankName || 'Intermediary Payment Network Clearing',
        accountHolder: bankDetails.accountHolder || store.business.name || 'Intermediary Payment Network',
        accountNumber: bankDetails.accountNumber || '',
        sortCodeOrRouting: bankDetails.sortCodeOrRouting || '',
        swiftOrIban: bankDetails.swiftOrIban || '',
        instructions: bankDetails.instructions || 'Please transfer the exact amount and quote your Payment Reference Code.',
        accountHandle: bankDetails.accountHandle || '',
        fields: Array.isArray(bankDetails.fields) ? bankDetails.fields : [],
        qrData: bankDetails.qrData,
      };
    }

    // Generate or update payment reference code (e.g. NW-84920)
    const code = paymentRefCode && paymentRefCode.trim() 
      ? paymentRefCode.trim().toUpperCase()
      : (invoice.paymentRefCode || `NW-${Math.floor(10000 + Math.random() * 90000)}`);
    invoice.paymentRefCode = code;

    // Change status to 'ready'
    invoice.status = 'ready';
    invoice.readyAt = new Date().toISOString();

    saveStore(store);
    res.json({ success: true, invoice });
  });

  // Delete invoice
  app.delete('/api/admin/invoices/:id', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    store.invoices = store.invoices.filter((i) => i.id !== req.params.id);
    saveStore(store);
    res.json({ success: true });
  });

  // Verify or reject payment proof
  app.patch('/api/admin/proofs/:id/status', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    const { status, adminNotes } = req.body;
    const proof = store.proofs.find((p) => p.id === req.params.id);
    if (!proof) {
      return res.status(404).json({ error: 'Proof not found' });
    }

    proof.status = status;
    proof.adminNotes = adminNotes || proof.adminNotes;
    if (status === 'verified') {
      proof.verifiedAt = new Date().toISOString();
      if (proof.invoiceId) {
        const inv = store.invoices.find((i) => i.id === proof.invoiceId);
        if (inv) inv.status = 'verified';
      }
    } else if (status === 'rejected') {
      if (proof.invoiceId) {
        const inv = store.invoices.find((i) => i.id === proof.invoiceId);
        if (inv) inv.status = 'pending';
      }
    }

    saveStore(store);
    res.json({ success: true, proof });
  });

  // Admin: Get live payment requests
  app.get('/api/admin/payment-requests', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    if (!store.paymentRequests) store.paymentRequests = [];

    // Auto expire any pending requests older than their expiresAt
    const now = Date.now();
    let changed = false;
    store.paymentRequests.forEach((r) => {
      if (r.status === 'pending' && now > new Date(r.expiresAt).getTime()) {
        r.status = 'expired';
        changed = true;
      }
    });
    if (changed) {
      saveStore(store);
    }

    res.json({ success: true, requests: store.paymentRequests });
  });

  // Admin: Assign or update payment details for a specific client request
  app.put('/api/admin/payment-requests/:id/assign', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    if (!store.paymentRequests) store.paymentRequests = [];
    const request = store.paymentRequests.find((r) => r.id === req.params.id);
    if (!request) {
      return res.status(404).json({ error: 'Payment request not found' });
    }

    const {
      accountHandle,
      accountHolder,
      instructions,
      fields,
      qrData,
      feeNote,
      adminNote,
      bankName,
      accountNumber,
      sortCodeOrRouting,
      swiftOrIban,
    } = req.body;

    let updatedFields: PaymentField[] = Array.isArray(fields) ? [...fields] : [];

    const isZelle = request.methodType === 'zelle' || request.methodId === 'method-zelle' || request.methodName.toLowerCase().includes('zelle');
    const isBank = !isZelle && (request.methodType === 'bank_wire' || Boolean(bankName && bankName.trim()) || Boolean(accountNumber && accountNumber.trim()));

    // If Zelle, build clean instant transfer fields (email/phone and payee)
    if (isZelle) {
      const zelleFields: PaymentField[] = [];
      const zelleHandle = accountHandle || request.assignedDetails?.accountHandle || 'settlement@natwest.com';
      const zelleHolder = accountHolder || request.assignedDetails?.accountHolder || store.business.name;
      const isPhone = /^\+?[0-9\s\-()]{7,}$/.test(zelleHandle.trim());

      zelleFields.push({
        id: 'f-z-handle',
        label: isPhone ? 'Zelle Phone' : 'Zelle Email',
        value: zelleHandle,
        copyable: true
      });
      zelleFields.push({
        id: 'f-z-holder',
        label: 'Recipient Name',
        value: zelleHolder,
        copyable: false
      });
      zelleFields.push({
        id: 'f-z-type',
        label: 'Transfer Type',
        value: 'Zelle Instant Bank-to-Bank',
        copyable: false
      });

      if (Array.isArray(fields)) {
        fields.forEach((f) => {
          if (!/^(bank|sort|routing|swift|iban|account\s*number)/i.test(f.label.trim()) && !zelleFields.some((zf) => zf.label.toLowerCase() === f.label.toLowerCase())) {
            zelleFields.push(f);
          }
        });
      }
      updatedFields = zelleFields;
    } else if (isBank && (bankName || accountNumber || sortCodeOrRouting || swiftOrIban)) {
      // If bank details are provided, build/synchronize structured fields
      const fieldList: PaymentField[] = [];
      if (bankName) fieldList.push({ id: 'f-assigned-bank', label: 'Bank Name', value: bankName, copyable: true });
      if (accountHolder) fieldList.push({ id: 'f-assigned-holder', label: 'Account Holder / Beneficiary', value: accountHolder, copyable: true });
      if (accountNumber) fieldList.push({ id: 'f-assigned-acct', label: 'Account Number', value: accountNumber, copyable: true });
      if (sortCodeOrRouting) fieldList.push({ id: 'f-assigned-sort', label: 'Sort Code / Routing', value: sortCodeOrRouting, copyable: true });
      if (swiftOrIban) fieldList.push({ id: 'f-assigned-swift', label: 'SWIFT / BIC / IBAN', value: swiftOrIban, copyable: true });

      // Preserve any extra custom fields
      updatedFields.forEach((f) => {
        if (!fieldList.some((bf) => bf.label.toLowerCase() === f.label.toLowerCase() || bf.id === f.id)) {
          fieldList.push(f);
        }
      });
      updatedFields = fieldList;
    }

    const finalAccountHandle = isZelle ? (accountHandle || '') : isBank ? (accountNumber || accountHandle || '') : (accountHandle || '');

    request.assignedDetails = {
      accountHandle: finalAccountHandle || (request.assignedDetails?.accountHandle || ''),
      accountHolder: accountHolder !== undefined ? accountHolder : (request.assignedDetails?.accountHolder || ''),
      instructions: instructions !== undefined ? instructions : (request.assignedDetails?.instructions || ''),
      fields: updatedFields,
      qrData: qrData !== undefined ? qrData : request.assignedDetails?.qrData,
      feeNote: feeNote !== undefined ? feeNote : request.assignedDetails?.feeNote,
      bankName: isBank ? bankName : undefined,
      accountNumber: isBank ? accountNumber : undefined,
      sortCodeOrRouting: isBank ? sortCodeOrRouting : undefined,
      swiftOrIban: isBank ? swiftOrIban : undefined,
    };

    request.adminNote = adminNote || request.adminNote;
    request.status = 'ready';
    request.updatedAt = new Date().toISOString();

    // ALSO synchronize with the invoice if request is linked to an invoice!
    if (request.invoiceId && store.invoices) {
      const invoice = store.invoices.find((i) => i.id === request.invoiceId || i.trackingId === request.invoiceId);
      if (invoice) {
        if (isBank) {
          invoice.assignedBankDetails = {
            methodId: request.methodId,
            bankName: bankName || invoice.assignedBankDetails?.bankName || 'Intermediary Payment Network Clearing',
            accountHolder: accountHolder || invoice.assignedBankDetails?.accountHolder || store.business.name,
            accountNumber: accountNumber || accountHandle || invoice.assignedBankDetails?.accountNumber || '',
            sortCodeOrRouting: sortCodeOrRouting || invoice.assignedBankDetails?.sortCodeOrRouting || '',
            swiftOrIban: swiftOrIban || invoice.assignedBankDetails?.swiftOrIban || '',
            instructions: instructions || invoice.assignedBankDetails?.instructions || '',
            accountHandle: finalAccountHandle,
            fields: updatedFields,
            qrData: qrData || invoice.assignedBankDetails?.qrData,
          };
        } else if (isZelle && invoice.assignedBankDetails?.methodId === 'method-zelle') {
          delete invoice.assignedBankDetails;
        }
        invoice.status = 'ready';
      }
    }

    saveStore(store);
    res.json({ success: true, request });
  });

  // Admin: Delete or dismiss request
  app.delete('/api/admin/payment-requests/:id', requireAdmin, (req: Request, res: Response) => {
    const store = loadStore();
    if (!store.paymentRequests) store.paymentRequests = [];
    store.paymentRequests = store.paymentRequests.filter((r) => r.id !== req.params.id);
    saveStore(store);
    res.json({ success: true });
  });


  // -------------------------------------------------------------
  // PWA & SERVICE WORKER SERVING
  // -------------------------------------------------------------
  app.get('/sw.js', (req: Request, res: Response) => {
    const swPath = path.resolve(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'sw.js');
    if (fs.existsSync(swPath)) {
      res.setHeader('Content-Type', 'application/javascript');
      res.setHeader('Service-Worker-Allowed', '/');
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
      return res.sendFile(swPath);
    }
    res.status(404).send('Service worker not found');
  });

  app.get('/manifest.json', (req: Request, res: Response) => {
    const manifestPath = path.resolve(__dirname, process.env.NODE_ENV === 'production' ? 'dist' : 'public', 'manifest.json');
    if (fs.existsSync(manifestPath)) {
      res.setHeader('Content-Type', 'application/manifest+json');
      return res.sendFile(manifestPath);
    }
    res.status(404).send('Manifest not found');
  });

  // -------------------------------------------------------------
  // VITE DEV SERVER OR STATIC PRODUCTION BUILD
  // -------------------------------------------------------------
  if (process.env.NODE_ENV === 'production') {
    app.use(express.static(path.resolve(__dirname, 'dist')));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    app.use('*', async (req: Request, res: Response, next) => {
      const url = req.originalUrl;
      try {
        let template = fs.readFileSync(path.resolve(__dirname, 'index.html'), 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e: any) {
        if (vite) vite.ssrFixStacktrace(e);
        next(e);
      }
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`PayDirect server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
