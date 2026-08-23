"use client";

import { useState } from "react";

/**
 * Copies a block of text, and says so.
 *
 * A driver group cannot be messaged from a link — wa.me addresses one person,
 * and WhatsApp offers no way to target a group from outside. So the slip is
 * copied and pasted, which is what the operator was doing anyway; the point is
 * that the text is generated rather than retyped, so the job number and the
 * pickup time in the group are the ones on the booking.
 */
export function CopyButton({
  text,
  label = "Copy",
  copiedLabel = "Copied",
  className = "btn-secondary",
}: {
  text: string;
  label?: string;
  copiedLabel?: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [failed, setFailed] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setFailed(false);
      // Long enough to read, short enough that the button is ready again
      // before the operator has finished pasting.
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access is refused over plain HTTP and in some embedded
      // browsers. Saying so beats a button that silently does nothing.
      setFailed(true);
    }
  }

  return (
    <>
      <button type="button" onClick={copy} className={className}>
        {copied ? copiedLabel : label}
      </button>
      {failed && (
        <p role="alert" className="mt-1.5 text-xs text-red-600">
          Copying was blocked. Select the text above and copy it manually.
        </p>
      )}
    </>
  );
}
