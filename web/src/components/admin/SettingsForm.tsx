"use client";

import { useActionState, useState } from "react";
import { saveSettings } from "@/app/admin/actions/settings";
import type { Settings } from "@/lib/settings";

export default function SettingsForm({ settings, disabled }: { settings: Settings; disabled: boolean }) {
  const [state, action, pending] = useActionState(saveSettings, null);
  const [open, setOpen] = useState(settings.store.open);

  return (
    <form action={action} className="a-grid a-grid--2">
      <section className="a-card">
        <h2>Bookstore</h2>
        <p className="a-card__sub">Pause sales for a while, e.g. while you prepare a new edition.</p>
        <label className="a-toggle">
          <input type="checkbox" name="open" checked={open} onChange={(e) => setOpen(e.target.checked)} />
          <span className="a-toggle__track" aria-hidden />
          <span>
            <strong>{open ? "Open — books can be bought" : "Paused — nobody can buy"}</strong>
          </span>
        </label>
        <label className="a-field a-field--wide" hidden={open}>
          <span className="a-field__label">
            Message on book pages
            <small>Optional, e.g. “Back on Monday with the new edition”</small>
          </span>
          <input className="a-input" name="closedMessage" defaultValue={settings.store.closedMessage} maxLength={140} />
        </label>
      </section>

      <section className="a-card">
        <h2>Download links</h2>
        <p className="a-card__sub">How long a buyer&rsquo;s emailed link works, and how many times it can be used. Applies to new links.</p>
        <div className="a-form">
          <label className="a-field">
            <span className="a-field__label">Valid for (hours)</span>
            <input className="a-input" name="hours" inputMode="numeric" defaultValue={settings.downloads.hours} />
          </label>
          <label className="a-field">
            <span className="a-field__label">Downloads allowed</span>
            <input className="a-input" name="uses" inputMode="numeric" defaultValue={settings.downloads.uses} />
          </label>
        </div>
      </section>

      <section className="a-card a-alerts" id="alerts">
        <h2>Alerts</h2>
        <p className="a-card__sub">
          Everything also appears under the bell in your dashboard. Email alerts start once delivery emails are switched on (see Status below).
        </p>
        <div className="a-form">
          <label className="a-field a-field--wide">
            <span className="a-field__label">
              Send alerts to
              <small>Leave empty to only see them in the dashboard</small>
            </span>
            <input className="a-input" name="alertEmail" type="email" placeholder="you@example.com" defaultValue={settings.alerts.email} maxLength={200} />
          </label>
        </div>
        <div className="a-checks-row">
          <label className="a-check">
            <input type="checkbox" name="alertEnquiries" defaultChecked={settings.alerts.enquiries} />
            New enquiries <small>instantly; reply straight from the email</small>
          </label>
          <label className="a-check">
            <input type="checkbox" name="alertOrders" defaultChecked={settings.alerts.orders} />
            New sales
          </label>
          <label className="a-check">
            <input type="checkbox" name="alertProblems" defaultChecked={settings.alerts.problems} />
            Problems that need you <small>e.g. a buyer&rsquo;s download email failed</small>
          </label>
        </div>
      </section>

      <div className="a-savebar">
        {state && (
          <span className={`a-msg ${state.ok ? "a-msg--ok" : "a-msg--err"}`} role="status">
            {state.message}
          </span>
        )}
        <button className="a-btn" disabled={pending || disabled}>
          {pending ? "Saving…" : "Save settings"}
        </button>
      </div>
    </form>
  );
}
