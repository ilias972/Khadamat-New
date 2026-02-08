import Link from 'next/link';
import { ArrowRight, Wrench, Zap, Paintbrush, Hammer } from 'lucide-react';
import type { ReactNode } from 'react';
import SectionHeader from './SectionHeader';

interface Category {
  id: string;
  name: string;
  icon: ReactNode;
}

const categories: Category[] = [
  { id: '1', name: 'Plomberie', icon: <Wrench className="w-7 h-7" /> },
  { id: '2', name: 'Électricité', icon: <Zap className="w-7 h-7" /> },
  { id: '3', name: 'Peinture', icon: <Paintbrush className="w-7 h-7" /> },
  { id: '4', name: 'Bricolage', icon: <Hammer className="w-7 h-7" /> },
];

export default function Categories() {
  return (
    <section aria-labelledby="categories-title" className="py-24 bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
          <div>
            <SectionHeader
              id="categories-title"
              badge="Nos Services"
              title="Tout ce dont votre maison a besoin"
            />
          </div>
          <Link
            href="/pros"
            className="group flex items-center gap-2 text-text-secondary font-semibold hover:text-primary-500 transition-colors focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2 rounded"
          >
            Voir toutes les catégories
            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" aria-hidden="true" />
          </Link>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <Link
              key={idx}
              href={`/pros?cat=${cat.id}`}
              className="group bg-surface rounded-2xl p-6 shadow-sm hover:shadow-card-hover hover:-translate-y-1 transition-all duration-300 border border-transparent hover:border-primary-200 flex flex-col items-center text-center md:items-start md:text-left focus-visible:outline-2 focus-visible:outline-primary-500 focus-visible:outline-offset-2"
            >
              <div className="w-14 h-14 rounded-xl bg-primary-50 group-hover:bg-primary-500 transition-colors duration-300 flex items-center justify-center mb-4">
                <div className="text-primary-500 group-hover:text-white transition-colors" aria-hidden="true">
                  {cat.icon}
                </div>
              </div>
              <h3 className="font-bold text-lg text-text-primary mb-1">{cat.name}</h3>
              <p className="text-sm text-text-muted">Disponible immédiatement</p>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
