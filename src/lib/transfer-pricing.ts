import { cache } from "react";
import { quoteAllCategories } from "@/lib/quote";
import { summarizeTransferQuotes, type TransferFareSummary } from "@/lib/transfer-fare-summary";
export { formatTransferFare, transferFareJsonLd } from "@/lib/transfer-fare-summary";
export type { TransferFareSummary } from "@/lib/transfer-fare-summary";

/**
 * Price the same exact pickup and dropoff the route page pre-fills in booking.
 * This calls the booking quote's all-category path, so fare rules, minimums,
 * currency, active vehicle rows and route measurement are shared.
 */
export const getTransferFareSummary = cache(async (
  pickupLocation: string,
  dropoffLocation: string,
): Promise<TransferFareSummary | null> => {
  try {
    const quote = await quoteAllCategories({
      serviceType: "ride",
      pickupLocation,
      dropoffLocation,
    });
    return summarizeTransferQuotes(quote);
  } catch {
    // Missing pricing, an unavailable database, or an unavailable route quote
    // leaves the page useful without claiming a fare it could not verify.
    return null;
  }
});
