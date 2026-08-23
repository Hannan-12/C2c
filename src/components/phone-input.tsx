"use client";

import { useEffect, useId, useState } from "react";
import { DEFAULT_ISO, DIAL_CODES, detectIso, dialFor } from "@/lib/dial-codes";

/**
 * A country code beside a national number, emitting one dialable string.
 *
 * Previously this was a single text box, which quietly assumed every customer
 * knew to type +971 — and a number saved without a country code cannot be
 * dialled or opened in WhatsApp, which is the only channel this business
 * confirms bookings on. A wrong number is a lost booking.
 *
 * The parent receives digits only, country code included, because that is what
 * the API stores and what wa.me expects.
 */
export function PhoneInput({
  value,
  onChange,
  invalid,
  describedBy,
  id,
}: {
  /** Digits only, country code included. Empty while nothing is typed. */
  value: string;
  onChange: (value: string) => void;
  invalid?: boolean;
  describedBy?: string;
  id: string;
}) {
  const selectId = useId();
  const [iso, setIso] = useState(DEFAULT_ISO);
  const [national, setNational] = useState("");

  /**
   * Detection runs after mount, never during render.
   *
   * The server has no browser locale, so guessing during render would make the
   * server and client disagree about the selected country and React would
   * discard the markup. Everyone gets the Emirates first, and the guess
   * corrects it a frame later.
   */
  useEffect(() => {
    const guess = detectIso();
    if (guess !== DEFAULT_ISO) {
      setIso(guess);
      // Keep the parent in step, in case a number was restored from the URL
      // before the guess landed.
      setNational((current) => {
        if (current) onChange(dialFor(guess) + current);
        return current;
      });
    }
    // Deliberately once, on mount: a later re-run would fight the customer's
    // own choice of country.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function update(nextIso: string, nextNational: string) {
    // A national number written with its own trunk zero — 050… — would become
    // 971050… and never connect. The zero is dropped here rather than
    // rejected, because typing it is the habit of everyone who lives here.
    const cleaned = nextNational.replace(/\D/g, "").replace(/^0+/, "");

    setIso(nextIso);
    setNational(cleaned);
    onChange(cleaned ? dialFor(nextIso) + cleaned : "");
  }

  return (
    <div className="flex gap-2">
      <label htmlFor={selectId} className="sr-only">
        Country code
      </label>
      <select
        id={selectId}
        value={iso}
        onChange={(e) => update(e.target.value, national)}
        className="field-input w-[7.5rem] shrink-0"
      >
        {DIAL_CODES.map((c) => (
          // The dial code is what the customer is checking, so it leads. The
          // name follows for anyone unsure which code is theirs.
          <option key={c.iso} value={c.iso}>
            +{c.dial} {c.iso}
          </option>
        ))}
      </select>

      <input
        id={id}
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        value={national}
        onChange={(e) => update(iso, e.target.value)}
        placeholder="50 123 4567"
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        className="field-input flex-1 min-w-0"
        required
      />
    </div>
  );
}

/** The chosen country's name, for a summary line. */
export function countryName(iso: string): string {
  return (DIAL_CODES.find((c) => c.iso === iso) ?? DIAL_CODES[0]).name;
}
