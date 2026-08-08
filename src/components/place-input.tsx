"use client";

import { useEffect, useId, useRef, useState } from "react";
import type { PlaceSuggestion } from "@/lib/places-api";

/**
 * Address field with place suggestions.
 *
 * Built as an ARIA combobox rather than a styled dropdown: it has to be usable
 * with a keyboard and announce itself to screen readers, and this is a
 * required field on the only page that earns money.
 *
 * The free-typed value is always accepted. Suggestions are a convenience, not
 * a constraint — a customer whose pickup point Google does not know must still
 * be able to book, and an admin confirms every address on WhatsApp anyway.
 */
export function PlaceInput({
  id,
  value,
  onChange,
  placeholder,
  required,
  dark = false,
}: {
  id: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  /** Dock fields sit on the dark panel and need their own treatment. */
  dark?: boolean;
}) {
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loading, setLoading] = useState(false);

  const listId = useId();
  const wrapperRef = useRef<HTMLDivElement>(null);

  // One session token per field, regenerated after a pick. Google bills
  // autocomplete per session rather than per keystroke when this is sent.
  const sessionRef = useRef<string>(crypto.randomUUID());

  // Set when the user picks a suggestion, so we don't immediately re-query
  // with the text we just inserted.
  const justPicked = useRef(false);

  const query = value.trim();
  // Derived rather than cleared in the effect: setting state synchronously in
  // an effect body causes a cascading render, and the empty case is a pure
  // function of the current input anyway.
  const visible = query.length >= 3 ? suggestions : [];
  const listOpen = open && visible.length > 0;

  useEffect(() => {
    if (justPicked.current) {
      justPicked.current = false;
      return;
    }

    if (query.length < 3) return;

    // Debounced: without this every keystroke is a billed request.
    const timer = setTimeout(async () => {
      const controller = new AbortController();
      setLoading(true);
      try {
        const res = await fetch(
          `/api/places?q=${encodeURIComponent(query)}&session=${sessionRef.current}`,
          { signal: controller.signal },
        );
        const data = (await res.json()) as { suggestions: PlaceSuggestion[] };
        setSuggestions(data.suggestions);
        setOpen(data.suggestions.length > 0);
        setActiveIndex(-1);
      } catch {
        // Silent: the field still works as free text.
        setSuggestions([]);
      } finally {
        setLoading(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [query]);

  // Close when focus or a click leaves the field.
  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!wrapperRef.current?.contains(event.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    return () => document.removeEventListener("mousedown", onPointerDown);
  }, []);

  function pick(suggestion: PlaceSuggestion) {
    justPicked.current = true;
    onChange(suggestion.description);
    setOpen(false);
    setSuggestions([]);
    setActiveIndex(-1);
    sessionRef.current = crypto.randomUUID();
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!listOpen) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActiveIndex((i) => (i + 1) % visible.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActiveIndex((i) => (i <= 0 ? visible.length - 1 : i - 1));
    } else if (event.key === "Enter" && activeIndex >= 0) {
      // Only intercept Enter when a suggestion is highlighted, so the form
      // still submits normally otherwise.
      event.preventDefault();
      pick(visible[activeIndex]);
    } else if (event.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={wrapperRef} className="relative">
      <input
        id={id}
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => visible.length > 0 && setOpen(true)}
        placeholder={placeholder}
        required={required}
        className={dark ? "field-input-dark" : "field-input"}
        role="combobox"
        aria-expanded={listOpen}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={
          activeIndex >= 0 ? `${listId}-option-${activeIndex}` : undefined
        }
        autoComplete="off"
      />

      {loading && (
        <span
          className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${
            dark ? "text-ink-inverse/40" : "text-ink-faint"
          }`}
          aria-hidden
        >
          …
        </span>
      )}

      {listOpen && (
        <ul
          id={listId}
          role="listbox"
          className={`absolute z-30 left-0 right-0 mt-1.5 overflow-hidden rounded-field border
                      shadow-[var(--shadow-lift-lg)] ${
                        dark
                          ? "bg-dock-raised border-dock-border"
                          : "bg-surface border-line"
                      }`}
        >
          {visible.map((suggestion, i) => (
            <li
              key={suggestion.placeId}
              id={`${listId}-option-${i}`}
              role="option"
              aria-selected={i === activeIndex}
              // mousedown, not click: click fires after blur, which closes the
              // list before the selection lands.
              onMouseDown={(e) => {
                e.preventDefault();
                pick(suggestion);
              }}
              onMouseEnter={() => setActiveIndex(i)}
              className={`cursor-pointer px-3.5 py-2.5 text-sm transition-colors ${
                i === activeIndex
                  ? dark
                    ? "bg-white/10"
                    : "bg-accent-soft"
                  : ""
              }`}
            >
              <span className={`block font-medium ${dark ? "text-ink-inverse" : "text-ink"}`}>
                {suggestion.mainText}
              </span>
              {suggestion.secondaryText && (
                <span
                  className={`block text-xs truncate ${
                    dark ? "text-ink-inverse/50" : "text-ink-faint"
                  }`}
                >
                  {suggestion.secondaryText}
                </span>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
