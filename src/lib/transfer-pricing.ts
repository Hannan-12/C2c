import { cache } from "react";
import { quoteAllCategories, QuoteError, RoutesApiError } from "@/lib/quote";
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
  } catch (error) {
    // An empty/disabled fare configuration is an expected no-fare state.
    // quoteAllCategories reports this as QuoteError only when there are no
    // active pricing rows; other quote failures must fail ISR so its last good
    // page remains cached.
    if (error instanceof QuoteError && error.message === "No active vehicle pricing is configured") {
      return null;
    }
    if (error instanceof RoutesApiError) throw error;
    throw error;
  }
});
