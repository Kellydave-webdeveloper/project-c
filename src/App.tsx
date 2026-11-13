import React, { useState, useEffect } from 'react';
import { CustomerCheckout } from './components/CustomerCheckout';
import { AdminPortal } from './components/AdminPortal';

export default function App() {
  const [view, setView] = useState<'customer' | 'admin'>('customer');
  const [invoiceId, setInvoiceId] = useState<string | null>(null);

  useEffect(() => {
    // Check initial search params
    const searchParams = new URLSearchParams(window.location.search);
    const payParam = searchParams.get('pay');
    const adminParam = searchParams.get('admin');

    if (adminParam === 'true' || window.location.pathname.startsWith('/admin')) {
      setView('admin');
    } else if (payParam) {
      setInvoiceId(payParam);
      setView('customer');
    }

    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      const pay = params.get('pay');
      const admin = params.get('admin');
      if (admin === 'true') {
        setView('admin');
      } else {
        setView('customer');
        setInvoiceId(pay);
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  const handleOpenAdmin = () => {
    setView('admin');
    const url = new URL(window.location.href);
    url.searchParams.set('admin', 'true');
    url.searchParams.delete('pay');
    window.history.pushState({}, '', url.toString());
  };

  const handleBackToCustomer = () => {
    setView('customer');
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    window.history.pushState({}, '', url.toString());
  };

  const handleOpenInvoicePreview = (targetInvoiceId: string) => {
    setInvoiceId(targetInvoiceId);
    setView('customer');
    const url = new URL(window.location.href);
    url.searchParams.delete('admin');
    url.searchParams.set('pay', targetInvoiceId);
    window.history.pushState({}, '', url.toString());
  };

  return (
    <div
      style={{ backgroundColor: 'rgb(255, 247, 255)' }}
      className="min-h-screen text-slate-900 font-['Plus_Jakarta_Sans',sans-serif] bg-[rgb(255,247,255)]"
    >
      {view === 'admin' ? (
        <AdminPortal
          onBackToCustomer={handleBackToCustomer}
          onOpenInvoicePreview={handleOpenInvoicePreview}
        />
      ) : (
        <CustomerCheckout
          invoiceIdQuery={invoiceId}
          onOpenAdmin={handleOpenAdmin}
        />
      )}
    </div>
  );
}
