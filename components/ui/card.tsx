import { type ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-2xl border border-border bg-surface p-4 shadow-sm sm:p-5 ${className}`}
    >
      {children}
    </section>
  );
}
