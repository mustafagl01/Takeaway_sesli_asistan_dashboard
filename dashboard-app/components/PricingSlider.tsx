'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/**
 * Pricing Slider Component
 * 
 * An interactive slider that calculates weekly pricing based on minute tiers.
 * Tiers:
 * - 200 - 400 mins: 20p/min
 * - 401 - 800 mins: 18p/min
 * - 801 - 2000 mins: 15p/min
 */
export default function PricingSlider() {
    const [minutes, setMinutes] = useState(500);
    const [price, setPrice] = useState(0);
    const [tier, setTier] = useState<'Small' | 'Medium' | 'Pro'>('Medium');
    const [rate, setRate] = useState(0.18);

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let currentRate = 0.18;
        let currentTier: 'Small' | 'Medium' | 'Pro' = 'Small';

        if (minutes > 800) {
            currentRate = 0.14;
            currentTier = 'Pro';
        } else if (minutes > 400) {
            currentRate = 0.16;
            currentTier = 'Medium';
        } else {
            currentRate = 0.18;
            currentTier = 'Small';
        }

        setRate(currentRate);
        setTier(currentTier);
        setPrice(minutes * currentRate);
    }, [minutes]);

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
            if (!response.ok) throw new Error(data.error || 'Ödeme oturumu başlatılamadı.');

            if (data.url) {
                window.location.href = data.url;
            }
        } catch (err: any) {
            setError(err.message);
            setIsLoading(false);
        }
    };

    // Highlight logic for the "tweak" where 401 is cheaper than 400
    const isOptimalTransition = (minutes === 401 || (minutes > 800 && minutes < 810));

    return (
        <div className="w-full max-w-2xl mx-auto p-8 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-100 dark:border-gray-700">
            <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                    İhtiyacın Kadar Dakika Seç
                </h2>
                <p className="text-gray-500 dark:text-gray-400">
                    Haftalık görüşme hacmine göre paketini anlık oluştur.
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 rounded-lg border border-red-200 dark:border-red-800 text-sm">
                    {error}
                </div>
            )}

            {/* Price Display */}
            <div className="flex justify-center items-baseline gap-2 mb-10 overflow-hidden py-2">
                <AnimatePresence mode="popLayout">
                    <motion.span
                        key={price}
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 20 }}
                        transition={{ duration: 0.3, type: "spring", stiffness: 300, damping: 25 }}
                        className="text-5xl font-extrabold text-blue-600 dark:text-blue-400"
                    >
                        £{price.toFixed(2)}
                    </motion.span>
                </AnimatePresence>
                <span className="text-gray-500 dark:text-gray-400 font-medium">/ hafta</span>
            </div>

            {/* Slider */}
            <div className="relative mb-12">
                <input
                    type="range"
                    min="200"
                    max="2000"
                    step="1"
                    value={minutes}
                    onChange={(e) => setMinutes(parseInt(e.target.value))}
                    disabled={isLoading}
                    className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-blue-600 disabled:opacity-50"
                />
                <div className="flex justify-between mt-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">
                    <span>200 DK</span>
                    <span>1100 DK</span>
                    <span>2000 DK</span>
                </div>
            </div>

            {/* Metrics Row */}
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Seçilen Süre</p>
                    <p className="text-xl font-bold text-gray-900 dark:text-white">{minutes} Dakika</p>
                </div>
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-xl border border-gray-100 dark:border-gray-600">
                    <p className="text-sm text-gray-500 dark:text-gray-400">Dakika Fiyatı</p>
                    <p className="text-xl font-bold text-blue-600 dark:text-blue-400">{(rate * 100).toFixed(0)}p</p>
                </div>
            </div>

            {/* Tier Badge & Optimization Message */}
            <div className="flex flex-col items-center gap-4">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={tier}
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        whileHover={{ scale: 1.05 }}
                        transition={{ duration: 0.3 }}
                        className={`px-6 py-2 rounded-full text-sm font-bold tracking-wide uppercase shadow-md flex items-center gap-2 ${tier === 'Small' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                            tier === 'Medium' ? 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-300' :
                                'bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300'
                            }`}
                    >
                        {tier === 'Small' ? 'Small' : tier === 'Medium' ? 'Medium' : 'Pro'} Kademe Modu
                    </motion.div>
                </AnimatePresence>

                <AnimatePresence>
                    {minutes === 400 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg border border-green-200 dark:border-green-800 text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                            <span className="animate-bounce">🔥</span> Bir tık daha kaydır! 401 dakika yaparsan birim fiyatın 16p'ye düşecek.
                        </motion.div>
                    )}

                    {minutes === 800 && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 p-3 rounded-lg border border-green-200 dark:border-green-800 text-sm font-medium flex items-center gap-2 shadow-sm"
                        >
                            <span className="animate-bounce">🔥</span> 801 dakika yaparsan birim fiyatın 14p'ye (en ucuz) düşecek!
                        </motion.div>
                    )}

                    {((minutes > 400 && minutes <= 405) || (minutes > 800 && minutes <= 805)) && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="bg-green-100 dark:bg-green-900/40 text-green-800 dark:text-green-300 p-3 rounded-lg text-sm font-bold flex items-center gap-2 shadow-sm border border-green-200 dark:border-green-800/50"
                        >
                            <span>✅</span> Akıllı Seçim! Daha fazla dakika aldın ama birim fiyat düştü.
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Action Button */}
            <button
                onClick={handleCheckout}
                disabled={isLoading}
                className="w-full mt-8 py-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl transition-all shadow-lg hover:shadow-blue-500/25 active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Hazırlanıyor...
                    </>
                ) : 'Seçilen Paketi Satın Al'}
            </button>

            <p className="mt-4 text-center text-xs text-gray-400">
                * Dakika aşımları seçilen kademenin birim fiyatı üzerinden ({(rate * 100).toFixed(0)}p) ücretlendirilir.
            </p>
        </div>
    );
}
