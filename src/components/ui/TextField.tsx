import type { InputHTMLAttributes } from "react";

type TextFieldProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  trailingIcon?: React.ReactNode;
};

export default function TextField({
  label,
  trailingIcon,
  id,
  className,
  ...props
}: TextFieldProps) {
  const inputId = id ?? props.name;

  return (
    <div className="flex flex-col gap-1.5">
      <label
        htmlFor={inputId}
        className="text-sm font-medium text-text-primary"
      >
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          className={`w-full rounded-lg border border-border-subtle bg-surface-muted px-3.5 py-2.5 text-sm text-text-primary placeholder:text-text-secondary/70 outline-none transition-colors focus:border-brand-500 focus:bg-surface focus:ring-2 focus:ring-brand-100 ${
            trailingIcon ? "pr-10" : ""
          } ${className ?? ""}`}
          {...props}
        />
        {trailingIcon && (
          <span className="absolute inset-y-0 right-3 flex items-center text-text-secondary">
            {trailingIcon}
          </span>
        )}
      </div>
    </div>
  );
}
