import React, { useState, useEffect, useRef } from 'react';
import type { AppDataStore, PaymentMethod, PaymentInvoice, PaymentProof, PaymentMethodType, BusinessProfile, PaymentRequest } from '../types/payment';
import {
  fetchAdminData,
  verifyAdminAuth,
  updateAdminBusiness,
  createPaymentMethod,
  updatePaymentMethod,
  togglePaymentMethod,
  deletePaymentMethod,
  createPaymentInvoice,
  updatePaymentInvoice,
  deletePaymentInvoice,
  pushUniqueIdDetails,
  updateProofStatus,
  removeStoredAdminPin,
  fetchAdminPaymentRequests,
  assignPaymentRequestDetails,
  deletePaymentRequest,
} from '../lib/api';
import { MethodIcon } from './MethodIcon';
import {
  Lock,
  Unlock,
  KeyRound,
  Plus,
  Edit2,
  Trash2,
  Copy,
  Check,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
  Sliders,
  DollarSign,
  Receipt,
  Eye,
  ArrowLeft,
  ToggleLeft,
  ToggleRight,
  Link as LinkIcon,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRightLeft,
  ShieldCheck,
  Menu,
  Bell,
  Volume2,
  VolumeX,
  Send,
  Zap,
  AlertTriangle,
  Landmark,
  Building2,
  CreditCard,
  Hash,
  Coins,
  Globe,
  Radio,
  FileText,
  ArrowUpRight,
} from 'lucide-react';

interface AdminPortalProps {
  onBackToCustomer: () => void;
  onOpenInvoicePreview: (invoiceId: string) => void;
}

export const AdminPortal: React.FC<AdminPortalProps> = ({
  onBackToCustomer,
  onOpenInvoicePreview,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState<boolean>(false);

  // App data store
  const [store, setStore] = useState<AppDataStore | null>(null);
  const [dataLoading, setDataLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<'waiting' | 'invoices' | 'methods' | 'requests' | 'proofs' | 'settings'>('waiting');

  // Push to Customer State (Workflow Step 4)
  const [showPushModal, setShowPushModal] = useState<boolean>(false);
  const [selectedInvoiceForPush, setSelectedInvoiceForPush] = useState<PaymentInvoice | null>(null);
  const [pushSubmitting, setPushSubmitting] = useState<boolean>(false);
  const [pushFormData, setPushFormData] = useState<{
    invoiceId: string;
    amount: string;
    currency: string;
    title: string;
    headerText: string;
    customerName: string;
    description: string;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    sortCodeOrRouting: string;
    swiftOrIban: string;
    instructions: string;
    paymentRefCode: string;
    selectedPresetMethodId: string;
    senderName: string;
    feeAmount: string;
    amountTendered: string;
    amountToReceive: string;
    transactionDate: string;
  }>({
    invoiceId: '',
    amount: '',
    currency: 'USD',
    title: '',
    headerText: 'International Payment Summary',
    customerName: '',
    description: '',
    bankName: 'National Westminster Bank Plc (NatWest)',
    accountHolder: 'NatWest Bank Plc',
    accountNumber: '84920491',
    sortCodeOrRouting: '60-00-01',
    swiftOrIban: 'NWBKGB2L',
    instructions: 'Please transfer via UK Faster Payments or BACS quoting your reference code.',
    paymentRefCode: 'NW-84920',
    selectedPresetMethodId: '',
    senderName: 'Intermediary Payment Network · Corporate Clearing',
    feeAmount: '320.00',
    amountTendered: '250.00',
    amountToReceive: '250.00',
    transactionDate: new Date().toISOString().split('T')[0],
  });
  const knownWaitingTimestampsRef = useRef<Map<string, string>>(new Map());

  // Live Payment Requests State (60s countdown assignment)
  const [paymentRequests, setPaymentRequests] = useState<PaymentRequest[]>([]);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);
  const [selectedRequestForAssign, setSelectedRequestForAssign] = useState<PaymentRequest | null>(null);
  const [showAssignModal, setShowAssignModal] = useState<boolean>(false);
  const [assignFormData, setAssignFormData] = useState<{
    accountHandle: string;
    accountHolder: string;
    instructions: string;
    bankName: string;
    accountNumber: string;
    sortCodeOrRouting: string;
    swiftOrIban: string;
    fields: { id: string; label: string; value: string; copyable?: boolean }[];
    qrData: string;
    feeNote: string;
    adminNote: string;
  }>({
    accountHandle: '',
    accountHolder: '',
    instructions: '',
    bankName: '',
    accountNumber: '',
    sortCodeOrRouting: '',
    swiftOrIban: '',
    fields: [],
    qrData: '',
    feeNote: 'Direct Settlement',
    adminNote: '',
  });
  const [assignSubmitting, setAssignSubmitting] = useState<boolean>(false);
  const knownRequestIdsRef = useRef<Set<string>>(new Set());

  // Copy feedback
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Notification banner
  const [actionMessage, setActionMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Method Modal state (Create / Edit)
  const [showMethodModal, setShowMethodModal] = useState<boolean>(false);
  const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
  const [methodFormData, setMethodFormData] = useState<{
    name: string;
    type: PaymentMethodType;
    accountHandle: string;
    accountHolder: string;
    instructions: string;
    feeNote: string;
    qrData: string;
    isActive: boolean;
    isPrimary: boolean;
    category: 'digital' | 'bank' | 'crypto' | 'other';
    bankName: string;
    accountNumber: string;
    sortCodeOrRouting: string;
    swiftOrIban: string;
    fields: { id: string; label: string; value: string; copyable?: boolean }[];
  }>({
    name: '',
    type: 'bank_wire',
    accountHandle: '',
    accountHolder: '',
    instructions: '',
    feeNote: 'Zero merchant fee',
    qrData: '',
    isActive: true,
    isPrimary: false,
    category: 'bank',
    bankName: '',
    accountNumber: '',
    sortCodeOrRouting: '',
    swiftOrIban: '',
    fields: [],
  });

  // Invoice Modal state
  const [showInvoiceModal, setShowInvoiceModal] = useState<boolean>(false);
  const [editingInvoice, setEditingInvoice] = useState<PaymentInvoice | null>(null);
  const [invoiceFormData, setInvoiceFormData] = useState<{
    trackingId: string;
    headerText: string;
    title: string;
    description: string;
    amount: string;
    currency: string;
    customerName: string;
    customerEmail: string;
    dueDate: string;
    allowedMethodIds: string[];
    customDetailsEnabled: boolean;
    bankName: string;
    accountHolder: string;
    accountNumber: string;
    sortCodeOrRouting: string;
    swiftOrIban: string;
    instructions: string;
    paymentRefCode: string;
  }>({
    trackingId: '',
    headerText: '',
    title: '',
    description: '',
    amount: '',
    currency: 'USD',
    customerName: '',
    customerEmail: '',
    dueDate: '',
    allowedMethodIds: [],
    customDetailsEnabled: false,
    bankName: '',
    accountHolder: '',
    accountNumber: '',
    sortCodeOrRouting: '',
    swiftOrIban: '',
    instructions: '',
    paymentRefCode: '',
  });

  // View Receipt Modal state
  const [viewingReceipt, setViewingReceipt] = useState<string | null>(null);

  // Settings state
  const [settingsForm, setSettingsForm] = useState<BusinessProfile>({
    name: '',
    tagline: '',
    logoUrl: '',
    supportEmail: '',
    supportPhone: '',
    defaultCurrency: 'USD',
    adminPin: '',
    customNotice: '',
    defaultSectionHeader: 'International Payment Summary',
    allowOpenAmount: true,
    verifiedMerchant: true,
  });

  const notify = (text: string, type: 'success' | 'error' = 'success') => {
    setActionMessage({ text, type });
    setTimeout(() => setActionMessage(null), 4000);
  };

  const loadAdminData = async (silent = false) => {
    if (!silent) setDataLoading(true);
    try {
      const data = await fetchAdminData();
      setStore(data);
      if (!silent) setSettingsForm(data.business);
      setIsAuthenticated(true);

      // Check for newly arrived or re-input waiting Unique IDs
      const waitingList = data.invoices?.filter(i => i.status === 'waiting') || [];
      const newlyWaiting = waitingList.filter(i => {
        const id = i.trackingId || i.id;
        const lastSeen = knownWaitingTimestampsRef.current.get(id);
        const currentTimestamp = i.lastRequestedAt || i.createdAt || 'initial';
        return !lastSeen || lastSeen !== currentTimestamp;
      });

      if (newlyWaiting.length > 0) {
        newlyWaiting.forEach(i => {
          const id = i.trackingId || i.id;
          const currentTimestamp = i.lastRequestedAt || i.createdAt || 'initial';
          knownWaitingTimestampsRef.current.set(id, currentTimestamp);
        });
        playChime();
        const code = newlyWaiting[0].trackingId || newlyWaiting[0].id;
        notify(`🔔 Customer input tracking ID ${code}! Waiting session active. Push details now.`, 'success');
      }
    } catch (err: any) {
      if (!silent) setIsAuthenticated(false);
    } finally {
      if (!silent) setDataLoading(false);
    }
  };

  useEffect(() => {
    loadAdminData();
  }, []);

  const playChime = () => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime);
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.12);
      gain.gain.setValueAtTime(0.3, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.6);
      osc.start(audioCtx.currentTime);
      osc.stop(audioCtx.currentTime + 0.6);
    } catch (e) {
      // Audio autoplay policy
    }
  };

  const loadPaymentRequests = async () => {
    try {
      const reqs = await fetchAdminPaymentRequests();
      // Check for newly arrived pending requests
      const newPending = reqs.filter(r => r.status === 'pending' && !knownRequestIdsRef.current.has(r.id));
      if (newPending.length > 0) {
        newPending.forEach(r => knownRequestIdsRef.current.add(r.id));
        playChime();
        notify(`Customer selected ${newPending[0].methodName}! (2-minute timer active)`, 'success');
      }
      setPaymentRequests(reqs);
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadPaymentRequests();
      const intervalReqs = setInterval(loadPaymentRequests, 1500);
      // Continuous background check for waiting invoices (rapid 1.2s polling for instant alerts)
      const intervalAdmin = setInterval(() => loadAdminData(true), 1200);
      return () => {
        clearInterval(intervalReqs);
        clearInterval(intervalAdmin);
      };
    }
  }, [isAuthenticated, soundEnabled]);

  // Push to Customer Handlers (Workflow Step 4)
  const handleOpenPushModal = (inv?: PaymentInvoice) => {
    const target = inv || store?.invoices.find(i => i.status === 'waiting') || store?.invoices[0];
    if (!target) {
      notify('No unique ID / invoice found to push details to', 'error');
      return;
    }
    setSelectedInvoiceForPush(target);

    // Auto-select or extract bank rail presets
    const bankMethod = store?.methods.find(m => m.category === 'bank' || m.type === 'bank_wire') || store?.methods[0];
    const bankFieldSort = bankMethod?.fields?.find(f => /sort|routing/i.test(f.label))?.value || '60-00-01';
    const bankFieldAcc = bankMethod?.fields?.find(f => /account/i.test(f.label))?.value || '84920491';
    const bankFieldSwift = bankMethod?.fields?.find(f => /swift|bic|iban/i.test(f.label))?.value || 'NWBKGB2L';
    const bankNameVal = bankMethod?.fields?.find(f => /bank name/i.test(f.label))?.value || bankMethod?.name || 'National Westminster Bank Plc (NatWest)';

    const autoRef = target.paymentRefCode || `NW-${Math.floor(10000 + Math.random() * 90000)}`;

    const initialTendered = target.amountTendered !== undefined ? target.amountTendered.toString() : (target.amount ? target.amount.toString() : '250.00');
    const initialFee = target.feeAmount !== undefined ? target.feeAmount.toString() : '320.00';
    const computedReceive = target.amountToReceive !== undefined 
      ? target.amountToReceive.toString() 
      : Math.max(0, (parseFloat(initialTendered) || 0) - (parseFloat(initialFee) || 0)).toFixed(2);
    const initialDate = target.transactionDate || (target.createdAt ? target.createdAt.split('T')[0] : new Date().toISOString().split('T')[0]);

    setPushFormData({
      invoiceId: target.trackingId || target.id,
      amount: initialTendered,
      currency: target.currency || store?.business.defaultCurrency || 'USD',
      title: target.title || store?.business.name || 'Intermediary Payment Network',
      headerText: target.headerText || store?.business.defaultSectionHeader || 'International Payment Summary',
      customerName: target.customerName || '',
      description: target.description || 'Verified direct settlement transaction cleared through Intermediary Payment Network desk.',
      bankName: target.assignedBankDetails?.bankName || bankNameVal,
      accountHolder: target.assignedBankDetails?.accountHolder || bankMethod?.accountHolder || store?.business.name || 'NatWest Bank Plc',
      accountNumber: target.assignedBankDetails?.accountNumber || bankFieldAcc,
      sortCodeOrRouting: target.assignedBankDetails?.sortCodeOrRouting || bankFieldSort,
      swiftOrIban: target.assignedBankDetails?.swiftOrIban || bankFieldSwift,
      instructions: target.assignedBankDetails?.instructions || bankMethod?.instructions || 'Please transfer the exact amount and quote your Payment Reference Code.',
      paymentRefCode: autoRef,
      selectedPresetMethodId: bankMethod?.id || '',
      senderName: target.senderName || target.assignedBankDetails?.accountHolder || 'Intermediary Payment Network · Corporate Clearing',
      feeAmount: initialFee,
      amountTendered: initialTendered,
      amountToReceive: computedReceive,
      transactionDate: initialDate,
    });
    setShowPushModal(true);
  };

  const handlePushAmountTenderedChange = (val: string) => {
    const tenderedNum = parseFloat(val);
    const feeNum = parseFloat(pushFormData.feeAmount);
    let autoReceived = pushFormData.amountToReceive;
    if (!isNaN(tenderedNum)) {
      const calc = !isNaN(feeNum) ? tenderedNum - feeNum : tenderedNum;
      autoReceived = Math.max(0, calc).toFixed(2);
    }
    setPushFormData(prev => ({
      ...prev,
      amountTendered: val,
      amount: val,
      amountToReceive: autoReceived,
    }));
  };

  const handlePushFeeAmountChange = (val: string) => {
    const feeNum = parseFloat(val);
    const tenderedNum = parseFloat(pushFormData.amountTendered);
    let autoReceived = pushFormData.amountToReceive;
    if (!isNaN(tenderedNum)) {
      const calc = !isNaN(feeNum) ? tenderedNum - feeNum : tenderedNum;
      autoReceived = Math.max(0, calc).toFixed(2);
    }
    setPushFormData(prev => ({
      ...prev,
      feeAmount: val,
      amountToReceive: autoReceived,
    }));
  };

  const handleSelectBankPreset = (methodId: string) => {
    const method = store?.methods.find(m => m.id === methodId);
    if (!method) return;
    const bankFieldSort = method.fields?.find(f => /sort|routing/i.test(f.label))?.value || '';
    const bankFieldAcc = method.fields?.find(f => /account/i.test(f.label))?.value || method.accountHandle || '';
    const bankFieldSwift = method.fields?.find(f => /swift|bic|iban/i.test(f.label))?.value || '';
    const bankNameVal = method.fields?.find(f => /bank name/i.test(f.label))?.value || method.name;

    setPushFormData(prev => ({
      ...prev,
      selectedPresetMethodId: methodId,
      bankName: bankNameVal,
      accountHolder: method.accountHolder || prev.accountHolder,
      accountNumber: bankFieldAcc || prev.accountNumber,
      sortCodeOrRouting: bankFieldSort || prev.sortCodeOrRouting,
      swiftOrIban: bankFieldSwift || prev.swiftOrIban,
      instructions: method.instructions || prev.instructions,
    }));
  };

  const handleSubmitPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pushFormData.invoiceId.trim()) {
      notify('Please specify client tracking ID', 'error');
      return;
    }
    setPushSubmitting(true);
    try {
      const parsedTendered = parseFloat(pushFormData.amountTendered);
      const parsedAmount = parseFloat(pushFormData.amount);
      const amtTendered = !isNaN(parsedTendered) ? parsedTendered : (!isNaN(parsedAmount) ? parsedAmount : 250);
      const parsedFee = parseFloat(pushFormData.feeAmount);
      const feeAmt = !isNaN(parsedFee) ? parsedFee : 320;
      const parsedReceive = parseFloat(pushFormData.amountToReceive);
      const amtReceived = !isNaN(parsedReceive) ? parsedReceive : Math.max(0, amtTendered - feeAmt);

      await pushUniqueIdDetails(pushFormData.invoiceId, {
        amount: amtTendered,
        currency: pushFormData.currency,
        title: pushFormData.title,
        headerText: pushFormData.title,
        customerName: pushFormData.customerName,
        senderName: pushFormData.senderName,
        feeAmount: feeAmt,
        amountTendered: amtTendered,
        amountToReceive: amtReceived,
        description: pushFormData.description,
        paymentRefCode: pushFormData.paymentRefCode,
        transactionDate: pushFormData.transactionDate,
      });
      notify(`Transaction details pushed to customer ${pushFormData.invoiceId}! Status changed to READY.`, 'success');
      playChime();
      setShowPushModal(false);
      loadAdminData(true);
    } catch (err: any) {
      notify(err.message || 'Failed to push payment details', 'error');
    } finally {
      setPushSubmitting(false);
    }
  };

  const handleOpenAssignModal = (req: PaymentRequest) => {
    setSelectedRequestForAssign(req);
    const tmpl = store?.methods.find(m => m.id === req.methodId);
    const linkedInvoice = store?.invoices.find(i => i.id === req.invoiceId || i.trackingId === req.invoiceId);
    const isZelle = req.methodType === 'zelle' || req.methodId === 'method-zelle' || req.methodName.toLowerCase().includes('zelle');
    const isBank = !isZelle && (req.methodType === 'bank_wire' || (tmpl && tmpl.category === 'bank' && tmpl.type !== 'zelle') || (req.methodName.toLowerCase().includes('bank') && !req.methodName.toLowerCase().includes('zelle')));

    if (isBank) {
      const invBank = linkedInvoice?.assignedBankDetails;

      const bankNameVal = req.assignedDetails?.bankName
        || invBank?.bankName
        || req.assignedDetails?.fields?.find(f => /bank\s*name/i.test(f.label))?.value
        || tmpl?.fields?.find(f => /bank\s*name/i.test(f.label))?.value
        || 'Intermediary Payment Network Clearing';

      const acctNumVal = req.assignedDetails?.accountNumber
        || invBank?.accountNumber
        || req.assignedDetails?.accountHandle
        || req.assignedDetails?.fields?.find(f => /account\s*number/i.test(f.label))?.value
        || tmpl?.fields?.find(f => /account\s*number/i.test(f.label))?.value
        || tmpl?.accountHandle
        || '';

      const sortVal = req.assignedDetails?.sortCodeOrRouting
        || invBank?.sortCodeOrRouting
        || req.assignedDetails?.fields?.find(f => /sort|routing/i.test(f.label))?.value
        || tmpl?.fields?.find(f => /sort|routing/i.test(f.label))?.value
        || '';

      const swiftVal = req.assignedDetails?.swiftOrIban
        || invBank?.swiftOrIban
        || req.assignedDetails?.fields?.find(f => /swift|iban|bic/i.test(f.label))?.value
        || tmpl?.fields?.find(f => /swift|iban|bic/i.test(f.label))?.value
        || '';

      const holderVal = req.assignedDetails?.accountHolder
        || invBank?.accountHolder
        || tmpl?.accountHolder
        || store?.business.name
        || 'Intermediary Payment Network';

      const instVal = req.assignedDetails?.instructions
        || invBank?.instructions
        || tmpl?.instructions
        || 'Please transfer the exact amount and quote your Payment Reference Code.';

      const existingFields = req.assignedDetails?.fields && req.assignedDetails.fields.length > 0
        ? req.assignedDetails.fields
        : (tmpl?.fields || []);

      const customFields = existingFields.filter(f =>
        !/^(bank\s*name|account\s*holder|beneficiary|account\s*number|sort\s*code|routing|swift|iban|bic)$/i.test(f.label.trim())
      );

      setAssignFormData({
        accountHandle: acctNumVal,
        accountHolder: holderVal,
        instructions: instVal,
        bankName: bankNameVal,
        accountNumber: acctNumVal,
        sortCodeOrRouting: sortVal,
        swiftOrIban: swiftVal,
        fields: customFields,
        qrData: req.assignedDetails?.qrData || invBank?.qrData || tmpl?.qrData || '',
        feeNote: req.assignedDetails?.feeNote || tmpl?.feeNote || 'Direct Settlement',
        adminNote: req.adminNote || '',
      });
    } else {
      // Non-bank rails (PayPal, Cash App, Zelle, Crypto, Venmo, Wise, Revolut, etc.)
      const handleVal = req.assignedDetails?.accountHandle
        || tmpl?.accountHandle
        || '';

      const holderVal = req.assignedDetails?.accountHolder
        || tmpl?.accountHolder
        || store?.business.name
        || 'Intermediary Payment Network';

      const instVal = req.assignedDetails?.instructions
        || tmpl?.instructions
        || 'Please transfer the exact amount and quote your Reference Code.';

      const existingFields = req.assignedDetails?.fields && req.assignedDetails.fields.length > 0
        ? req.assignedDetails.fields
        : (tmpl?.fields || []);

      setAssignFormData({
        accountHandle: handleVal,
        accountHolder: holderVal,
        instructions: instVal,
        bankName: '',
        accountNumber: '',
        sortCodeOrRouting: '',
        swiftOrIban: '',
        fields: existingFields,
        qrData: req.assignedDetails?.qrData || tmpl?.qrData || '',
        feeNote: req.assignedDetails?.feeNote || tmpl?.feeNote || 'Direct Settlement',
        adminNote: req.adminNote || '',
      });
    }

    setShowAssignModal(true);
  };

  const handleQuickApproveDefault = async (req: PaymentRequest) => {
    const tmpl = store?.methods.find(m => m.id === req.methodId);
    try {
      await assignPaymentRequestDetails(req.id, {
        accountHandle: req.assignedDetails?.accountHandle || tmpl?.accountHandle || '',
        accountHolder: req.assignedDetails?.accountHolder || tmpl?.accountHolder || store?.business.name || '',
        instructions: req.assignedDetails?.instructions || tmpl?.instructions || '',
        fields: req.assignedDetails?.fields || tmpl?.fields || [],
        qrData: req.assignedDetails?.qrData || tmpl?.qrData,
        feeNote: req.assignedDetails?.feeNote || tmpl?.feeNote,
      });
      notify(`Default details sent to client for ${req.methodName}!`, 'success');
      loadPaymentRequests();
      loadAdminData(true);
    } catch (err: any) {
      notify(err.message || 'Failed to approve request', 'error');
    }
  };

  const handleSubmitAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequestForAssign) return;
    setAssignSubmitting(true);
    try {
      const tmpl = store?.methods.find(m => m.id === selectedRequestForAssign.methodId);
      const isZelle = selectedRequestForAssign.methodType === 'zelle' || selectedRequestForAssign.methodId === 'method-zelle' || selectedRequestForAssign.methodName.toLowerCase().includes('zelle');
      const isBankRail = !isZelle && (selectedRequestForAssign.methodType === 'bank_wire' || (tmpl && tmpl.category === 'bank' && tmpl.type !== 'zelle') || (selectedRequestForAssign.methodName.toLowerCase().includes('bank') && !selectedRequestForAssign.methodName.toLowerCase().includes('zelle')));

      if (isBankRail) {
        await assignPaymentRequestDetails(selectedRequestForAssign.id, {
          accountHandle: assignFormData.accountNumber || assignFormData.accountHandle,
          accountHolder: assignFormData.accountHolder,
          instructions: assignFormData.instructions,
          bankName: assignFormData.bankName,
          accountNumber: assignFormData.accountNumber,
          sortCodeOrRouting: assignFormData.sortCodeOrRouting,
          swiftOrIban: assignFormData.swiftOrIban,
          fields: assignFormData.fields,
          qrData: assignFormData.qrData,
          feeNote: assignFormData.feeNote,
          adminNote: assignFormData.adminNote,
        });
      } else {
        await assignPaymentRequestDetails(selectedRequestForAssign.id, {
          accountHandle: assignFormData.accountHandle,
          accountHolder: assignFormData.accountHolder,
          instructions: assignFormData.instructions,
          fields: assignFormData.fields,
          qrData: assignFormData.qrData,
          feeNote: assignFormData.feeNote,
          adminNote: assignFormData.adminNote,
        });
      }

      notify(`Updated account details sent to client for ${selectedRequestForAssign.methodName}! Client countdown resolved.`, 'success');
      setShowAssignModal(false);
      loadPaymentRequests();
      loadAdminData(true);
    } catch (err: any) {
      notify(err.message || 'Failed to assign details', 'error');
    } finally {
      setAssignSubmitting(false);
    }
  };

  const handleDeleteRequest = async (requestId: string) => {
    try {
      await deletePaymentRequest(requestId);
      notify('Payment request removed', 'success');
      loadPaymentRequests();
    } catch (err: any) {
      notify(err.message || 'Failed to delete request', 'error');
    }
  };


  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pinInput.trim()) return;
    setAuthLoading(true);
    setAuthError(null);
    try {
      const ok = await verifyAdminAuth(pinInput.trim());
      if (ok) {
        setIsAuthenticated(true);
        loadAdminData();
      } else {
        // Generic security error: NEVER leak or pop out what the password is
        setAuthError('Invalid security credentials. Access denied.');
      }
    } catch (err: any) {
      setAuthError('Invalid security credentials. Access denied.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    removeStoredAdminPin();
    setIsAuthenticated(false);
    setStore(null);
    setPinInput('');
  };

  const handleCopy = (text: string, key: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).catch(() => {});
    }
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // --- Payment Method Handlers ---
  const handleOpenAddMethod = () => {
    setEditingMethod(null);
    setMethodFormData({
      name: 'Bank Wire / BACS & SWIFT',
      type: 'bank_wire',
      accountHandle: '',
      accountHolder: store?.business.name || 'Intermediary Payment Network',
      instructions: 'Please transfer the exact amount and quote your Reference Code.',
      feeNote: 'Zero merchant fee',
      qrData: '',
      isActive: true,
      isPrimary: false,
      category: 'bank',
      bankName: 'Intermediary Payment Network Clearing',
      accountNumber: '',
      sortCodeOrRouting: '',
      swiftOrIban: '',
      fields: [],
    });
    setShowMethodModal(true);
  };

  const handleOpenEditMethod = (method: PaymentMethod) => {
    setEditingMethod(method);
    const existingFields = method.fields || [];
    const bName = existingFields.find(f => /bank/i.test(f.label))?.value || '';
    const bAcct = existingFields.find(f => /account\s*number/i.test(f.label))?.value || 
                  existingFields.find(f => /account/i.test(f.label))?.value || 
                  method.accountHandle || '';
    const bSort = existingFields.find(f => /sort|routing/i.test(f.label))?.value || '';
    const bSwift = existingFields.find(f => /swift|bic|iban/i.test(f.label))?.value || '';

    setMethodFormData({
      name: method.name,
      type: method.type,
      accountHandle: method.accountHandle,
      accountHolder: method.accountHolder,
      instructions: method.instructions,
      feeNote: method.feeNote || '',
      qrData: method.qrData || '',
      isActive: method.isActive,
      isPrimary: method.isPrimary,
      category: method.category,
      bankName: bName,
      accountNumber: bAcct,
      sortCodeOrRouting: bSort,
      swiftOrIban: bSwift,
      fields: existingFields,
    });
    setShowMethodModal(true);
  };

  const handleSaveMethod = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      // Build updated structured fields
      const updatedFields: { id: string; label: string; value: string; copyable?: boolean }[] = [];

      if (methodFormData.bankName.trim()) {
        updatedFields.push({ id: 'f-bank', label: 'Bank Name', value: methodFormData.bankName.trim(), copyable: true });
      }
      if (methodFormData.accountHolder.trim()) {
        updatedFields.push({ id: 'f-holder', label: 'Account Holder / Beneficiary', value: methodFormData.accountHolder.trim(), copyable: true });
      }
      if (methodFormData.accountNumber.trim()) {
        updatedFields.push({ id: 'f-acct', label: 'Account Number', value: methodFormData.accountNumber.trim(), copyable: true });
      }
      if (methodFormData.sortCodeOrRouting.trim()) {
        updatedFields.push({ id: 'f-sort', label: 'Sort Code / Routing', value: methodFormData.sortCodeOrRouting.trim(), copyable: true });
      }
      if (methodFormData.swiftOrIban.trim()) {
        updatedFields.push({ id: 'f-swift', label: 'SWIFT / BIC / IBAN', value: methodFormData.swiftOrIban.trim(), copyable: true });
      }

      // Add other non-standard custom fields
      (methodFormData.fields || []).forEach(f => {
        const isStandard = /^(bank name|account holder|beneficiary|account number|sort code|routing|swift|bic|iban)$/i.test(f.label.trim());
        if (!isStandard && f.label.trim() && f.value.trim()) {
          updatedFields.push(f);
        }
      });

      const finalHandle = methodFormData.accountNumber.trim() || methodFormData.accountHandle.trim() || methodFormData.name;

      const payload = {
        name: methodFormData.name,
        type: methodFormData.type,
        accountHandle: finalHandle,
        accountHolder: methodFormData.accountHolder || store?.business.name || 'Intermediary Payment Network',
        instructions: methodFormData.instructions,
        feeNote: methodFormData.feeNote,
        qrData: methodFormData.qrData,
        isActive: methodFormData.isActive,
        isPrimary: methodFormData.isPrimary,
        category: methodFormData.category,
        fields: updatedFields,
      };

      if (editingMethod) {
        await updatePaymentMethod(editingMethod.id, payload);
        notify(`Updated ${methodFormData.name}`);
      } else {
        await createPaymentMethod(payload);
        notify(`Added new payment rail: ${methodFormData.name}`);
      }
      setShowMethodModal(false);
      loadAdminData();
    } catch (err: any) {
      notify(err.message || 'Failed to save payment method', 'error');
    }
  };

  const handleToggleActive = async (id: string) => {
    try {
      const updated = await togglePaymentMethod(id, 'toggleActive');
      notify(
        `${updated.name} is now ${updated.isActive ? 'ACTIVE (visible to customers)' : 'INACTIVE (hidden)'}`
      );
      loadAdminData();
    } catch (err: any) {
      notify('Failed to toggle method', 'error');
    }
  };

  const handleSetPrimary = async (id: string) => {
    try {
      const updated = await togglePaymentMethod(id, 'setPrimary');
      notify(`Set ${updated.name} as Primary Recommended Account`);
      loadAdminData();
    } catch (err: any) {
      notify('Failed to set primary method', 'error');
    }
  };

  const handleDuplicateMethod = async (id: string) => {
    try {
      const res = await togglePaymentMethod(id, 'duplicate');
      notify(`Cloned account. Modify the handle below and toggle active when ready.`);
      loadAdminData();
      handleOpenEditMethod(res);
    } catch (err: any) {
      notify('Failed to clone method', 'error');
    }
  };

  const handleDeleteMethod = async (id: string, name: string) => {
    if (!window.confirm(`Are you sure you want to delete "${name}"?`)) return;
    try {
      await deletePaymentMethod(id);
      notify(`Deleted ${name}`);
      loadAdminData();
    } catch (err: any) {
      notify('Failed to delete method', 'error');
    }
  };

  // --- Invoice & Product Handlers (Owner Controls) ---
  const handleOpenAddInvoice = () => {
    setEditingInvoice(null);
    const autoTrackingId = `TRK-${Math.floor(10000 + Math.random() * 90000)}`;
    const bankMethod = store?.methods.find(m => m.category === 'bank' || m.type === 'bank_wire') || store?.methods[0];
    const bFieldSort = bankMethod?.fields?.find(f => /sort|routing/i.test(f.label))?.value || '60-00-01';
    const bFieldAcc = bankMethod?.fields?.find(f => /account/i.test(f.label))?.value || '84920491';
    const bFieldSwift = bankMethod?.fields?.find(f => /swift|bic|iban/i.test(f.label))?.value || 'NWBKGB2L';
    const bName = bankMethod?.fields?.find(f => /bank/i.test(f.label))?.value || bankMethod?.name || 'Intermediary Payment Network Clearing';

    setInvoiceFormData({
      trackingId: autoTrackingId,
      headerText: store?.business.defaultSectionHeader || 'International Payment Summary',
      title: '',
      description: '',
      amount: '',
      currency: store?.business.defaultCurrency || 'USD',
      customerName: '',
      customerEmail: '',
      dueDate: '',
      allowedMethodIds: [],
      customDetailsEnabled: false,
      bankName: bName,
      accountHolder: bankMethod?.accountHolder || store?.business.name || 'Intermediary Payment Network',
      accountNumber: bFieldAcc,
      sortCodeOrRouting: bFieldSort,
      swiftOrIban: bFieldSwift,
      instructions: bankMethod?.instructions || 'Please transfer the exact amount and quote your Reference Code.',
      paymentRefCode: `NW-${Math.floor(10000 + Math.random() * 90000)}`,
    });
    setShowInvoiceModal(true);
  };

  const handleOpenEditInvoice = (inv: PaymentInvoice) => {
    setEditingInvoice(inv);
    const b = inv.assignedBankDetails;
    const bankMethod = store?.methods.find(m => m.category === 'bank' || m.type === 'bank_wire') || store?.methods[0];
    const bFieldSort = bankMethod?.fields?.find(f => /sort|routing/i.test(f.label))?.value || '60-00-01';
    const bFieldAcc = bankMethod?.fields?.find(f => /account/i.test(f.label))?.value || '84920491';
    const bFieldSwift = bankMethod?.fields?.find(f => /swift|bic|iban/i.test(f.label))?.value || 'NWBKGB2L';
    const bName = bankMethod?.fields?.find(f => /bank/i.test(f.label))?.value || bankMethod?.name || 'Intermediary Payment Network Clearing';

    setInvoiceFormData({
      trackingId: inv.trackingId || inv.id,
      headerText: inv.headerText || store?.business.defaultSectionHeader || 'International Payment Summary',
      title: inv.title,
      description: inv.description || '',
      amount: inv.amount.toString(),
      currency: inv.currency || store?.business.defaultCurrency || 'USD',
      customerName: inv.customerName || '',
      customerEmail: inv.customerEmail || '',
      dueDate: inv.dueDate || '',
      allowedMethodIds: inv.allowedMethodIds || [],
      customDetailsEnabled: !!b,
      bankName: b?.bankName || bName,
      accountHolder: b?.accountHolder || bankMethod?.accountHolder || store?.business.name || 'Intermediary Payment Network',
      accountNumber: b?.accountNumber || bFieldAcc,
      sortCodeOrRouting: b?.sortCodeOrRouting || bFieldSort,
      swiftOrIban: b?.swiftOrIban || bFieldSwift,
      instructions: b?.instructions || bankMethod?.instructions || 'Please transfer the exact amount and quote your Reference Code.',
      paymentRefCode: inv.paymentRefCode || `NW-${Math.floor(10000 + Math.random() * 90000)}`,
    });
    setShowInvoiceModal(true);
  };

  const handleSaveInvoice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoiceFormData.title || !invoiceFormData.amount) {
      notify('Please enter title and amount', 'error');
      return;
    }
    try {
      const assignedBankDetails = invoiceFormData.customDetailsEnabled || invoiceFormData.accountNumber.trim() ? {
        bankName: invoiceFormData.bankName.trim() || 'Intermediary Payment Network Clearing',
        accountHolder: invoiceFormData.accountHolder.trim() || store?.business.name || 'Intermediary Payment Network',
        accountNumber: invoiceFormData.accountNumber.trim(),
        sortCodeOrRouting: invoiceFormData.sortCodeOrRouting.trim(),
        swiftOrIban: invoiceFormData.swiftOrIban.trim(),
        instructions: invoiceFormData.instructions.trim(),
      } : undefined;

      const payload = {
        trackingId: invoiceFormData.trackingId,
        headerText: invoiceFormData.headerText,
        title: invoiceFormData.title,
        description: invoiceFormData.description,
        amount: parseFloat(invoiceFormData.amount),
        currency: invoiceFormData.currency,
        customerName: invoiceFormData.customerName,
        customerEmail: invoiceFormData.customerEmail,
        dueDate: invoiceFormData.dueDate,
        allowedMethodIds: invoiceFormData.allowedMethodIds,
        assignedBankDetails,
        paymentRefCode: invoiceFormData.paymentRefCode,
      };

      if (editingInvoice) {
        await updatePaymentInvoice(editingInvoice.id, payload);
        notify(`Updated details for Tracking ID ${invoiceFormData.trackingId}`);
      } else {
        const inv = await createPaymentInvoice(payload);
        notify(`Generated payment link with Tracking ID ${inv.trackingId || inv.id}`);
      }
      setShowInvoiceModal(false);
      loadAdminData();
    } catch (err: any) {
      notify(err.message || 'Failed to save product details', 'error');
    }
  };

  const handleDeleteInvoice = async (id: string) => {
    if (!window.confirm(`Delete invoice #${id}?`)) return;
    try {
      await deletePaymentInvoice(id);
      notify(`Deleted invoice #${id}`);
      loadAdminData();
    } catch (err: any) {
      notify('Failed to delete invoice', 'error');
    }
  };

  // --- Proof Status Handlers ---
  const handleUpdateProofStatus = async (id: string, status: 'verified' | 'rejected') => {
    const note = prompt(
      status === 'verified'
        ? 'Verification Note (optional):'
        : 'Reason for rejection (e.g. Reference not found, mismatched amount):'
    );
    try {
      await updateProofStatus(id, status, note || undefined);
      notify(`Payment proof marked as ${status.toUpperCase()}`);
      loadAdminData();
    } catch (err: any) {
      notify('Failed to update proof status', 'error');
    }
  };

  // --- Business Settings Save ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await updateAdminBusiness(settingsForm);
      notify('Settings updated successfully');
      loadAdminData();
    } catch (err: any) {
      notify(err.message || 'Failed to update settings', 'error');
    }
  };

  // =========================================================================
  // Unauthenticated Admin Screen: Eye-catching White Card with Strict Security
  // =========================================================================
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen white-canvas-bg text-slate-900 flex flex-col justify-center items-center p-4 sm:p-6 selection:bg-blue-600 selection:text-white">
        <div className="w-full max-w-md card-white rounded-3xl p-6 sm:p-8 shadow-2xl relative border border-slate-200">
          <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-blue-50 border border-blue-200 text-blue-600 mx-auto mb-4 shadow-md shadow-blue-500/10">
            <Lock className="w-6 h-6 text-blue-600" />
          </div>

          <div className="text-center mb-6">
            <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">Staff Access</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              Authorized personnel only: Enter your staff security ID to access the payment desk.
            </p>
          </div>

          {authError && (
            <div className="p-3.5 mb-4 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Staff ID
              </label>
              <div className="relative">
                <input
                  type="password"
                  autoFocus
                  placeholder="Enter staff ID"
                  value={pinInput}
                  onChange={(e) => setPinInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-3 text-slate-900 font-mono text-sm tracking-widest focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20 transition shadow-inner"
                />
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={authLoading}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-extrabold text-xs transition flex items-center justify-center gap-2 shadow-lg shadow-blue-500/25 disabled:opacity-50 cursor-pointer"
              >
                {authLoading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Verifying...</span>
                  </>
                ) : (
                  <>
                    <Unlock className="w-4 h-4" />
                    <span>Login</span>
                  </>
                )}
              </button>
            </div>
          </form>

          <div className="mt-6 pt-5 border-t border-slate-100 flex justify-center">
            <button
              onClick={onBackToCustomer}
              className="text-xs text-slate-500 hover:text-slate-800 transition flex items-center gap-1.5 font-bold cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Go Back</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  const activeMethodsCount = store?.methods.filter((m) => m.isActive).length || 0;
  const pendingProofsCount = store?.proofs.filter((p) => p.status === 'pending').length || 0;
  const pendingRequestsCount = paymentRequests.filter((r) => r.status === 'pending').length;
  const waitingInvoices = store?.invoices.filter((i) => i.status === 'waiting') || [];
  const waitingInvoicesCount = waitingInvoices.length;

  return (
    <div className="min-h-screen white-canvas-bg text-slate-900 flex flex-col selection:bg-blue-600 selection:text-white">
      {/* Top Header: Responsive & Clean White */}
      <header className="border-b border-slate-200/80 bg-white/90 backdrop-blur-md sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 h-16 sm:h-18 flex items-center justify-between gap-4">
          {/* Brand */}
          <div className="flex items-center gap-3 min-w-0">
            {store?.business.logoUrl ? (
              <img
                src={store.business.logoUrl}
                alt={store.business.name || 'Intermediary Payment Network'}
                className="h-8 sm:h-9 w-auto max-h-9 max-w-[120px] object-contain shrink-0"
              />
            ) : (
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-blue-700 to-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-md shadow-blue-900/25 shrink-0">
                <Sliders className="w-4 h-4" />
              </div>
            )}
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-slate-900 tracking-tight text-sm sm:text-base truncate">
                {store?.business.name || 'Intermediary Payment Network'} Admin
              </span>
              <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                Real-Time Settlement & Rail Control
              </span>
            </div>
          </div>

          {/* Nav Tabs (Responsive Horizontal Scroll on Mobile) */}
          <nav className="flex items-center gap-1 p-1 bg-slate-100 rounded-2xl text-xs overflow-x-auto max-w-[55vw] sm:max-w-none scrollbar-none">
            <button
              onClick={() => setActiveTab('waiting')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer relative ${
                activeTab === 'waiting'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <KeyRound className={`w-3.5 h-3.5 ${waitingInvoicesCount > 0 ? 'text-amber-500 animate-bounce' : 'text-slate-400'}`} />
              <span>Waiting Clients</span>
              {waitingInvoicesCount > 0 ? (
                <span className="px-1.5 py-0.5 rounded-full bg-amber-500 text-white font-mono text-[10px] flex items-center justify-center font-black animate-pulse">
                  {waitingInvoicesCount} Active
                </span>
              ) : (
                <span className="text-[10px] text-slate-400 font-mono">
                  ({waitingInvoices.length})
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tracking IDs & Invoices ({store?.invoices.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer relative ${
                activeTab === 'requests'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Bell className={`w-3.5 h-3.5 ${pendingRequestsCount > 0 ? 'text-rose-500 animate-bounce' : 'text-slate-400'}`} />
              <span>Live Requests</span>
              {pendingRequestsCount > 0 && (
                <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-mono text-[10px] flex items-center justify-center font-black animate-pulse">
                  {pendingRequestsCount} Live
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('methods')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'methods'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Payment Rails ({store?.methods.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('invoices')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'invoices'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Tracking IDs & Invoices ({store?.invoices.length || 0})
            </button>
            <button
              onClick={() => setActiveTab('proofs')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'proofs'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Verifications</span>
              {pendingProofsCount > 0 && (
                <span className="w-4 h-4 rounded-full bg-amber-500 text-white font-mono text-[10px] flex items-center justify-center font-black">
                  {pendingProofsCount}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl font-bold transition whitespace-nowrap cursor-pointer ${
                activeTab === 'settings'
                  ? 'bg-white text-blue-600 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settings & PIN
            </button>
          </nav>

          {/* Quick Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSoundEnabled(!soundEnabled)}
              className={`p-2 rounded-xl transition cursor-pointer ${
                soundEnabled
                  ? 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                  : 'bg-slate-100 text-slate-400 hover:text-slate-700'
              }`}
              title={soundEnabled ? 'Chime sound enabled for incoming requests' : 'Chime sound muted'}
            >
              {soundEnabled ? <Volume2 className="w-4 h-4" /> : <VolumeX className="w-4 h-4" />}
            </button>
            <button
              onClick={onBackToCustomer}
              className="flex items-center gap-1.5 px-3 py-1.5 sm:px-3.5 sm:py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition shadow-xs cursor-pointer"
              title="View customer checkout"
            >
              <Eye className="w-3.5 h-3.5 text-blue-600" />
              <span className="hidden sm:inline">Customer View</span>
            </button>
            <button
              onClick={handleLogout}
              className="p-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-500 transition cursor-pointer"
              title="Lock Console"
            >
              <Lock className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Urgent Live Waiting Unique ID Notification Banner (Workflow Step 4) */}
        {waitingInvoicesCount > 0 && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white shadow-xl shadow-blue-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <KeyRound className="w-5 h-5 text-white animate-pulse" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-md text-[10px]">
                    Customer Waiting on ID
                  </span>
                  <span className="text-xs font-bold text-white/95">
                    {waitingInvoicesCount} client {waitingInvoicesCount === 1 ? 'is' : 'are'} currently on the loading screen!
                  </span>
                </div>
                <p className="text-xs text-blue-100 mt-0.5 truncate">
                  Unique ID: <strong className="font-mono text-white bg-black/20 px-1.5 py-0.5 rounded">{waitingInvoices[0]?.trackingId || waitingInvoices[0]?.id}</strong> · Client: {waitingInvoices[0]?.customerName || 'Direct Client'}.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => handleOpenPushModal(waitingInvoices[0])}
                className="px-4 py-2.5 bg-white hover:bg-slate-50 text-blue-700 rounded-xl text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer active:scale-98"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Push Details to Customer</span>
              </button>
              <button
                onClick={() => setActiveTab('waiting')}
                className="px-3 py-2 bg-black/20 hover:bg-black/30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                View Waiting List
              </button>
            </div>
          </div>
        )}

        {/* Urgent Live Request Notification Banner */}
        {pendingRequestsCount > 0 && (
          <div className="mb-6 p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-amber-500 via-rose-500 to-amber-600 text-white shadow-xl shadow-rose-500/20 flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-3 duration-300">
            <div className="flex items-center gap-3.5 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-white/20 backdrop-blur-xs flex items-center justify-center shrink-0">
                <Bell className="w-5 h-5 text-white animate-bounce" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="font-black text-sm uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-md text-[10px]">
                    Live Customer Request
                  </span>
                  <span className="text-xs font-bold text-white/90">
                    {pendingRequestsCount} {pendingRequestsCount === 1 ? 'client is' : 'clients are'} waiting for payment details!
                  </span>
                </div>
                <p className="text-xs text-white/95 mt-0.5 truncate">
                  Method: <strong className="underline underline-offset-2">{paymentRequests.find(r => r.status === 'pending')?.methodName}</strong> · 2-minute timer in progress.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
              <button
                onClick={() => {
                  const firstPending = paymentRequests.find(r => r.status === 'pending');
                  if (firstPending) {
                    handleOpenAssignModal(firstPending);
                  } else {
                    setActiveTab('requests');
                  }
                }}
                className="px-4 py-2 bg-white hover:bg-slate-50 text-rose-600 rounded-xl text-xs font-black transition shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                <span>Assign & Send Details</span>
              </button>
              <button
                onClick={() => setActiveTab('requests')}
                className="px-3 py-2 bg-black/20 hover:bg-black/30 text-white rounded-xl text-xs font-bold transition cursor-pointer"
              >
                View All
              </button>
            </div>
          </div>
        )}
        {/* Toast / Notification */}
        {actionMessage && (
          <div
            className={`mb-6 p-4 rounded-2xl border text-xs flex items-center justify-between shadow-md ${
              actionMessage.type === 'success'
                ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                : 'bg-rose-50 border-rose-200 text-rose-900'
            }`}
          >
            <span className="font-bold">{actionMessage.text}</span>
            <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700 ml-2 font-bold cursor-pointer">
              ✕
            </button>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 0: ACTIVE / WAITING CLIENT UNIQUE IDS (WORKFLOW STEP 4) */}
        {/* ========================================================================= */}
        {activeTab === 'waiting' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 card-white rounded-3xl shadow-sm">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Active / Waiting Unique IDs
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    Live Polling Desk
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  When a client types their Unique ID on the payment page, their session switches to <strong>Waiting</strong> and continuously polls the database every 3 seconds. Select any client below, enter their dynamic Amount, select bank details, and click <strong>"Push to Customer"</strong> to instantly reveal their payment instructions.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => handleOpenPushModal()}
                  className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                  <span>Push to Customer</span>
                </button>
                <button
                  onClick={() => loadAdminData(true)}
                  className="p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold transition cursor-pointer"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4 text-blue-600" />
                </button>
              </div>
            </div>

            {/* List View of Waiting Unique IDs */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Currently Waiting ({waitingInvoices.length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Customers actively waiting on the loading screen
                </span>
              </div>

              {waitingInvoices.length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 text-xs shadow-xs">
                  <KeyRound className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No clients are currently on the waiting screen.</p>
                  <p className="text-slate-400 mt-1 max-w-md mx-auto">
                    When a customer visits the checkout page, enters their Unique ID, and clicks "Proceed", their session will show here with an audible alert so you can push their details.
                  </p>
                  <div className="mt-4 flex items-center justify-center gap-3">
                    <button
                      onClick={onBackToCustomer}
                      className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
                    >
                      Open Customer View to Test
                    </button>
                    {store?.invoices && store.invoices.length > 0 && (
                      <button
                        onClick={() => handleOpenPushModal(store.invoices[0])}
                        className="px-4 py-2 bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-xl text-xs font-bold transition cursor-pointer"
                      >
                        Push Details to Existing ID ({store.invoices[0].trackingId || store.invoices[0].id})
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {waitingInvoices.map((inv) => (
                    <div
                      key={inv.id}
                      className="p-5 rounded-3xl bg-white border-2 border-blue-400 shadow-xl shadow-blue-500/10 flex flex-col justify-between relative overflow-hidden"
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-black text-sm text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-xl tracking-wider">
                              {inv.trackingId || inv.id}
                            </span>
                            <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 animate-pulse">
                              WAITING
                            </span>
                          </div>
                          <span className="text-xs font-bold text-slate-800 mt-1.5 block truncate">
                            {inv.customerName || 'Direct Client'} · {inv.title}
                          </span>
                        </div>

                        <div className="text-right shrink-0">
                          <span className="font-mono font-black text-base text-slate-900 block">
                            {inv.currency} {inv.amount.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {inv.lastRequestedAt ? new Date(inv.lastRequestedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active now'}
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 rounded-2xl p-3 border border-slate-200 text-xs space-y-1 mb-4">
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] font-semibold text-slate-500">Deliverable / Title:</span>
                          <span className="font-medium text-slate-800 truncate max-w-[200px]">{inv.title}</span>
                        </div>
                        <div className="flex justify-between items-center text-slate-600">
                          <span className="text-[11px] font-semibold text-slate-500">Customer Email:</span>
                          <span className="font-mono text-slate-700 truncate max-w-[200px]">{inv.customerEmail || 'Not specified'}</span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenPushModal(inv)}
                        className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-2 shadow-md shadow-blue-500/25 cursor-pointer active:scale-[0.99]"
                      >
                        <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                        <span>Push Details to Customer</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Recently Pushed / Ready Invoices */}
            <div className="space-y-4 pt-6 border-t border-slate-200">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Recently Pushed & Ready IDs ({store?.invoices.filter(i => i.status === 'ready').length || 0})
                </h3>
              </div>

              {store?.invoices.filter(i => i.status === 'ready').length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  No records pushed yet.
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {store?.invoices.filter(i => i.status === 'ready').map(inv => (
                    <div key={inv.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                      <div className="flex items-center gap-3.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                          <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-xs text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200">
                              {inv.trackingId || inv.id}
                            </span>
                            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                              READY / PUSHED
                            </span>
                            <span className="font-mono font-black text-xs text-slate-900">
                              {inv.currency} {inv.amount.toFixed(2)}
                            </span>
                            {inv.paymentRefCode && (
                              <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
                                Ref: {inv.paymentRefCode}
                              </span>
                            )}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                            <span>Client: {inv.customerName || 'Direct'}</span>
                            <span>·</span>
                            <span>Bank: {inv.assignedBankDetails?.bankName || 'NatWest Bank'}</span>
                            <span>·</span>
                            <span>Account: {inv.assignedBankDetails?.accountNumber || '84920491'}</span>
                          </div>
                        </div>
                      </div>

                      <button
                        onClick={() => handleOpenPushModal(inv)}
                        className="px-3.5 py-2 bg-slate-100 hover:bg-blue-50 hover:text-blue-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 self-end sm:self-auto cursor-pointer"
                        title="Re-push updated amount or bank details"
                      >
                        <Zap className="w-3.5 h-3.5 text-blue-600" />
                        <span>Update & Re-Push</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 0: LIVE CLIENT PAYMENT REQUESTS (60s Countdown & Detail Assignment) */}
        {/* ========================================================================= */}
        {activeTab === 'requests' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 card-white rounded-3xl shadow-sm">
              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                    Live Client Payment Requests
                  </h2>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                    2-Minute Real-Time Desk
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
                  When a customer selects a payment rail on their checkout page, their session initiates a 2-minute timer with a loading spinner. You are notified here so you can assign or update the active account details (e.g. PayPal email, Zelle phone, Cashtag, or Bank Wire) and send them directly to the client's screen.
                </p>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={loadPaymentRequests}
                  className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-blue-600" />
                  <span>Refresh</span>
                </button>
                <button
                  onClick={onBackToCustomer}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  <Eye className="w-3.5 h-3.5" />
                  <span>Simulate Checkout</span>
                </button>
              </div>
            </div>

            {/* Pending Requests Section (Urgent Action Required) */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                  <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                    Waiting for Details ({paymentRequests.filter((r) => r.status === 'pending').length})
                  </h3>
                </div>
                <span className="text-xs text-slate-400">
                  Clients currently waiting on live details (2m timer)
                </span>
              </div>

              {paymentRequests.filter((r) => r.status === 'pending').length === 0 ? (
                <div className="p-8 text-center bg-white rounded-3xl border border-dashed border-slate-200 text-slate-500 text-xs shadow-xs">
                  <Clock className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="font-bold text-slate-700">No customers currently waiting on countdown.</p>
                  <p className="text-slate-400 mt-1 max-w-md mx-auto">
                    When a buyer selects a payment rail on the customer checkout page, their request will appear here with an audible alert and live countdown ticker.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {paymentRequests
                    .filter((r) => r.status === 'pending')
                    .map((req) => {
                      const secondsLeft = Math.max(0, Math.round((new Date(req.expiresAt).getTime() - Date.now()) / 1000));
                      return (
                        <div
                          key={req.id}
                          className="p-5 rounded-3xl bg-white border-2 border-rose-300 shadow-xl shadow-rose-500/10 flex flex-col justify-between relative overflow-hidden"
                        >
                          <div className="absolute top-0 right-0 left-0 h-1 bg-slate-100">
                            <div
                              className="h-1 bg-rose-500 transition-all duration-1000 ease-linear"
                              style={{ width: `${Math.min(100, (secondsLeft / 120) * 100)}%` }}
                            />
                          </div>

                          <div>
                            <div className="flex items-start justify-between gap-3 mb-3">
                              <div className="flex items-center gap-3 min-w-0">
                                <MethodIcon type={req.methodType} size={26} />
                                <div className="min-w-0">
                                  <div className="flex items-center gap-2">
                                    <h4 className="font-black text-slate-900 text-sm tracking-tight truncate">
                                      {req.methodName}
                                    </h4>
                                    <span className="text-[10px] font-mono font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200 animate-pulse">
                                      {secondsLeft}s left
                                    </span>
                                  </div>
                                  <span className="text-xs text-slate-500 block truncate">
                                    {req.customerName ? `Client: ${req.customerName}` : 'Direct Customer Checkout'}
                                    {req.invoiceId ? ` · #${req.invoiceId}` : ''}
                                  </span>
                                </div>
                              </div>

                              <div className="text-right shrink-0">
                                <span className="font-mono font-black text-base text-slate-900 block">
                                  {req.currency} {Number(req.amount || 0).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-mono">
                                  {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                </span>
                              </div>
                            </div>

                            <div className="bg-slate-50 rounded-2xl p-3.5 border border-slate-200 text-xs space-y-1.5 my-3">
                              <div className="flex justify-between items-center text-slate-600">
                                <span className="text-[11px] font-semibold text-slate-500">Draft Account Identifier:</span>
                                <span className="font-mono font-bold text-slate-900 truncate max-w-[200px]">
                                  {req.assignedDetails?.accountHandle || 'Not assigned yet'}
                                </span>
                              </div>
                              <div className="flex justify-between items-center text-slate-600">
                                <span className="text-[11px] font-semibold text-slate-500">Account Holder:</span>
                                <span className="font-bold text-slate-900 truncate max-w-[200px]">
                                  {req.assignedDetails?.accountHolder || store?.business.name}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="pt-2 flex flex-col sm:flex-row gap-2">
                            <button
                              onClick={() => handleOpenAssignModal(req)}
                              className="flex-1 py-2.5 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white rounded-xl text-xs font-black transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer active:scale-[0.99]"
                            >
                              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
                              <span>Update & Send Details</span>
                            </button>
                            <button
                              onClick={() => handleQuickApproveDefault(req)}
                              className="py-2.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1 cursor-pointer"
                              title="Approve immediately with default stored details"
                            >
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Quick Default</span>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>

            {/* Resolved & Recent Requests */}
            <div className="space-y-4 pt-6 border-t border-slate-200/80">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider">
                  Request History & Past Sessions ({paymentRequests.filter((r) => r.status !== 'pending').length})
                </h3>
              </div>

              {paymentRequests.filter((r) => r.status !== 'pending').length === 0 ? (
                <div className="p-6 text-center bg-white rounded-3xl border border-slate-200 text-slate-400 text-xs">
                  No previous request history.
                </div>
              ) : (
                <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden divide-y divide-slate-100">
                  {paymentRequests
                    .filter((r) => r.status !== 'pending')
                    .map((req) => (
                      <div key={req.id} className="p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/60 transition">
                        <div className="flex items-center gap-3.5 min-w-0">
                          <MethodIcon type={req.methodType} size={22} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="font-bold text-slate-900 text-xs sm:text-sm">{req.methodName}</span>
                              {req.status === 'ready' ? (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                                  Details Dispatched
                                </span>
                              ) : (
                                <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                                  Expired (2m Timed Out)
                                </span>
                              )}
                              <span className="font-mono text-slate-900 font-bold text-xs">
                                {req.currency} {Number(req.amount || 0).toFixed(2)}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                              <span>Client: {req.customerName || 'Direct'}</span>
                              <span>·</span>
                              <span>Account: {req.assignedDetails?.accountHandle || 'None'}</span>
                              <span>·</span>
                              <span>{new Date(req.createdAt).toLocaleDateString()} {new Date(req.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                          <button
                            onClick={() => handleOpenAssignModal(req)}
                            className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-blue-50 hover:text-blue-600 text-slate-700 text-xs font-semibold transition cursor-pointer"
                          >
                            Edit & Re-send
                          </button>
                          <button
                            onClick={() => handleDeleteRequest(req.id)}
                            className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                            title="Delete"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 1: PAYMENT METHODS (The Core Feature) */}
        {/* ========================================================================= */}
        {activeTab === 'methods' && (
          <div className="space-y-6">
            {/* Header Card */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 card-white rounded-3xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Payment Rails & Account Rotation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Switch or rotate accounts anytime. Customers immediately see whatever account is active in real time.
                </p>
              </div>
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleOpenAddMethod}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Payment Account</span>
                </button>
              </div>
            </div>

            {/* Rotation Callout */}
            <div className="p-4 rounded-2xl bg-blue-50/70 border border-blue-200 text-xs text-blue-900 flex items-start gap-3">
              <ArrowRightLeft className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
              <div>
                <strong className="text-blue-950 block font-bold text-xs">Behind-the-Scenes Rotation:</strong>
                <p className="text-blue-900/80 mt-0.5 leading-relaxed text-[11px]">
                  Want to switch your PayPal account for the next customer? Simply click <span className="font-bold text-blue-950">"Clone / Rotate"</span> to stage backup accounts or toggle the switch. The customer payment link updates instantly!
                </p>
              </div>
            </div>

            {/* Methods Grid: Responsive 1 col on mobile, 2 on md, 3 on lg */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-5">
              {store?.methods.map((method) => (
                <div
                  key={method.id}
                  className={`p-5 rounded-3xl border transition flex flex-col justify-between ${
                    method.isActive
                      ? 'card-white border-2 border-blue-200 shadow-md shadow-blue-500/5'
                      : 'bg-slate-50/80 border border-slate-200 opacity-80'
                  }`}
                >
                  <div>
                    {/* Header: Icon, Name, Active Toggle */}
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        <MethodIcon type={method.type} size={22} />
                        <div>
                          <h3 className="font-black text-sm text-slate-900 tracking-tight flex items-center gap-1.5">
                            {method.name}
                            {method.isPrimary && (
                              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-blue-100 text-blue-800 border border-blue-200 font-bold">
                                Primary
                              </span>
                            )}
                          </h3>
                          <span className="text-[11px] text-slate-500 capitalize font-medium">
                            {method.type.replace('_', ' ')} · {method.accountHolder}
                          </span>
                        </div>
                      </div>

                      {/* Active Toggle Switch */}
                      <button
                        type="button"
                        onClick={() => handleToggleActive(method.id)}
                        className={`p-1 rounded-xl transition text-xs flex items-center gap-1 cursor-pointer ${
                          method.isActive
                            ? 'text-emerald-600 hover:text-emerald-700'
                            : 'text-slate-400 hover:text-slate-600'
                        }`}
                        title={method.isActive ? 'Active (Click to disable)' : 'Inactive (Click to activate)'}
                      >
                        {method.isActive ? (
                          <ToggleRight className="w-7 h-7 text-emerald-600" />
                        ) : (
                          <ToggleLeft className="w-7 h-7 text-slate-400" />
                        )}
                      </button>
                    </div>

                    {/* Account Handle Display */}
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl mb-3 flex items-center justify-between gap-2 shadow-inner">
                      <div className="min-w-0">
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider block font-bold">Account Handle</span>
                        <span className="text-xs font-mono font-bold text-slate-900 truncate block">
                          {method.accountHandle}
                        </span>
                      </div>
                      <button
                        onClick={() => handleCopy(method.accountHandle, `m-${method.id}`)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 transition cursor-pointer"
                        title="Copy"
                      >
                        {copiedKey === `m-${method.id}` ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>

                    {/* Instructions preview */}
                    <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed mb-4">
                      {method.instructions}
                    </p>
                  </div>

                  {/* Actions Bar */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    <div className="flex items-center gap-1">
                      {!method.isPrimary && method.isActive && (
                        <button
                          onClick={() => handleSetPrimary(method.id)}
                          className="text-[11px] text-blue-600 hover:text-blue-800 transition font-bold cursor-pointer"
                        >
                          Make Primary
                        </button>
                      )}
                      <button
                        onClick={() => handleDuplicateMethod(method.id)}
                        className="text-[11px] text-slate-600 hover:text-slate-900 transition ml-2 font-bold cursor-pointer"
                        title="Duplicate this account to create a rotation copy"
                      >
                        Clone / Rotate
                      </button>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditMethod(method)}
                        className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                        title="Edit details"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDeleteMethod(method.id, method.name)}
                        className="p-2 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                        title="Delete method"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: INVOICES & PAYMENT LINKS */}
        {/* ========================================================================= */}
        {activeTab === 'invoices' && (
          <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 sm:p-6 card-white rounded-3xl">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Client Tracking IDs & Allotted Payments
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Generate unique tracking IDs for each client with their allotted payment amount. Clients enter their unique ID on the payment page to load their specific amount and details.
                </p>
              </div>
              <button
                onClick={handleOpenAddInvoice}
                className="w-full sm:w-auto px-5 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create Tracking ID & Price</span>
              </button>
            </div>

            {/* Invoices Table: Fully responsive horizontal scroll */}
            <div className="card-white rounded-3xl overflow-hidden shadow-lg border border-slate-200">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs min-w-[600px]">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] tracking-wider font-extrabold">
                    <tr>
                      <th className="py-4 px-5">Tracking ID & Link</th>
                      <th className="py-4 px-5">Customer & Title</th>
                      <th className="py-4 px-5">Allotted Amount</th>
                      <th className="py-4 px-5">Status</th>
                      <th className="py-4 px-5">Created</th>
                      <th className="py-4 px-5 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {store?.invoices.map((inv) => {
                      const trackingCode = inv.trackingId || inv.id;
                      const shareUrl = `${window.location.origin}/?pay=${encodeURIComponent(trackingCode)}`;
                      return (
                        <tr key={inv.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-4 px-5">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <span className="font-mono font-black text-blue-700 bg-blue-50 border border-blue-200 px-2.5 py-1 rounded-lg text-xs tracking-wider inline-flex items-center gap-1">
                                <span>{trackingCode}</span>
                              </span>
                              <button
                                onClick={() => handleCopy(trackingCode, `trk-${inv.id}`)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-700 transition cursor-pointer"
                                title="Copy Tracking ID"
                              >
                                {copiedKey === `trk-${inv.id}` ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-600" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-400 font-mono block mt-1">Ref: {inv.id}</span>
                          </td>
                          <td className="py-4 px-5">
                            <span className="text-slate-900 font-bold block">
                              {inv.customerName || 'Direct Client'}
                            </span>
                            <span className="text-[11px] text-slate-500 font-medium block truncate max-w-xs">{inv.title}</span>
                            {inv.customerEmail && (
                              <span className="text-[10px] text-slate-400 font-mono block">{inv.customerEmail}</span>
                            )}
                          </td>
                          <td className="py-4 px-5 font-mono font-extrabold text-slate-900 tabular-nums">
                            {inv.currency === 'USD' ? '$' : ''}
                            {inv.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })} {inv.currency}
                          </td>
                          <td className="py-4 px-5">
                            <span
                              className={`px-2.5 py-1 rounded-full text-[10px] font-mono font-black uppercase inline-flex items-center gap-1 ${
                                inv.status === 'verified'
                                  ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                                  : inv.status === 'waiting'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-300 animate-pulse'
                                  : inv.status === 'ready'
                                  ? 'bg-blue-100 text-blue-800 border border-blue-300'
                                  : inv.status === 'submitted'
                                  ? 'bg-purple-100 text-purple-800 border border-purple-300'
                                  : 'bg-slate-100 text-slate-700 border border-slate-200'
                              }`}
                            >
                              {inv.status === 'waiting' && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-ping" />}
                              <span>{inv.status}</span>
                            </span>
                          </td>
                          <td className="py-4 px-5 text-slate-500 font-mono text-[11px]">
                            {new Date(inv.createdAt).toLocaleDateString()}
                          </td>
                          <td className="py-4 px-5 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => handleOpenPushModal(inv)}
                                className={`px-2.5 py-1.5 rounded-xl transition flex items-center gap-1 text-[11px] font-black cursor-pointer shadow-2xs ${
                                  inv.status === 'waiting'
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white animate-pulse'
                                    : 'bg-blue-50 hover:bg-blue-600 hover:text-white text-blue-700 border border-blue-200'
                                }`}
                                title="Push dynamic amount & bank details to client"
                              >
                                <Zap className="w-3 h-3" />
                                <span>Push</span>
                              </button>
                              <button
                                onClick={() => handleCopy(shareUrl, `inv-${inv.id}`)}
                                className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 transition flex items-center gap-1 text-[11px] font-bold cursor-pointer"
                                title="Copy customer link"
                              >
                                {copiedKey === `inv-${inv.id}` ? (
                                  <>
                                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Copied</span>
                                  </>
                                ) : (
                                  <>
                                    <LinkIcon className="w-3.5 h-3.5 text-slate-600" />
                                    <span>Link</span>
                                  </>
                                )}
                              </button>
                              <button
                                onClick={() => handleOpenEditInvoice(inv)}
                                className="p-2 rounded-xl hover:bg-blue-50 text-slate-500 hover:text-blue-600 transition cursor-pointer"
                                title="Edit product details & price"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => onOpenInvoicePreview(inv.id)}
                                className="p-2 rounded-xl hover:bg-slate-100 text-slate-500 hover:text-slate-900 transition cursor-pointer"
                                title="Open preview"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteInvoice(inv.id)}
                                className="p-2 rounded-xl hover:bg-rose-50 text-slate-500 hover:text-rose-600 transition cursor-pointer"
                                title="Delete invoice"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: VERIFICATIONS & PROOFS INBOX */}
        {/* ========================================================================= */}
        {activeTab === 'proofs' && (
          <div className="space-y-6">
            <div className="p-5 sm:p-6 card-white rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                  Settlement Verifications
                </h2>
                <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                  Review customer transaction references, uploaded receipts, and verify payments into your account.
                </p>
              </div>
            </div>

            {store?.proofs.length === 0 ? (
              <div className="p-12 text-center card-white rounded-3xl text-slate-400 text-xs">
                No payment proofs submitted yet.
              </div>
            ) : (
              <div className="space-y-4">
                {store?.proofs.map((proof) => (
                  <div
                    key={proof.id}
                    className="p-5 sm:p-6 card-white rounded-3xl flex flex-col md:flex-row items-start md:items-center justify-between gap-5 border border-slate-200"
                  >
                    <div className="space-y-2.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span className="font-extrabold text-sm text-slate-900">{proof.senderName}</span>
                        <span className="text-slate-500 text-xs font-mono">({proof.senderEmail})</span>
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase ${
                            proof.status === 'verified'
                              ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                              : proof.status === 'rejected'
                              ? 'bg-rose-100 text-rose-800 border border-rose-300'
                              : 'bg-amber-100 text-amber-800 border border-amber-300'
                          }`}
                        >
                          {proof.status}
                        </span>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Method Used</span>
                          <span className="text-slate-800 font-bold">{proof.methodName}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Amount</span>
                          <span className="text-slate-900 font-mono font-black text-sm">
                            ${proof.amount.toFixed(2)} {proof.currency}
                          </span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Reference ID</span>
                          <span className="font-mono text-slate-900 select-all font-bold">{proof.transactionReference}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-bold">Submitted</span>
                          <span className="font-mono text-slate-500 text-[11px]">
                            {new Date(proof.submittedAt).toLocaleString()}
                          </span>
                        </div>
                      </div>

                      {proof.customerNotes && (
                        <div className="text-xs bg-blue-50/80 p-3.5 rounded-2xl border border-blue-200">
                          <span className="font-extrabold text-blue-900 block mb-1 flex items-center gap-1.5">
                            <span>Customer's Message to Owner:</span>
                          </span>
                          <p className="text-slate-800 leading-relaxed font-medium">{proof.customerNotes}</p>
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-auto flex-wrap">
                      {proof.receiptImage && (
                        <button
                          onClick={() => setViewingReceipt(proof.receiptImage || null)}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5 text-blue-600" />
                          <span>View Receipt</span>
                        </button>
                      )}

                      {proof.status !== 'verified' && (
                        <button
                          onClick={() => handleUpdateProofStatus(proof.id, 'verified')}
                          className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1 shadow-md shadow-emerald-600/25 cursor-pointer"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Approve & Mark Paid</span>
                        </button>
                      )}

                      {proof.status !== 'rejected' && (
                        <button
                          onClick={() => handleUpdateProofStatus(proof.id, 'rejected')}
                          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-rose-50 hover:text-rose-600 text-slate-600 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>Reject</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 4: SETTINGS & MASTER PIN */}
        {/* ========================================================================= */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl space-y-6">
            <div className="p-5 sm:p-6 card-white rounded-3xl">
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                Business Profile & Security Password
              </h2>
              <p className="text-xs text-slate-500 mt-0.5 leading-relaxed">
                Update your business identity and modify your private administrator password.
              </p>
            </div>

            <form onSubmit={handleSaveSettings} className="card-white rounded-3xl p-6 sm:p-8 space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Business Name *</label>
                <input
                  type="text"
                  required
                  value={settingsForm.name}
                  onChange={(e) => setSettingsForm({ ...settingsForm, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Business Logo (URL or Upload Image)</label>
                <div className="flex items-center gap-3">
                  {settingsForm.logoUrl ? (
                    <div className="w-12 h-12 rounded-xl bg-slate-100 border border-slate-200 p-1 flex items-center justify-center shrink-0">
                      <img src={settingsForm.logoUrl} alt="Logo Preview" className="max-h-full max-w-full object-contain rounded" />
                    </div>
                  ) : (
                    <div className="w-12 h-12 rounded-xl bg-blue-100 text-blue-700 font-black text-xs flex items-center justify-center shrink-0">
                      {settingsForm.name ? settingsForm.name.slice(0, 2).toUpperCase() : 'LOGO'}
                    </div>
                  )}
                  <input
                    type="text"
                    placeholder="Paste image URL (https://... or data:image/...)"
                    value={settingsForm.logoUrl || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, logoUrl: e.target.value })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                  <label className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold cursor-pointer shrink-0 transition">
                    Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (re) => {
                            if (typeof re.target?.result === 'string') {
                              setSettingsForm({ ...settingsForm, logoUrl: re.target.result });
                            }
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                    />
                  </label>
                  {settingsForm.logoUrl && (
                    <button
                      type="button"
                      onClick={() => setSettingsForm({ ...settingsForm, logoUrl: '' })}
                      className="text-xs text-rose-500 hover:text-rose-700 shrink-0 font-semibold px-1"
                    >
                      Clear
                    </button>
                  )}
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Displayed on customer checkout header, payment amount card, and mobile viewports.
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Support Email</label>
                  <input
                    type="email"
                    value={settingsForm.supportEmail}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Support Phone</label>
                  <input
                    type="text"
                    value={settingsForm.supportPhone || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, supportPhone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              {/* Default Product & Pricing (Owner Controls) */}
              <div className="pt-4 border-t border-slate-100 space-y-3.5">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">Default Product & Pricing (Direct Link)</h3>
                    <p className="text-[11px] text-slate-500">
                      Configure the default product details and non-editable price displayed to customers on direct checkout links.
                    </p>
                  </div>
                  <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-200">
                    Owner Controlled
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Default Product / Deliverable Title</label>
                    <input
                      type="text"
                      placeholder="e.g. Standard Consultation & Creative Deliverable"
                      value={settingsForm.defaultProductTitle || ''}
                      onChange={(e) => setSettingsForm({ ...settingsForm, defaultProductTitle: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Base Currency</label>
                      <select
                        value={settingsForm.defaultCurrency || 'USD'}
                        onChange={(e) => setSettingsForm({ ...settingsForm, defaultCurrency: e.target.value })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-slate-900 font-bold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      >
                        <option value="GBP">🇬🇧 GBP (£)</option>
                        <option value="USD">🇺🇸 USD ($)</option>
                        <option value="EUR">🇪🇺 EUR (€)</option>
                        <option value="CAD">🇨🇦 CAD (CA$)</option>
                        <option value="AUD">🇦🇺 AUD (A$)</option>
                        <option value="CHF">🇨🇭 CHF (CHF)</option>
                        <option value="JPY">🇯🇵 JPY (¥)</option>
                        <option value="AED">🇦🇪 AED (AED)</option>
                        <option value="SGD">🇸🇬 SGD (S$)</option>
                        <option value="NZD">🇳🇿 NZD (NZ$)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Default Price</label>
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        placeholder="e.g. 250.00"
                        value={settingsForm.defaultAmount ?? 250}
                        onChange={(e) => setSettingsForm({ ...settingsForm, defaultAmount: parseFloat(e.target.value) || 0 })}
                        className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3 py-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Default Product / Deliverable Description</label>
                  <textarea
                    rows={2}
                    placeholder="Describe the product or deliverable provided to the customer..."
                    value={settingsForm.defaultProductDescription || ''}
                    onChange={(e) => setSettingsForm({ ...settingsForm, defaultProductDescription: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Default Review Section Header / Bold Text
                </label>
                <input
                  type="text"
                  placeholder="e.g. International Payment Summary"
                  value={settingsForm.defaultSectionHeader || ''}
                  onChange={(e) => setSettingsForm({ ...settingsForm, defaultSectionHeader: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 font-bold focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Prominent bold headline displayed above transaction details on the customer review screen.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Customer Settlement Notice</label>
                <textarea
                  rows={2}
                  value={settingsForm.customNotice}
                  onChange={(e) => setSettingsForm({ ...settingsForm, customNotice: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-4 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Security Password change */}
              <div className="pt-4 border-t border-slate-100">
                <label className="block text-slate-900 font-black mb-1 flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-amber-500" />
                  <span>Update Admin Password *</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Set your private password"
                  value={settingsForm.adminPin}
                  onChange={(e) => setSettingsForm({ ...settingsForm, adminPin: e.target.value })}
                  className="w-full bg-slate-50 border border-amber-300 rounded-2xl px-4 py-2.5 text-slate-900 font-mono text-sm tracking-wider focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[11px] text-slate-500 mt-1.5 block">
                  Only individuals with this password can unlock this admin console.
                </span>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  className="w-full sm:w-auto px-6 py-3 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-black transition shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  Save Business Settings
                </button>
              </div>
            </form>
          </div>
        )}
      </main>

      {/* MODAL: Add / Edit Payment Method */}
      {showMethodModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {editingMethod ? 'Edit Payment Method' : 'Add Payment Rail / Account'}
              </h3>
              <button
                onClick={() => setShowMethodModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveMethod} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Payment Rail</label>
                <select
                  value={methodFormData.type}
                  onChange={(e) => {
                    const t = e.target.value as PaymentMethodType;
                    setMethodFormData({
                      ...methodFormData,
                      type: t,
                      name:
                        t === 'paypal'
                          ? 'PayPal'
                          : t === 'zelle'
                          ? 'Zelle Direct'
                          : t === 'cashapp'
                          ? 'Cash App'
                          : t === 'venmo'
                          ? 'Venmo'
                          : t === 'bank_wire'
                          ? 'Bank Wire / ACH'
                          : t === 'crypto'
                          ? 'Crypto (USDT / USDC)'
                          : 'Custom Payment',
                    });
                  }}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                >
                  <option value="paypal">PayPal (Email / PayPal.me)</option>
                  <option value="zelle">Zelle (Email or Phone)</option>
                  <option value="cashapp">Cash App ($Cashtag)</option>
                  <option value="venmo">Venmo (@Handle)</option>
                  <option value="bank_wire">Bank Wire / ACH / SWIFT</option>
                  <option value="crypto">Cryptocurrency (BTC / ETH / USDT / USDC)</option>
                  <option value="revolut">Revolut Tag / Account</option>
                  <option value="wise">Wise Account Details</option>
                  <option value="custom">Other Custom Rail</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Method Display Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PayPal (Primary Business Account)"
                  value={methodFormData.name}
                  onChange={(e) => setMethodFormData({ ...methodFormData, name: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">
                    Account Number / Identifier *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 84920491 or wallet / email"
                    value={methodFormData.accountNumber || methodFormData.accountHandle}
                    onChange={(e) => {
                      const val = e.target.value;
                      setMethodFormData({
                        ...methodFormData,
                        accountNumber: val,
                        accountHandle: val,
                      });
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Account number displayed to customers
                  </span>
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Account Holder / Beneficiary</label>
                  <input
                    type="text"
                    placeholder="e.g. Intermediary Payment Network"
                    value={methodFormData.accountHolder}
                    onChange={(e) => setMethodFormData({ ...methodFormData, accountHolder: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Legal account name
                  </span>
                </div>
              </div>

              {/* Structured Bank Rails Fields */}
              <div className="p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
                <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 block">
                  Bank Clearing & Wire Rail Details (Editable)
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Intermediary Payment Network Clearing"
                      value={methodFormData.bankName}
                      onChange={(e) => setMethodFormData({ ...methodFormData, bankName: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Sort Code / Routing Number</label>
                    <input
                      type="text"
                      placeholder="e.g. 60-00-01"
                      value={methodFormData.sortCodeOrRouting}
                      onChange={(e) => setMethodFormData({ ...methodFormData, sortCodeOrRouting: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-slate-700 font-bold mb-1">SWIFT / BIC / IBAN</label>
                    <input
                      type="text"
                      placeholder="e.g. NWBKGB2L or GB29..."
                      value={methodFormData.swiftOrIban}
                      onChange={(e) => setMethodFormData({ ...methodFormData, swiftOrIban: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                    />
                  </div>
                </div>

                {/* Additional Custom Fields List */}
                <div className="pt-2 border-t border-blue-200/60">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[10px] uppercase font-bold text-slate-500">
                      Additional Custom Fields ({methodFormData.fields.filter(f => !/^(bank name|account holder|beneficiary|account number|sort code|routing|swift|bic|iban)$/i.test(f.label)).length})
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `f-${Date.now().toString(36)}`;
                        setMethodFormData({
                          ...methodFormData,
                          fields: [...methodFormData.fields, { id: newId, label: '', value: '', copyable: true }],
                        });
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-800 font-bold bg-white px-2 py-0.5 rounded-lg border border-blue-200 cursor-pointer"
                    >
                      + Add Custom Field
                    </button>
                  </div>

                  <div className="space-y-2">
                    {methodFormData.fields
                      .filter(f => !/^(bank name|account holder|beneficiary|account number|sort code|routing|swift|bic|iban)$/i.test(f.label))
                      .map((fld, idx) => (
                        <div key={fld.id || idx} className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Field Label (e.g. Branch)"
                            value={fld.label}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = methodFormData.fields.map(f => f.id === fld.id ? { ...f, label: val } : f);
                              setMethodFormData({ ...methodFormData, fields: updated });
                            }}
                            className="w-1/3 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-semibold"
                          />
                          <input
                            type="text"
                            placeholder="Field Value"
                            value={fld.value}
                            onChange={(e) => {
                              const val = e.target.value;
                              const updated = methodFormData.fields.map(f => f.id === fld.id ? { ...f, value: val } : f);
                              setMethodFormData({ ...methodFormData, fields: updated });
                            }}
                            className="flex-1 bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-xs text-slate-800 font-mono"
                          />
                          <button
                            type="button"
                            onClick={() => {
                              const updated = methodFormData.fields.filter(f => f.id !== fld.id);
                              setMethodFormData({ ...methodFormData, fields: updated });
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-white cursor-pointer"
                            title="Remove field"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Payer Instructions</label>
                <textarea
                  rows={2}
                  placeholder="Specific instructions for how the customer should send the payment..."
                  value={methodFormData.instructions}
                  onChange={(e) => setMethodFormData({ ...methodFormData, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  QR Code Link or Payment URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://paypal.me/handle or https://cash.app/$handle"
                  value={methodFormData.qrData}
                  onChange={(e) => setMethodFormData({ ...methodFormData, qrData: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 font-mono text-[11px] focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={methodFormData.isActive}
                    onChange={(e) => setMethodFormData({ ...methodFormData, isActive: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-slate-800 font-bold">Active (Visible to customers)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={methodFormData.isPrimary}
                    onChange={(e) => setMethodFormData({ ...methodFormData, isPrimary: e.target.checked })}
                    className="rounded border-slate-300 text-blue-600"
                  />
                  <span className="text-slate-800 font-bold">Recommended Badge</span>
                </label>
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowMethodModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  Save Method
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Create Payment Invoice */}
      {showInvoiceModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl relative my-8 border border-slate-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {editingInvoice ? `Edit Product Details & Price (#${editingInvoice.id})` : 'Create Payment Link / Product'}
              </h3>
              <button
                onClick={() => setShowInvoiceModal(false)}
                className="text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveInvoice} className="space-y-4 text-xs">
              <div>
                <label className="block text-slate-700 font-bold mb-1">
                  Unique Client Tracking ID *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. TRK-84920"
                    value={invoiceFormData.trackingId}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, trackingId: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 font-mono font-bold focus:outline-hidden focus:border-blue-600 focus:bg-white tracking-wider"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const auto = `TRK-${Math.floor(10000 + Math.random() * 90000)}`;
                      setInvoiceFormData({ ...invoiceFormData, trackingId: auto });
                    }}
                    className="px-3 py-2.5 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs shrink-0 cursor-pointer"
                    title="Generate new tracking ID"
                  >
                    🎲 Regenerate
                  </button>
                </div>
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Give this unique code to the client. When they enter it at checkout, their allotted price and details will load automatically.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Section Header / Bold Title</label>
                <input
                  type="text"
                  placeholder="e.g. International Payment Summary"
                  value={invoiceFormData.headerText}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, headerText: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 font-bold focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
                <span className="text-[11px] text-slate-500 mt-1 block">
                  Bold headline displayed at top of customer review card for this ID.
                </span>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Invoice / Deliverable Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Website Development Milestone 1"
                  value={invoiceFormData.title}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Amount (Price) *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="1"
                    required
                    placeholder="e.g. 500.00"
                    value={invoiceFormData.amount}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, amount: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 font-mono focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Currency</label>
                  <select
                    value={invoiceFormData.currency}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, currency: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  >
                    <option value="GBP">🇬🇧 GBP (£)</option>
                    <option value="USD">🇺🇸 USD ($)</option>
                    <option value="EUR">🇪🇺 EUR (€)</option>
                    <option value="CAD">🇨🇦 CAD (CA$)</option>
                    <option value="AUD">🇦🇺 AUD (A$)</option>
                    <option value="CHF">🇨🇭 CHF (CHF)</option>
                    <option value="JPY">🇯🇵 JPY (¥)</option>
                    <option value="AED">🇦🇪 AED (AED)</option>
                    <option value="SGD">🇸🇬 SGD (S$)</option>
                    <option value="NZD">🇳🇿 NZD (NZ$)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3.5">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Name (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Sarah Jenkins"
                    value={invoiceFormData.customerName}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Customer Email (Optional)</label>
                  <input
                    type="email"
                    placeholder="e.g. sarah@client.com"
                    value={invoiceFormData.customerEmail}
                    onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customerEmail: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Description / Memo</label>
                <textarea
                  rows={2}
                  placeholder="Details for the client to see on the payment screen..."
                  value={invoiceFormData.description}
                  onChange={(e) => setInvoiceFormData({ ...invoiceFormData, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-2xl px-3.5 py-2.5 text-slate-900 focus:outline-hidden focus:border-blue-600 focus:bg-white"
                />
              </div>

              {/* Client-Specific Account Details (Optional) */}
              <div className="pt-3 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <label className="text-slate-800 font-bold text-xs flex items-center gap-1.5 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={invoiceFormData.customDetailsEnabled}
                        onChange={(e) => setInvoiceFormData({ ...invoiceFormData, customDetailsEnabled: e.target.checked })}
                        className="rounded border-slate-300 text-blue-600"
                      />
                      <span>Assign Specific Account Details to this Client</span>
                    </label>
                    <span className="text-[10px] text-slate-500 block ml-5">
                      Input different bank / account details specific to this client's tracking ID
                    </span>
                  </div>
                  {invoiceFormData.customDetailsEnabled && (
                    <button
                      type="button"
                      onClick={() => {
                        const bankMethod = store?.methods.find(m => m.category === 'bank' || m.type === 'bank_wire') || store?.methods[0];
                        if (bankMethod) {
                          const bFieldSort = bankMethod.fields?.find(f => /sort|routing/i.test(f.label))?.value || '';
                          const bFieldAcc = bankMethod.fields?.find(f => /account/i.test(f.label))?.value || bankMethod.accountHandle || '';
                          const bFieldSwift = bankMethod.fields?.find(f => /swift|bic|iban/i.test(f.label))?.value || '';
                          const bName = bankMethod.fields?.find(f => /bank/i.test(f.label))?.value || bankMethod.name;
                          setInvoiceFormData(prev => ({
                            ...prev,
                            bankName: bName,
                            accountHolder: bankMethod.accountHolder || prev.accountHolder,
                            accountNumber: bFieldAcc || prev.accountNumber,
                            sortCodeOrRouting: bFieldSort || prev.sortCodeOrRouting,
                            swiftOrIban: bFieldSwift || prev.swiftOrIban,
                            instructions: bankMethod.instructions || prev.instructions,
                          }));
                        }
                      }}
                      className="text-[10px] text-blue-600 hover:text-blue-700 font-bold bg-blue-50 px-2 py-1 rounded-lg border border-blue-200 cursor-pointer"
                    >
                      Pre-fill from Rail
                    </button>
                  )}
                </div>

                {invoiceFormData.customDetailsEnabled && (
                  <div className="mt-3 p-3.5 bg-blue-50/60 rounded-2xl border border-blue-200/80 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Account Number *</label>
                        <input
                          type="text"
                          placeholder="e.g. 84920491"
                          value={invoiceFormData.accountNumber}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, accountNumber: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Bank Name</label>
                        <input
                          type="text"
                          placeholder="e.g. Intermediary Payment Network Clearing"
                          value={invoiceFormData.bankName}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, bankName: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Account Holder / Beneficiary</label>
                        <input
                          type="text"
                          placeholder="e.g. Intermediary Payment Network"
                          value={invoiceFormData.accountHolder}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, accountHolder: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Sort Code / Routing Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 60-00-01"
                          value={invoiceFormData.sortCodeOrRouting}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, sortCodeOrRouting: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">SWIFT / BIC / IBAN</label>
                        <input
                          type="text"
                          placeholder="e.g. NWBKGB2L"
                          value={invoiceFormData.swiftOrIban}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, swiftOrIban: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                      <div className="sm:col-span-2">
                        <label className="block text-slate-700 font-bold mb-1">Transfer Instructions</label>
                        <textarea
                          rows={2}
                          placeholder="Transfer instructions for this client..."
                          value={invoiceFormData.instructions}
                          onChange={(e) => setInvoiceFormData({ ...invoiceFormData, instructions: e.target.value })}
                          className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowInvoiceModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs font-bold transition shadow-md shadow-blue-500/25 cursor-pointer"
                >
                  {editingInvoice ? 'Save Product Details & Price' : 'Generate Share Link'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: View Full Receipt */}
      {viewingReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 p-4">
          <div className="max-w-2xl w-full bg-white rounded-3xl p-5 relative border border-slate-200 shadow-2xl">
            <button
              onClick={() => setViewingReceipt(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-900 p-2 font-bold cursor-pointer"
            >
              ✕ Close
            </button>
            <h4 className="text-sm font-black text-slate-900 mb-3">Customer Payment Screenshot</h4>
            <div className="max-h-[75vh] overflow-auto rounded-2xl border border-slate-200 bg-slate-50 flex justify-center p-2">
              <img src={viewingReceipt} alt="Customer Payment Receipt" className="max-w-full h-auto object-contain rounded-xl" />
            </div>
          </div>
        </div>
      )}
      {/* MODAL: Assign / Update Payment Details for Active Client Request */}
      {showAssignModal && selectedRequestForAssign && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-6 border border-slate-200">
            {/* Top Close */}
            <button
              onClick={() => setShowAssignModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
              <MethodIcon type={selectedRequestForAssign.methodType} size={28} />
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Assign Payment Details for {selectedRequestForAssign.methodName}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Client: <strong className="text-slate-800">{selectedRequestForAssign.customerName || 'Direct Checkout'}</strong> · Amount: <strong className="font-mono text-slate-900">{selectedRequestForAssign.currency} {Number(selectedRequestForAssign.amount || 0).toFixed(2)}</strong>
                </p>
              </div>
            </div>

            {/* Live countdown notice in modal */}
            {selectedRequestForAssign.status === 'pending' && (
              <div className="p-3 mb-4 rounded-2xl bg-amber-50 border border-amber-200 text-xs text-amber-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-semibold">
                  <Clock className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Customer is currently waiting on the 2-minute timer!</span>
                </span>
                <span className="font-mono font-bold text-amber-700 bg-white px-2 py-0.5 rounded border border-amber-200">
                  {Math.max(0, Math.round((new Date(selectedRequestForAssign.expiresAt).getTime() - Date.now()) / 1000))}s remaining
                </span>
              </div>
            )}

            <form onSubmit={handleSubmitAssign} className="space-y-4 text-xs">
              <div className="p-3 rounded-2xl bg-blue-50/70 border border-blue-200 text-blue-900 text-xs">
                <p className="font-semibold">Update Account Details for this Client</p>
                <p className="text-[11px] text-blue-700/80 mt-0.5">
                  You can enter new account details each time. The client will immediately see these details upon clicking Send.
                </p>
              </div>

              {/* Conditional Bank Details vs Digital Handle */}
              {selectedRequestForAssign.methodType === 'bank_wire' || (selectedRequestForAssign.methodName.toLowerCase().includes('bank') && !selectedRequestForAssign.methodName.toLowerCase().includes('zelle') && selectedRequestForAssign.methodType !== 'zelle') ? (
                <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
                  <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                    <Landmark className="w-4 h-4 text-blue-600" />
                    <span>Bank Transfer Account Details</span>
                  </span>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Bank Name *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. NatWest Bank Plc or Barclays"
                        value={assignFormData.bankName}
                        onChange={(e) => setAssignFormData({ ...assignFormData, bankName: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Account Number *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 84920491"
                        value={assignFormData.accountNumber}
                        onChange={(e) => setAssignFormData({ ...assignFormData, accountNumber: e.target.value, accountHandle: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Account Holder / Beneficiary *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Intermediary Payment Network"
                        value={assignFormData.accountHolder}
                        onChange={(e) => setAssignFormData({ ...assignFormData, accountHolder: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>

                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Sort Code / Routing *</label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. 20-40-71 or 021000021"
                        value={assignFormData.sortCodeOrRouting}
                        onChange={(e) => setAssignFormData({ ...assignFormData, sortCodeOrRouting: e.target.value })}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">SWIFT / BIC / IBAN (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. NWBKGB2L or GB29NWBK60161331926819"
                      value={assignFormData.swiftOrIban}
                      onChange={(e) => setAssignFormData({ ...assignFormData, swiftOrIban: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      {selectedRequestForAssign.methodType === 'paypal'
                        ? 'PayPal Email Address *'
                        : selectedRequestForAssign.methodType === 'zelle'
                        ? 'Zelle Email or Phone Number *'
                        : selectedRequestForAssign.methodType === 'cashapp'
                        ? 'Cash App $Cashtag *'
                        : selectedRequestForAssign.methodType === 'venmo'
                        ? 'Venmo @Handle or Phone *'
                        : selectedRequestForAssign.methodType === 'crypto'
                        ? 'Cryptocurrency Deposit Wallet Address *'
                        : selectedRequestForAssign.methodType === 'revolut'
                        ? 'Revolut Tag or Account Identifier *'
                        : selectedRequestForAssign.methodType === 'wise'
                        ? 'Wise Account Identifier / Email *'
                        : 'Active Account Handle / Identifier *'}
                    </label>
                    <input
                      type="text"
                      required
                      placeholder={
                        selectedRequestForAssign.methodType === 'paypal'
                          ? 'e.g. transfers.billing@outlook.com'
                          : selectedRequestForAssign.methodType === 'zelle'
                          ? 'e.g. pay@domain.com or +1 415 890 2341'
                          : selectedRequestForAssign.methodType === 'cashapp'
                          ? 'e.g. $MyBusinessTag'
                          : selectedRequestForAssign.methodType === 'crypto'
                          ? 'e.g. 0x71C8A3E9b98048fD9764585B5F3Eec0707D87a21'
                          : 'e.g. fresh.paypal@outlook.com or $Cashtag or wallet'
                      }
                      value={assignFormData.accountHandle}
                      onChange={(e) => setAssignFormData({ ...assignFormData, accountHandle: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                    <span className="text-[11px] text-slate-400 mt-0.5 block">
                      This is the exact handle, email, phone, or wallet address the client will see and copy.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-800 font-bold mb-1">
                      Account Beneficiary / Payee Name *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Intermediary Payment Network"
                      value={assignFormData.accountHolder}
                      onChange={(e) => setAssignFormData({ ...assignFormData, accountHolder: e.target.value })}
                      className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Transfer Instructions & Memo Requirement
                </label>
                <textarea
                  rows={2}
                  placeholder="Instructions for the customer..."
                  value={assignFormData.instructions}
                  onChange={(e) => setAssignFormData({ ...assignFormData, instructions: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              {/* Dynamic Custom Fields Editor */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[11px] font-bold text-slate-700">Custom Additional Fields (Optional)</span>
                  <button
                    type="button"
                    onClick={() => {
                      setAssignFormData({
                        ...assignFormData,
                        fields: [
                          ...assignFormData.fields,
                          { id: `f-${Date.now()}`, label: 'Reference / Memo', value: '', copyable: true },
                        ],
                      });
                    }}
                    className="text-blue-600 hover:text-blue-700 font-bold text-[11px] flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Custom Field</span>
                  </button>
                </div>

                {assignFormData.fields.length > 0 && (
                  <div className="space-y-2 mb-3">
                    {assignFormData.fields.map((f, idx) => (
                      <div key={f.id || idx} className="flex items-center gap-2">
                        <input
                          type="text"
                          placeholder="Label (e.g. Branch)"
                          value={f.label}
                          onChange={(e) => {
                            const newFields = [...assignFormData.fields];
                            newFields[idx].label = e.target.value;
                            setAssignFormData({ ...assignFormData, fields: newFields });
                          }}
                          className="w-1/3 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900"
                        />
                        <input
                          type="text"
                          placeholder="Value"
                          value={f.value}
                          onChange={(e) => {
                            const newFields = [...assignFormData.fields];
                            newFields[idx].value = e.target.value;
                            setAssignFormData({ ...assignFormData, fields: newFields });
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-900 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            setAssignFormData({
                              ...assignFormData,
                              fields: assignFormData.fields.filter((_, i) => i !== idx),
                            });
                          }}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  QR Code Link or Payment URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. https://paypal.me/apex or https://cash.app/$Apex"
                  value={assignFormData.qrData}
                  onChange={(e) => setAssignFormData({ ...assignFormData, qrData: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 font-mono text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Merchant Desk Note to Client (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Verified active account. Please quote reference code in payment notes."
                  value={assignFormData.adminNote}
                  onChange={(e) => setAssignFormData({ ...assignFormData, adminNote: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-slate-900 text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
              </div>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowAssignModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="submit"
                    disabled={assignSubmitting}
                    className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs transition shadow-md shadow-blue-500/25 flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>{assignSubmitting ? 'Sending...' : 'Send Details to Client'}</span>
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MODAL: PUSH PAYMENT DETAILS TO CUSTOMER (WORKFLOW STEP 4) */}
      {/* ========================================================================= */}
      {showPushModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/65 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 shadow-2xl relative my-6 border border-slate-200">
            {/* Top Close */}
            <button
              onClick={() => setShowPushModal(false)}
              className="absolute top-5 right-5 text-slate-400 hover:text-slate-700 p-1.5 rounded-xl hover:bg-slate-100 font-mono text-sm cursor-pointer"
            >
              ✕
            </button>

            {/* Modal Header */}
            <div className="flex items-center gap-3 pb-4 mb-4 border-b border-slate-100">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                <Landmark className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                  Push Transaction Details to Customer
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configure the transaction details dispatched to the customer review screen in real-time.
                </p>
              </div>
            </div>

            <form onSubmit={handleSubmitPush} className="space-y-4 text-xs">
              {/* Select Target Unique ID */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Target Client Unique ID *
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={pushFormData.invoiceId}
                    onChange={(e) => {
                      const selectedVal = e.target.value;
                      const matched = store?.invoices.find(i => (i.trackingId || i.id) === selectedVal || i.id === selectedVal);
                      if (matched) {
                        handleOpenPushModal(matched);
                      } else {
                        setPushFormData({ ...pushFormData, invoiceId: selectedVal });
                      }
                    }}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  >
                    {store?.invoices.map((inv) => {
                      const code = inv.trackingId || inv.id;
                      return (
                        <option key={inv.id} value={code}>
                          {code} — {inv.customerName || 'Direct'} ({inv.currency} {inv.amount}) [{inv.status.toUpperCase()}]
                        </option>
                      );
                    })}
                  </select>

                  {selectedInvoiceForPush?.status === 'waiting' && (
                    <span className="px-2.5 py-2 rounded-xl bg-amber-100 text-amber-800 font-mono font-bold text-[10px] border border-amber-300 animate-pulse shrink-0">
                      WAITING NOW
                    </span>
                  )}
                </div>
              </div>

              {/* Deliverable Title */}
              <div>
                <label className="block text-slate-800 font-bold mb-1">
                  Deliverable / Transaction Title *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. International Payment Summary"
                  value={pushFormData.title}
                  onChange={(e) => setPushFormData({ ...pushFormData, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-bold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white focus:ring-2 focus:ring-blue-500/20"
                />
                <span className="text-[10px] text-slate-400 mt-0.5 block">
                  Prominent headline displayed at the top of the client's transaction review screen.
                </span>
              </div>

              {/* Sender & Beneficiary */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Sender / Originator *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Intermediary Payment Network · Corporate Clearing"
                    value={pushFormData.senderName}
                    onChange={(e) => setPushFormData({ ...pushFormData, senderName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Dispatched as "Sender:" in customer ledger.
                  </span>
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">
                    Beneficiary (Customer Name) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Marcus Vance"
                    value={pushFormData.customerName}
                    onChange={(e) => setPushFormData({ ...pushFormData, customerName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-semibold text-xs focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                  <span className="text-[10px] text-slate-400 mt-0.5 block">
                    Dispatched as "Beneficiary:" in customer ledger.
                  </span>
                </div>
              </div>

              {/* Amounts and Currency */}
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-3">
                <span className="text-[11px] font-black uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-blue-600" />
                  <span>Transaction Amounts & Currency</span>
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Currency *</label>
                    <select
                      value={pushFormData.currency}
                      onChange={(e) => setPushFormData({ ...pushFormData, currency: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-bold text-xs focus:outline-hidden focus:border-blue-600"
                    >
                      <option value="USD">🇺🇸 USD ($)</option>
                      <option value="GBP">🇬🇧 GBP (£)</option>
                      <option value="EUR">🇪🇺 EUR (€)</option>
                      <option value="CAD">🇨🇦 CAD (CA$)</option>
                      <option value="AUD">🇦🇺 AUD (A$)</option>
                      <option value="CHF">🇨🇭 CHF (CHF)</option>
                      <option value="JPY">🇯🇵 JPY (¥)</option>
                      <option value="AED">🇦🇪 AED (AED)</option>
                      <option value="SGD">🇸🇬 SGD (S$)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Amount Tendered *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 250.00"
                      value={pushFormData.amountTendered}
                      onChange={(e) => handlePushAmountTenderedChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Handling / Transaction Fee ($) *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 320.00"
                      value={pushFormData.feeAmount}
                      onChange={(e) => handlePushFeeAmountChange(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1 border-t border-slate-200/80">
                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Transaction Date (Manual Edit) *</label>
                    <input
                      type="date"
                      required
                      value={pushFormData.transactionDate}
                      onChange={(e) => setPushFormData({ ...pushFormData, transactionDate: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-medium text-xs focus:outline-hidden focus:border-blue-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Edit to whichever date the payment was made. Dispatched to client view.
                    </span>
                  </div>

                  <div>
                    <label className="block text-slate-700 font-bold mb-1">Amount to Receive / Amount Received *</label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="e.g. 250.00"
                      value={pushFormData.amountToReceive}
                      onChange={(e) => setPushFormData({ ...pushFormData, amountToReceive: e.target.value })}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-900 font-mono font-bold text-xs focus:outline-hidden focus:border-blue-600"
                    />
                    <span className="text-[10px] text-slate-400 mt-0.5 block">
                      Auto-calculated: Amount Tendered minus Handling Fee.
                    </span>
                  </div>
                </div>
              </div>

              {/* Payment Reference Code */}
              <div className="pt-2 border-t border-slate-100">
                <label className="block text-slate-800 font-bold mb-1">
                  Payment Reference Code (Customer Quote) *
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    required
                    placeholder="e.g. NW-84920"
                    value={pushFormData.paymentRefCode}
                    onChange={(e) => setPushFormData({ ...pushFormData, paymentRefCode: e.target.value.toUpperCase() })}
                    className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-slate-900 font-mono font-black text-sm tracking-wider uppercase focus:outline-hidden focus:border-blue-600 focus:bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      const code = `NW-${Math.floor(10000 + Math.random() * 90000)}`;
                      setPushFormData({ ...pushFormData, paymentRefCode: code });
                    }}
                    className="px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl shrink-0 cursor-pointer"
                    title="Generate new reference code"
                  >
                    🎲 Regenerate
                  </button>
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Reference code attached to the customer transaction record.
                </span>
              </div>

              {/* Action Buttons */}
              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setShowPushModal(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={pushSubmitting}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 hover:from-blue-700 hover:to-indigo-800 text-white font-black text-xs sm:text-sm transition shadow-lg shadow-blue-500/25 flex items-center gap-2 cursor-pointer active:scale-98 disabled:opacity-50"
                >
                  {pushSubmitting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Pushing to Customer...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                      <span>Push to Customer Screen</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
