import type { AllCategoriesQuote } from "@/lib/quote";
import { VEHICLE_SPECS } from "./vehicles.ts";

export type TransferFareLine = {
  category: string;
  vehicle: string;
  amount: number;
  currency: string;
};

export type TransferFareSummary = {
  vehicles: TransferFareLine[];
  /** The same amount rendered as the page's from-fare and AggregateOffer.lowPrice. */
  fromFare: number;
  aggregateOffer: {
    "@type": "AggregateOffer";
    priceCurrency: "AED";
    lowPrice: number;
    highPrice: number;
    offerCount: number;
  };
};

export function summarizeTransferQuotes(quote: AllCategoriesQuote): TransferFareSummary | null {
  // Do not skip a zero or non-AED active vehicle: either would make the
  // displayed minimum disagree with the cheapest vehicle in the quote.
  if (quote.vehicles.some((vehicle) =>
    vehicle.currency !== "AED" ||
    !Number.isFinite(vehicle.fareEstimate) ||
    vehicle.fareEstimate <= 0
  )) {
    return null;
  }

  const vehicles = quote.vehicles.flatMap((vehicle) => {
    const spec = VEHICLE_SPECS.find((item) => item.id === vehicle.category);
    if (!spec) return [];
    return [{
      category: vehicle.category,
      vehicle: spec.label,
      amount: vehicle.fareEstimate,
      currency: vehicle.currency,
    }];
  });

  if (vehicles.length === 0) return null;
  const amounts = vehicles.map(({ amount }) => amount);
  const fromFare = Math.min(...amounts);

  return {
    vehicles,
    fromFare,
    aggregateOffer: {
      "@type": "AggregateOffer",
      priceCurrency: "AED",
      lowPrice: fromFare,
      highPrice: Math.max(...amounts),
      offerCount: vehicles.length,
    },
  };
}

export function formatTransferFare(amount: number): string {
  return new Intl.NumberFormat("en-AE", {
    style: "currency",
    currency: "AED",
    maximumFractionDigits: 2,
  }).format(amount);
}

export function transferFareJsonLd(summary: TransferFareSummary | null) {
  return summary ? summary.aggregateOffer : null;
}
