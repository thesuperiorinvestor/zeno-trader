import { ReactNode } from "react";

export function EmptyState({
  icon,
  title,
  body,
  cta,
}: {
  icon?: ReactNode;
  title: string;
  body?: string;
  cta?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center text-center py-16 px-8">
      {icon && <div className="mb-4 text-[var(--color-text-dim)]">{icon}</div>}
      <h2 className="text-lg font-medium mb-1">{title}</h2>
      {body && <p className="text-sm text-[var(--color-text-muted)] max-w-md mb-5">{body}</p>}
      {cta}
    </div>
  );
}
