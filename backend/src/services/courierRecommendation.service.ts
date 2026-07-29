// Phase 6.5 §5 — Courier Recommendation Engine
// Customer NEVER sees courier names — only estimated charge and time.
// Admin sees full recommendation with reasoning.
// All courier-specific pricing is internal-only.

export type Zone = 'dhaka_city' | 'dhaka_district' | 'outside_dhaka';

export interface CourierOption {
  name: string;           // internal only — never sent to customer
  estimatedCharge: number;
  estimatedDays: number;
  minDays: number;
  maxDays: number;
  reason: string;         // admin-facing explanation
  isRecommended: boolean;
}

export interface CustomerDeliveryView {
  estimatedCharge: string;   // e.g. "৳80–100"
  deliveryTime: string;      // e.g. "Within 2 Days"
  disclaimer: string;
}

// Per-courier base rates (internal, never exposed to customer)
const COURIER_RATES: Record<string, {
  dhakaCity: number; dhakaDistrict: number; outsideDhaka: number;
  dhakaMinDays: number; dhakaMaxDays: number;
  outMinDays: number; outMaxDays: number;
  weightLimitKg: number; extraPerKg: number;
}> = {
  Steadfast: { dhakaCity: 80,  dhakaDistrict: 110, outsideDhaka: 130, dhakaMinDays: 1, dhakaMaxDays: 2, outMinDays: 2, outMaxDays: 4, weightLimitKg: 0.5, extraPerKg: 30 },
  Paperfly:  { dhakaCity: 70,  dhakaDistrict: 100, outsideDhaka: 120, dhakaMinDays: 1, dhakaMaxDays: 2, outMinDays: 2, outMaxDays: 4, weightLimitKg: 0.5, extraPerKg: 25 },
  RedX:      { dhakaCity: 75,  dhakaDistrict: 105, outsideDhaka: 125, dhakaMinDays: 1, dhakaMaxDays: 2, outMinDays: 3, outMaxDays: 5, weightLimitKg: 0.5, extraPerKg: 28 },
};

function calcCharge(courier: typeof COURIER_RATES[string], zone: Zone, weightKg: number): number {
  const base = zone === 'dhaka_city' ? courier.dhakaCity
             : zone === 'dhaka_district' ? courier.dhakaDistrict
             : courier.outsideDhaka;
  const overweight = Math.max(0, weightKg - courier.weightLimitKg);
  const extra = Math.ceil(overweight / 0.5) * courier.extraPerKg;
  return base + extra;
}

export function getRecommendations(zone: Zone, weightKg = 0.5): {
  options: CourierOption[];
  recommended: CourierOption;
  customerView: CustomerDeliveryView;
} {
  const options: CourierOption[] = Object.entries(COURIER_RATES).map(([name, rates]) => {
    const charge = calcCharge(rates, zone, weightKg);
    const minDays = zone === 'dhaka_city' || zone === 'dhaka_district' ? rates.dhakaMinDays : rates.outMinDays;
    const maxDays = zone === 'dhaka_city' || zone === 'dhaka_district' ? rates.dhakaMaxDays : rates.outMaxDays;
    return { name, estimatedCharge: charge, estimatedDays: Math.round((minDays + maxDays) / 2), minDays, maxDays, reason: '', isRecommended: false };
  });

  // Sort by charge ASC, then speed
  options.sort((a, b) => a.estimatedCharge !== b.estimatedCharge ? a.estimatedCharge - b.estimatedCharge : a.estimatedDays - b.estimatedDays);

  options.forEach((o, i) => {
    o.reason = i === 0 ? 'Lowest cost for this route' : i === 1 ? 'Good balance of cost and speed' : 'Alternative option';
    o.isRecommended = i === 0;
  });

  const recommended = options[0];
  const minCharge = options[0].estimatedCharge;
  const maxCharge = options[options.length - 1].estimatedCharge;

  const timeLabel = zone === 'dhaka_city' ? 'Within 2 Days'
    : zone === 'dhaka_district' ? 'Within 3 Days'
    : 'Within 4–5 Days';

  const customerView: CustomerDeliveryView = {
    estimatedCharge: minCharge === maxCharge ? `৳${minCharge}` : `৳${minCharge}–${maxCharge}`,
    deliveryTime: timeLabel,
    disclaimer: 'Final delivery charge may vary depending on product weight and destination.',
  };

  return { options, recommended, customerView };
}

// Public endpoint response — courier names stripped
export function getCustomerDeliveryInfo(zone: Zone, weightKg = 0.5): CustomerDeliveryView {
  return getRecommendations(zone, weightKg).customerView;
}
