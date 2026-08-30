'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import { isAdminEmail } from '@/lib/admin';
import {
  derivePaygRatePence,
  PRESET_PACKAGE_DEFINITIONS,
  PRESET_PACKAGE_OPTIONS,
  type PresetPackageKey,
} from '@/lib/pricing';

interface CustomerData {
  id: string;
  name: string;
  email: string;
  created_at: string;
  retell_webhook_token: string | null;
  retell_agent_id: string | null;
  subscription: {
    id: string;
    plan_name: string;
    total_minutes: number;
    used_minutes: number;
    remaining_minutes: number;
    rate_pence: number;
    payg_rate_pence: number | null;
    status: string;
    start_date: string;
    percent_used: number;
  } | null;
  next_subscription: {
    id: string;
    plan_name: string;
    total_minutes: number;
    rate_pence: number;
    created_at: string;
  } | null;
  total_calls: number;
}

interface RetellConfigFormState {
  retellApiKey: string;
  retellWebhookKey: string;
  retellAgentId: string;
}

type PackageMode = 'preset' | 'custom';

interface PackageFormState {
  mode: PackageMode;
  presetKey: PresetPackageKey;
  minutes: number;
  customPlanName: string;
  customMinutes: number;
  customRatePence: number;
}

interface CreateCustomerFormState {
  email: string;
  name: string;
  assignPackage: boolean;
  packageForm: PackageFormState;
}

interface CreateCustomerResult {
  customer: {
    id: string;
    email: string;
    name: string;
  };
  credentials: {
    email: string;
    password: string;
  };
  emailDelivery: {
    sent: boolean;
    error?: string;
  };
  packageSummary: string | null;
}

function getPresetDefaultMinutes(presetKey: PresetPackageKey): number {
  const preset = PRESET_PACKAGE_DEFINITIONS[presetKey];
  if (preset.isPayg) return 0;
  return preset.minMinutes || 200;
}

function defaultPackageFormState(): PackageFormState {
  return {
    mode: 'preset',
    presetKey: 'small',
    minutes: getPresetDefaultMinutes('small'),
    customPlanName: '',
    customMinutes: 200,
    customRatePence: 18,
  };
}

function buildPackageRequest(form: PackageFormState) {
  if (form.mode === 'preset') {
    return {
      mode: 'preset',
      presetKey: form.presetKey,
      minutes: form.presetKey === 'payg' ? 0 : form.minutes,
    };
  }

  return {
    mode: 'custom',
    planName: form.customPlanName,
    totalMinutes: form.customMinutes,
    ratePence: form.customRatePence,
  };
}

function getPackageSummary(form: PackageFormState): string {
  if (form.mode === 'preset') {
    const preset = PRESET_PACKAGE_OPTIONS.find((item) => item.key === form.presetKey);
    if (!preset) return '-';
    if (preset.isPayg) {
      return `${preset.label} | ${preset.ratePence}p/dk | PAYG aktif`;
    }

    return `${preset.label} | ${form.minutes} dk | ${preset.ratePence}p/dk | PAYG ${derivePaygRatePence(preset.ratePence)}p/dk`;
  }

  const fallback = derivePaygRatePence(form.customRatePence || 0);
  return `${form.customPlanName || 'Ozel Paket'} | ${form.customMinutes || 0} dk | ${form.customRatePence || 0}p/dk | PAYG ${fallback}p/dk`;
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

function ModalShell({
  title,
  subtitle,
  children,
  onClose,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="bg-white dark:bg-gray-900 rounded-2xl p-8 max-w-2xl w-full shadow-2xl border border-gray-200 dark:border-gray-700 max-h-[90vh] overflow-y-auto">
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <h3 className="text-xl font-bold text-gray-900 dark:text-white">{title}</h3>
            {subtitle ? (
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>
            ) : null}
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-xl text-sm text-gray-600 dark:text-gray-300 transition-colors"
          >
            Kapat
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function PackageFields({
  value,
  onChange,
}: {
  value: PackageFormState;
  onChange: (next: PackageFormState) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Paket Tipi</label>
          <select
            value={value.mode}
            onChange={(e) => onChange({ ...value, mode: e.target.value as PackageMode })}
            className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="preset">Hazir Paket</option>
            <option value="custom">Ozel Paket</option>
          </select>
        </div>

        {value.mode === 'preset' ? (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Hazir Paket</label>
            <select
              value={value.presetKey}
              onChange={(e) => {
                const presetKey = e.target.value as PresetPackageKey;
                onChange({
                  ...value,
                  presetKey,
                  minutes: getPresetDefaultMinutes(presetKey),
                });
              }}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            >
              {PRESET_PACKAGE_OPTIONS.map((preset) => (
                <option key={preset.key} value={preset.key}>
                  {preset.label} ({preset.ratePence}p/dk)
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Plan Adi</label>
            <input
              type="text"
              value={value.customPlanName}
              onChange={(e) => onChange({ ...value, customPlanName: e.target.value })}
              placeholder="Orn. Banka Transferi Paketi"
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        )}
      </div>

      {value.mode === 'preset' ? (
        value.presetKey === 'payg' ? (
          <div className="rounded-xl border border-amber-200 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20 p-4 text-sm text-amber-700 dark:text-amber-300">
            Bu secenekte dakika paketi acilmaz. Hesap direkt Pay As You Go modunda {PRESET_PACKAGE_DEFINITIONS.payg.ratePence}p/dk ile devam eder.
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dakika</label>
            <input
              type="number"
              min={value.presetKey === 'small' ? 200 : value.presetKey === 'medium' ? 401 : 801}
              max={value.presetKey === 'small' ? 400 : value.presetKey === 'medium' ? 800 : undefined}
              value={value.minutes}
              onChange={(e) => onChange({ ...value, minutes: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        )
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Toplam Dakika</label>
            <input
              type="number"
              min="1"
              value={value.customMinutes}
              onChange={(e) => onChange({ ...value, customMinutes: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Dakika Ucreti (p)</label>
            <input
              type="number"
              min="1"
              value={value.customRatePence}
              onChange={(e) => onChange({ ...value, customRatePence: parseInt(e.target.value, 10) || 0 })}
              className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
            />
          </div>
        </div>
      )}

      <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/70 dark:bg-indigo-950/30 p-4">
        <div className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300 font-semibold mb-2">
          Paket Ozeti
        </div>
        <div className="text-sm text-gray-800 dark:text-gray-100">{getPackageSummary(value)}</div>
      </div>
    </div>
  );
}

export default function AdminPage() {
  const router = useRouter();
  const { data: session, status } = useSession();

  const [customers, setCustomers] = useState<CustomerData[]>([]);
  const [appOrigin, setAppOrigin] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const [addMinutesModal, setAddMinutesModal] = useState<{ userId: string; name: string } | null>(null);
  const [minutesToAdd, setMinutesToAdd] = useState(100);

  const [createCustomerOpen, setCreateCustomerOpen] = useState(false);
  const [createCustomerForm, setCreateCustomerForm] = useState<CreateCustomerFormState>({
    email: '',
    name: '',
    assignPackage: false,
    packageForm: defaultPackageFormState(),
  });

  const [assignPackageModal, setAssignPackageModal] = useState<{ userId: string; name: string } | null>(null);
  const [assignPackageForm, setAssignPackageForm] = useState<PackageFormState>(defaultPackageFormState());
  const [queuePackageModal, setQueuePackageModal] = useState<{ userId: string; name: string } | null>(null);
  const [queuePackageForm, setQueuePackageForm] = useState<PackageFormState>(defaultPackageFormState());

  const [credentialResult, setCredentialResult] = useState<CreateCustomerResult | null>(null);
  const [copyMessage, setCopyMessage] = useState<string | null>(null);
  const [retellConfigOpenFor, setRetellConfigOpenFor] = useState<string | null>(null);
  const [retellForms, setRetellForms] = useState<Record<string, RetellConfigFormState>>({});
  const [retellSavingUserId, setRetellSavingUserId] = useState<string | null>(null);
  const [retellFeedback, setRetellFeedback] = useState<{ userId: string; type: 'success' | 'error'; text: string } | null>(null);

  const isAdmin = isAdminEmail(session?.user?.email);

  useEffect(() => {
    if (status === 'authenticated' && !isAdmin) {
      router.push('/dashboard');
    }
  }, [isAdmin, router, status]);

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/login');
    }
  }, [router, status]);

  useEffect(() => {
    if (status === 'authenticated' && isAdmin) {
      void fetchCustomers();
    }
  }, [isAdmin, status]);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setAppOrigin(window.location.origin);
    }
  }, []);

  useEffect(() => {
    if (!copyMessage) return undefined;
    const timer = window.setTimeout(() => setCopyMessage(null), 2500);
    return () => window.clearTimeout(timer);
  }, [copyMessage]);

  useEffect(() => {
    if (!retellFeedback) return undefined;
    const timer = window.setTimeout(() => setRetellFeedback(null), 4000);
    return () => window.clearTimeout(timer);
  }, [retellFeedback]);

  const summary = useMemo(() => {
    const activePackages = customers.filter((customer) => customer.subscription?.status === 'active').length;
    const paygAccounts = customers.filter((customer) => customer.subscription?.status === 'pay_as_you_go').length;
    const lowMinutes = customers.filter((customer) => {
      if (!customer.subscription || customer.subscription.status !== 'active') return false;
      return customer.subscription.remaining_minutes <= 50;
    }).length;

    return {
      totalCustomers: customers.length,
      activePackages,
      paygAccounts,
      lowMinutes,
    };
  }, [customers]);

  async function fetchCustomers() {
    try {
      setLoading(true);
      const res = await fetch('/api/admin/customers', { cache: 'no-store' });
      const data = await res.json();
      if (data.success) {
        setCustomers(data.data);
        setError('');
      } else {
        setError(data.error || 'Musteri listesi alinamadi');
      }
    } catch {
      setError('Sunucu hatasi');
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
      if (!data.success) {
        throw new Error(data.error || 'Hata olustu');
      }

      setAddMinutesModal(null);
      setMinutesToAdd(100);
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleAssignPackage() {
    if (!assignPackageModal) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'assign_package',
          userId: assignPackageModal.userId,
          packageConfig: buildPackageRequest(assignPackageForm),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Paket atanamadi');
      }

      setAssignPackageModal(null);
      setAssignPackageForm(defaultPackageFormState());
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleQueuePackage() {
    if (!queuePackageModal) return;
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'queue_package',
          userId: queuePackageModal.userId,
          packageConfig: buildPackageRequest(queuePackageForm),
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Siradaki paket kaydedilemedi');
      }

      setQueuePackageModal(null);
      setQueuePackageForm(defaultPackageFormState());
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCancelPackage(customer: CustomerData) {
    if (!customer.subscription || actionLoading) return;

    const confirmed = window.confirm(
      `${customer.name} icin aktif paket/PAYG kaydini iptal etmek istediginden emin misin?`
    );
    if (!confirmed) return;

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'cancel_package',
          userId: customer.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Paket iptal edilemedi');
      }

      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleDeleteCustomer(customer: CustomerData) {
    if (actionLoading) return;

    const confirmed = window.confirm(
      `${customer.email} hesabini tamamen silmek istediginden emin misin? Cagrilar ve aktif paketler de kaldirilir.`
    );
    if (!confirmed) return;

    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'delete_customer',
          userId: customer.id,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Musteri silinemedi');
      }

      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function handleCreateCustomer() {
    setActionLoading(true);

    try {
      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_customer',
          email: createCustomerForm.email,
          name: createCustomerForm.name,
          packageConfig: createCustomerForm.assignPackage
            ? buildPackageRequest(createCustomerForm.packageForm)
            : undefined,
        }),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Musteri olusturulamadi');
      }

      setCredentialResult(data.data as CreateCustomerResult);
      setCreateCustomerOpen(false);
      setCreateCustomerForm({
        email: '',
        name: '',
        assignPackage: false,
        packageForm: defaultPackageFormState(),
      });
      await fetchCustomers();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Sunucu hatasi');
    } finally {
      setActionLoading(false);
    }
  }

  async function copyText(label: string, value: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopyMessage(`${label} kopyalandi`);
    } catch {
      setCopyMessage('Kopyalama basarisiz oldu');
    }
  }

  function openRetellConfig(customer: CustomerData) {
    setRetellConfigOpenFor((prev) => (prev === customer.id ? null : customer.id));
    setRetellForms((prev) => ({
      ...prev,
      [customer.id]: prev[customer.id] || {
        retellApiKey: '',
        retellWebhookKey: '',
        retellAgentId: customer.retell_agent_id || '',
      },
    }));
  }

  function updateRetellForm(userId: string, updates: Partial<RetellConfigFormState>) {
    setRetellForms((prev) => ({
      ...prev,
      [userId]: {
        retellApiKey: prev[userId]?.retellApiKey || '',
        retellWebhookKey: prev[userId]?.retellWebhookKey || '',
        retellAgentId: prev[userId]?.retellAgentId || '',
        ...updates,
      },
    }));
  }

  function getWebhookUrl(customer: CustomerData) {
    if (!customer.retell_webhook_token) return '';
    return `${appOrigin || ''}/api/retell/webhook/${customer.retell_webhook_token}`;
  }

  async function handleRetellConfigSave(customer: CustomerData) {
    const form = retellForms[customer.id];
    if (!form) return;

    setRetellSavingUserId(customer.id);
    setRetellFeedback(null);

    try {
      const payload: Record<string, unknown> = {
        action: 'update_retell_config',
        userId: customer.id,
        retellAgentId: form.retellAgentId.trim() || null,
      };

      const nextRetellApiKey = form.retellApiKey.replace(/\r\n|\r|\n/g, '').trim();
      const nextRetellWebhookKey = form.retellWebhookKey.replace(/\r\n|\r|\n/g, '').trim();

      if (nextRetellApiKey) {
        payload.retellApiKey = nextRetellApiKey;
      }

      if (nextRetellWebhookKey) {
        payload.retellWebhookKey = nextRetellWebhookKey;
      }

      const res = await fetch('/api/admin/customers', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!data.success) {
        throw new Error(data.error || 'Retell ayarlari kaydedilemedi');
      }

      setRetellForms((prev) => ({
        ...prev,
        [customer.id]: {
          retellApiKey: '',
          retellWebhookKey: '',
          retellAgentId: form.retellAgentId.trim(),
        },
      }));
      setRetellFeedback({
        userId: customer.id,
        type: 'success',
        text: data.message || 'Retell ayarlari kaydedildi',
      });
      await fetchCustomers();
    } catch (err) {
      setRetellFeedback({
        userId: customer.id,
        type: 'error',
        text: err instanceof Error ? err.message : 'Sunucu hatasi',
      });
    } finally {
      setRetellSavingUserId(null);
    }
  }

  function getInitials(customer: CustomerData) {
    const source = customer.name?.trim() || customer.email;
    return source
      .split(' ')
      .map((part) => part.charAt(0).toUpperCase())
      .join('')
      .slice(0, 2);
  }

  function getUsageColor(percent: number) {
    if (percent >= 90) return 'bg-red-500';
    if (percent >= 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  }

  function getStatusChip(customer: CustomerData) {
    if (!customer.subscription) {
      return {
        label: 'Paket yok',
        className: 'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-300',
      };
    }

    if (customer.subscription.status === 'pay_as_you_go') {
      return {
        label: 'PAYG aktif',
        className: 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300',
      };
    }

    if (customer.subscription.remaining_minutes <= 0) {
      return {
        label: 'Paket tukenmis',
        className: 'bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300',
      };
    }

    if (customer.subscription.remaining_minutes <= 50) {
      return {
        label: 'Az dakika kaldi',
        className: 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300',
      };
    }

    return {
      label: 'Aktif',
      className: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300',
    };
  }

  if (status === 'loading' || (status === 'authenticated' && isAdmin && loading)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block h-10 w-10 animate-spin rounded-full border-4 border-solid border-indigo-500 border-r-transparent" />
          <p className="mt-4 text-gray-600 dark:text-gray-400">Admin paneli yukleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="max-w-md w-full rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-900/60 backdrop-blur-md p-8 text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-3">Yetki gerekli</h1>
          <p className="text-gray-600 dark:text-gray-400">
            Bu sayfa sadece admin hesabi icin acik. Yonetim olmayan hesaplar dashboard ana sayfasina yonlendirilir.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="aurora-bg">
        <div className="aurora-layer aurora-layer-1" />
        <div className="aurora-layer aurora-layer-2" />
        <div className="aurora-layer aurora-layer-3" />
        <div className="noise-overlay" />
      </div>

      <div className="relative min-h-screen">
        <div className="relative overflow-hidden">
          <div className="absolute inset-0 grid-pattern opacity-50" />
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 relative">
            <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
              <div>
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-gradient-to-r from-amber-500/10 to-orange-500/10 dark:from-amber-500/20 dark:to-orange-500/20 border border-amber-200/50 dark:border-amber-700/50 mb-6">
                  <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-medium text-amber-700 dark:text-amber-300">Admin Panel</span>
                </div>
                <h1 className="text-4xl sm:text-5xl font-bold">
                  <span className="gradient-text">Musteri Yonetimi</span>
                </h1>
                <p className="mt-3 text-lg text-gray-600 dark:text-gray-400 max-w-2xl">
                  Banka transferiyle gelen musterileri olustur, paket ata, dakika ekle ve giris bilgilerini tek yerden yonet.
                </p>
              </div>

              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={() => void fetchCustomers()}
                  className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white/80 dark:bg-gray-800/70 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                >
                  Yenile
                </button>
                <button
                  type="button"
                  onClick={() => setCreateCustomerOpen(true)}
                  className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold shadow-lg shadow-indigo-500/30 hover:shadow-xl hover:shadow-indigo-500/40 transition-all"
                >
                  Yeni Musteri Olustur
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-16 space-y-8">
          {error ? (
            <div className="rounded-2xl border border-red-200 dark:border-red-700 bg-red-50/80 dark:bg-red-950/30 px-5 py-4 text-red-700 dark:text-red-300">
              {error}
            </div>
          ) : null}

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <SummaryCard label="Toplam musteri" value={summary.totalCustomers.toString()} icon="👥" />
            <SummaryCard label="Aktif paket" value={summary.activePackages.toString()} icon="📦" />
            <SummaryCard label="PAYG hesap" value={summary.paygAccounts.toString()} icon="⚡" />
            <SummaryCard label="Az dakika kalan" value={summary.lowMinutes.toString()} icon="⏳" />
          </div>

          <div className="bg-white/85 dark:bg-gray-900/55 backdrop-blur-md rounded-2xl border border-gray-200 dark:border-gray-700 shadow-xl overflow-hidden">
            <div className="px-6 py-5 border-b border-gray-200 dark:border-gray-700">
              <h2 className="text-xl font-bold text-gray-900 dark:text-white">Musteriler</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Paket atama, iptal, dakika ekleme ve musteri silme islemleri buradan yapilir.
              </p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px]">
                <thead>
                  <tr className="bg-gray-50/70 dark:bg-gray-800/60 border-b border-gray-200 dark:border-gray-700">
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Musteri</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Paket</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Kullanim</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Cagrilar</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold uppercase tracking-wider text-gray-500">Durum</th>
                    <th className="px-6 py-4 text-right text-xs font-semibold uppercase tracking-wider text-gray-500">Islemler</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                  {customers.map((customer) => {
                    const statusChip = getStatusChip(customer);
                    const percentUsed = customer.subscription?.percent_used || 0;
                    const remaining = customer.subscription?.remaining_minutes || 0;
                    const retellForm = retellForms[customer.id] || {
                      retellApiKey: '',
                      retellWebhookKey: '',
                      retellAgentId: customer.retell_agent_id || '',
                    };
                    const webhookUrl = getWebhookUrl(customer);
                    const isRetellOpen = retellConfigOpenFor === customer.id;
                    const feedback = retellFeedback?.userId === customer.id ? retellFeedback : null;

                    return (
                      <React.Fragment key={customer.id}>
                        <tr className="hover:bg-indigo-500/5 dark:hover:bg-indigo-500/10 transition-colors">
                          <td className="px-6 py-5">
                            <div className="flex items-center gap-4">
                              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 text-white font-semibold flex items-center justify-center shadow-lg shadow-indigo-500/25">
                                {getInitials(customer)}
                              </div>
                              <div>
                                <div className="font-semibold text-gray-900 dark:text-white">{customer.name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">{customer.email}</div>
                                <div className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                  Olusturma: {new Date(customer.created_at).toLocaleDateString('en-GB')}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-5">
                            {customer.subscription ? (
                              <div className="space-y-1">
                                <div className="font-medium text-gray-900 dark:text-white">{customer.subscription.plan_name}</div>
                                <div className="text-sm text-gray-500 dark:text-gray-400">
                                  {customer.subscription.status === 'pay_as_you_go'
                                    ? `${customer.subscription.rate_pence}p/dk`
                                    : `${customer.subscription.total_minutes} dk | ${customer.subscription.rate_pence}p/dk`}
                                </div>
                                {customer.subscription.payg_rate_pence ? (
                                  <div className="text-xs text-gray-400 dark:text-gray-500">
                                    PAYG fallback: {customer.subscription.payg_rate_pence}p/dk
                                  </div>
                                ) : null}
                                {customer.next_subscription ? (
                                  <div className="text-xs text-indigo-600 dark:text-indigo-300 pt-1">
                                    Siradaki paket: {customer.next_subscription.plan_name} | {customer.next_subscription.total_minutes} dk | {customer.next_subscription.rate_pence}p/dk
                                  </div>
                                ) : null}
                              </div>
                            ) : (
                              <div className="space-y-1">
                                <span className="text-sm text-gray-500 dark:text-gray-400">Paket yok</span>
                                {customer.next_subscription ? (
                                  <div className="text-xs text-indigo-600 dark:text-indigo-300">
                                    Siradaki paket: {customer.next_subscription.plan_name} | {customer.next_subscription.total_minutes} dk | {customer.next_subscription.rate_pence}p/dk
                                  </div>
                                ) : null}
                              </div>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            {customer.subscription && customer.subscription.status !== 'pay_as_you_go' ? (
                              <div className="space-y-2 min-w-[220px]">
                                <div className="flex items-center justify-between text-sm">
                                  <span className="text-gray-500 dark:text-gray-400">
                                    {customer.subscription.used_minutes.toFixed(1)} / {customer.subscription.total_minutes} dk
                                  </span>
                                  <span className="font-semibold text-gray-900 dark:text-white">{remaining.toFixed(1)} dk</span>
                                </div>
                                <div className="w-full bg-gray-200 dark:bg-gray-800 rounded-full h-2.5 overflow-hidden">
                                  <div
                                    className={`h-full rounded-full ${getUsageColor(percentUsed)}`}
                                    style={{ width: `${Math.min(percentUsed, 100)}%` }}
                                  />
                                </div>
                              </div>
                            ) : customer.subscription?.status === 'pay_as_you_go' ? (
                              <span className="text-sm text-gray-500 dark:text-gray-400">Dakika paketi yok, kullandikca ode.</span>
                            ) : (
                              <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                            )}
                          </td>
                          <td className="px-6 py-5">
                            <div className="font-semibold text-gray-900 dark:text-white">{customer.total_calls}</div>
                            <div className="text-sm text-gray-500 dark:text-gray-400">toplam cagri</div>
                          </td>
                          <td className="px-6 py-5">
                            <span className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-semibold ${statusChip.className}`}>
                              {statusChip.label}
                            </span>
                          </td>
                          <td className="px-6 py-5">
                            <div className="flex flex-wrap items-center justify-end gap-3">
                              <button
                                type="button"
                                onClick={() => {
                                  setAssignPackageModal({ userId: customer.id, name: customer.name });
                                  setAssignPackageForm(defaultPackageFormState());
                                }}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-indigo-100 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300 hover:bg-indigo-200 dark:hover:bg-indigo-950/60 transition-colors text-sm font-medium"
                              >
                                Paket Ata
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setQueuePackageModal({ userId: customer.id, name: customer.name });
                                  setQueuePackageForm(defaultPackageFormState());
                                }}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300 hover:bg-sky-200 dark:hover:bg-sky-950/60 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Sonraki Paket
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setAddMinutesModal({ userId: customer.id, name: customer.name });
                                  setMinutesToAdd(100);
                                }}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300 hover:bg-emerald-200 dark:hover:bg-emerald-950/60 transition-colors text-sm font-medium"
                              >
                                + Dakika
                              </button>
                              <button
                                type="button"
                                onClick={() => openRetellConfig(customer)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300 hover:bg-violet-200 dark:hover:bg-violet-950/60 transition-colors text-sm font-medium"
                              >
                                {isRetellOpen ? 'Retell Gizle' : 'Retell Ayarlari'}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleCancelPackage(customer)}
                                disabled={actionLoading || !customer.subscription}
                                className="px-4 py-2 rounded-xl bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-950/60 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Paket Iptal
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleDeleteCustomer(customer)}
                                disabled={actionLoading}
                                className="px-4 py-2 rounded-xl bg-red-100 text-red-700 dark:bg-red-950/40 dark:text-red-300 hover:bg-red-200 dark:hover:bg-red-950/60 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                              >
                                Musteri Sil
                              </button>
                            </div>
                          </td>
                        </tr>

                        {isRetellOpen ? (
                          <tr>
                            <td colSpan={6} className="px-6 pb-6 pt-0">
                              <div className="rounded-2xl border border-violet-200/70 dark:border-violet-800/70 bg-violet-50/70 dark:bg-violet-950/20 p-5">
                                <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 mb-5">
                                  <div>
                                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">Retell Yapilandirmasi</h3>
                                    <p className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                                      Secret alanlari gizli tutulur. Yeni deger girmezsen mevcut keyler korunur.
                                    </p>
                                  </div>
                                  <span className="inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium bg-white/80 dark:bg-gray-900/50 text-violet-700 dark:text-violet-300 border border-violet-200/70 dark:border-violet-700/70">
                                    {customer.name}
                                  </span>
                                </div>

                                <div className="mb-5">
                                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Webhook URL</label>
                                  <div className="flex flex-col md:flex-row gap-3">
                                    <input
                                      type="text"
                                      value={webhookUrl || 'Henuz olusturulmadi'}
                                      readOnly
                                      className="flex-1 px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-700 dark:text-gray-200"
                                    />
                                    <button
                                      type="button"
                                      onClick={() => void copyText('Webhook URL', webhookUrl)}
                                      disabled={!webhookUrl}
                                      className="px-4 py-3 rounded-xl bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                      Kopyala
                                    </button>
                                  </div>
                                  <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                                    Token yoksa ilk kaydetme isleminde benzersiz webhook URL otomatik uretilir.
                                  </p>
                                </div>

                                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retell API Key</label>
                                    <input
                                      type="password"
                                      value={retellForm.retellApiKey}
                                      onChange={(e) => updateRetellForm(customer.id, { retellApiKey: e.target.value })}
                                      placeholder="Yeni key gir"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                      autoComplete="off"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Retell Webhook Key</label>
                                    <input
                                      type="password"
                                      value={retellForm.retellWebhookKey}
                                      onChange={(e) => updateRetellForm(customer.id, { retellWebhookKey: e.target.value })}
                                      placeholder="Yeni key gir"
                                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                      autoComplete="off"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Agent ID</label>
                                    <input
                                      type="text"
                                      value={retellForm.retellAgentId}
                                      onChange={(e) => updateRetellForm(customer.id, { retellAgentId: e.target.value })}
                                      placeholder="agent_..."
                                      className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-900 text-gray-900 dark:text-white"
                                      autoComplete="off"
                                    />
                                  </div>
                                </div>

                                {feedback ? (
                                  <div
                                    className={`mt-4 rounded-xl border px-4 py-3 text-sm ${
                                      feedback.type === 'success'
                                        ? 'border-emerald-200 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-300'
                                        : 'border-red-200 dark:border-red-700 bg-red-50/80 dark:bg-red-950/20 text-red-700 dark:text-red-300'
                                    }`}
                                  >
                                    {feedback.text}
                                  </div>
                                ) : null}

                                <div className="mt-5 flex items-center justify-between gap-4">
                                  <span className="text-xs text-gray-500 dark:text-gray-400">
                                    Agent ID bos birakilirsa temizlenir. Secret alanlari sadece yeni deger girilirse degisir.
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => void handleRetellConfigSave(customer)}
                                    disabled={retellSavingUserId === customer.id}
                                    className="px-5 py-3 rounded-xl bg-gradient-to-r from-violet-500 to-indigo-500 text-white font-semibold shadow-lg shadow-violet-500/25 disabled:opacity-60 disabled:cursor-not-allowed"
                                  >
                                    {retellSavingUserId === customer.id ? 'Kaydediliyor...' : 'Kaydet'}
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        ) : null}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {createCustomerOpen ? (
        <ModalShell
          title="Yeni Musteri Olustur"
          subtitle="Sistem guclu bir sifre uretir, istersen acilis aninda paket de tanimlar."
          onClose={() => {
            if (actionLoading) return;
            setCreateCustomerOpen(false);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleCreateCustomer();
            }}
            className="space-y-5"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  required
                  value={createCustomerForm.email}
                  onChange={(e) => setCreateCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                  placeholder="musteri@email.com"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Ad Soyad</label>
                <input
                  type="text"
                  value={createCustomerForm.name}
                  onChange={(e) => setCreateCustomerForm((prev) => ({ ...prev, name: e.target.value }))}
                  placeholder="Opsiyonel"
                  className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50/80 dark:bg-gray-800/50 p-4">
              <input
                type="checkbox"
                checked={createCustomerForm.assignPackage}
                onChange={(e) => setCreateCustomerForm((prev) => ({ ...prev, assignPackage: e.target.checked }))}
                className="mt-1 h-4 w-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>
                <span className="block font-medium text-gray-900 dark:text-white">Olustururken paket ata</span>
                <span className="block text-sm text-gray-500 dark:text-gray-400">
                  Stripe disinda banka transferiyle gelen musteriler icin kullan.
                </span>
              </span>
            </label>

            {createCustomerForm.assignPackage ? (
              <PackageFields
                value={createCustomerForm.packageForm}
                onChange={(packageForm) => setCreateCustomerForm((prev) => ({ ...prev, packageForm }))}
              />
            ) : null}

            <div className="rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/60 p-4 text-sm text-slate-600 dark:text-slate-300">
              Musteri olusunca sifre bir kez gosterilir ve SMTP ile email olarak da gonderilir.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setCreateCustomerOpen(false)}
                className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Vazgec
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? 'Olusturuluyor...' : 'Musteri Olustur'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {assignPackageModal ? (
        <ModalShell
          title="Paket Ata"
          subtitle={`${assignPackageModal.name} icin yeni paket tanimla. Mevcut aktif/PAYG kaydi otomatik kapanir.`}
          onClose={() => {
            if (actionLoading) return;
            setAssignPackageModal(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAssignPackage();
            }}
            className="space-y-5"
          >
            <PackageFields value={assignPackageForm} onChange={setAssignPackageForm} />

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAssignPackageModal(null)}
                className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Vazgec
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? 'Tanimlaniyor...' : 'Paketi Kaydet'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {queuePackageModal ? (
        <ModalShell
          title="Sonraki Paketi Kuyruga Al"
          subtitle={`${queuePackageModal.name} icin sonraki paketi hazirla. Aktif paket bitince otomatik devreye girer.`}
          onClose={() => {
            if (actionLoading) return;
            setQueuePackageModal(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleQueuePackage();
            }}
            className="space-y-5"
          >
            <PackageFields value={queuePackageForm} onChange={setQueuePackageForm} />

            <div className="rounded-xl border border-sky-200 dark:border-sky-700 bg-sky-50/80 dark:bg-sky-950/30 p-4 text-sm text-sky-700 dark:text-sky-300">
              Bu paket hemen aktif olmaz. Mevcut paket bittiginde otomatik olarak devreye girer.
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setQueuePackageModal(null)}
                className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Vazgec
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-sky-500 to-blue-500 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? 'Kaydediliyor...' : 'Siraya Al'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {addMinutesModal ? (
        <ModalShell
          title="+ Dakika Ekle"
          subtitle={`${addMinutesModal.name} icin mevcut pakete/top-up kaydina dakika ekle.`}
          onClose={() => {
            if (actionLoading) return;
            setAddMinutesModal(null);
          }}
        >
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void handleAddMinutes();
            }}
            className="space-y-5"
          >
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Eklenecek Dakika</label>
              <input
                type="number"
                min="1"
                value={minutesToAdd}
                onChange={(e) => setMinutesToAdd(parseInt(e.target.value, 10) || 0)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              />
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setAddMinutesModal(null)}
                className="px-5 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200"
              >
                Vazgec
              </button>
              <button
                type="submit"
                disabled={actionLoading}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white font-semibold disabled:opacity-60"
              >
                {actionLoading ? 'Ekleniyor...' : 'Dakika Ekle'}
              </button>
            </div>
          </form>
        </ModalShell>
      ) : null}

      {credentialResult ? (
        <ModalShell
          title="Musteri Hazir"
          subtitle="Bu sifre sadece bir kez gosterilir. Musteriye kopyalayabilir veya emailden gonderildigini kontrol edebilirsin."
          onClose={() => {
            setCredentialResult(null);
            setCopyMessage(null);
          }}
        >
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/30 p-4">
              <div className="font-semibold text-emerald-800 dark:text-emerald-300">{credentialResult.customer.name}</div>
              <div className="text-sm text-emerald-700 dark:text-emerald-200 mt-1">
                Hesap olusturuldu. Gecici giris bilgileri asagida.
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Email</div>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm text-gray-900 dark:text-white break-all">{credentialResult.credentials.email}</code>
                  <button
                    type="button"
                    onClick={() => void copyText('Email', credentialResult.credentials.email)}
                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                  >
                    Kopyala
                  </button>
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="text-xs uppercase tracking-wide text-gray-500 mb-2">Uretilen Sifre</div>
                <div className="flex items-center justify-between gap-3">
                  <code className="text-sm text-gray-900 dark:text-white break-all">{credentialResult.credentials.password}</code>
                  <button
                    type="button"
                    onClick={() => void copyText('Sifre', credentialResult.credentials.password)}
                    className="px-3 py-2 rounded-lg bg-gray-100 dark:bg-gray-800 text-sm"
                  >
                    Kopyala
                  </button>
                </div>
              </div>
            </div>

            {credentialResult.packageSummary ? (
              <div className="rounded-xl border border-indigo-200 dark:border-indigo-700 bg-indigo-50/80 dark:bg-indigo-950/30 p-4">
                <div className="text-xs uppercase tracking-wide text-indigo-600 dark:text-indigo-300 mb-2">Tanimlanan Paket</div>
                <div className="text-sm text-gray-900 dark:text-white">{credentialResult.packageSummary}</div>
              </div>
            ) : null}

            <div
              className={`rounded-xl p-4 ${
                credentialResult.emailDelivery.sent
                  ? 'border border-emerald-200 dark:border-emerald-700 bg-emerald-50/80 dark:bg-emerald-950/30'
                  : 'border border-amber-200 dark:border-amber-700 bg-amber-50/80 dark:bg-amber-950/30'
              }`}
            >
              <div className="font-medium text-gray-900 dark:text-white">
                {credentialResult.emailDelivery.sent ? 'SMTP gonderimi basarili' : 'SMTP gonderimi basarisiz'}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-300 mt-1">
                {credentialResult.emailDelivery.sent
                  ? 'Giris bilgileri musterinin email adresine gonderildi.'
                  : credentialResult.emailDelivery.error || 'Email gonderilemedi. Bilgileri manuel ilet.'}
              </div>
            </div>

            {copyMessage ? (
              <div className="text-sm text-indigo-600 dark:text-indigo-300">{copyMessage}</div>
            ) : null}

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setCredentialResult(null);
                  setCopyMessage(null);
                }}
                className="px-5 py-3 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-semibold"
              >
                Tamam
              </button>
            </div>
          </div>
        </ModalShell>
      ) : null}
    </>
  );
}
