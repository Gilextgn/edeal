"use client";

// Choix à cocher sous forme de grandes zones tactiles : pas de saisie au clavier.

const focus =
  "has-focus-visible:outline-2 has-focus-visible:outline-offset-2 has-focus-visible:outline-primary";

type Option = { value: string; label: string; hint?: string };

export function ChoiceCards({
  legend,
  name,
  value,
  onChange,
  options,
  columns = 2,
}: {
  legend: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
  options: Option[];
  columns?: 2 | 4;
}) {
  const grid = columns === 4 ? "grid-cols-2 lg:grid-cols-4" : "sm:grid-cols-2";
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      <div className={`grid gap-3 ${grid}`}>
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-12 cursor-pointer items-start gap-3 rounded-xl border border-border bg-surface p-3.5 has-checked:border-primary has-checked:bg-primary-soft ${focus}`}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={value === option.value}
              onChange={() => onChange(option.value)}
              className="mt-1 size-4 shrink-0 accent-primary"
            />
            <span className="min-w-0">
              <span className="block font-semibold">{option.label}</span>
              {option.hint ? (
                <span className="block text-sm text-muted">{option.hint}</span>
              ) : null}
            </span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}

export function ToggleChips({
  legend,
  hint,
  options,
  selected,
  onToggle,
}: {
  legend: string;
  hint?: string;
  options: Option[];
  selected: readonly string[];
  onToggle: (value: string) => void;
}) {
  return (
    <fieldset>
      <legend className="mb-2 text-sm font-medium text-fg">{legend}</legend>
      {hint ? <p className="-mt-1 mb-2 text-sm text-muted">{hint}</p> : null}
      <div className="flex flex-wrap gap-2">
        {options.map((option) => (
          <label
            key={option.value}
            className={`flex min-h-11 cursor-pointer items-center gap-2 rounded-full border border-border bg-surface px-4 text-sm font-medium has-checked:border-primary has-checked:bg-primary-soft has-checked:text-on-primary-soft ${focus}`}
          >
            <input
              type="checkbox"
              checked={selected.includes(option.value)}
              onChange={() => onToggle(option.value)}
              className="size-4 accent-primary"
            />
            {option.label}
          </label>
        ))}
      </div>
    </fieldset>
  );
}
