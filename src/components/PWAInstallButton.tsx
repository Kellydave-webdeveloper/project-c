import React, { useState } from 'react';
import { Download, CheckCircle, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact'
}) => {
  const { isInstallable, isInstalled, isIOS, promptInstall } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [installing, setInstalling] = useState(false);

  if (isInstalled) {
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-semibold rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 ${className}`}>
        <CheckCircle className="w-3.5 h-3.5 text-emerald-600" />
        <span>App Installed</span>
      </span>
    );
  }

  const handleInstallClick = async () => {
    if (isInstallable) {
      setInstalling(true);
      await promptInstall();
      setInstalling(false);
    } else if (isIOS) {
      setShowIOSGuide(true);
    } else {
      // In browsers where beforeinstallprompt hasn't fired yet or Chrome desktop
      setShowIOSGuide(true);
    }
  };

  return (
    <div className="relative inline-block">
      <button
        onClick={handleInstallClick}
        disabled={installing}
        title="Install IPN Pay as a Progressive Web App"
        className={`inline-flex items-center justify-center gap-1.5 text-xs font-bold transition-all shadow-sm rounded-lg cursor-pointer ${
          variant === 'compact'
            ? 'px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-700 border border-blue-200/80 active:scale-95'
            : 'px-4 py-2 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-blue-500/20 active:scale-98'
        } ${className}`}
      >
        <Download className="w-3.5 h-3.5" />
        <span>{installing ? 'Installing...' : 'Install App'}</span>
      </button>

      {/* Guide modal / tooltip for iOS or manual install */}
      {showIOSGuide && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl p-5 max-w-sm w-full shadow-2xl border border-slate-200 relative animate-in fade-in zoom-in duration-150">
            <button
              onClick={() => setShowIOSGuide(false)}
              className="absolute top-3.5 right-3.5 text-slate-400 hover:text-slate-600 p-1 rounded-lg"
            >
              <X className="w-4 h-4" />
            </button>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Download className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900">Install IPN Pay App</h3>
                <p className="text-xs text-slate-500">Standalone direct payment client</p>
              </div>
            </div>
            {isIOS ? (
              <div className="space-y-2.5 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                  <span>Tap the <strong>Share</strong> button <Share className="w-3.5 h-3.5 inline mx-0.5 text-blue-600" /> in Safari.</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                  <span>Scroll down and select <strong>&quot;Add to Home Screen&quot;</strong>.</span>
                </p>
                <p className="flex items-center gap-2 font-medium text-slate-800">
                  <span className="w-5 h-5 rounded-full bg-blue-600 text-white flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                  <span>Tap <strong>Add</strong> to install onto your home screen.</span>
                </p>
              </div>
            ) : (
              <div className="space-y-2 text-xs text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100">
                <p>
                  To install IPN Pay in Chrome or Edge:
                </p>
                <p className="font-medium text-slate-800">
                  Click the <strong>Install</strong> icon in the address bar (or Menu &gt; <strong>Install Intermediary Payment Network</strong>).
                </p>
              </div>
            )}
            <button
              onClick={() => setShowIOSGuide(false)}
              className="mt-4 w-full py-2 bg-blue-600 text-white text-xs font-bold rounded-xl hover:bg-blue-700 transition"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
