export type PaymentMethodType =
  | 'paypal'
  | 'zelle'
  | 'cashapp'
  | 'venmo'
  | 'bank_wire'
  | 'crypto'
  | 'revolut'
  | 'wise'
  | 'apple_pay'
  | 'custom';

export interface PaymentField {
  id: string;
  label: string;
  value: string;
  copyable?: boolean;
}

export interface PaymentMethod {
  id: string;
  name: string;
  type: PaymentMethodType;
  accountHandle: string; // Primary identifier: email, $cashtag, phone, or wallet
  accountHolder: string; // Legal name or Business name
  instructions: string; // Explanatory instructions to the payer
  fields: PaymentField[]; // Extended structured data (routing number, swift, network, etc.)
  qrData?: string; // Data URL or text to generate QR (e.g. paypal.me link, crypto address)
  isActive: boolean;
  isPrimary: boolean;
  feeNote?: string;
  category: 'digital' | 'bank' | 'crypto' | 'other';
  createdAt: string;
  updatedAt: string;
}

export interface PaymentInvoice {
  id: string;
  trackingId?: string; // Unique client tracking ID (e.g. TRK-84920)
  headerText?: string; // Bold section header text (editable in admin panel)
  title: string;
  description?: string;
  amount: number;
  currency: string;
  customerName?: string;
  customerEmail?: string;
  status: 'pending' | 'waiting' | 'ready' | 'submitted' | 'verified' | 'cancelled';
  allowedMethodIds?: string[]; // if specified, only allow these methods; else all active
  dueDate?: string;
  createdAt: string;
  proofId?: string;
  // Dynamic admin assigned payment & bank details for this unique ID
  assignedBankDetails?: {
    methodId?: string;
    bankName?: string;
    accountHolder?: string;
    accountNumber?: string;
    sortCodeOrRouting?: string;
    swiftOrIban?: string;
    instructions?: string;
    accountHandle?: string;
    fields?: PaymentField[];
    qrData?: string;
  };
  paymentRefCode?: string; // e.g. NW-84920
  senderName?: string; // Sender / Originator
  feeAmount?: number; // Transaction fee / amount due (e.g. 320.00)
  amountTendered?: number; // Amount tendered
  amountToReceive?: number; // Amount to receive
  transactionDate?: string; // Custom transaction date dispatched to client view
  lastRequestedAt?: string;
  readyAt?: string;
}

export interface PaymentProof {
  id: string;
  invoiceId?: string;
  methodId: string;
  methodName: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  amount: number;
  currency: string;
  transactionReference: string;
  receiptImage?: string; // Data URL or image link
  customerNotes?: string;
  submittedAt: string;
  status: 'pending' | 'verified' | 'rejected';
  verifiedAt?: string;
  adminNotes?: string;
}

export interface BusinessProfile {
  name: string;
  tagline: string;
  logoUrl?: string;
  supportEmail: string;
  supportPhone?: string;
  defaultCurrency: string;
  defaultAmount?: number; // Fixed checkout amount set by admin
  defaultProductTitle?: string; // Product / Service title set by owner
  defaultProductDescription?: string; // Product / Service description set by owner
  adminPin: string; // Defaults to "SECRETadmin1234"
  customNotice: string;
  defaultSectionHeader?: string; // Global default bold header for review section
  allowOpenAmount?: boolean;
  verifiedMerchant: boolean;
}

export interface PaymentRequest {
  id: string;
  orderId?: string;
  invoiceId?: string;
  methodId: string;
  methodName: string;
  methodType: PaymentMethodType;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  currency: string;
  status: 'pending' | 'ready' | 'expired';
  createdAt: string;
  expiresAt: string; // ISO date string 60 seconds after createdAt
  assignedDetails?: {
    accountHandle: string;
    accountHolder: string;
    instructions: string;
    fields: PaymentField[];
    qrData?: string;
    feeNote?: string;
    bankName?: string;
    accountNumber?: string;
    sortCodeOrRouting?: string;
    swiftOrIban?: string;
  };
  adminNote?: string;
  updatedAt?: string;
}

export interface AppDataStore {
  business: BusinessProfile;
  methods: PaymentMethod[];
  invoices: PaymentInvoice[];
  proofs: PaymentProof[];
  paymentRequests?: PaymentRequest[];
}

