import type { ButtonHTMLAttributes } from "react";

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  fullWidth?: boolean;
};

const variantClasses: Record<string, string> = {
  primary:
    "bg-brand-500 text-white hover:bg-brand-600 focus-visible:ring-brand-100",
  secondary:
    "bg-surface border border-border-subtle text-text-primary hover:bg-surface-muted focus-visible:ring-brand-100",
  ghost: "bg-transparent text-text-primary hover:bg-surface-muted",
};

export default function Button({
  variant = "primary",
  fullWidth,
  className,
  ...props
}: ButtonProps) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors focus:outline-none focus-visible:ring-2 disabled:cursor-not-allowed disabled:opacity-50 ${
        variantClasses[variant]
      } ${fullWidth ? "w-full" : ""} ${className ?? ""}`}
      {...props}
    />
  );
}
