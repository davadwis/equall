export type Currency =
  | "IDR"
  | "USD"
  | "EUR"
  | "SGD"
  | "MYR"
  | "JPY"
  | "GBP"
  | "AUD"
  | "CNY"
  | "KRW";

export const CURRENCIES: { value: Currency; label: string; symbol: string }[] =
  [
    { value: "IDR", label: "Indonesian Rupiah (IDR)", symbol: "Rp" },
    { value: "USD", label: "US Dollar (USD)", symbol: "$" },
    { value: "EUR", label: "Euro (EUR)", symbol: "€" },
    { value: "SGD", label: "Singapore Dollar (SGD)", symbol: "S$" },
    { value: "MYR", label: "Malaysian Ringgit (MYR)", symbol: "RM" },
    { value: "JPY", label: "Japanese Yen (JPY)", symbol: "¥" },
    { value: "GBP", label: "British Pound (GBP)", symbol: "£" },
    { value: "AUD", label: "Australian Dollar (AUD)", symbol: "A$" },
    { value: "CNY", label: "Chinese Yuan (CNY)", symbol: "¥" },
    { value: "KRW", label: "Korean Won (KRW)", symbol: "₩" },
  ];

export interface Session {
  id: string;
  name: string;
  currency: Currency;
  slug: string;
}

export interface MenuItem {
  id: string;
  name: string;
  totalQty: number;
  pricePerUnit: number;
  totalPrice: number;
  remainingQty: number;
}

export interface ClaimedItem {
  menuId: string;
  name: string;
  qty: number;
  pricePerUnit: number;
  subtotal: number;
}

export interface Person {
  id: string;
  name: string;
  claimedItems: ClaimedItem[];
}

export type ChargeType = "Tax" | "Service Charge" | "Tip" | "Custom";
export type ChargeMethod = "percentage" | "nominal";
export type ChargeApplyTo = "items" | "total";
export type ChargeDistribution = "proportional" | "equal";

export interface Charge {
  id: string;
  type: ChargeType;
  name: string;
  method: ChargeMethod;
  value: number;
  applyTo: ChargeApplyTo;
  distribution: ChargeDistribution;
}

export type PaymentType =
  | "bank_transfer"
  | "ewallet"
  | "paypal"
  | "crypto"
  | "custom";

export interface PaymentMethod {
  id: string;
  type: PaymentType;
  label: string;
  accountNumber: string;
  accountName: string;
  additionalInfo: string;
}

export interface PersonSummary {
  person: Person;
  itemSubtotal: number;
  chargeBreakdown: { chargeId: string; chargeName: string; amount: number }[];
  total: number;
}

export interface SplitBillState {
  session: Session | null;
  menuPool: MenuItem[];
  persons: Person[];
  charges: Charge[];
  paymentMethods: PaymentMethod[];
}
