"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

const EVERY_MS = 4000;
const GIVE_UP_AFTER = 30; // ~2 minutes of checking, then a calm note

/** Re-checks the payment on its own (the server re-verifies with Paystack each time). */
export default function PendingRefresh({ reference }: { reference: string }) {
  const router = useRouter();
  const [tries, setTries] = useState(0);

  useEffect(() => {
    if (tries >= GIVE_UP_AFTER) return;
    const t = setTimeout(() => {
      router.refresh();
      setTries((n) => n + 1);
    }, EVERY_MS);
    return () => clearTimeout(t);
  }, [tries, router]);

  return (
    <div className="done__pending" role="status" aria-live="polite">
      {tries < GIVE_UP_AFTER ? (
        <p className="done__checking">
          <span className="done__spin" aria-hidden="true" />
          Checking with Paystack…
        </p>
      ) : (
        <p className="done__body">
          Still waiting? Some bank transfers take a few minutes. You don&apos;t need to stay: as soon as it clears, your download link is
          emailed to you. If it doesn&apos;t arrive, contact us with your reference.
        </p>
      )}
      {reference && <p className="done__ref">Reference: {reference}</p>}
    </div>
  );
}
