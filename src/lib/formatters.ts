import type { Currency } from "../types";

export function formatCurrency(amount: number, currency: Currency): string {
  const localeMap: Record<Currency, string> = {
    IDR: "id-ID",
    USD: "en-US",
    EUR: "de-DE",
    SGD: "en-SG",
    MYR: "ms-MY",
    JPY: "ja-JP",
    GBP: "en-GB",
    AUD: "en-AU",
    CNY: "zh-CN",
    KRW: "ko-KR",
  };

  const fractionDigits: Record<Currency, number> = {
    IDR: 0,
    JPY: 0,
    KRW: 0,
    USD: 2,
    EUR: 2,
    SGD: 2,
    MYR: 2,
    GBP: 2,
    AUD: 2,
    CNY: 2,
  };

  return new Intl.NumberFormat(localeMap[currency], {
    style: "currency",
    currency,
    maximumFractionDigits: fractionDigits[currency],
    minimumFractionDigits: fractionDigits[currency],
  }).format(amount);
}

export function generateSlug(name: string): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .substring(0, 30);
  const random = Math.random().toString(36).substring(2, 7);
  return `${base}-${random}`;
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
