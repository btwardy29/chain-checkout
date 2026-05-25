import type { ButtonHTMLAttributes, ReactNode } from "react";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary" | "ghost";
  children: ReactNode;
};

export function Button({ variant = "primary", className = "", ...props }: Props) {
  const styles = {
    primary: "bg-ink text-white hover:bg-black",
    secondary: "border border-black/15 bg-white text-ink hover:border-black/35",
    ghost: "text-ink hover:bg-black/5"
  };

  return (
    <button
      className={`focus-ring inline-flex min-h-11 items-center justify-center gap-2 rounded-md px-4 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 ${styles[variant]} ${className}`}
      {...props}
    />
  );
}
