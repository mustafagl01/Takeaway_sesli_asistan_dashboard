import {
  calculateEstimatedMonthlyBillInPennies,
  calculateMonthlyUsageInPennies,
  calculatePackagePriceInPennies,
  calculatePackageRatePence,
  getBillingTierName,
  isPackageMinutesInRange,
  PAYG_RATE_PENCE,
  PLATFORM_MONTHLY_FEE_PENCE,
  PRINTER_ONE_TIME_FEE_PENCE,
} from './pricing';

describe('public usage pricing', () => {
  it('uses the fixed monthly fee plus 25p per actual minute', () => {
    expect(PAYG_RATE_PENCE).toBe(25);
    expect(PLATFORM_MONTHLY_FEE_PENCE).toBe(990);
    expect(PRINTER_ONE_TIME_FEE_PENCE).toBe(19_900);
    expect(calculateMonthlyUsageInPennies(300)).toBe(7_500);
    expect(calculateEstimatedMonthlyBillInPennies(300)).toBe(8_490);
  });
});

describe('prepaid credit pricing', () => {
  it('applies a single tiered rate to the whole package based on total minutes', () => {
    expect(calculatePackageRatePence(200)).toBe(25);
    expect(calculatePackageRatePence(201)).toBe(23);
    expect(calculatePackageRatePence(500)).toBe(23);
    expect(calculatePackageRatePence(501)).toBe(21);
    expect(calculatePackageRatePence(1_000)).toBe(21);
    expect(calculatePackageRatePence(1_001)).toBe(20);
    expect(calculatePackageRatePence(2_000)).toBe(20);

    expect(calculatePackagePriceInPennies(500)).toBe(11_500);
    expect(calculatePackagePriceInPennies(1_000)).toBe(21_000);
    expect(calculatePackagePriceInPennies(2_000)).toBe(40_000);
    // Crossing a tier boundary drops the rate for every minute in the package.
    expect(calculatePackagePriceInPennies(650)).toBe(650 * 21);
  });

  it('names the tier based on total minutes', () => {
    expect(getBillingTierName(150)).toBe('Giris');
    expect(getBillingTierName(500)).toBe('Small');
    expect(getBillingTierName(1_000)).toBe('Medium');
    expect(getBillingTierName(2_000)).toBe('Pro');
  });

  it('accepts any whole minute count within the supported range', () => {
    expect(isPackageMinutesInRange(1)).toBe(true);
    expect(isPackageMinutesInRange(650)).toBe(true);
    expect(isPackageMinutesInRange(2_000)).toBe(true);
    expect(isPackageMinutesInRange(0)).toBe(false);
    expect(isPackageMinutesInRange(2_001)).toBe(false);
    expect(isPackageMinutesInRange(650.5)).toBe(false);
  });
});
