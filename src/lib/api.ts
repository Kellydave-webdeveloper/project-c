import type { AppDataStore, BusinessProfile, PaymentInvoice, PaymentMethod, PaymentProof, PaymentRequest } from '../types/payment';

const ADMIN_PIN_KEY = 'paydirect_admin_pin';

export function getStoredAdminPin(): string | null {
  return localStorage.getItem(ADMIN_PIN_KEY);
}

export function setStoredAdminPin(pin: string): void {
  localStorage.setItem(ADMIN_PIN_KEY, pin);
}

export function removeStoredAdminPin(): void {
  localStorage.removeItem(ADMIN_PIN_KEY);
}

// Public API
export async function fetchPublicConfig(): Promise<{
  business: BusinessProfile;
  activeMethods: PaymentMethod[];
  availableMethodsCount: number;
  timestamp: string;
}> {
  const res = await fetch('/api/public/config');
  if (!res.ok) throw new Error('Failed to fetch payment portal config');
  return res.json();
}

export async function fetchPublicInvoice(invoiceId: string): Promise<{
  business: BusinessProfile;
  invoice: PaymentInvoice;
  allowedMethods: PaymentMethod[];
  proof: {
    id: string;
    methodName: string;
    submittedAt: string;
    status: 'pending' | 'verified' | 'rejected';
    transactionReference: string;
  } | null;
}> {
  const res = await fetch(`/api/public/invoices/${encodeURIComponent(invoiceId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Invoice not found');
  }
  return res.json();
}

export async function requestSecureDetails(uniqueId: string): Promise<{ success: boolean; invoice: PaymentInvoice }> {
  const res = await fetch(`/api/public/invoices/${encodeURIComponent(uniqueId)}/request-details`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to request secure payment details');
  }
  return res.json();
}

export async function submitPaymentProof(data: {
  invoiceId?: string;
  methodId: string;
  senderName: string;
  senderEmail: string;
  senderPhone?: string;
  amount: number;
  currency?: string;
  transactionReference: string;
  receiptImage?: string;
  customerNotes?: string;
}): Promise<{ success: boolean; proof: PaymentProof }> {
  const res = await fetch('/api/public/submit-proof', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to submit payment proof');
  }
  return res.json();
}

export async function fetchProofStatus(proofId: string): Promise<PaymentProof> {
  const res = await fetch(`/api/public/proof/${encodeURIComponent(proofId)}`);
  if (!res.ok) throw new Error('Proof not found');
  return res.json();
}

// Admin API
function getAdminHeaders(): HeadersInit {
  const pin = getStoredAdminPin();
  return {
    'Content-Type': 'application/json',
    'x-admin-pin': pin || '',
  };
}

export async function verifyAdminAuth(pin: string): Promise<boolean> {
  const res = await fetch('/api/admin/auth', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ pin }),
  });
  if (!res.ok) return false;
  const data = await res.json();
  if (data.success) {
    setStoredAdminPin(pin);
    return true;
  }
  return false;
}

export async function fetchAdminData(): Promise<AppDataStore> {
  const res = await fetch('/api/admin/data', {
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    if (res.status === 401) {
      removeStoredAdminPin();
      throw new Error('Unauthorized');
    }
    throw new Error('Failed to load admin data');
  }
  return res.json();
}

export async function updateAdminBusiness(updates: Partial<BusinessProfile>): Promise<BusinessProfile> {
  const res = await fetch('/api/admin/business', {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update business settings');
  }
  const data = await res.json();
  if (updates.adminPin) {
    setStoredAdminPin(updates.adminPin);
  }
  return data.business;
}

export async function createPaymentMethod(method: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const res = await fetch('/api/admin/methods', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(method),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create payment method');
  }
  const data = await res.json();
  return data.method;
}

export async function updatePaymentMethod(id: string, updates: Partial<PaymentMethod>): Promise<PaymentMethod> {
  const res = await fetch(`/api/admin/methods/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update payment method');
  }
  const data = await res.json();
  return data.method;
}

export async function togglePaymentMethod(
  id: string,
  action: 'toggleActive' | 'setPrimary' | 'duplicate'
): Promise<PaymentMethod> {
  const res = await fetch(`/api/admin/methods/${encodeURIComponent(id)}/toggle`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ action }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update method');
  }
  const data = await res.json();
  return data.method;
}

export async function deletePaymentMethod(id: string): Promise<void> {
  const res = await fetch(`/api/admin/methods/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete payment method');
  }
}

export async function createPaymentInvoice(invoice: Partial<PaymentInvoice>): Promise<PaymentInvoice> {
  const res = await fetch('/api/admin/invoices', {
    method: 'POST',
    headers: getAdminHeaders(),
    body: JSON.stringify(invoice),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to create invoice');
  }
  const data = await res.json();
  return data.invoice;
}

export async function deletePaymentInvoice(id: string): Promise<void> {
  const res = await fetch(`/api/admin/invoices/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete invoice');
  }
}

export async function updatePaymentInvoice(
  id: string,
  updates: Partial<PaymentInvoice>
): Promise<PaymentInvoice> {
  const res = await fetch(`/api/admin/invoices/${encodeURIComponent(id)}`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update invoice');
  }
  const data = await res.json();
  return data.invoice;
}

export async function pushUniqueIdDetails(
  id: string,
  payload: {
    amount: number;
    currency?: string;
    bankDetails?: {
      methodId?: string;
      bankName?: string;
      accountHolder?: string;
      accountNumber?: string;
      sortCodeOrRouting?: string;
      swiftOrIban?: string;
      instructions?: string;
      accountHandle?: string;
      fields?: { id: string; label: string; value: string; copyable?: boolean }[];
      qrData?: string;
    };
    paymentRefCode?: string;
    headerText?: string;
    title?: string;
    description?: string;
    customerName?: string;
    senderName?: string;
    feeAmount?: number;
    amountTendered?: number;
    amountToReceive?: number;
    transactionDate?: string;
  }
): Promise<PaymentInvoice> {
  const res = await fetch(`/api/admin/invoices/${encodeURIComponent(id)}/push-details`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to push payment details to customer');
  }
  const data = await res.json();
  return data.invoice;
}

export async function updateProofStatus(
  id: string,
  status: 'verified' | 'rejected',
  adminNotes?: string
): Promise<PaymentProof> {
  const res = await fetch(`/api/admin/proofs/${encodeURIComponent(id)}/status`, {
    method: 'PATCH',
    headers: getAdminHeaders(),
    body: JSON.stringify({ status, adminNotes }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to update proof status');
  }
  const data = await res.json();
  return data.proof;
}

// Payment Requests (60s Dynamic Assignment API)
export async function createPaymentRequest(data: {
  methodId: string;
  invoiceId?: string;
  customerName?: string;
  customerEmail?: string;
  amount?: number;
  currency?: string;
}): Promise<PaymentRequest> {
  const res = await fetch('/api/public/payment-requests', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to initiate payment request');
  }
  const body = await res.json();
  return body.request;
}

export async function fetchPaymentRequest(requestId: string): Promise<PaymentRequest> {
  const res = await fetch(`/api/public/payment-requests/${encodeURIComponent(requestId)}`);
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to fetch payment request');
  }
  const body = await res.json();
  return body.request;
}

export async function fetchAdminPaymentRequests(): Promise<PaymentRequest[]> {
  const res = await fetch('/api/admin/payment-requests', {
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    throw new Error('Failed to fetch admin payment requests');
  }
  const body = await res.json();
  return body.requests || [];
}

export async function assignPaymentRequestDetails(
  id: string,
  details: {
    accountHandle?: string;
    accountHolder?: string;
    instructions?: string;
    fields?: PaymentRequest['assignedDetails'] extends { fields: infer F } ? F : any;
    qrData?: string;
    feeNote?: string;
    adminNote?: string;
    bankName?: string;
    accountNumber?: string;
    sortCodeOrRouting?: string;
    swiftOrIban?: string;
  }
): Promise<PaymentRequest> {
  const res = await fetch(`/api/admin/payment-requests/${encodeURIComponent(id)}/assign`, {
    method: 'PUT',
    headers: getAdminHeaders(),
    body: JSON.stringify(details),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to assign payment details');
  }
  const body = await res.json();
  return body.request;
}

export async function deletePaymentRequest(id: string): Promise<void> {
  const res = await fetch(`/api/admin/payment-requests/${encodeURIComponent(id)}`, {
    method: 'DELETE',
    headers: getAdminHeaders(),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || 'Failed to delete payment request');
  }
}
