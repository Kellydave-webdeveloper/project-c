import React from 'react';
import type { PaymentMethodType } from '../types/payment';
import {
  Building2,
  Coins,
  Zap,
  Smartphone,
  Globe2,
  CreditCard,
} from 'lucide-react';

interface MethodIconProps {
  type: PaymentMethodType;
  className?: string;
  size?: number;
}

export const MethodIcon: React.FC<MethodIconProps> = ({ type, className = '', size = 20 }) => {
  const containerSize = size + 16;

  switch (type) {
    case 'paypal':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-md shadow-blue-500/25 shrink-0 font-extrabold ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <svg className="w-5 h-5 fill-current" viewBox="0 0 24 24">
            <path d="M7.076 21.337H2.47a.641.641 0 0 1-.633-.74L4.944 3.72a.798.798 0 0 1 .788-.667h6.924c2.65 0 4.58.625 5.733 1.857 1.096 1.17 1.488 2.825 1.164 4.919-.512 3.32-2.735 5.568-6.608 5.568H9.84a.8.8 0 0 0-.79.673l-1.045 5.267h-.929z" />
          </svg>
        </div>
      );
    case 'zelle':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-purple-600 to-indigo-700 text-white shadow-md shadow-purple-500/25 shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <Zap size={size} className="fill-white" />
        </div>
      );
    case 'cashapp':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 text-white shadow-md shadow-emerald-500/25 shrink-0 font-bold ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <span className="font-mono text-base font-black">$</span>
        </div>
      );
    case 'venmo':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-sky-500 to-blue-600 text-white shadow-md shadow-sky-500/25 shrink-0 font-bold ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <span className="font-extrabold text-sm">V</span>
        </div>
      );
    case 'bank_wire':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-white shadow-md shadow-amber-500/25 shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <Building2 size={size} />
        </div>
      );
    case 'crypto':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-indigo-600 to-violet-700 text-white shadow-md shadow-indigo-500/25 shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <Coins size={size} />
        </div>
      );
    case 'revolut':
    case 'wise':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-teal-500 to-teal-700 text-white shadow-md shadow-teal-500/25 shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <Globe2 size={size} />
        </div>
      );
    case 'apple_pay':
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-900 to-slate-950 text-white shadow-md shadow-slate-900/25 shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <Smartphone size={size} />
        </div>
      );
    default:
      return (
        <div
          className={`flex items-center justify-center rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 text-white shadow-md shrink-0 ${className}`}
          style={{ width: containerSize, height: containerSize }}
        >
          <CreditCard size={size} />
        </div>
      );
  }
};
