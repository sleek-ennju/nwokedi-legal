"use client";

import { useEffect, useId, useRef, useState } from "react";

export type Option = { value: string; label: string; hint?: string };

type Props = {
  id: string;
  name: string;
  label: string;
  options: Option[];
  placeholder?: string;
  defaultValue?: string;
  invalid?: boolean;
  describedBy?: string;
};

/**
 * A branded, accessible select (WAI-ARIA "select-only combobox" pattern).
 * Keyboard: ↑/↓ move, Enter/Space choose, Esc closes, Home/End, and type-ahead.
 * The chosen value is submitted through a hidden input, so it works with the server action.
 */
export default function Select({ id, name, label, options, placeholder = "Choose one", defaultValue = "", invalid, describedBy }: Props) {
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(() => Math.max(0, options.findIndex((o) => o.value === defaultValue)));
  const root = useRef<HTMLDivElement>(null);
  const button = useRef<HTMLButtonElement>(null);
  const typed = useRef({ text: "", t: 0 });
  const listId = useId();
  const labelId = `${id}-label`;
  const current = options.find((o) => o.value === value);

  // close on outside click
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    addEventListener("pointerdown", onDown);
    return () => removeEventListener("pointerdown", onDown);
  }, [open]);

  const choose = (i: number) => {
    setValue(options[i].value);
    setActive(i);
    setOpen(false);
    button.current?.focus();
  };

  const onKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((a) => Math.min(last, a + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        if (!open) setOpen(true);
        else setActive((a) => Math.max(0, a - 1));
        break;
      case "Home":
        if (open) {
          e.preventDefault();
          setActive(0);
        }
        break;
      case "End":
        if (open) {
          e.preventDefault();
          setActive(last);
        }
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        if (open) choose(active);
        else setOpen(true);
        break;
      case "Escape":
        if (open) {
          e.preventDefault();
          setOpen(false);
        }
        break;
      case "Tab":
        if (open) choose(active);
        break;
      default:
        // type-ahead: jump to the first option starting with what's typed
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const now = performance.now();
          typed.current.text = (now - typed.current.t > 700 ? "" : typed.current.text) + e.key.toLowerCase();
          typed.current.t = now;
          const i = options.findIndex((o) => o.label.toLowerCase().startsWith(typed.current.text));
          if (i >= 0) {
            setActive(i);
            if (!open) setValue(options[i].value);
          }
        }
    }
  };

  return (
    <div className={`select${open ? " is-open" : ""}${invalid ? " is-invalid" : ""}`} ref={root}>
      <span className="select__label" id={labelId}>
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        ref={button}
        id={id}
        type="button"
        className="select__trigger"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-labelledby={`${labelId} ${id}`}
        aria-activedescendant={open ? `${listId}-${active}` : undefined}
        aria-invalid={invalid || undefined}
        aria-describedby={describedBy}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={onKey}
      >
        <span className={current ? "select__value" : "select__placeholder"}>{current?.label ?? placeholder}</span>
        <svg className="select__chevron" width="12" height="12" viewBox="0 0 12 12" aria-hidden>
          <path d="M2 4.5 6 8.5 10 4.5" fill="none" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
        </svg>
      </button>

      <ul className="select__list" id={listId} role="listbox" aria-labelledby={labelId} tabIndex={-1}>
        {options.map((o, i) => (
          <li
            key={o.value}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={o.value === value}
            className={`select__option${i === active ? " is-active" : ""}`}
            style={{ "--i": i } as React.CSSProperties}
            onPointerEnter={() => setActive(i)}
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => choose(i)}
          >
            <span className="select__text">
              {o.label}
              {o.hint && <small>{o.hint}</small>}
            </span>
            <svg className="select__check" width="14" height="14" viewBox="0 0 14 14" aria-hidden>
              <path d="M3 7.4 5.8 10 11 4" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </li>
        ))}
      </ul>
    </div>
  );
}
