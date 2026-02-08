'use client';

import { Search } from 'lucide-react';

interface HeroMobileCTAProps {
  visible: boolean;
  disabled: boolean;
  onClick: () => void;
}

export default function HeroMobileCTA({ visible, disabled, onClick }: HeroMobileCTAProps) {
  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 md:hidden pb-[env(safe-area-inset-bottom)] bg-surface/95 backdrop-blur-md border-t border-border shadow-xl">
      <div className="px-4 py-3">
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          aria-label="Rechercher un professionnel"
          className="w-full min-h-[44px] bg-primary-500 hover:bg-primary-600 text-white rounded-xl px-6 py-3.5 font-bold text-base shadow-orange transition-all duration-200 flex items-center justify-center gap-2 active:scale-[0.98] motion-reduce:transform-none disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-primary-500 focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
        >
          <Search className="w-5 h-5" aria-hidden="true" />
          Rechercher un professionnel
        </button>
      </div>
    </div>
  );
}
