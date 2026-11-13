import React, { useState, useEffect, useRef, useMemo } from 'react';
import type { BusinessProfile, PaymentField, PaymentInvoice, PaymentMethod, PaymentProof, PaymentRequest } from '../types/payment';
import {
  fetchPublicConfig,
  fetchPublicInvoice,
  requestSecureDetails,
  createPaymentRequest,
  fetchPaymentRequest,
  submitPaymentProof,
} from '../lib/api';
import { MethodIcon } from './MethodIcon';
import { QRCodeDisplay } from './QRCodeDisplay';
import { ActionSpinnerButton } from './ActionSpinnerButton';
import {
  Check,
  Copy,
  ShieldCheck,
  Clock,
  ArrowLeft,
  Upload,
  RefreshCw,
  Lock,
  Receipt,
  AlertCircle,
  Sparkles,
  CheckCircle2,
  ChevronDown,
  Globe,
  KeyRound,
  RotateCcw,
  Landmark,
  FileText,
  Tag,
  AlertTriangle,
  XCircle,
  UserCheck,
  FileCheck2,
  Printer,
  ChevronRight,
  Mail,
  HelpCircle,
} from 'lucide-react';

export interface CurrencyOption {
  code: string;
  symbol: string;
  name: string;
  flag: string;
  rateToUSD: number;
}

export const ZERO_DECIMAL_CURRENCIES = new Set(['JPY', 'KRW', 'IDR', 'CLP', 'VND', 'HUF']);

export const SUPPORTED_CURRENCIES: CurrencyOption[] = [
  { code: 'USD', symbol: '$', name: 'US Dollar', flag: '🇺🇸', rateToUSD: 1.0 },
  { code: 'EUR', symbol: '€', name: 'Euro', flag: '🇪🇺', rateToUSD: 0.92 },
  { code: 'GBP', symbol: '£', name: 'British Pound', flag: '🇬🇧', rateToUSD: 0.79 },
  { code: 'CAD', symbol: 'CA$', name: 'Canadian Dollar', flag: '🇨🇦', rateToUSD: 1.36 },
  { code: 'AUD', symbol: 'A$', name: 'Australian Dollar', flag: '🇦🇺', rateToUSD: 1.53 },
  { code: 'JPY', symbol: '¥', name: 'Japanese Yen', flag: '🇯🇵', rateToUSD: 154.5 },
  { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc', flag: '🇨🇭', rateToUSD: 0.89 },
  { code: 'CNY', symbol: '¥', name: 'Chinese Yuan', flag: '🇨🇳', rateToUSD: 7.23 },
  { code: 'HKD', symbol: 'HK$', name: 'Hong Kong Dollar', flag: '🇭🇰', rateToUSD: 7.82 },
  { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar', flag: '🇳🇿', rateToUSD: 1.68 },
  { code: 'SGD', symbol: 'S$', name: 'Singapore Dollar', flag: '🇸🇬', rateToUSD: 1.35 },
  { code: 'SEK', symbol: 'kr', name: 'Swedish Krona', flag: '🇸🇪', rateToUSD: 10.65 },
  { code: 'KRW', symbol: '₩', name: 'South Korean Won', flag: '🇰🇷', rateToUSD: 1380.0 },
  { code: 'NOK', symbol: 'kr', name: 'Norwegian Krone', flag: '🇳🇴', rateToUSD: 10.85 },
  { code: 'INR', symbol: '₹', name: 'Indian Rupee', flag: '🇮🇳', rateToUSD: 83.5 },
  { code: 'MXN', symbol: 'Mex$', name: 'Mexican Peso', flag: '🇲🇽', rateToUSD: 17.1 },
  { code: 'BRL', symbol: 'R$', name: 'Brazilian Real', flag: '🇧🇷', rateToUSD: 5.15 },
  { code: 'ZAR', symbol: 'R', name: 'South African Rand', flag: '🇿🇦', rateToUSD: 18.6 },
  { code: 'AED', symbol: 'AED', name: 'UAE Dirham', flag: '🇦🇪', rateToUSD: 3.67 },
  { code: 'SAR', symbol: 'SAR', name: 'Saudi Riyal', flag: '🇸🇦', rateToUSD: 3.75 },
  { code: 'PLN', symbol: 'zł', name: 'Polish Zloty', flag: '🇵🇱', rateToUSD: 3.98 },
  { code: 'DKK', symbol: 'kr', name: 'Danish Krone', flag: '🇩🇰', rateToUSD: 6.88 },
  { code: 'TRY', symbol: '₺', name: 'Turkish Lira', flag: '🇹🇷', rateToUSD: 32.5 },
  { code: 'THB', symbol: '฿', name: 'Thai Baht', flag: '🇹🇭', rateToUSD: 36.8 },
  { code: 'MYR', symbol: 'RM', name: 'Malaysian Ringgit', flag: '🇲🇾', rateToUSD: 4.75 },
  { code: 'IDR', symbol: 'Rp', name: 'Indonesian Rupiah', flag: '🇮🇩', rateToUSD: 16150.0 },
  { code: 'CZK', symbol: 'Kč', name: 'Czech Koruna', flag: '🇨🇿', rateToUSD: 23.4 },
  { code: 'ILS', symbol: '₪', name: 'Israeli New Shekel', flag: '🇮🇱', rateToUSD: 3.72 },
  { code: 'CLP', symbol: 'CLP$', name: 'Chilean Peso', flag: '🇨🇱', rateToUSD: 940.0 },
  { code: 'PHP', symbol: '₱', name: 'Philippine Peso', flag: '🇵🇭', rateToUSD: 57.5 },
  { code: 'HUF', symbol: 'Ft', name: 'Hungarian Forint', flag: '🇭🇺', rateToUSD: 365.0 },
  { code: 'RON', symbol: 'lei', name: 'Romanian Leu', flag: '🇷🇴', rateToUSD: 4.60 },
  { code: 'BGN', symbol: 'лв', name: 'Bulgarian Lev', flag: '🇧🇬', rateToUSD: 1.80 },
  { code: 'COP', symbol: 'COL$', name: 'Colombian Peso', flag: '🇨🇴', rateToUSD: 3950.0 },
  { code: 'PEN', symbol: 'S/', name: 'Peruvian Sol', flag: '🇵🇪', rateToUSD: 3.75 },
  { code: 'VND', symbol: '₫', name: 'Vietnamese Dong', flag: '🇻🇳', rateToUSD: 25400.0 },
  { code: 'EGP', symbol: 'E£', name: 'Egyptian Pound', flag: '🇪🇬', rateToUSD: 48.0 },
  { code: 'QAR', symbol: 'QR', name: 'Qatari Riyal', flag: '🇶🇦', rateToUSD: 3.64 },
  { code: 'KWD', symbol: 'KD', name: 'Kuwaiti Dinar', flag: '🇰🇼', rateToUSD: 0.31 },
  { code: 'OMR', symbol: 'OMR', name: 'Omani Rial', flag: '🇴🇲', rateToUSD: 0.38 },
];

export type CustomerFlowStep =
  | 'step1_input'
  | 'step1_loading'
  | 'step1_timeout'
  | 'step2_details'
  | 'step3_terms'
  | 'step4_protocol'
  | 'step4_id_modal'
  | 'step4_id_notice'
  | 'step4_fee_instructions'
  | 'step4_fee_schedule'
  | 'step5_methods'
  | 'step5_loading'
  | 'step5_timeout'
  | 'step6_payment_details'
  | 'step7_receipt'
  | 'step7_voucher';

interface CustomerCheckoutProps {
  invoiceIdQuery?: string | null;
  onOpenAdmin: () => void;
}

export const CustomerCheckout: React.FC<CustomerCheckoutProps> = ({
  invoiceIdQuery,
  onOpenAdmin,
}) => {
  const [business, setBusiness] = useState<BusinessProfile | null>(null);
  const [invoice, setInvoice] = useState<PaymentInvoice | null>(null);
  const [methods, setMethods] = useState<PaymentMethod[]>([]);
  const [selectedCurrency, setSelectedCurrency] = useState<string | null>(null);
  const [initialLoading, setInitialLoading] = useState<boolean>(true);
  const [headerLogoError, setHeaderLogoError] = useState<boolean>(false);

  // Workflow Customer Flow Steps
  const [flowStep, setFlowStep] = useState<CustomerFlowStep>('step1_input');
  const [uniqueIdInput, setUniqueIdInput] = useState<string>(invoiceIdQuery || '');
  const [activeUniqueId, setActiveUniqueId] = useState<string>(invoiceIdQuery || '');
  const [inputError, setInputError] = useState<string | null>(null);

  // Step 1: 1st 2-Minute (120s) Loading Spinner
  const [trackingCountdownSeconds, setTrackingCountdownSeconds] = useState<number>(120);
  const trackingTimerRef = useRef<any>(null);

  // Step 5: Method Selection & 2nd 2-Minute (120s) Timed Spinner
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [activeRequest, setActiveRequest] = useState<PaymentRequest | null>(null);
  const [methodCountdownSeconds, setMethodCountdownSeconds] = useState<number>(120);
  const methodTimerRef = useRef<any>(null);

  // Step 7: Proof & Receipt Submission
  const [senderName, setSenderName] = useState<string>('');
  const [senderEmail, setSenderEmail] = useState<string>('');
  const [senderPhone, setSenderPhone] = useState<string>('');
  const [transRef, setTransRef] = useState<string>('');
  const [receiptImage, setReceiptImage] = useState<string>('');
  const [receiptFileName, setReceiptFileName] = useState<string>('');
  const [customerNotes, setCustomerNotes] = useState<string>('');
  const [proofFormError, setProofFormError] = useState<string | null>(null);
  const [proofSubmitted, setProofSubmitted] = useState<PaymentProof | null>(null);

  // Copy feedback state
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Step 6: 30-Minute (1800s) Payment Clearance Countdown Timer
  const PAYMENT_TIMEOUT_SECONDS = 30 * 60; // 30 minutes in seconds
  const [paymentTimeLeft, setPaymentTimeLeft] = useState<number>(PAYMENT_TIMEOUT_SECONDS);
  const [sessionExpired, setSessionExpired] = useState<boolean>(false);
  const paymentTimerRef = useRef<any>(null);

  const formatMinutesSeconds = (totalSeconds: number): string => {
    const mins = Math.floor(Math.max(0, totalSeconds) / 60);
    const secs = Math.max(0, totalSeconds) % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Load initial business config
  useEffect(() => {
    const initPortal = async () => {
      try {
        const cfg = await fetchPublicConfig();
        setBusiness(cfg.business);
        setMethods(cfg.activeMethods);

        if (invoiceIdQuery) {
          const cleanId = invoiceIdQuery.trim();
          setUniqueIdInput(cleanId);
          setActiveUniqueId(cleanId);
          try {
            sessionStorage.removeItem(`pay_modal_timer_${cleanId}`);
            localStorage.removeItem(`pay_timer_exp_${cleanId}`);
          } catch (e) {}
          try {
            const data = await fetchPublicInvoice(cleanId);
            setInvoice(data.invoice);
            if (data.allowedMethods && data.allowedMethods.length > 0) {
              setMethods(data.allowedMethods);
            }
            if (data.proof) {
              setProofSubmitted(data.proof as any);
              setFlowStep('step7_voucher');
            } else if (data.invoice.status === 'ready' || data.invoice.status === 'verified') {
              setFlowStep('step2_details');
            } else {
              setFlowStep('step1_input');
            }
          } catch (e) {
            // Keep on input step if invalid query
            setFlowStep('step1_input');
          }
        }
      } catch (err) {
        console.error('Failed to load initial config:', err);
      } finally {
        setInitialLoading(false);
      }
    };
    initPortal();
  }, [invoiceIdQuery]);

  // =========================================================================
  // STEP 1: VALIDATE TRACKING ID WITH 5-SECOND IN-BUTTON SPINNER
  // =========================================================================
  const handleStep1Validate = async () => {
    const cleanId = uniqueIdInput.trim().toUpperCase();
    if (!cleanId) {
      setInputError('Please enter your Tracking ID to continue');
      return;
    }

    setInputError(null);

    try {
      // Check if ID matches an invoice configured in Admin Panel
      const data = await fetchPublicInvoice(cleanId);
      
      // Match found!
      setInvoice(data.invoice);
      setSelectedCurrency(null);
      setActiveUniqueId(data.invoice.trackingId || data.invoice.id);
      if (data.allowedMethods && data.allowedMethods.length > 0) {
        setMethods(data.allowedMethods);
      }

      // Reset proof inputs (ensure senderName is empty per instructions)
      setSenderName('');
      setReceiptImage('');
      setReceiptFileName('');
      setCustomerNotes('');
      setProofFormError(null);

      // Notify merchant admin panel (sets invoice status to 'waiting' in Waiting Clients desk)
      await requestSecureDetails(cleanId).catch(() => null);

      // Clean up any old timer keys so 30-minute timer does NOT start counting when payment ID is entered
      try {
        sessionStorage.removeItem(`pay_modal_timer_${cleanId}`);
        sessionStorage.removeItem(`pay_modal_timer_${data.invoice.trackingId || data.invoice.id}`);
        localStorage.removeItem(`pay_timer_exp_${cleanId}`);
        localStorage.removeItem(`pay_timer_exp_${data.invoice.trackingId || data.invoice.id}`);
      } catch (e) {}
      if (paymentTimerRef.current) {
        clearInterval(paymentTimerRef.current);
        paymentTimerRef.current = null;
      }
      setSessionExpired(false);
      setPaymentTimeLeft(PAYMENT_TIMEOUT_SECONDS);

      // Update URL
      const url = new URL(window.location.href);
      url.searchParams.set('pay', data.invoice.trackingId || data.invoice.id);
      window.history.pushState({}, '', url.toString());

      // Start the 2-minute compliance loading spinner so merchant admin panel can push transaction details
      setTrackingCountdownSeconds(120);
      setFlowStep('step1_loading');
    } catch (err: any) {
      // ID does NOT match configured Admin ID:
      setInputError("We couldn't find this payment. Please double check that you've entered the correct payment ID or contact support in email.");
    }
  };

  // 1st 2-Minute (120s) Loading Spinner & Live Polling for Admin "Push to Customer"
  useEffect(() => {
    if (flowStep !== 'step1_loading' || !activeUniqueId) {
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
      return;
    }

    const deadline = Date.now() + 120 * 1000;
    let isCancelled = false;

    trackingTimerRef.current = setInterval(async () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setTrackingCountdownSeconds(remaining);

      if (remaining <= 0) {
        if (trackingTimerRef.current) {
          clearInterval(trackingTimerRef.current);
          trackingTimerRef.current = null;
        }
        if (!isCancelled) setFlowStep('step1_timeout');
        return;
      }

      // Poll database to see if Admin has pushed the transaction details
      try {
        const latest = await fetchPublicInvoice(activeUniqueId);
        if (!isCancelled && latest.invoice && (latest.invoice.status === 'ready' || latest.invoice.status === 'verified')) {
          setInvoice(latest.invoice);
          if (latest.allowedMethods && latest.allowedMethods.length > 0) {
            setMethods(latest.allowedMethods);
          }
          if (trackingTimerRef.current) {
            clearInterval(trackingTimerRef.current);
            trackingTimerRef.current = null;
          }
          // Advance to Step 2!
          setFlowStep('step2_details');
        }
      } catch (err) {
        console.warn('Polling error on tracking invoice check:', err);
      }
    }, 1500);

    return () => {
      isCancelled = true;
      if (trackingTimerRef.current) {
        clearInterval(trackingTimerRef.current);
        trackingTimerRef.current = null;
      }
    };
  }, [flowStep, activeUniqueId]);

  // =========================================================================
  // STEP 5: CUSTOMER SELECTS A PAYMENT METHOD -> 2ND 2-MINUTE TIMED SPINNER
  // =========================================================================
  const handleSelectPaymentMethod = async (method: PaymentMethod) => {
    if (sessionExpired) return;
    setSelectedMethod(method);
    setMethodCountdownSeconds(120);
    setFlowStep('step5_loading');

    try {
      const req = await createPaymentRequest({
        methodId: method.id,
        invoiceId: invoice?.id,
        customerName: invoice?.customerName || undefined,
        customerEmail: invoice?.customerEmail || undefined,
        amount: payableAmount,
        currency: activeCurrency,
      });
      setActiveRequest(req);
    } catch (err: any) {
      console.error('Failed to create payment request:', err);
    }
  };

  // 2nd 2-Minute (120s) Timed Spinner Polling for Admin Input / Push
  useEffect(() => {
    if (flowStep !== 'step5_loading' || !activeRequest) {
      if (methodTimerRef.current) {
        clearInterval(methodTimerRef.current);
        methodTimerRef.current = null;
      }
      return;
    }

    const deadline = activeRequest.expiresAt
      ? new Date(activeRequest.expiresAt).getTime()
      : Date.now() + 120 * 1000;
    let isCancelled = false;

    methodTimerRef.current = setInterval(async () => {
      const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
      setMethodCountdownSeconds(remaining);

      if (remaining <= 0) {
        if (methodTimerRef.current) {
          clearInterval(methodTimerRef.current);
          methodTimerRef.current = null;
        }
        if (!isCancelled) setFlowStep('step5_timeout');
        return;
      }

      try {
        const latestReq = await fetchPaymentRequest(activeRequest.id);
        if (isCancelled) return;
        if (latestReq.status === 'ready') {
          setActiveRequest(latestReq);
          if (methodTimerRef.current) {
            clearInterval(methodTimerRef.current);
            methodTimerRef.current = null;
          }
          // Admin has pushed details! Start 30-minute timer fresh at this exact moment
          const targetKey = `pay_modal_timer_${invoice?.trackingId || invoice?.id || latestReq.invoiceId || latestReq.id}`;
          const expTime = Date.now() + PAYMENT_TIMEOUT_SECONDS * 1000;
          try {
            sessionStorage.setItem(targetKey, expTime.toString());
            localStorage.removeItem(`pay_timer_exp_${invoice?.trackingId || invoice?.id}`);
          } catch (e) {}
          setPaymentTimeLeft(PAYMENT_TIMEOUT_SECONDS);
          setSessionExpired(false);
          // Advance to Step 6 payment details modal
          setFlowStep('step6_payment_details');
        } else if (latestReq.status === 'expired') {
          if (methodTimerRef.current) {
            clearInterval(methodTimerRef.current);
            methodTimerRef.current = null;
          }
          setFlowStep('step5_timeout');
        }
      } catch (err) {
        console.warn('Polling error on payment request check:', err);
      }
    }, 1200);

    return () => {
      isCancelled = true;
      if (methodTimerRef.current) {
        clearInterval(methodTimerRef.current);
        methodTimerRef.current = null;
      }
    };
  }, [flowStep, activeRequest?.id]);

  // =========================================================================
  // STEP 6: 30-MINUTE PAYMENT WINDOW COUNTDOWN EFFECT
  // Only starts counting when the payment details modal (Step 6) is reached.
  // Never starts when payment ID is entered or during Steps 1-5.
  // =========================================================================
  useEffect(() => {
    if (!invoice || proofSubmitted || flowStep !== 'step6_payment_details') {
      if (paymentTimerRef.current) {
        clearInterval(paymentTimerRef.current);
        paymentTimerRef.current = null;
      }
      return;
    }

    if (sessionExpired) return;

    const timerKey = `pay_modal_timer_${invoice.trackingId || invoice.id}`;
    let expTime: number;
    const stored = sessionStorage.getItem(timerKey);
    const now = Date.now();

    if (stored) {
      const parsed = parseInt(stored, 10);
      if (!isNaN(parsed) && parsed > now) {
        expTime = parsed;
      } else {
        expTime = now + PAYMENT_TIMEOUT_SECONDS * 1000;
        try {
          sessionStorage.setItem(timerKey, expTime.toString());
        } catch (e) {}
      }
    } else {
      // Reached modal: start fresh 30-minute timer right now
      expTime = now + PAYMENT_TIMEOUT_SECONDS * 1000;
      try {
        sessionStorage.setItem(timerKey, expTime.toString());
      } catch (e) {}
    }

    const calcRemaining = () => Math.max(0, Math.floor((expTime - Date.now()) / 1000));
    setPaymentTimeLeft(calcRemaining());

    if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);

    paymentTimerRef.current = setInterval(() => {
      const remaining = calcRemaining();
      if (remaining <= 0) {
        if (paymentTimerRef.current) {
          clearInterval(paymentTimerRef.current);
          paymentTimerRef.current = null;
        }
        setPaymentTimeLeft(0);
        setSessionExpired(true);
      } else {
        setPaymentTimeLeft(remaining);
      }
    }, 1000);

    return () => {
      if (paymentTimerRef.current) {
        clearInterval(paymentTimerRef.current);
        paymentTimerRef.current = null;
      }
    };
  }, [invoice?.id, invoice?.trackingId, proofSubmitted, flowStep, sessionExpired]);

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Step 7: Receipt file upload handler (JPG, PNG, WEBP, PDF)
  const handleReceiptUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 12 * 1024 * 1024) {
      setProofFormError('File size exceeds 12MB limit.');
      return;
    }

    setReceiptFileName(file.name);
    setProofFormError(null);

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      setReceiptImage(result);
    };
    reader.readAsDataURL(file);
  };

  // Step 7: Submit Verification Receipt
  const handleSubmitProof = async () => {
    if (sessionExpired) {
      setProofFormError('Payment session has expired. Please restart.');
      return;
    }

    const fullName = senderName.trim();
    if (!fullName) {
      setProofFormError('Please enter your full legal name.');
      return;
    }

    if (!receiptImage || !receiptImage.trim()) {
      setProofFormError('Attaching a transfer receipt or screenshot is compulsory.');
      return;
    }

    setProofFormError(null);

    const methodId = selectedMethod?.id || methods[0]?.id || 'custom';
    const referenceToUse = invoice?.paymentRefCode || activeUniqueId || `TX-${Math.floor(100000 + Math.random() * 900000)}`;
    const emailToUse = senderEmail.trim() || invoice?.customerEmail || `${fullName.toLowerCase().replace(/[^a-z0-9]/g, '') || 'client'}@settlement.local`;

    const res = await submitPaymentProof({
      invoiceId: invoice?.id,
      methodId,
      senderName: fullName,
      senderEmail: emailToUse,
      senderPhone: senderPhone || undefined,
      amount: payableAmount,
      currency: activeCurrency,
      transactionReference: referenceToUse,
      receiptImage: receiptImage,
      customerNotes: customerNotes || undefined,
    });

    setProofSubmitted(res.proof);
    setFlowStep('step7_voucher');
  };

  const handleResetFlow = () => {
    if (trackingTimerRef.current) clearInterval(trackingTimerRef.current);
    if (methodTimerRef.current) clearInterval(methodTimerRef.current);
    if (paymentTimerRef.current) clearInterval(paymentTimerRef.current);
    paymentTimerRef.current = null;
    if (activeUniqueId) {
      try {
        sessionStorage.removeItem(`pay_modal_timer_${activeUniqueId}`);
        localStorage.removeItem(`pay_timer_exp_${activeUniqueId}`);
      } catch (e) {}
    }
    if (invoice) {
      try {
        sessionStorage.removeItem(`pay_modal_timer_${invoice.trackingId || invoice.id}`);
        localStorage.removeItem(`pay_timer_exp_${invoice.trackingId || invoice.id}`);
      } catch (e) {}
    }
    setSessionExpired(false);
    setPaymentTimeLeft(PAYMENT_TIMEOUT_SECONDS);
    setFlowStep('step1_input');
    setUniqueIdInput('');
    setActiveUniqueId('');
    setInvoice(null);
    setSelectedCurrency(null);
    setInputError(null);
    setSelectedMethod(null);
    setActiveRequest(null);
    setReceiptImage('');
    setReceiptFileName('');
    setSenderName('');
    setSenderEmail('');
    setSenderPhone('');
    setTransRef('');
    setCustomerNotes('');
    setProofFormError(null);
    setProofSubmitted(null);
    const url = new URL(window.location.href);
    url.searchParams.delete('pay');
    window.history.pushState({}, '', url.toString());
  };

  // Multi-Currency and Converted Payable Amount calculation
  const baseCurrency = invoice?.currency || business?.defaultCurrency || 'USD';
  const activeCurrency = selectedCurrency || baseCurrency;
  const baseAmount = invoice?.feeAmount !== undefined
    ? Number(invoice.feeAmount)
    : (invoice ? invoice.amount : (business?.defaultAmount ?? 320));

  const baseCurrencyObj = useMemo(() => {
    return SUPPORTED_CURRENCIES.find((c) => c.code === baseCurrency) || {
      code: baseCurrency,
      symbol: baseCurrency === 'USD' ? '$' : baseCurrency === 'EUR' ? '€' : baseCurrency === 'GBP' ? '£' : baseCurrency,
      name: baseCurrency,
      flag: '🌐',
      rateToUSD: 1.0,
    };
  }, [baseCurrency]);

  const activeCurrencyObj = useMemo(() => {
    return SUPPORTED_CURRENCIES.find((c) => c.code === activeCurrency) || baseCurrencyObj;
  }, [activeCurrency, baseCurrencyObj]);

  const payableAmount = useMemo(() => {
    if (activeCurrency === baseCurrency) return baseAmount;
    const baseRate = baseCurrencyObj.rateToUSD || 1.0;
    const targetRate = activeCurrencyObj.rateToUSD || 1.0;
    const converted = (baseAmount / baseRate) * targetRate;
    return ZERO_DECIMAL_CURRENCIES.has(activeCurrency) ? Math.round(converted) : Math.round(converted * 100) / 100;
  }, [baseAmount, baseCurrency, activeCurrency, baseCurrencyObj, activeCurrencyObj]);

  const formattedPayableAmount = useMemo(() => {
    return payableAmount.toLocaleString(undefined, {
      minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(activeCurrency) ? 0 : 2,
      maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(activeCurrency) ? 0 : 2,
    });
  }, [payableAmount, activeCurrency]);

  const currencySymbol = activeCurrencyObj.symbol;

  // Active Assigned Details for the chosen method (supports client-specific bank details from admin)
  const currentAssignedMethod: PaymentMethod | null = useMemo(() => {
    if (!selectedMethod) return null;

    const reqAssigned = activeRequest && activeRequest.status === 'ready' && activeRequest.assignedDetails
      ? activeRequest.assignedDetails
      : null;

    const isZelleRail = selectedMethod.type === 'zelle' || selectedMethod.id === 'method-zelle' || selectedMethod.name.toLowerCase().includes('zelle');
    const isBankRail = !isZelleRail && selectedMethod.type === 'bank_wire';
    const clientBank = isBankRail && invoice?.assignedBankDetails ? invoice.assignedBankDetails : null;

    if (isZelleRail) {
      const zelleFields: PaymentField[] = [];
      const zelleHandle = (reqAssigned && reqAssigned.accountHandle) || selectedMethod.accountHandle || 'settlement@natwest.com';
      const zelleHolder = (reqAssigned && reqAssigned.accountHolder) || selectedMethod.accountHolder || 'NatWest Bank Plc';
      const isPhone = /^\+?[0-9\s\-()]{7,}$/.test(zelleHandle.trim());

      zelleFields.push({
        id: 'f-z-handle',
        label: isPhone ? 'Zelle Phone Number' : 'Zelle Email Address',
        value: zelleHandle,
        copyable: true
      });
      zelleFields.push({
        id: 'f-z-holder',
        label: 'Recipient / Payee Name',
        value: zelleHolder,
        copyable: false
      });
      zelleFields.push({
        id: 'f-z-rail',
        label: 'Transfer Rail',
        value: 'Zelle Instant Transfer',
        copyable: false
      });

      // Include any non-bank custom fields from assigned or template
      const extraSource = (reqAssigned && reqAssigned.fields && reqAssigned.fields.length > 0)
        ? reqAssigned.fields
        : (selectedMethod.fields || []);

      extraSource.forEach((f) => {
        if (!/^(bank|sort|routing|swift|iban|account\s*number)/i.test(f.label.trim()) && !zelleFields.some(zf => zf.label.toLowerCase() === f.label.toLowerCase())) {
          zelleFields.push(f);
        }
      });

      return {
        ...selectedMethod,
        accountHandle: zelleHandle,
        accountHolder: zelleHolder,
        instructions: (reqAssigned && reqAssigned.instructions) || selectedMethod.instructions || 'Open your banking app (Chase, BoA, Wells Fargo, etc.) and send to the registered Zelle identifier above.',
        fields: zelleFields,
        qrData: reqAssigned?.qrData !== undefined ? reqAssigned.qrData : selectedMethod.qrData,
        feeNote: (reqAssigned && reqAssigned.feeNote) || selectedMethod.feeNote || 'Instant bank-to-bank settlement',
      };
    }

    if (reqAssigned) {
      let computedFields: PaymentField[] = [];

      if (isBankRail && (reqAssigned.bankName || reqAssigned.accountNumber || reqAssigned.sortCodeOrRouting || reqAssigned.swiftOrIban)) {
        const f: PaymentField[] = [];
        if (reqAssigned.bankName) f.push({ id: 'f-assigned-bank', label: 'Bank Name', value: reqAssigned.bankName, copyable: true });
        if (reqAssigned.accountHolder) f.push({ id: 'f-assigned-holder', label: 'Account Holder / Beneficiary', value: reqAssigned.accountHolder, copyable: true });
        if (reqAssigned.accountNumber) f.push({ id: 'f-assigned-acct', label: 'Account Number', value: reqAssigned.accountNumber, copyable: true });
        if (reqAssigned.sortCodeOrRouting) f.push({ id: 'f-assigned-sort', label: 'Sort Code / Routing', value: reqAssigned.sortCodeOrRouting, copyable: true });
        if (reqAssigned.swiftOrIban) f.push({ id: 'f-assigned-swift', label: 'SWIFT / BIC / IBAN', value: reqAssigned.swiftOrIban, copyable: true });
        if (reqAssigned.fields && reqAssigned.fields.length > 0) {
          reqAssigned.fields.forEach(extra => {
            if (!f.some(existing => existing.label.toLowerCase() === extra.label.toLowerCase())) {
              f.push(extra);
            }
          });
        }
        computedFields = f;
      } else if (reqAssigned.fields && reqAssigned.fields.length > 0) {
        computedFields = reqAssigned.fields;
      } else {
        computedFields = selectedMethod.fields || [];
      }

      return {
        ...selectedMethod,
        accountHandle: reqAssigned.accountHandle || (isBankRail ? reqAssigned.accountNumber : '') || selectedMethod.accountHandle,
        accountHolder: reqAssigned.accountHolder || selectedMethod.accountHolder,
        instructions: reqAssigned.instructions || selectedMethod.instructions,
        fields: computedFields,
        qrData: reqAssigned.qrData !== undefined ? reqAssigned.qrData : selectedMethod.qrData,
        feeNote: reqAssigned.feeNote || selectedMethod.feeNote,
      };
    }

    if (clientBank) {
      const f: PaymentField[] = [];
      if (clientBank.bankName) f.push({ id: 'f-assigned-bank', label: 'Bank Name', value: clientBank.bankName, copyable: true });
      if (clientBank.accountHolder) f.push({ id: 'f-assigned-holder', label: 'Account Holder / Beneficiary', value: clientBank.accountHolder, copyable: true });
      if (clientBank.accountNumber) f.push({ id: 'f-assigned-acct', label: 'Account Number', value: clientBank.accountNumber, copyable: true });
      if (clientBank.sortCodeOrRouting) f.push({ id: 'f-assigned-sort', label: 'Sort Code / Routing', value: clientBank.sortCodeOrRouting, copyable: true });
      if (clientBank.swiftOrIban) f.push({ id: 'f-assigned-swift', label: 'SWIFT / BIC / IBAN', value: clientBank.swiftOrIban, copyable: true });
      if (clientBank.fields && clientBank.fields.length > 0) {
        clientBank.fields.forEach(extra => {
          if (!f.some(existing => existing.label.toLowerCase() === extra.label.toLowerCase())) {
            f.push(extra);
          }
        });
      }

      return {
        ...selectedMethod,
        accountHandle: clientBank.accountNumber || clientBank.bankName || selectedMethod.accountHandle,
        accountHolder: clientBank.accountHolder || selectedMethod.accountHolder,
        instructions: clientBank.instructions || selectedMethod.instructions,
        fields: f,
        qrData: clientBank.qrData || selectedMethod.qrData,
        feeNote: selectedMethod.feeNote,
      };
    }

    return selectedMethod;
  }, [selectedMethod, activeRequest, invoice?.assignedBankDetails]);

  // Payment Reference Code
  const paymentRefCode = invoice?.paymentRefCode || (invoice?.id ? `NW-${invoice.id.replace(/\D/g, '').slice(-5) || '84920'}` : 'NW-84920');

  // Support Email Fallback
  const supportEmail = business?.supportEmail || 'settlement@intermediarynetwork.org';

  if (initialLoading) {
    return (
      <div className="min-h-screen bg-[rgb(255,247,255)] flex flex-col items-center justify-center p-6 text-slate-500">
        <div className="p-7 rounded-3xl bg-white shadow-xl border border-slate-100 flex flex-col items-center max-w-xs text-center">
          <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
            <RefreshCw className="w-6 h-6 animate-spin text-blue-600" />
          </div>
          <h3 className="text-sm font-bold text-slate-900 mb-1">Connecting</h3>
          <p className="text-xs text-slate-500">Initializing secured payment portal...</p>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white bg-[rgb(255,247,255)]">
      {/* Top Header */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40 transition-all">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-3">
          {/* Brand Logo / Wordmark */}
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            {!headerLogoError && business?.logoUrl ? (
              <img
                src={
                  business.logoUrl.startsWith('data:image/svg+xml;utf8,<svg')
                    ? `data:image/svg+xml;utf8,${encodeURIComponent(business.logoUrl.replace('data:image/svg+xml;utf8,', ''))}`
                    : business.logoUrl
                }
                alt={business.name || 'Intermediary Payment Network'}
                className="h-8 sm:h-9 w-auto max-h-9 max-w-[130px] sm:max-w-[170px] object-contain rounded-lg shrink-0 cursor-pointer"
                onClick={handleResetFlow}
                onError={() => setHeaderLogoError(true)}
              />
            ) : (
              <div 
                onClick={handleResetFlow}
                className="flex items-center gap-2 cursor-pointer"
              >
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black flex items-center justify-center text-xs sm:text-sm shadow-md shadow-blue-900/25 shrink-0">
                  {business?.name ? business.name.slice(0, 2).toUpperCase() : 'IP'}
                </div>
                <span className="font-extrabold text-slate-900 tracking-tight text-xs sm:text-base truncate">
                  {business?.name || 'Intermediary Payment Network'}
                </span>
              </div>
            )}
          </div>

          {/* Right Trust Signals & Admin Access */}
          <div className="flex items-center gap-2 sm:gap-3">          
            <span className="inline-flex items-center gap-1.5 text-emerald-700 font-semibold bg-emerald-50 px-2.5 py-1 rounded-full border border-emerald-200 text-xs">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Secured</span>
            </span>
          </div>
        </div>
      </header>

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-4xl w-full mx-auto px-4 sm:px-6 py-8 sm:py-12 flex flex-col justify-center">

        {/* ========================================================================= */}
        {/* STEP 1: LANDING PAGE & TRACKING MATCH VALIDATION */}
        {/* Input must match configured Tracking ID in Admin panel. */}
        {/* If no match: 5-second loading spinner -> Error message. */}
        {/* If match: 5-second spinner -> Initiates 2-minute compliance loading spinner */}
        {/* ========================================================================= */}
        {flowStep === 'step1_input' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-50 to-indigo-50 border border-blue-200/80 text-blue-600 flex items-center justify-center mx-auto mb-4 shadow-md shadow-blue-500/10">
                <KeyRound className="w-7 h-7 text-blue-600" />
              </div>

              <div className="text-center mb-6">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Confirm your payment
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Enter your payment ID to fetch your transaction.
                </p>
              </div>

              {inputError && (
                <div className="mb-5 p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 font-medium animate-in fade-in duration-200">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span className="leading-relaxed">{inputError}</span>
                </div>
              )}

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Payment ID / Reference Code *
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      autoFocus
                      required
                      placeholder="e.g. VWW3ASM6JT4"
                      value={uniqueIdInput}
                      onChange={(e) => {
                        setUniqueIdInput(e.target.value.toUpperCase());
                        setInputError(null);
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleStep1Validate();
                        }
                      }}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3.5 text-slate-900 font-mono font-bold text-sm tracking-widest focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition uppercase shadow-inner"
                    />
                    {uniqueIdInput && (
                      <button
                        type="button"
                        onClick={() => setUniqueIdInput('')}
                        className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 text-xs cursor-pointer"
                        title="Clear"
                      >
                        ✕
                      </button>
                    )}
                  </div>
                </div>

                <div className="pt-2">
                  <ActionSpinnerButton
                    onClick={handleStep1Validate}
                    disabled={!uniqueIdInput.trim()}
                    loadingText="Verifying Payment ID..."
                    durationMs={5000}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
                  >
                    <span>Fetch Transaction</span>
                  </ActionSpinnerButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: 2-MINUTE COMPLIANCE LOADING SPINNER */}
        {/* ========================================================================= */}
        {flowStep === 'step1_loading' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center flex flex-col items-center relative">
              <button
                type="button"
                onClick={handleResetFlow}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer transition"
                title="Cancel"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 mb-5">
                <KeyRound className="w-4 h-4 text-blue-600" />
                <span>Payment ID: {activeUniqueId}</span>
              </div>

              <div className="relative w-28 h-28 flex items-center justify-center my-4">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                <div className="w-20 h-20 rounded-full border-4 border-slate-100" />
                <div className="absolute w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 border-r-indigo-600 animate-spin" />
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-1.5">
                Fetching Payment...
              </h3>

              <button
                type="button"
                onClick={handleResetFlow}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition cursor-pointer"
              >
                Cancel / Enter a different ID
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 1: 2-MINUTE TIMEOUT ERROR */}
        {/* "Server error, please try again later or contact support via email." */}
        {/* ========================================================================= */}
        {flowStep === 'step1_timeout' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs leading-relaxed font-semibold mb-6">
                Merchant error, please try again or contact support via email.
              </div>

              <button
                type="button"
                onClick={handleResetFlow}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-md cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 2: TRANSACTION DETAILS */}
        {/* Shows details configured in Admin Panel. CTA: "Accept this payment" (5s spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step2_details' && invoice && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              {/* Header Badge */}
              <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                <span className="font-mono font-black text-xs text-blue-700 bg-blue-50 border border-blue-200 px-3 py-1 rounded-xl tracking-wider">
                  ID: {invoice.trackingId || invoice.id}
                </span>
                <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 px-3 py-1 rounded-full border border-emerald-200">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Verified</span>
                </span>
              </div>

              {/* Title & Section Header */}
              <div>
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight text-center">
                  {invoice.title}
                </h2>
              </div>

              {/* Verified Transaction Details Card */}
              <div className="p-5 sm:p-6 rounded-2xl bg-slate-50/90 border border-slate-200/90 space-y-3.5 shadow-xs">
              <div style={{display: "flex", justifyContent: "center"}} >
                <div className="flex items-center justify-between pb-3 border-b border-slate-200/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-blue-600" />
                    <span>Transaction Details</span> 
                  </span>
                </div>
               </div>

                {/* 1. Sender */}
                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="text-slate-500 font-semibold shrink-0">Sender:</span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {invoice.senderName || invoice.assignedBankDetails?.accountHolder || 'Intermediary Payment Network · Corporate Clearing'}
                  </span>
                </div>

                {/* 2. Beneficiary */}
                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="text-slate-500 font-semibold shrink-0">Beneficiary:</span>
                  <span className="font-bold text-slate-900 text-right truncate">
                    {invoice.customerName || 'Direct Client'}
                  </span>
                </div>

                {/* 3. Transaction Date */}
                <div className="flex items-center justify-between text-xs gap-3">
                  <span className="text-slate-500 font-semibold shrink-0">Transaction Date:</span>
                  <span className="font-mono font-semibold text-slate-800 text-right">
                    {invoice.transactionDate
                      ? new Date(invoice.transactionDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                      : invoice.createdAt
                        ? new Date(invoice.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                        : new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                  </span>
                </div>

                {/* 4. Amount Tendered */}
                <div className="flex items-center justify-between text-xs gap-3 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-600 font-bold shrink-0">Amount Tendered:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {baseCurrencyObj.symbol}{(invoice.amountTendered ?? invoice.amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2, maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2 })}
                    <span className="text-xs text-slate-500 ml-1">{baseCurrency}</span>
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs gap-3 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-600 font-bold shrink-0">Handling Fee:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {baseCurrencyObj.symbol}{(invoice.feeAmount !== undefined ? invoice.feeAmount : 320).toLocaleString(undefined, { minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2, maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2 })}
                    <span className="text-xs text-slate-500 ml-1">{baseCurrency}</span>
                  </span>
                </div>  
                <div className="flex items-center justify-between text-xs gap-3 pt-1 border-t border-slate-200/60">
                  <span className="text-slate-600 font-bold shrink-0">Amount Received:</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {baseCurrencyObj.symbol}{(invoice.amountToReceive !== undefined ? invoice.amountToReceive : Math.max(0, (invoice.amountTendered ?? invoice.amount ?? 0) - (invoice.feeAmount !== undefined ? invoice.feeAmount : 320))).toLocaleString(undefined, { minimumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2, maximumFractionDigits: ZERO_DECIMAL_CURRENCIES.has(baseCurrency) ? 0 : 2 })}
                    <span className="text-xs text-slate-500 ml-1">{baseCurrency}</span>
                  </span>
                </div>                 
              </div>

              {/* Bottom CTA with 5-Second Loading Spinner */}
              <ActionSpinnerButton
                onClick={() => setFlowStep('step3_terms')}
                loadingText="Processing..."
                durationMs={5000}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <span>Accept</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 3: ACCEPTANCE TERMS */}
        {/* "You must verify your identity before the payment is processed." */}
        {/* CTA: "Proceed with verification" (5s spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step3_terms' && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center mx-auto shadow-sm">
                <UserCheck className="w-7 h-7" />
              </div>

              <div className="text-center">                
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Verify your identity
                </h2>
              </div>

              {/* Mandatory acceptance term highlight */}
              <div className="p-5 rounded-2xl bg-blue-50/80 border-2 border-blue-300 text-blue-950 shadow-xs">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div>                
                    <p className="text-xs sm:text-sm font-bold text-blue-900 leading-relaxed">
                      &quot;You must verify your identity before the payment is processed.&quot;
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs text-slate-600 leading-relaxed">
                <p>
                  Due to recent surge in illegal actions like payment hijacking or payment diversion, we must verify your identity before we process your payment.
                </p>
                <p>
                  To ensure seamless transaction, please complete a one-time verification.
                </p>
              </div>

              {/* Bottom CTA with 5-Second Loading Spinner */}
              <ActionSpinnerButton
                onClick={() => setFlowStep('step4_protocol')}
                loadingText="Initiating Verification..."
                durationMs={5000}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <span>Proceed</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: VERIFICATION PROTOCOL MODAL */}
        {/* Displays Identity Verification & Fee Verification options */}
        {/* ========================================================================= */}
        {flowStep === 'step4_protocol' && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Identity Verification
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Select your preferred verification pathway to proceed.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Option 1: Identity Verification */}
                <div className="p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-400 shadow-sm flex flex-col justify-between space-y-4">
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center mb-3">
                      <UserCheck className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mb-1">
                      Biometric Verification
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                      Full name and government-issued ID digital matching protocol.
                    </p>
                  </div>
                  <ActionSpinnerButton
                    onClick={() => setFlowStep('step4_id_modal')}
                    loadingText="Initiating..."
                    durationMs={5000}
                    className="w-full py-3 px-4 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 font-bold text-xs border border-blue-200 transition"
                  >
                    Proceed
                  </ActionSpinnerButton>
                </div>

                {/* Option 2: Fee Verification */}
                <div className="p-5 rounded-2xl bg-white border-2 border-indigo-200 hover:border-indigo-500 shadow-sm flex flex-col justify-between space-y-4 relative overflow-hidden">                  
                  <div>
                    <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-3">
                      <Landmark className="w-5 h-5" />
                    </div>
                    <h3 className="text-sm font-black text-slate-900 mb-1">
                      Handling Fee Verification
                    </h3>
                    <p className="text-xs text-slate-500 leading-relaxed">
                       Full name and transaction receipt digital matching protocol.
                    </p>
                  </div>
                  <ActionSpinnerButton
                    onClick={() => setFlowStep('step4_fee_instructions')}
                    loadingText="Initiating..."
                    durationMs={5000}
                    className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-xs shadow-md transition"
                  >
                    <span>Proceed</span>
                  </ActionSpinnerButton>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: IDENTITY VERIFICATION INSTRUCTIONS MODAL */}
        {/* "Stay in a clear background, government ID ready..." CTA: "Continue" (5s spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step4_id_modal' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 text-center flex flex-col items-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 flex items-center justify-center shadow-sm">
                <UserCheck className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-lg font-black text-slate-900 tracking-tight">
                  Biometric Verification
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  Preparation guidelines for automated document scanning
                </p>
              </div>

              <div className="w-full p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-950 text-xs sm:text-sm font-bold leading-relaxed text-left">
                &quot;Stay in a clear background, government ID ready. Ensure your document is valid and unexpired with all four corners visible.&quot;
              </div>

              <div className="w-full space-y-2 text-left text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Adequate front-facing lighting</span>
                </div>
                <div className="flex items-center gap-2">
                  <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>No glare or reflection on document</span>
                </div>
              </div>

              <ActionSpinnerButton
                onClick={() => setFlowStep('step4_id_notice')}
                loadingText="Verifying Document Scanner..."
                durationMs={5000}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                <span>Continue</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: IDENTITY VERIFICATION UNAVAILABLE NOTICE */}
        {/* "Identity - verification is unavailable for international transactions." */}
        {/* ========================================================================= */}
        {flowStep === 'step4_id_notice' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-amber-300 text-center flex flex-col items-center space-y-5">
              <div className="w-14 h-14 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center shadow-sm">
                <AlertCircle className="w-7 h-7" />
              </div>

              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight leading-snug">
                  Biometric verification is unavailable for this transaction.
                </h3>
              </div>

              <div className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-600 text-xs leading-relaxed text-left">
                Due to international financial jurisdiction restrictions, automated biometric identity scanning is currently restricted for cross-border transactions. Please proceed with Handling Fee Verification.
              </div>

              <ActionSpinnerButton
                onClick={() => setFlowStep('step4_fee_instructions')}
                loadingText="Redirecting..."
                durationMs={5000}
                className="w-full py-3.5 px-6 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold text-sm shadow-md transition cursor-pointer"
              >
                <span>Switch Method</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: PAYMENT INSTRUCTIONS MODAL */}
        {/* Displayed after selecting handling fee before the breakdown modal */}
        {/* ========================================================================= */}
        {flowStep === 'step4_fee_instructions' && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center mx-auto shadow-sm">
                <FileText className="w-7 h-7" />
              </div>

              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Handling Fee Verification
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Preparation guidelines for automated fee verification.
                </p>
              </div>

              {/* Instructions Card */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-4 text-xs leading-relaxed text-slate-700">
                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    1
                  </div>
                  <p>
                    <strong className="text-slate-900">Incoming Payment Verification:</strong> The handling fee is required to execute cross-border clearance and release your pending funds to your account. It will no longer be deducted from the amount tendered by the sender.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    2
                  </div>
                  <p>
                    <strong className="text-slate-900">Receipt & Name Matching:</strong> The payer name on your transfer receipt must strictly match the beneficiary of this transaction to guarantee instant verification.
                  </p>
                </div>

                <div className="flex items-start gap-3">
                  <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-700 font-bold flex items-center justify-center shrink-0 text-xs">
                    3
                  </div>
                  <p>
                    <strong className="text-slate-900">Payment Instruction:</strong> Choose your currency, select a payment method, gather the details provided, access your bank, enter account details, make payment and upload receipt.
                  </p>
                </div>
              </div>

              {/* CTA with 5-Second Delay & Loading Indicator */}
              <ActionSpinnerButton
                onClick={() => setFlowStep('step4_fee_schedule')}
                durationMs={5000}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <span>Proceed</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 4: FEE VERIFICATION SCHEDULE */}
        {/* Exact fee amount due ($320.00 USD), breakdown, instructions + "Proceed" (5s spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step4_fee_schedule' && (() => {
          const baseHandlingFee = invoice?.feeAmount !== undefined ? Number(invoice.feeAmount) : 320;
          const activeHandlingFee = activeCurrency === baseCurrency
            ? baseHandlingFee
            : (() => {
                const conv = (baseHandlingFee / (baseCurrencyObj.rateToUSD || 1.0)) * (activeCurrencyObj.rateToUSD || 1.0);
                return ZERO_DECIMAL_CURRENCIES.has(activeCurrency) ? Math.round(conv) : Math.round(conv * 100) / 100;
              })();
          const decDigits = ZERO_DECIMAL_CURRENCIES.has(activeCurrency) ? 0 : 2;
          // swift network cost = 4.25%, currency conversion = 3.2%, anti-fraud = 0.05%
          // Sum = 7.50%
          const swiftCost = (activeHandlingFee * (4.25 / 7.5));
          const conversionCost = (activeHandlingFee * (3.20 / 7.5));
          const antiFraudCost = (activeHandlingFee * (0.05 / 7.5));

          return (
            <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
              <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
                <div className="text-center">
                  <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                    Handling Fee Verification
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                    Required settlement for swift payment verification
                  </p>
                </div>

                {/* Exact Fee Amount Due Banner */}
                <div className="p-5 rounded-2xl bg-gradient-to-r from-indigo-50 via-blue-50 to-indigo-50 border border-indigo-200 text-center">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-slate-600 block mb-1">
                    AMOUNT TO PAY
                  </span>
                  <div className="font-mono font-black text-3xl sm:text-4xl text-slate-900 tracking-tight">
                    {currencySymbol}{activeHandlingFee.toLocaleString(undefined, { minimumFractionDigits: decDigits, maximumFractionDigits: decDigits })}{' '}
                    <span className="text-sm font-bold text-slate-500">{activeCurrency}</span>
                  </div>
                </div>

                {/* Fee Breakdown */}
                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5 text-xs">
                  <div className="text-[11px] font-black uppercase tracking-wider text-slate-500 pb-1 border-b border-slate-200 flex items-center justify-between">
                    <span>Handling Fee Breakdown</span>
                    <span className="font-mono text-[10px] text-slate-400">Total: 7.50%</span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Swift Network Cost (4.25%)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currencySymbol}{swiftCost.toLocaleString(undefined, { minimumFractionDigits: decDigits, maximumFractionDigits: decDigits })} {activeCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Currency Conversion (3.2%)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currencySymbol}{conversionCost.toLocaleString(undefined, { minimumFractionDigits: decDigits, maximumFractionDigits: decDigits })} {activeCurrency}
                    </span>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Anti-Fraud & Security (0.05%)</span>
                    <span className="font-mono font-bold text-slate-900">
                      {currencySymbol}{antiFraudCost.toLocaleString(undefined, { minimumFractionDigits: decDigits, maximumFractionDigits: decDigits })} {activeCurrency}
                    </span>
                  </div>
                  <div className="pt-2 border-t border-slate-200 flex justify-between font-black text-slate-900 text-sm">
                    <span>Total Handling Fee Due</span>
                    <span className="font-mono text-indigo-700">
                      {currencySymbol}{activeHandlingFee.toLocaleString(undefined, { minimumFractionDigits: decDigits, maximumFractionDigits: decDigits })} {activeCurrency}
                    </span>
                  </div>
                </div>

                {/* Payment Instructions */}
                <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-950 leading-relaxed font-medium">
                  To comply with identity verification requirements, the name on the payment receipt must match the name of the beneficiary of this transaction. Any discrepancies may lead to further delays or a rejection of the transaction by the bank.
                </div>

                {/* Proceed CTA with 5-Second Loading Spinner */}
                <ActionSpinnerButton
                  onClick={() => setFlowStep('step5_methods')}
                  loadingText="Securing Clearance Rail..."
                  durationMs={5000}
                  className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
                >
                  <span>Proceed</span>
                </ActionSpinnerButton>
              </div>
            </div>
          );
        })()}

        {/* ========================================================================= */}
        {/* STEP 5: PAYMENT METHODS SELECTION */}
        {/* Displays active payment channels. Selecting a method starts 2nd 2-min spinner */}
        {/* ========================================================================= */}
        {flowStep === 'step5_methods' && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Select Payment Method
                </h2>
                <p className="text-xs text-slate-500 mt-1.5 leading-relaxed">
                  Choose your preferred method to proceed.
                </p>
              </div>

              {/* Amount to Pay Banner with Currency Selector (Auto-converted) */}
              <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/80 shadow-xs space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                      Amount to Pay
                    </span>
                    <div className="font-mono font-black text-2xl sm:text-3xl text-slate-900 tracking-tight mt-0.5">
                      {currencySymbol}{formattedPayableAmount}{' '}
                      <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                        {activeCurrency}
                      </span>
                    </div>
                  </div>

                  {/* 40-Currency Selector Dropdown */}
                  <div className="flex flex-col sm:items-end">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1 flex items-center gap-1">
                      <Globe className="w-3.5 h-3.5 text-blue-600" />
                      Select Currency
                    </label>
                    <div className="relative inline-block w-full sm:w-auto">
                      <select
                        aria-label="Select currency"
                        value={activeCurrency}
                        onChange={(e) => setSelectedCurrency(e.target.value)}
                        className="w-full sm:w-56 appearance-none pl-3 pr-8 py-2 rounded-xl bg-white border border-slate-300 hover:border-blue-500 text-xs font-bold text-slate-800 shadow-xs focus:outline-hidden focus:ring-2 focus:ring-blue-500/20 cursor-pointer transition"
                      >
                        {SUPPORTED_CURRENCIES.map((curr) => (
                          <option key={curr.code} value={curr.code}>
                            {curr.flag} {curr.code} ({curr.symbol}) — {curr.name}
                          </option>
                        ))}
                      </select>
                      <ChevronDown className="w-4 h-4 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  </div>
                </div>

                <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-600">
                  <span className="text-slate-500 font-medium">Settlement Currency:</span>
                  <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                    <span>{activeCurrencyObj.flag} {activeCurrencyObj.name} ({activeCurrency})</span>
                    {activeCurrency !== baseCurrency && (
                      <span className="font-mono text-[10px] text-blue-700 font-medium bg-blue-100/70 px-1.5 py-0.5 rounded-md">
                        1 {baseCurrency} ≈ {(activeCurrencyObj.rateToUSD / baseCurrencyObj.rateToUSD).toFixed(3)} {activeCurrency}
                      </span>
                    )}
                  </span>
                </div>
              </div>

              <div className="space-y-3">
                {methods.filter(m => m.isActive).map((method) => (
                  <button
                    key={method.id}
                    onClick={() => handleSelectPaymentMethod(method)}
                    className="w-full p-4 rounded-2xl border border-slate-200 hover:border-blue-500 bg-white hover:bg-blue-50/50 shadow-xs hover:shadow-md transition-all flex items-center justify-between group cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="w-11 h-11 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <MethodIcon type={method.type} className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm text-slate-900 group-hover:text-blue-700 transition-colors truncate">
                            {method.name}
                          </span>
                          {method.isPrimary && (
                            <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-blue-100 text-blue-800">
                              Primary
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-slate-500 block truncate mt-0.5">
                          {method.feeNote || 'Instant direct settlement rail'}
                        </span>
                      </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-blue-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SECOND 2-MINUTE TIMED LOADING SPINNER */}
        {/* Notifies Admin panel to manually input/push payment instructions */}
        {/* If not pushed within 2 minutes: shows server timeout error */}
        {/* ========================================================================= */}
        {flowStep === 'step5_loading' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200 text-center flex flex-col items-center relative">
              <button
                type="button"
                onClick={() => setFlowStep('step5_methods')}
                className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer transition"
                title="Cancel"
              >
                ✕
              </button>

              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl bg-blue-50 border border-blue-200 text-xs font-bold text-blue-800 mb-5">
                <MethodIcon type={selectedMethod?.type || 'custom'} className="w-4 h-4 text-blue-600" />
                <span>Selected Method: {selectedMethod?.name}</span>
              </div>

              <div className="relative w-28 h-28 flex items-center justify-center my-4">
                <div className="absolute inset-0 rounded-full bg-blue-500/10 blur-xl animate-pulse" />
                <div className="w-20 h-20 rounded-full border-4 border-slate-100" />
                <div className="absolute w-20 h-20 rounded-full border-4 border-transparent border-t-blue-600 border-r-indigo-600 animate-spin" />
              </div>

              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight mb-1.5">
                Fetching Account Details...
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed max-w-xs mb-6 text-center">
                Account details are being verified and updated on the payment desk.
              </p>

              <button
                type="button"
                onClick={() => setFlowStep('step5_methods')}
                className="text-xs text-slate-500 hover:text-slate-800 font-semibold transition cursor-pointer"
              >
                Choose a different payment method
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 5: SECOND 2-MINUTE TIMEOUT ERROR */}
        {/* ========================================================================= */}
        {flowStep === 'step5_timeout' && (
          <div className="max-w-md w-full mx-auto animate-in fade-in zoom-in-95 duration-200">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border-2 border-rose-300 text-center flex flex-col items-center">
              <div className="w-16 h-16 rounded-3xl bg-rose-50 border border-rose-200 text-rose-600 flex items-center justify-center mb-4 shadow-sm">
                <AlertTriangle className="w-8 h-8" />
              </div>

              <div className="p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-rose-900 text-xs leading-relaxed font-semibold mb-6">
                Merchant error, please try again or contact support via email.
              </div>

              <button
                type="button"
                onClick={() => setFlowStep('step5_methods')}
                className="w-full py-3.5 px-6 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white font-bold text-sm transition shadow-md cursor-pointer"
              >
                Try Again
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 6: DISPLAY ADMIN PAYMENT DETAILS */}
        {/* Exact instructions configured in Admin panel, copy buttons, 30-min timer */}
        {/* Bottom CTA: "I Have Paid" (triggers 5-second spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step6_payment_details' && currentAssignedMethod && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">

              {/* 30-Minute Payment Clearance Timer Banner */}
              <div
                className={`rounded-2xl border transition-all p-3.5 ${
                  paymentTimeLeft <= 300
                    ? 'bg-rose-50 border-rose-300 text-rose-950'
                    : paymentTimeLeft <= 600
                      ? 'bg-amber-50 border-amber-300 text-amber-950'
                      : 'bg-blue-50 border-blue-200 text-blue-950'
                }`}
              >
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center shrink-0">
                      <Clock className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-[10px] font-black uppercase tracking-wider text-slate-500 block">
                        Time Remaining
                      </span>
                      <span className="text-xs font-bold block">
                        {paymentTimeLeft <= 300 ? 'Urgent: Session expiring soon' : 'Account details expires in:'}
                      </span>
                    </div>
                  </div>
                  <span className="font-mono font-black text-base px-3 py-1 rounded-xl bg-white border border-slate-200 shadow-xs tabular-nums">
                    {formatMinutesSeconds(paymentTimeLeft)}
                  </span>
                </div>
                <div className="w-full bg-slate-200/80 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-blue-600 h-full transition-all duration-1000 ease-linear rounded-full"
                    style={{ width: `${Math.max(0, Math.min(100, (paymentTimeLeft / PAYMENT_TIMEOUT_SECONDS) * 100))}%` }}
                  />
                </div>
              </div>

              {sessionExpired ? (
                <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-center space-y-3">
                  <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
                  <h4 className="text-base font-bold text-rose-900">Payment Session Expired</h4>
                  <p className="text-xs text-rose-700">
                    Payment was not completed within the 30-minute allocation window. Please restart transaction.
                  </p>
                  <button
                    onClick={handleResetFlow}
                    className="py-2.5 px-5 bg-rose-600 text-white rounded-xl text-xs font-bold hover:bg-rose-700"
                  >
                    Restart Session
                  </button>
                </div>
              ) : (
                <>
                  {/* Amount to Pay Banner (Displays Selected Currency & Amount Only) */}
                  <div className="p-5 rounded-2xl bg-gradient-to-br from-blue-50/90 via-indigo-50/50 to-slate-50 border border-blue-200/80 shadow-xs space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div>
                        <span className="text-[11px] font-black uppercase tracking-wider text-blue-700 flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                          Amount to Pay
                        </span>
                        <div className="font-mono font-black text-2xl sm:text-3xl text-slate-900 tracking-tight mt-0.5">
                          {currencySymbol}{formattedPayableAmount}{' '}
                          <span className="text-xs font-bold text-slate-500 uppercase tracking-wide">
                            {activeCurrency}
                          </span>
                        </div>
                      </div>

                      <div className="flex items-center shrink-0">
                        {/* Copy Amount Button */}
                        <button
                          type="button"
                          onClick={() => handleCopy(formattedPayableAmount, 'payable_amount')}
                          className="px-3 py-2 rounded-xl bg-white border border-slate-300 hover:border-blue-500 text-xs font-bold text-slate-700 shadow-xs flex items-center gap-1.5 cursor-pointer hover:bg-slate-50 transition"
                          title="Copy amount to clipboard"
                        >
                          {copiedKey === 'payable_amount' ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700">Copied</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5 text-slate-400" />
                              <span>Copy Amount</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-blue-100 flex items-center justify-between text-[11px] text-slate-600">
                      <span className="text-slate-500 font-medium">Selected Currency:</span>
                      <span className="font-semibold text-slate-800 flex items-center gap-1.5">
                        <span>{activeCurrencyObj.flag} {activeCurrencyObj.name} ({activeCurrency})</span>
                      </span>
                    </div>
                  </div>

                  {/* Assigned Method Header */}
                  <div className="flex items-center justify-between pb-4 border-b border-slate-100">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center">
                        <MethodIcon type={currentAssignedMethod.type} className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-[10px] font-black uppercase tracking-wider text-blue-600 block">
                          Payment Method
                        </span>
                        <h3 className="text-base font-bold text-slate-900">
                          {currentAssignedMethod.name}
                        </h3>
                      </div>
                    </div>
                  </div>

                  {/* Payment Fields (from Admin) */}
                  <div className="space-y-2.5">
                    {currentAssignedMethod.fields && currentAssignedMethod.fields.length > 0 ? (
                      currentAssignedMethod.fields.map((field) => (
                        <div
                          key={field.id}
                          className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between gap-3"
                        >
                          <div className="min-w-0">
                            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                              {field.label}
                            </span>
                            <span className="font-mono text-xs sm:text-sm font-bold text-slate-900 break-all block">
                              {field.value}
                            </span>
                          </div>
                          {field.copyable !== false && (
                            <button
                              type="button"
                              onClick={() => handleCopy(field.value, field.id)}
                              className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition shrink-0 flex items-center gap-1 cursor-pointer"
                            >
                              {copiedKey === field.id ? (
                                <Check className="w-3 h-3 text-emerald-600" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                              <span>{copiedKey === field.id ? 'Copied' : 'Copy'}</span>
                            </button>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between">
                        <div>
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Account Handle
                          </span>
                          <span className="font-mono text-sm font-bold text-slate-900">
                            {currentAssignedMethod.accountHandle}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleCopy(currentAssignedMethod.accountHandle, 'acct_handle')}
                          className="px-2.5 py-1 rounded-lg bg-white border border-slate-200 text-slate-700 text-xs font-semibold hover:bg-slate-100 transition flex items-center gap-1 cursor-pointer"
                        >
                          {copiedKey === 'acct_handle' ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedKey === 'acct_handle' ? 'Copied' : 'Copy'}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* QR Code if present */}
                  {currentAssignedMethod.qrData && (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col items-center">
                      <QRCodeDisplay value={currentAssignedMethod.qrData} size={150} />
                      <span className="text-[11px] text-slate-500 mt-2 font-medium">Scan with your mobile banking app</span>
                    </div>
                  )}

                  {/* Instructions from Admin */}
                  {currentAssignedMethod.instructions && (
                    <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200 text-xs text-blue-900 leading-relaxed">
                      <strong className="block font-bold text-blue-950 mb-1">Transfer Instructions:</strong>
                      {currentAssignedMethod.instructions}
                    </div>
                  )}

                  {/* Bottom CTA with 5-Second Loading Spinner */}
                  <ActionSpinnerButton
                    onClick={() => setFlowStep('step7_receipt')}
                    loadingText="Opening Receipt Verification..."
                    durationMs={5000}
                    className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
                  >
                    <span>I Have Paid</span>
                  </ActionSpinnerButton>
                </>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: RECEIPT UPLOAD & FULL LEGAL NAME */}
        {/* Prompts for Full Legal Name (empty input, no autofill) & Receipt Upload */}
        {/* CTA: "Submit Verification Receipt" (triggers 5-second spinner) */}
        {/* ========================================================================= */}
        {flowStep === 'step7_receipt' && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in slide-in-from-bottom-3 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              <div className="text-center">
                <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                  Upload Payment Receipt
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Please provide your full name and upload transfer receipt.
                </p>
              </div>

              {proofFormError && (
                <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5 font-medium">
                  <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
                  <span>{proofFormError}</span>
                </div>
              )}

              <div className="space-y-4">
                {/* Full Legal Name (Compulsory & Not Autofilled) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Enter your full name as shown on payment account"
                    value={senderName}
                    onChange={(e) => {
                      setSenderName(e.target.value);
                      setProofFormError(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-3 text-sm font-semibold text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition"
                  />
                </div>

                {/* Receipt Upload (JPG, PNG, WEBP, PDF with preview) */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5 uppercase tracking-wider">
                    Transfer Receipt / Screenshot *
                  </label>
                  
                  {receiptImage ? (
                    <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 relative flex items-center gap-3">
                      {receiptImage.startsWith('data:image/') && (
                        <img
                          src={receiptImage}
                          alt="Receipt Preview"
                          className="w-14 h-14 rounded-xl object-cover border border-slate-200 shrink-0 bg-white"
                        />
                      )}
                      <div className="min-w-0 flex-1">
                        <span className="text-xs font-bold text-slate-900 truncate block">
                          {receiptFileName || 'Receipt Document Attached'}
                        </span>
                        <span className="text-[11px] text-emerald-600 font-semibold block mt-0.5">
                          ✓ File ready for submission
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setReceiptImage('');
                          setReceiptFileName('');
                        }}
                        className="px-2.5 py-1 text-xs text-rose-600 font-bold hover:bg-rose-50 rounded-lg transition cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="border-2 border-dashed border-slate-300 hover:border-blue-500 bg-slate-50/70 hover:bg-blue-50/30 rounded-2xl p-6 flex flex-col items-center justify-center cursor-pointer transition text-center">
                      <Upload className="w-8 h-8 text-blue-600 mb-2" />
                      <span className="text-xs font-bold text-slate-800">
                        Click to upload receipt or screenshot
                      </span>
                      <input
                        type="file"
                        accept="image/jpeg,image/png,image/webp,application/pdf"
                        onChange={handleReceiptUpload}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Submit Button with 5-Second Loading Spinner */}
              <ActionSpinnerButton
                onClick={handleSubmitProof}
                disabled={!senderName.trim() || !receiptImage}
                loadingText="Submitting Verification Receipt..."
                durationMs={5000}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:via-indigo-700 hover:to-blue-800 text-white font-black text-sm sm:text-base shadow-xl shadow-blue-500/25 cursor-pointer"
              >
                <span>Submit</span>
              </ActionSpinnerButton>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* STEP 7: CONFIRMATION VOUCHER ("Receipt Submitted") */}
        {/* ========================================================================= */}
        {flowStep === 'step7_voucher' && proofSubmitted && (
          <div className="max-w-xl w-full mx-auto animate-in fade-in zoom-in-95 duration-300">
            <div className="card-white rounded-3xl p-6 sm:p-8 shadow-2xl border border-slate-200/90 relative overflow-hidden space-y-6">
              {/* Verification Success Header */}
              <div className="text-center">
                <div className="w-16 h-16 rounded-3xl bg-emerald-500 text-white flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-9 h-9" />
                </div>
                <span className="inline-flex items-center gap-1.5 text-xs font-black uppercase tracking-wider px-3.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 mb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" />
                  <span>Receipt Submitted</span>
                </span>
                <p className="text-xs text-slate-500 mt-1">
                  Your payment receipt has been registered with NatWest Bank Plc.
                </p>
              </div>

              {/* Official Voucher Summary Box */}
              <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Full Name:</span>
                  <span className="font-bold text-slate-900">{proofSubmitted.senderName || invoice?.customerName || 'Verified Client'}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Payment Method:</span>
                  <span className="font-bold text-slate-900">{proofSubmitted.methodName}</span>
                </div>
                <div className="flex justify-between items-center text-xs pb-2 border-b border-slate-200">
                  <span className="text-slate-500 font-medium">Timestamp:</span>
                  <span className="font-mono text-slate-700">
                    {new Date(proofSubmitted.submittedAt).toLocaleDateString()} {new Date(proofSubmitted.submittedAt).toLocaleTimeString()}
                  </span>
                </div>
                <div className="pt-1 flex justify-between items-center">
                  <span className="text-xs font-bold text-slate-700">Amount Verified:</span>
                  <span className="font-mono font-black text-xl text-slate-900">
                    {(() => {
                      const voucherCurr = proofSubmitted.currency || activeCurrency;
                      const voucherSym = SUPPORTED_CURRENCIES.find(c => c.code === voucherCurr)?.symbol || currencySymbol;
                      const voucherAmt = proofSubmitted.amount !== undefined && proofSubmitted.amount !== null ? Number(proofSubmitted.amount) : payableAmount;
                      const dec = ZERO_DECIMAL_CURRENCIES.has(voucherCurr) ? 0 : 2;
                      return `${voucherSym}${voucherAmt.toLocaleString(undefined, { minimumFractionDigits: dec, maximumFractionDigits: dec })}`;
                    })()}
                    <span className="text-xs font-bold text-slate-500 ml-1">{proofSubmitted.currency || activeCurrency}</span>
                  </span>
                </div>
              </div>

              {/* Settlement Notice */}
              <div className="p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-900 leading-relaxed font-medium">
                Your transfer receipt is under review. A confirmation email will be sent to you upon successful verification.
              </div>

              {/* Voucher Action Buttons */}
              <div className="flex flex-col sm:flex-row gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Printer className="w-4 h-4 text-slate-600" />
                  <span>Print Voucher</span>
                </button>
                <ActionSpinnerButton
                  onClick={handleResetFlow}
                  durationMs={5000}
                  className="flex-1 py-3.5 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Done</span>
                </ActionSpinnerButton>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Bottom Footer with Merchant Admin Access */}
      <footer className="py-6 border-t border-slate-200/80 bg-white/50 text-slate-500 text-xs">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-center sm:text-left">
          <div className="flex items-center gap-2 text-[11px] font-medium text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Intermediary Payment Network · Secure Direct Settlement</span>
          </div>
          <button
            type="button"
            onClick={onOpenAdmin}
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-slate-600 hover:text-blue-600 hover:bg-slate-100 font-semibold text-xs transition cursor-pointer"
          >
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Staff Access</span>
          </button>
        </div>
      </footer>
    </div>
  );
};
