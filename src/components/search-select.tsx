"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { icons } from "./icons";
import { focusRing } from "./ui";

export type SelectOption = { value: string; label: string; group?: string };

// Ignore la casse et les accents : « ecran » trouve « Écran ».
const normalize = (text: string) =>
  text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();

// Liste déroulante avec recherche : on tape quelques lettres pour filtrer.
// Remplace les <select> de l'application. La valeur choisie part dans un
// champ caché `name`, comme un champ de formulaire ordinaire.
export function SearchSelect({
  name,
  label,
  options,
  placeholder,
  searchPlaceholder,
  emptyLabel,
  defaultValue = "",
  value: controlled,
  onChange,
  className = "",
}: {
  name: string;
  label: string;
  options: SelectOption[];
  // Texte affiché tant que rien n'est choisi.
  placeholder: string;
  searchPlaceholder: string;
  // Texte affiché quand la recherche ne trouve rien.
  emptyLabel: string;
  defaultValue?: string;
  // Fournir `value` et `onChange` pour piloter la valeur depuis l'extérieur.
  value?: string;
  onChange?: (value: string) => void;
  className?: string;
}) {
  const id = useId();
  const [inner, setInner] = useState(defaultValue);
  const value = controlled ?? inner;
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const filtered = useMemo(() => {
    const wanted = normalize(query.trim());
    return wanted
      ? options.filter((option) =>
          normalize(`${option.group ?? ""} ${option.label}`).includes(wanted),
        )
      : options;
  }, [options, query]);
  const selected = options.find((option) => option.value === value);

  useEffect(() => {
    if (!open) return;
    search.current?.focus();
    const close = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", close);
    return () => document.removeEventListener("pointerdown", close);
  }, [open]);

  // Garde l'option survolée au clavier visible dans la liste.
  useEffect(() => {
    list.current?.querySelector("[data-active=true]")?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function choose(next: string) {
    setInner(next);
    onChange?.(next);
    setOpen(false);
    setQuery("");
  }

  function toggle() {
    setOpen(!open);
    setQuery("");
    setActive(Math.max(0, options.findIndex((option) => option.value === value)));
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => Math.min(index + 1, filtered.length - 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => Math.max(index - 1, 0));
    } else if (event.key === "Enter") {
      // Ne pas envoyer le formulaire : Entrée choisit l'option.
      event.preventDefault();
      if (filtered[active]) choose(filtered[active].value);
    }
  }

  return (
    <div ref={root} className={`relative flex flex-col gap-1.5 ${className}`}>
      <span id={`${id}-label`} className="text-sm font-semibold text-fg">
        {label}
      </span>
      <input type="hidden" name={name} value={value} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-labelledby={`${id}-label ${id}-value`}
        onClick={toggle}
        className={`flex min-h-12 items-center justify-between gap-2 rounded-xl border border-border bg-surface px-4 text-left text-base ${focusRing}`}
      >
        <span id={`${id}-value`} className={`truncate ${selected ? "text-fg" : "text-muted"}`}>
          {selected?.label ?? placeholder}
        </span>
        <span className={`text-muted transition-transform ${open ? "rotate-180" : ""}`}>
          {icons.chevronDown}
        </span>
      </button>

      {open ? (
        <div className="absolute inset-x-0 top-full z-30 mt-1 overflow-hidden rounded-2xl border border-border bg-surface shadow-card">
          <div className="relative border-b border-border">
            <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted">
              {icons.search}
            </span>
            <input
              ref={search}
              type="search"
              value={query}
              onChange={(event) => {
                setQuery(event.target.value);
                setActive(0);
              }}
              onKeyDown={onKeyDown}
              placeholder={searchPlaceholder}
              aria-label={searchPlaceholder}
              aria-controls={`${id}-list`}
              autoComplete="off"
              className="h-12 w-full bg-transparent pl-10 pr-3 text-base outline-none placeholder:text-muted"
            />
          </div>
          <ul
            ref={list}
            id={`${id}-list`}
            role="listbox"
            aria-labelledby={`${id}-label`}
            className="max-h-64 overflow-y-auto p-1.5"
          >
            {filtered.length === 0 ? (
              <li className="px-3 py-3 text-sm text-muted">{emptyLabel}</li>
            ) : (
              filtered.map((option, index) => (
                <li key={option.value} role="presentation">
                  {option.group && option.group !== filtered[index - 1]?.group ? (
                    <p className="px-3 pb-1 pt-2 text-xs font-bold uppercase tracking-widest text-muted">
                      {option.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    role="option"
                    aria-selected={option.value === value}
                    data-active={index === active}
                    onClick={() => choose(option.value)}
                    onPointerMove={() => setActive(index)}
                    className={`flex min-h-11 w-full items-center justify-between gap-2 rounded-xl px-3 text-left text-sm ${index === active ? "bg-surface-2" : ""} ${option.value === value ? "font-bold" : ""}`}
                  >
                    <span className="truncate">{option.label}</span>
                    {option.value === value ? icons.check : null}
                  </button>
                </li>
              ))
            )}
          </ul>
        </div>
      ) : null}
    </div>
  );
}
