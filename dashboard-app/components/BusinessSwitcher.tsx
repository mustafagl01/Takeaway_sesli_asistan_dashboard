'use client';

import React from 'react';
import { useBusiness } from '@/lib/BusinessContext';
import { ChevronDown, Store } from 'lucide-react';

export default function BusinessSwitcher() {
    const { activeBusinessId, setActiveBusinessId, businesses, isLoading } = useBusiness();

    if (isLoading || businesses.length === 0) {
        return (
            <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 dark:bg-gray-800 rounded-lg animate-pulse">
                <div className="w-5 h-5 bg-gray-200 dark:bg-gray-700 rounded-full"></div>
                <div className="w-24 h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
            </div>
        );
    }

    const activeBusiness = businesses.find(b => b.id === activeBusinessId) || businesses[0];

    return (
        <div className="relative group">
            <button className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all shadow-sm">
                <div className="w-6 h-6 rounded-lg bg-indigo-100 dark:bg-indigo-900/30 flex items-center justify-center text-indigo-600 dark:text-indigo-400">
                    {activeBusiness?.logo_url ? (
                        <img src={activeBusiness.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                    ) : (
                        <Store size={14} />
                    )}
                </div>
                <span className="text-sm font-semibold text-gray-700 dark:text-gray-200 max-w-[120px] truncate">
                    {activeBusiness?.name}
                </span>
                <ChevronDown size={14} className="text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-colors" />
            </button>

            {/* Dropdown menu */}
            <div className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl shadow-xl py-2 invisible group-hover:visible opacity-0 group-hover:opacity-100 transition-all z-50">
                <div className="px-4 py-2 text-xs font-bold text-gray-400 uppercase tracking-wider">
                    İşletmelerim
                </div>

                {businesses.map((business) => (
                    <button
                        key={business.id}
                        onClick={() => setActiveBusinessId(business.id)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left ${activeBusinessId === business.id ? 'bg-indigo-50/50 dark:bg-indigo-900/10' : ''
                            }`}
                    >
                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${activeBusinessId === business.id ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'bg-gray-100 dark:bg-gray-800 text-gray-500'
                            }`}>
                            {business.logo_url ? (
                                <img src={business.logo_url} alt="" className="w-full h-full rounded-lg object-cover" />
                            ) : (
                                <Store size={16} />
                            )}
                        </div>
                        <div className="flex flex-col">
                            <span className={`text-sm font-medium ${activeBusinessId === business.id ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-200'}`}>
                                {business.name}
                            </span>
                            <span className="text-xs text-gray-400">UK Takaway</span>
                        </div>
                    </button>
                ))}

                <div className="h-px bg-gray-100 dark:bg-gray-800 my-2"></div>

                <button className="w-full flex items-center gap-3 px-4 py-2 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors text-left text-gray-600 dark:text-gray-400">
                    <div className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <span className="text-lg font-bold">+</span>
                    </div>
                    <span className="text-sm font-medium">Yeni İşletme Ekle</span>
                </button>
            </div>
        </div>
    );
}
