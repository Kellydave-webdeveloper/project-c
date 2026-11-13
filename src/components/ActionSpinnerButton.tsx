import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

interface ActionSpinnerButtonProps {
  onClick: () => void | Promise<void>;
  onBeforeClick?: () => boolean;
  disabled?: boolean;
  className?: string;
  children: React.ReactNode;
  loadingText?: string;
  durationMs?: number;
  type?: 'button' | 'submit';
}

export const ActionSpinnerButton: React.FC<ActionSpinnerButtonProps> = ({
  onClick,
  onBeforeClick,
  disabled = false,
  className = '',
  children,
  durationMs = 5000,
  type = 'button'
}) => {
  const [loading, setLoading] = useState(false);
  const timerRef = useRef<any>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
    if (loading || disabled) return;

    if (onBeforeClick && !onBeforeClick()) {
      return;
    }

    setLoading(true);

    timerRef.current = setTimeout(async () => {
      try {
        await onClick();
      } finally {
        setLoading(false);
      }
    }, durationMs);
  };

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={handleClick}
      className={`relative inline-flex items-center justify-center font-bold transition-all duration-200 select-none ${
        loading ? 'cursor-wait opacity-90' : 'cursor-pointer hover:brightness-105 active:scale-[0.99]'
      } ${className}`}
    >
      <span className="relative z-10 flex items-center justify-center gap-2">
        {loading && (
          <Loader2 className="w-4 h-4 animate-spin shrink-0 text-current" />
        )}
        {children}
      </span>
    </button>
  );
};


