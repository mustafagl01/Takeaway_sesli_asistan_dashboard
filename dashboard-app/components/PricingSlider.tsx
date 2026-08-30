'use client';

import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { calculatePackagePriceInPennies, calculatePackageRatePence, getBillingTierName, PAYG_RATE_PENCE } from '@/lib/pricing';

interface BillingStateResponse {
  success: boolean;
  data: { status: string } | null;
  queuedPackage?: { id: string } | null;
  cardOnFile?: boolean;
  autoPaygEnabled?: boolean;
}

interface CheckoutResponse {
  error?: string;
  url?: string;
}

const MIN_MINUTES = 200;
const MAX_MINUTES = 2000;
const DEFAULT_MINUTES = 500;

function clampMinutes(value: number): number {
  return Math.min(MAX_MINUTES, Math.max(MIN_MINUTES, value));
}

export default function PricingSlider() {
  const [minutes, setMinutes] = useState(DEFAULT_MINUTES);
  const [minutesInput, setMinutesInput] = useState(String(DEFAULT_MINUTES));
  const [price, setPrice] = useState(calculatePackagePriceInPennies(DEFAULT_MINUTES) / 100);
  const [tier, setTier] = useState<'Small' | 'Medium' | 'Pro'>('Medium');
  const [rate, setRate] = useState(calculatePackageRatePence(DEFAULT_MINUTES) / 100);
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
    setPrice(calculatePackagePriceInPennies(minutes) / 100);
  }, [minutes]);

  useEffect(() => {
    setMinutesInput(String(minutes));
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

      const data = (await response.json()) as CheckoutResponse;

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

  const handleMinutesInputChange = (value: string) => {
    if (value === '') {
      setMinutesInput('');
      return;
    }

    if (!/^\d+$/.test(value)) {
      return;
    }

    setMinutesInput(value);

    const parsedValue = Number(value);
    if (parsedValue >= MIN_MINUTES && parsedValue <= MAX_MINUTES) {
      setMinutes(parsedValue);
    }
  };

  const commitMinutesInput = () => {
    if (minutesInput.trim() === '') {
      setMinutesInput(String(minutes));
      return;
    }

    const parsedValue = Number(minutesInput);
    if (Number.isNaN(parsedValue)) {
      setMinutesInput(String(minutes));
      return;
    }

    const normalizedMinutes = clampMinutes(parsedValue);
    setMinutes(normalizedMinutes);
    setMinutesInput(String(normalizedMinutes));
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

      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div className="w-full sm:max-w-[220px]">
          <label
            htmlFor="minutes-input"
            className="text-sm font-semibold text-gray-700 dark:text-gray-200"
          >
            Dakikayi Klavyeyle Gir
          </label>
          <div className="relative mt-2">
            <input
              id="minutes-input"
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              value={minutesInput}
              onChange={(e) => handleMinutesInputChange(e.target.value)}
              onBlur={commitMinutesInput}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.currentTarget.blur();
                }
              }}
              disabled={isLoading || hasQueuedPackage}
              aria-describedby="minutes-input-help"
              className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 pr-12 text-lg font-semibold text-gray-900 outline-none transition focus:border-blue-500 focus:ring-2 focus:ring-blue-100 disabled:opacity-50 dark:border-gray-600 dark:bg-gray-700 dark:text-white dark:focus:ring-blue-900/40"
            />
            <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-sm font-semibold text-gray-400">
              dk
            </span>
          </div>
        </div>
        <p
          id="minutes-input-help"
          className="text-xs leading-5 text-gray-500 dark:text-gray-400 sm:max-w-xs sm:text-right"
        >
          Mobilde daha rahat secim icin dakika degerini elle yazabilir, yine isterse slider ile ince ayar yapabilirsin.
        </p>
      </div>

      <div className="relative mb-12">
        <input
          type="range"
          min={String(MIN_MINUTES)}
          max={String(MAX_MINUTES)}
          step="1"
          value={minutes}
          onChange={(e) => setMinutes(clampMinutes(parseInt(e.target.value, 10)))}
          disabled={isLoading || hasQueuedPackage}
          className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
        />
        <div className="flex justify-between mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
          <span>{MIN_MINUTES} DK</span>
          <span>1100 DK</span>
          <span>{MAX_MINUTES} DK</span>
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
          Eger siradaki paketiniz yoksa ve kartiniz kayitliysa, mevcut paket bittiginde otomatik {PAYG_RATE_PENCE}p/dk PAYG moduna gecilebilir.
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
