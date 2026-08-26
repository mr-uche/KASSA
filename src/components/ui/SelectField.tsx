import type { SelectHTMLAttributes } from "react";

type SelectFieldProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  placeholder?: string;
};

export default function SelectField({
  label,
  placeholder,
  id,
  className,
  children,
  defaultValue,
  ...props
}: SelectFieldProps) {
  const selectId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={selectId}
        className="text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <div className="relative">
        <select
          id={selectId}
          defaultValue={defaultValue ?? ""}
          className={`w-full appearance-none rounded-lg border border-border-subtle bg-surface-muted px-3.5 py-2.5 pr-9 text-sm text-text-primary outline-none transition-colors focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-100 ${
            className ?? ""
          }`}
          {...props}
        >
          {placeholder && (
            <option value="" disabled className="text-text-secondary">
              {placeholder}
            </option>
          )}
          {children}
        </select>
        <svg
          className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
          viewBox="0 0 20 20"
          fill="none"
        >
          <path
            d="M5 7.5L10 12.5L15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </div>
  );
}
