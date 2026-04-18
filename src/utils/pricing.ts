export interface PricingInput {
  pricePerNight: number;
  nights: number;
  discountPct?: number;
  taxPct?: number;
  extraNightSupplement?: number;
  depositPct?: number;
}

export interface PricingResult {
  subtotal: number;
  discountAmount: number;
  subtotalWithDiscount: number;
  extra: number;
  subtotalWithExtras: number;
  taxes: number;
  total: number;
  deposit: number;
}

export function calculateBookingPrice(input: PricingInput): PricingResult {
  const {
    pricePerNight,
    nights,
    discountPct = 0,
    taxPct = 10,
    extraNightSupplement = 0,
    depositPct = 50,
  } = input;

  const subtotal = pricePerNight * nights;
  const discountAmount = discountPct > 0 ? Math.round(subtotal * (discountPct / 100)) : 0;
  const subtotalWithDiscount = subtotal - discountAmount;
  const extra = extraNightSupplement * nights;
  const subtotalWithExtras = subtotalWithDiscount + extra;
  const taxes = Math.round(subtotalWithExtras * (taxPct / 100));
  const total = subtotalWithExtras + taxes;
  const deposit = Math.round(total * (depositPct / 100));

  return {
    subtotal,
    discountAmount,
    subtotalWithDiscount,
    extra,
    subtotalWithExtras,
    taxes,
    total,
    deposit,
  };
}
