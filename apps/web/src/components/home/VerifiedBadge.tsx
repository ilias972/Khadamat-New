import { CheckCircle2 } from 'lucide-react';

export default function VerifiedBadge({ small = false }: { small?: boolean }) {
  return (
    <span className={`
      inline-flex items-center gap-1.5
      bg-success-50 text-success-600 font-bold
      ${small ? 'px-2 py-0.5 text-xs' : 'px-3 py-1 text-sm'}
      rounded-full
    `}>
      <CheckCircle2
        className={small ? "w-3 h-3" : "w-4 h-4"}
        aria-hidden="true"
      />
      Vérifié
    </span>
  );
}
