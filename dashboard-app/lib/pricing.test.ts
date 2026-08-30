import {
  calculateEstimatedMonthlyBillInPennies,
  calculateMonthlyUsageInPennies,
  calculatePackagePriceInPennies,
  calculatePackageRatePence,
  isCreditPackageMinutes,
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
  it('reduces the per-minute rate for larger fixed packages', () => {
    expect(calculatePackagePriceInPennies(500)).toBe(11_500);
    expect(calculatePackageRatePence(500)).toBe(23);
    expect(calculatePackagePriceInPennies(1_000)).toBe(21_000);
    expect(calculatePackageRatePence(1_000)).toBe(21);
    expect(calculatePackagePriceInPennies(2_000)).toBe(40_000);
    expect(calculatePackageRatePence(2_000)).toBe(20);
  });

  it('accepts only the published fixed package sizes', () => {
    expect(isCreditPackageMinutes(500)).toBe(true);
    expect(isCreditPackageMinutes(750)).toBe(false);
    expect(() => calculatePackagePriceInPennies(750)).toThrow('Unsupported prepaid minute package');
  });
});
