import assert from "node:assert/strict";
import { TRANSFERS, transferMetaDescription } from "../src/data/transfers.ts";
import {
  formatTransferFare,
  summarizeTransferQuotes,
  transferFareJsonLd,
} from "../src/lib/transfer-fare-summary.ts";

for (const route of TRANSFERS) {
  const withoutFare = transferMetaDescription(route);
  const withFare = transferMetaDescription(route, 1234.56);
  assert.ok(withoutFare.length >= 120 && withoutFare.length <= 155, `${route.slug}: no-fare description length`);
  assert.ok(withFare.length >= 120 && withFare.length <= 155, `${route.slug}: fare description length`);
}

// Test values are fixtures only. The public pages always use the live quote path.
const summary = summarizeTransferQuotes({
  distanceKm: 12,
  durationMin: 24,
  basis: "distance",
  vehicles: [
    { category: "comfort", fareEstimate: 148.25, currency: "AED" },
    { category: "business", fareEstimate: 211.5, currency: "AED" },
  ],
});

assert.ok(summary, "fixture should produce a fare summary");
const structuredOffer = transferFareJsonLd(summary);
assert.ok(structuredOffer, "a fare summary should produce an AggregateOffer");
assert.equal(structuredOffer["@type"], "AggregateOffer");
assert.equal(structuredOffer.priceCurrency, "AED");
assert.equal(summary.fromFare, structuredOffer.lowPrice, "visible from-fare must equal JSON-LD lowPrice");
assert.equal(Math.min(...summary.vehicles.map((vehicle) => vehicle.amount)), structuredOffer.lowPrice, "visible vehicle table minimum must equal JSON-LD lowPrice");
assert.equal(Math.max(...summary.vehicles.map((vehicle) => vehicle.amount)), structuredOffer.highPrice, "visible vehicle table maximum must equal JSON-LD highPrice");
assert.equal(summary.vehicles.length, structuredOffer.offerCount);
assert.equal(Number(formatTransferFare(summary.fromFare).replace(/[^\d.]/g, "")), structuredOffer.lowPrice);
assert.equal(summarizeTransferQuotes({
  distanceKm: null,
  durationMin: null,
  basis: "hourly",
  vehicles: [{ category: "comfort", fareEstimate: 0, currency: "AED" }],
}), null, "zero fares must not create an offer");
assert.equal(summarizeTransferQuotes({
  distanceKm: 12,
  durationMin: 24,
  basis: "distance",
  vehicles: [
    { category: "comfort", fareEstimate: 0, currency: "AED" },
    { category: "business", fareEstimate: 211.5, currency: "AED" },
  ],
}), null, "a zero fare must not be hidden behind another vehicle's price");

console.log("Transfer fare display and JSON-LD are consistent.");
