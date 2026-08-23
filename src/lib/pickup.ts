/**
 * A pickup slot to start a booking form from.
 *
 * Empty date and time fields make the customer do arithmetic before they can
 * see a fare, and most trips here are for later today or tomorrow morning. The
 * value is only a starting point: both fields stay editable, and the date
 * input still refuses anything in the past.
 *
 * Two hours ahead, rounded up to the half hour. Enough notice for a driver to
 * be assigned, and a round time reads as a suggestion rather than a
 * suspiciously precise default.
 */
const LEAD_MINUTES = 120;

export function defaultPickup(): { date: string; time: string } {
  const when = new Date(Date.now() + LEAD_MINUTES * 60_000);

  const minutes = when.getMinutes();
  when.setMinutes(minutes > 30 ? 60 : 30, 0, 0);

  /**
   * Local parts, not toISOString().slice(). That converts to UTC, so a
   * booking started at 1am in Dubai would default to the previous day — and
   * then fail the input's own `min`, which is computed the same wrong way.
   */
  const pad = (n: number) => String(n).padStart(2, "0");

  return {
    date: `${when.getFullYear()}-${pad(when.getMonth() + 1)}-${pad(when.getDate())}`,
    time: `${pad(when.getHours())}:${pad(when.getMinutes())}`,
  };
}

/** Today, in the browser's own timezone — the floor for a pickup date. */
export function todayLocal(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}
