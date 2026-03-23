'use client';

import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface SubscriptionData {
  plan_name: string;
  total_minutes: number;
  used_minutes: number;
  rate_pence: number;
  start_date: string;
  end_date: string;
  status: string;
}

interface BillingStateResponse {
  success: boolean;
  data: SubscriptionData | null;
  queuedPackage?: SubscriptionData | null;
  cardOnFile?: boolean;
  autoPaygEnabled?: boolean;
}

export default function ActiveSubscriptionWidget() {
  const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
  const [queuedPackage, setQueuedPackage] = useState<SubscriptionData | null>(null);
  const [cardOnFile, setCardOnFile] = useState(false);
  const [autoPaygEnabled, setAutoPaygEnabled] = useState(false);
  const [loading, setLoading] = useState(true);
  const requestInFlightRef = useRef(false);

  useEffect(() => {
    let isMounted = true;

    async function fetchSubscription(showLoader = false) {
      if (requestInFlightRef.current) return;
      requestInFlightRef.current = true;

      try {
        if (showLoader) {
          setLoading(true);
        }

        const response = await fetch('/api/billing/subscription', { cache: 'no-store' });
        const data = (await response.json()) as BillingStateResponse;
        if (!isMounted) return;

        if (data.success) {
          setSubscription(data.data ?? null);
          setQueuedPackage(data.queuedPackage ?? null);
          setCardOnFile(!!data.cardOnFile);
          setAutoPaygEnabled(!!data.autoPaygEnabled);
        }
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
      } finally {
        requestInFlightRef.current = false;
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    void fetchSubscription(true);

    const intervalId = window.setInterval(() => {
      if (!document.hidden) {
        void fetchSubscription();
      }
    }, 10000);

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        void fetchSubscription();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      isMounted = false;
      window.clearInterval(intervalId);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  if (loading) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
        <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4" />
        <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4" />
        <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full" />
      </div>
    );
  }

  if (!subscription && !queuedPackage) {
    return (
      <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
        <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aktif Plan Bulunamadi</h3>
        <p className="text-gray-500 dark:text-gray-400 mb-4">Su anda aktif bir paketiniz bulunmuyor.</p>
        <a href="/dashboard/billing" className="text-blue-600 hover:text-blue-700 font-medium">Planlari Goruntule</a>
      </div>
    );
  }

  const remainingMinutes = subscription
    ? Math.max(0, subscription.total_minutes - subscription.used_minutes)
    : 0;
  const percentUsed = subscription && subscription.total_minutes > 0
    ? Math.min(100, (subscription.used_minutes / subscription.total_minutes) * 100)
    : 0;

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700"
    >
      {subscription ? (
        <>
          <div className="flex justify-between items-start mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                <span className="text-2xl">⚡</span> {subscription.plan_name}
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                Birim Fiyat: {subscription.rate_pence}p / dk
              </p>
            </div>
            <div className="text-right">
              <div className="text-sm font-medium text-gray-500 dark:text-gray-400">Durum</div>
              <div className="text-xl font-extrabold text-green-600 dark:text-green-400">
                {subscription.status === 'pay_as_you_go' ? 'PAYG' : remainingMinutes > 0 ? 'Aktif' : 'Tukendi'}
              </div>
            </div>
          </div>

          {subscription.status === 'active' ? (
            <>
              <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="text-gray-700 dark:text-gray-300">
                  Kullanilan: <span className="font-bold">{subscription.used_minutes.toFixed(2)} dk</span>
                </span>
                <span className="text-gray-700 dark:text-gray-300">
                  Kalan: <span className="font-bold text-blue-600 dark:text-blue-400">{remainingMinutes.toFixed(2)} dk</span>
                </span>
              </div>

              <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${percentUsed}%` }}
                  transition={{ duration: 1, ease: 'easeOut' }}
                  className={`h-full ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-yellow-500' : 'bg-blue-600'}`}
                />
              </div>
            </>
          ) : (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-700 dark:bg-amber-950/20 dark:text-amber-300">
              Paketiniz bitmis durumda. Su anda kullandikca ode modundasiniz ve kullanimlariniz 20p/dk uzerinden haftalik tahsil edilir.
            </div>
          )}
        </>
      ) : null}

      {queuedPackage ? (
        <div className="mt-6 rounded-xl border border-indigo-200 bg-indigo-50/80 p-4 dark:border-indigo-700 dark:bg-indigo-950/20">
          <div className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300 font-semibold mb-2">
            Siradaki Paket
          </div>
          <div className="text-sm text-gray-800 dark:text-gray-100">
            {queuedPackage.plan_name} | {queuedPackage.total_minutes} dk | {queuedPackage.rate_pence}p/dk
          </div>
          <div className="text-xs text-gray-500 dark:text-gray-400 mt-2">
            Aktif paketiniz biter bitmez otomatik devreye girer.
          </div>
        </div>
      ) : null}

      <div className="mt-6 space-y-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-4 text-sm text-slate-700 dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-300">
          {cardOnFile && autoPaygEnabled
            ? 'Kartiniz kayitli. Eger siradaki paket yoksa mevcut paket bittiginde sistem otomatik 20p/dk PAYG moduna gecebilir.'
            : 'Kartiniz kayitli degil. Paketiniz bitmeden once bir sonraki paketi satin almanizi oneririz.'}
        </div>

        <div className="flex justify-end">
          <a
            href="/dashboard/billing"
            className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
          >
            {subscription?.status === 'active' ? 'Siradaki Paketi Ekle' : 'Plan Satin Al'}
          </a>
        </div>
      </div>
    </motion.div>
  );
}
