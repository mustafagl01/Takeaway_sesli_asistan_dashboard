'use client';

import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { redirect } from 'next/navigation';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  created_at: string;
  subscription: {
    id: string;
    plan_name: string;
    total_minutes: number;
    used_minutes: number;
    remaining_minutes: number;
    rate_pence: number;
    status: string;
    start_date: string;
    percent_used: number;
  } | null;
  total_calls: number;
}

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [addMinutesModal, setAddMinutesModal] = useState<{ userId: string; name: string } | null>(null);
  const [minutesToAdd, setMinutesToAdd] = useState(100);
  const [actionLoading, setActionLoading] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  async function fetchCustomers() {
    try {
      const res = await fetch('/api/admin/customers');
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
      } else {
        setError(data.error || 'Müşteri listesi alınamadı');
      }
    } catch (err) {
      setError('Sunucu hatası');
    } finally {
      setLoading(false);
    }
  }

  async function handleAddMinutes() {
    if (!addMinutesModal) return;
    setActionLoading(true);
    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'add_minutes',
          userId: addMinutesModal.userId,
          minutes: minutesToAdd,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setAddMinutesModal(null);
        fetchCustomers(); // Refresh
      } else {
        alert(data.error || 'Hata oluştu');
      }
    } catch {
      alert('Sunucu hatası');
    } finally {
      setActionLoading(false);
    }
  }

  function getStatusBadge(status: string | undefined) {
    if (!status) return <span className="px-2 py-1 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400">Paket Yok</span>;
    const styles: Record<string, string> = {
      active: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400',
      pay_as_you_go: 'bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400',
      expired: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400',
    };
    const labels: Record<string, string> = {
      active: '✅ Aktif',
      pay_as_you_go: '⚡ PAYG',
      expired: '❌ Bitmiş',
    };
    return <span className={`px-2 py-1 text-xs font-bold rounded-full ${styles[status] || styles.expired}`}>{labels[status] || status}</span>;
  }

  function getProgressColor(percent: number) {
    if (percent > 90) return 'bg-red-500';
    if (percent > 75) return 'bg-amber-500';
    return 'bg-blue-600';
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-indigo-500 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <>
      {/* Aurora Background */}
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
        <div className="noise-overlay" />
      </div>

      <div className="relative min-h-screen">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          {/* Header */}
          <div className="mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-red-500/10 to-orange-500/10 border border-red-200/50 dark:border-red-700/50 mb-4">
              <span className="text-sm font-medium text-red-700 dark:text-red-300">🔒 Admin Panel</span>
            </div>
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white">Müşteri Dakika Yönetimi</h1>
            <p className="mt-2 text-gray-600 dark:text-gray-400">Tüm müşterilerin paket durumu, kalan dakikaları ve faturalandırma bilgileri</p>
          </div>

          {error && (
            <div className="p-4 mb-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-xl text-red-700 dark:text-red-400">
              {error}
            </div>
          )}

          {/* Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            <SummaryCard label="Toplam Müşteri" value={customers.length.toString()} icon="👥" />
            <SummaryCard label="Aktif Paket" value={customers.filter(c => c.subscription?.status === 'active').length.toString()} icon="✅" />
            <SummaryCard label="PAYG Modu" value={customers.filter(c => c.subscription?.status === 'pay_as_you_go').length.toString()} icon="⚡" />
            <SummaryCard label="Paketsiz" value={customers.filter(c => !c.subscription).length.toString()} icon="❌" />
          </div>

          {/* Customer Table */}
          <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Müşteri</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Paket</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Kullanım</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Durum</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">Aramalar</th>
                    <th className="px-6 py-4 text-left text-xs font-bold text-gray-500 dark:text-gray-400 uppercase">İşlem</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 dark:divide-gray-800">
                  {customers.map(customer => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
                        <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                      </td>
                      <td className="px-6 py-4">
                        {customer.subscription ? (
                          <div>
                            <div className="text-sm font-medium text-gray-900 dark:text-white">{customer.subscription.plan_name}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{customer.subscription.rate_pence}p/dk</div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 min-w-[200px]">
                        {customer.subscription ? (
                          <div>
                            <div className="flex justify-between text-xs mb-1">
                              <span className="text-gray-600 dark:text-gray-400">
                                {customer.subscription.used_minutes.toFixed(2)} / {customer.subscription.total_minutes} dk
                              </span>
                              <span className="font-bold text-blue-600 dark:text-blue-400">
                                {customer.subscription.remaining_minutes.toFixed(2)} dk kaldı
                              </span>
                            </div>
                            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                              <div
                                className={`h-full transition-all duration-500 ${getProgressColor(customer.subscription.percent_used)}`}
                                style={{ width: `${Math.min(100, customer.subscription.percent_used)}%` }}
                              />
                            </div>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-400">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(customer.subscription?.status)}
                      </td>
                      <td className="px-6 py-4">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{customer.total_calls}</span>
                      </td>
                      <td className="px-6 py-4">
                        <button
                          onClick={() => setAddMinutesModal({ userId: customer.id, name: customer.name })}
                          className="px-3 py-1.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors"
                        >
                          + Dakika Ekle
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Add Minutes Modal */}
      {addMinutesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-md w-full mx-4 shadow-2xl border border-gray-200 dark:border-gray-700">
            <h3 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Dakika Ekle</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              <strong>{addMinutesModal.name}</strong> hesabına dakika ekle
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eklenecek Dakika</label>
              <input
                type="number"
                min="1"
                value={minutesToAdd}
                onChange={e => setMinutesToAdd(parseInt(e.target.value) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleAddMinutes}
                disabled={actionLoading || minutesToAdd <= 0}
                className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
              >
                {actionLoading ? 'Ekleniyor...' : `${minutesToAdd} Dakika Ekle`}
              </button>
              <button
                onClick={() => setAddMinutesModal(null)}
                className="px-4 py-3 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 font-bold rounded-xl transition-colors"
              >
                İptal
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function SummaryCard({ label, value, icon }: { label: string; value: string; icon: string }) {
  return (
    <div className="bg-white/80 dark:bg-gray-900/50 backdrop-blur-md rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-lg">
      <div className="flex items-center gap-3">
        <span className="text-2xl">{icon}</span>
        <div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">{value}</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">{label}</div>
        </div>
      </div>
    </div>
  );
}
