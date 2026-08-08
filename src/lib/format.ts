/** Fares are whole-dirham amounts in the mockups; keep decimals only when present. */
export function formatFare(amount: number, currency = "AED"): string {
  const hasCents = Math.round(amount * 100) % 100 !== 0;
  return `${currency} ${amount.toLocaleString("en-AE", {
    minimumFractionDigits: hasCents ? 2 : 0,
    maximumFractionDigits: hasCents ? 2 : 0,
  })}`;
}

export function formatDistance(km: number): string {
  return `${km.toLocaleString("en-AE", { maximumFractionDigits: 1 })}km`;
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `${minutes}min`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}min`;
}

/**
 * Renders in Gulf Standard Time regardless of the viewer's device, so a
 * customer booking from abroad sees the same pickup time the driver will.
 */
export function formatPickup(value: Date | string): string {
  const date = typeof value === "string" ? new Date(value) : value;
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleString("en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
    timeZone: "Asia/Dubai",
  });
}

/**
 * Groups a UAE number for display: 971589655634 → +971 58 965 5634.
 * Stored and linked as bare digits; only the rendering is grouped, so wa.me
 * and tel: links are unaffected.
 */
export function formatPhone(digits: string): string {
  const d = digits.replace(/\D/g, "");
  const m = d.match(/^(971)(\d{2})(\d{3})(\d{4})$/);
  return m ? `+${m[1]} ${m[2]} ${m[3]} ${m[4]}` : `+${d}`;
}

/** Builds a wa.me deep link with a prefilled message (docs Section 4). */
export function whatsappLink(number: string, message: string): string {
  const digits = number.replace(/\D/g, "");
  return `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
}
