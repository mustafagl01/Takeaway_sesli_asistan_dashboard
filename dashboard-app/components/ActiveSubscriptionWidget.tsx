'use client';

import React, { useEffect, useState } from 'react';
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

export default function ActiveSubscriptionWidget() {
    const [subscription, setSubscription] = useState<SubscriptionData | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchSubscription() {
            try {
                const response = await fetch('/api/billing/subscription');
                const data = await response.json();
                if (data.success && data.data) {
                    setSubscription(data.data);
                }
            } catch (error) {
                console.error('Failed to fetch subscription:', error);
            } finally {
                setLoading(false);
            }
        }
        fetchSubscription();
    }, []);

    if (loading) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 animate-pulse">
                <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-1/3 mb-4"></div>
                <div className="h-10 bg-gray-200 dark:bg-gray-700 rounded w-1/2 mb-4"></div>
                <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-full"></div>
            </div>
        );
    }

    if (!subscription) {
        return (
            <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 flex flex-col items-center justify-center text-center">
                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2">Aktif Plan Bulunamadı</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-4">Şu anda aktif bir aboneliğiniz bulunmuyor.</p>
                <a href="/dashboard/billing" className="text-blue-600 hover:text-blue-700 font-medium">Planları Görüntüle ➔</a>
            </div>
        );
    }

    const remainingMinutes = Math.max(0, subscription.total_minutes - subscription.used_minutes);
    const percentUsed = Math.min(100, (subscription.used_minutes / subscription.total_minutes) * 100);

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="p-6 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-gray-800 dark:to-gray-800 rounded-2xl shadow-sm border border-blue-100 dark:border-gray-700"
        >
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
                        {subscription.status === 'pay_as_you_go' ? '⚡ PAYG' : remainingMinutes > 0 ? 'Aktif' : 'Tükendi'}
                    </div>
                </div>
            </div>

            <div className="mb-2 flex justify-between text-sm font-medium">
                <span className="text-gray-700 dark:text-gray-300">Kullanılan: <span className="font-bold">{subscription.used_minutes.toFixed(2)} dk</span></span>
                <span className="text-gray-700 dark:text-gray-300">Kalan: <span className="font-bold text-blue-600 dark:text-blue-400">{remainingMinutes.toFixed(2)} dk</span></span>
            </div>

            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentUsed}%` }}
                    transition={{ duration: 1, ease: 'easeOut' }}
                    className={`h-full ${percentUsed > 90 ? 'bg-red-500' : percentUsed > 75 ? 'bg-yellow-500' : 'bg-blue-600'}`}
                />
            </div>

            <div className="mt-6 flex justify-end">
                <a href="/dashboard/billing" className="text-sm font-bold text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 transition-colors">
                    Planı Yenile / Değiştir ➔
                </a>
            </div>
        </motion.div>
    );
}
