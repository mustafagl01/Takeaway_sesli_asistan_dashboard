export type PresetPackageKey = 'payg' | 'small' | 'medium' | 'pro';
export type BillingTierName = 'Small' | 'Medium' | 'Pro';
export const PAYG_RATE_PENCE = 20;

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
    label: 'Small',
    planName: 'Small Paket',
    ratePence: 18,
    minMinutes: 200,
    maxMinutes: 400,
  },
  medium: {
    key: 'medium',
    label: 'Medium',
    planName: 'Medium Paket',
    ratePence: 16,
    minMinutes: 401,
    maxMinutes: 800,
  },
  pro: {
    key: 'pro',
    label: 'Pro',
    planName: 'Pro Paket',
    ratePence: 14,
    minMinutes: 801,
    maxMinutes: null,
  },
};

export const PRESET_PACKAGE_OPTIONS = Object.values(PRESET_PACKAGE_DEFINITIONS);

export function calculatePackageRatePence(minutes: number): number {
  if (minutes > 800) return PRESET_PACKAGE_DEFINITIONS.pro.ratePence;
  if (minutes > 400) return PRESET_PACKAGE_DEFINITIONS.medium.ratePence;
  return PRESET_PACKAGE_DEFINITIONS.small.ratePence;
}

export function getBillingTierName(minutes: number): BillingTierName {
  if (minutes > 800) return 'Pro';
  if (minutes > 400) return 'Medium';
  return 'Small';
}

export function calculatePackagePriceInPennies(minutes: number): number {
  return Math.round(minutes * (calculatePackageRatePence(minutes) / 100) * 100);
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

  if (preset.maxMinutes == null) {
    return `${preset.minMinutes}+ dk`;
  }

  return `${preset.minMinutes}-${preset.maxMinutes} dk`;
}
