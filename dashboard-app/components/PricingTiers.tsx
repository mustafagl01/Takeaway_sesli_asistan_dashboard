'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { PRESET_PACKAGE_DEFINITIONS } from '@/lib/pricing';

interface TierData {
    name: string;
    emoji: string;
    rate: string;
    rateSuffix: string;
    rangeLabel: string;
    totalRange: string;
    savings: string | null;
    features: string[];
    highlight: boolean;
    highlightLabel?: string;
    color: string;
    bgGradient: string;
    borderColor: string;
}

const tiers: TierData[] = [
    {
        name: PRESET_PACKAGE_DEFINITIONS.payg.label,
        emoji: '💳',
        rate: PRESET_PACKAGE_DEFINITIONS.payg.ratePence.toString(),
        rateSuffix: 'p / dakika',
        rangeLabel: 'Taahhütsüz',
        totalRange: 'Kullandığın kadar öde',
        savings: null,
        features: [
            'Sözleşme yok',
            'Minimum limit yok',
            'Dakika başı ücret',
        ],
        highlight: false,
        color: 'text-gray-600 dark:text-gray-400',
        bgGradient: 'from-gray-50 to-white dark:from-gray-800 dark:to-gray-800',
        borderColor: 'border-gray-200 dark:border-gray-700',
    },
    {
        name: PRESET_PACKAGE_DEFINITIONS.small.label,
        emoji: '🌱',
        rate: PRESET_PACKAGE_DEFINITIONS.small.ratePence.toString(),
        rateSuffix: 'p / dakika',
        rangeLabel: '200 – 400 dk paket',
        totalRange: '£36 – £72 toplam',
        savings: null,
        features: [
            'Küçük işletmeler için ideal',
            'Dakikalar bitene kadar geçerli',
            'Otomatik sipariş yönetimi',
        ],
        highlight: false,
        color: 'text-blue-600 dark:text-blue-400',
        bgGradient: 'from-blue-50 to-white dark:from-blue-900/20 dark:to-gray-800',
        borderColor: 'border-blue-200 dark:border-blue-700',
    },
    {
        name: PRESET_PACKAGE_DEFINITIONS.medium.label,
        emoji: '🚀',
        rate: PRESET_PACKAGE_DEFINITIONS.medium.ratePence.toString(),
        rateSuffix: 'p / dakika',
        rangeLabel: '401 – 800 dk paket',
        totalRange: '£64 – £128 toplam',
        savings: '%11 tasarruf',
        features: [
            'Orta ölçekli işletmeler',
            'Dakikalar bitene kadar geçerli',
            'Hacim indirimi avantajı',
        ],
        highlight: true,
        highlightLabel: '⭐ En Popüler',
        color: 'text-indigo-600 dark:text-indigo-400',
        bgGradient: 'from-indigo-50 to-white dark:from-indigo-900/20 dark:to-gray-800',
        borderColor: 'border-indigo-400 dark:border-indigo-500',
    },
    {
        name: PRESET_PACKAGE_DEFINITIONS.pro.label,
        emoji: '💎',
        rate: PRESET_PACKAGE_DEFINITIONS.pro.ratePence.toString(),
        rateSuffix: 'p / dakika',
        rangeLabel: '801 – 1500+ dk paket',
        totalRange: '£112 – £210+ toplam',
        savings: '%22 tasarruf',
        features: [
            'Yoğun işletmeler için',
            'Dakikalar bitene kadar geçerli',
            'En düşük birim fiyat',
        ],
        highlight: false,
        color: 'text-purple-600 dark:text-purple-400',
        bgGradient: 'from-purple-50 to-white dark:from-purple-900/20 dark:to-gray-800',
        borderColor: 'border-purple-200 dark:border-purple-700',
    },
];

const containerVariants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.1 } },
};

const cardVariants = {
    hidden: { opacity: 0, y: 30 },
    show: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.1, 0.25, 1] as const } },
};

export default function PricingTiers() {
    return (
        <div className="w-full max-w-6xl mx-auto">
            {/* Section Header */}
            <div className="text-center mb-10">
                <h2 className="text-3xl font-extrabold text-gray-900 dark:text-white mb-3">
                    Paket Karşılaştırması
                </h2>
                <p className="text-gray-500 dark:text-gray-400 max-w-xl mx-auto">
                    Daha fazla dakika alın, birim fiyat otomatik düşsün. Aşağıdaki tablodan hangi
                    kademenin size uygun olduğunu hemen görün.
                </p>
            </div>

            {/* Tier Cards Grid */}
            <motion.div
                variants={containerVariants}
                initial="hidden"
                whileInView="show"
                viewport={{ once: true, amount: 0.2 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6"
            >
                {tiers.map((t) => (
                    <motion.div
                        key={t.name}
                        variants={cardVariants}
                        className={`relative flex flex-col rounded-2xl border-2 bg-gradient-to-b ${t.bgGradient} ${t.borderColor} p-6 shadow-sm hover:shadow-lg transition-shadow ${t.highlight ? 'ring-2 ring-indigo-500 ring-offset-2 dark:ring-offset-gray-900 scale-[1.02]' : ''}`}
                    >
                        {/* Popular Badge */}
                        {t.highlightLabel && (
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-xs font-bold px-4 py-1 rounded-full shadow-md whitespace-nowrap">
                                {t.highlightLabel}
                            </div>
                        )}

                        {/* Emoji + Name */}
                        <div className="flex items-center gap-2 mb-4 mt-1">
                            <span className="text-2xl">{t.emoji}</span>
                            <h3 className="text-lg font-bold text-gray-900 dark:text-white">{t.name}</h3>
                        </div>

                        {/* Rate */}
                        <div className="mb-4">
                            <span className={`text-4xl font-extrabold ${t.color}`}>{t.rate}</span>
                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">{t.rateSuffix}</span>
                        </div>

                        {/* Savings Badge */}
                        {t.savings && (
                            <div className="mb-4 inline-flex self-start px-3 py-1 rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 text-xs font-bold">
                                🎉 {t.savings}
                            </div>
                        )}

                        {/* Range */}
                        <div className="text-sm text-gray-600 dark:text-gray-300 font-medium mb-1">
                            {t.rangeLabel}
                        </div>
                        <div className="text-sm text-gray-500 dark:text-gray-400 mb-5">
                            {t.totalRange}
                        </div>

                        {/* Divider */}
                        <div className="border-t border-gray-200 dark:border-gray-700 mb-4"></div>

                        {/* Features */}
                        <ul className="space-y-2 mb-6 flex-1">
                            {t.features.map((f, i) => (
                                <li key={i} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-300">
                                    <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                                    </svg>
                                    {f}
                                </li>
                            ))}
                        </ul>
                    </motion.div>
                ))}
            </motion.div>

            {/* Bottom Note */}
            <div className="mt-8 text-center">
                <p className="text-sm text-gray-500 dark:text-gray-400 max-w-2xl mx-auto">
                    💡 <strong>Nasıl çalışır?</strong> Aşağıdaki kaydırıcı ile tam ihtiyacınız kadar dakika seçin. Seçtiğiniz
                    dakika miktarı hangi kademeye giriyorsa, o kademenin birim fiyatı <em>tüm dakikalara</em> uygulanır.
                    Aldığınız paket bitene kadar kullanılabilir, süre sınırı yoktur.
                </p>
            </div>
        </div>
    );
}
