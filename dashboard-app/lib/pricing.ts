export type PresetPackageKey = 'payg' | 'small' | 'medium' | 'pro';
export type BillingTierName = 'Small' | 'Medium' | 'Pro';
export const PLATFORM_MONTHLY_FEE_PENCE = 990;
export const PRINTER_ONE_TIME_FEE_PENCE = 19_900;
export const PAYG_RATE_PENCE = 25;

export interface PresetPackageDefinition {
  key: PresetPackageKey;
  label: string;
  planName: string;
  ratePence: number;
  minMinutes: number | null;
  maxMinutes: number | null;
  isPayg?: boolean;
}

export const PRESET_PACKAGE_DEFINITIONS: Record<PresetPackageKey, PresetPackageDefinition> = {
  payg: {
    key: 'payg',
    label: 'Pay As You Go',
    planName: 'Pay As You Go',
    ratePence: PAYG_RATE_PENCE,
    minMinutes: null,
    maxMinutes: null,
    isPayg: true,
  },
  small: {
    key: 'small',
    label: '500 Dakika',
    planName: '500 Dakika Kontör',
    ratePence: 23,
    minMinutes: 500,
    maxMinutes: 500,
  },
  medium: {
    key: 'medium',
    label: '1.000 Dakika',
    planName: '1.000 Dakika Kontör',
    ratePence: 21,
    minMinutes: 1_000,
    maxMinutes: 1_000,
  },
  pro: {
    key: 'pro',
    label: '2.000 Dakika',
    planName: '2.000 Dakika Kontör',
    ratePence: 20,
    minMinutes: 2_000,
    maxMinutes: 2_000,
  },
};

export const PRESET_PACKAGE_OPTIONS = Object.values(PRESET_PACKAGE_DEFINITIONS);
export const CREDIT_PACKAGE_MINUTES = [500, 1_000, 2_000] as const;

export function isCreditPackageMinutes(minutes: number): boolean {
  return CREDIT_PACKAGE_MINUTES.includes(minutes as (typeof CREDIT_PACKAGE_MINUTES)[number]);
}

export function calculatePackageRatePence(minutes: number): number {
  if (minutes === 500) return PRESET_PACKAGE_DEFINITIONS.small.ratePence;
  if (minutes === 1_000) return PRESET_PACKAGE_DEFINITIONS.medium.ratePence;
  if (minutes === 2_000) return PRESET_PACKAGE_DEFINITIONS.pro.ratePence;
  throw new RangeError('Unsupported prepaid minute package');
}

export function getBillingTierName(minutes: number): BillingTierName {
  if (minutes === 500) return 'Small';
  if (minutes === 1_000) return 'Medium';
  if (minutes === 2_000) return 'Pro';
  throw new RangeError('Unsupported prepaid minute package');
}

export function calculatePackagePriceInPennies(minutes: number): number {
  return minutes * calculatePackageRatePence(minutes);
}

export function calculateMonthlyUsageInPennies(minutes: number): number {
  return Math.max(0, minutes) * PAYG_RATE_PENCE;
}

export function calculateEstimatedMonthlyBillInPennies(minutes: number): number {
  return PLATFORM_MONTHLY_FEE_PENCE + calculateMonthlyUsageInPennies(minutes);
}

export function derivePaygRatePence(ratePence: number): number {
  void ratePence;
  return PAYG_RATE_PENCE;
}

export function isPresetMinutesValid(presetKey: PresetPackageKey, minutes: number): boolean {
  const preset = PRESET_PACKAGE_DEFINITIONS[presetKey];
  if (preset.isPayg) {
    return minutes === 0;
  }

  if (minutes <= 0) return false;
  if (preset.minMinutes != null && minutes < preset.minMinutes) return false;
  if (preset.maxMinutes != null && minutes > preset.maxMinutes) return false;
  return true;
}

export function buildPresetPlanName(presetKey: PresetPackageKey, minutes: number): string {
  const preset = PRESET_PACKAGE_DEFINITIONS[presetKey];
  if (preset.isPayg) {
    return preset.planName;
  }

  return `${preset.planName} (${minutes} dk)`;
}

export function describePresetRange(presetKey: PresetPackageKey): string {
  const preset = PRESET_PACKAGE_DEFINITIONS[presetKey];
  if (preset.isPayg) {
    return 'Kullandigin kadar ode';
  }

  if (preset.minMinutes === preset.maxMinutes) {
    return `${preset.minMinutes} dk`;
  }

  if (preset.maxMinutes == null) return `${preset.minMinutes}+ dk`;
  return `${preset.minMinutes}-${preset.maxMinutes} dk`;
}
