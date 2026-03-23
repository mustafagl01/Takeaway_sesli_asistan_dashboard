'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePackageRatePence, getBillingTierName } from '@/lib/pricing';

interface BillingStateResponse {
  success: boolean;
  data: { status: string } | null;
  queuedPackage?: { id: string } | null;
  cardOnFile?: boolean;
  autoPaygEnabled?: boolean;
}

export default function PricingSlider() {
  const [minutes, setMinutes] = useState(500);
  const [price, setPrice] = useState(0);
  const [tier, setTier] = useState<'Small' | 'Medium' | 'Pro'>('Medium');
  const [rate, setRate] = useState(0.18);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [hasActivePackage, setHasActivePackage] = useState(false);
  const [hasQueuedPackage, setHasQueuedPackage] = useState(false);
  const [cardOnFile, setCardOnFile] = useState(false);
  const [autoPaygEnabled, setAutoPaygEnabled] = useState(false);

  useEffect(() => {
    const currentRate = calculatePackageRatePence(minutes) / 100;
    const currentTier = getBillingTierName(minutes);

    setRate(currentRate);
    setTier(currentTier);
    setPrice(minutes * currentRate);
  }, [minutes]);

  useEffect(() => {
    let cancelled = false;

    async function fetchState() {
      try {
        const response = await fetch('/api/billing/subscription', { cache: 'no-store' });
        const data = (await response.json()) as BillingStateResponse;
        if (cancelled || !data.success) return;
        setHasActivePackage(data.data?.status === 'active');
        setHasQueuedPackage(!!data.queuedPackage);
        setCardOnFile(!!data.cardOnFile);
        setAutoPaygEnabled(!!data.autoPaygEnabled);
      } catch (fetchError) {
        console.error('Failed to fetch billing state:', fetchError);
      }
    }

    void fetchState();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleCheckout = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ minutes }),
      });

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 401) {
          window.location.href = '/login?callbackUrl=/dashboard/billing';
          return;
        }
        throw new Error(data.error || 'Odeme oturumu baslatilamadi.');
      }

      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const buttonLabel = hasActivePackage ? 'Siradaki Paketi Satin Al' : 'Secilen Paketi Satin Al';

  return (
    <div className="w-full max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Ihtiyacin Kadar Dakika Sec
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Dakika paketini olustur, bitene kadar kullan. Aktif paketin varsa yeni satin alim siradaki paket olarak kaydedilir.
        </p>
      </div>

      {error ? (
        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
          {error}
        </div>
      ) : null}

      {hasQueuedPackage ? (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300 text-sm">
          Sirada zaten bir sonraki paketiniz var. Yeni satin alimdan once o paketin devreye girmesini bekleyin veya admin ile degistirin.
        </div>
      ) : null}

      <div className="flex justify-center items-baseline gap-2 mb-10 overflow-hidden py-2">
        <AnimatePresence mode="popLayout">
          <motion.span
            key={price}
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.3, type: 'spring', stiffness: 300, damping: 25 }}
            className="text-5xl font-extrabold text-blue-600 dark:text-blue-400"
          >
            £{price.toFixed(2)}
          </motion.span>
        </AnimatePresence>
        <span className="text-gray-500 dark:text-gray-400 font-medium">toplam</span>
      </div>

      <div className="relative mb-12">
        <input
          type="range"
          min="200"
          max="2000"
          step="1"
          value={minutes}
          onChange={(e) => setMinutes(parseInt(e.target.value, 10))}
          disabled={isLoading || hasQueuedPackage}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
        />
        <div className="flex justify-between mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>200 DK</span>
          <span>1100 DK</span>
          <span>2000 DK</span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-8">
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">Secilen Sure</p>
          <p className="text-xl font-bold text-gray-900 dark:text-white">{minutes} Dakika</p>
        </div>
        <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
          <p className="text-sm text-gray-500 dark:text-gray-400">Dakika Fiyati</p>
          <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{(rate * 100).toFixed(0)}p</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={tier}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            whileHover={{ scale: 1.05 }}
            transition={{ duration: 0.3 }}
            className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide uppercase shadow-md flex items-center gap-2 ${
              tier === 'Small'
                ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300'
                : tier === 'Medium'
                  ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300'
                  : 'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
            }`}
          >
            {tier} Kademe Modu
          </motion.div>
        </AnimatePresence>
      </div>

      <button
        onClick={handleCheckout}
        disabled={isLoading || hasQueuedPackage}
        className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {isLoading ? 'Hazirlaniyor...' : buttonLabel}
      </button>

      <div className="mt-4 text-center text-xs text-gray-500 dark:text-gray-400 space-y-2">
        <p>
          Satin aldiginiz dakikalar bitene kadar gecerlidir, sure siniri yoktur.
        </p>
        <p>
          Eger siradaki paketiniz yoksa ve kartiniz kayitliysa, mevcut paket bittiginde otomatik 20p/dk PAYG moduna gecilebilir.
        </p>
        <p>
          {cardOnFile && autoPaygEnabled
            ? 'Kartiniz guvenli sekilde Stripe uzerinde kayitli. PAYG gecisinde kullanimlar haftalik tahsil edilebilir.'
            : 'Kart kaydi olmayan musteriler icin paket bitmeden once yeni paket satin alinmasi onerilir.'}
        </p>
      </div>
    </div>
  );
}
