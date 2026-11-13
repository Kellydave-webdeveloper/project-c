import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';

interface QRCodeDisplayProps {
  value: string;
  size?: number;
  className?: string;
  label?: string;
}

export const QRCodeDisplay: React.FC<QRCodeDisplayProps> = ({
  value,
  size = 180,
  className = '',
  label,
}) => {
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!value) return;
    let isMounted = true;

    QRCode.toDataURL(value, {
      width: size * 2, // high DPI
      margin: 1.5,
      color: {
        dark: '#000000',
        light: '#FFFFFF',
      },
      errorCorrectionLevel: 'M',
    })
      .then((url) => {
        if (isMounted) {
          setDataUrl(url);
          setError(false);
        }
      })
      .catch((err) => {
        console.error('QR code generation error:', err);
        if (isMounted) setError(true);
      });

    return () => {
      isMounted = false;
    };
  }, [value, size]);

  if (error || !value) {
    return null;
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="p-2.5 bg-white rounded-xl shadow-xs border border-neutral-200">
        {dataUrl ? (
          <img
            src={dataUrl}
            alt="Payment QR Code"
            width={size}
            height={size}
            className="rounded-lg object-contain block"
          />
        ) : (
          <div
            style={{ width: size, height: size }}
            className="flex items-center justify-center bg-neutral-100 rounded-lg animate-pulse text-xs text-neutral-400"
          >
            Generating QR...
          </div>
        )}
      </div>
      {label && (
        <span className="text-[11px] text-neutral-400 mt-1.5 font-medium">
          {label}
        </span>
      )}
    </div>
  );
};
