'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';
import { postJSON, deleteJSON, getJSON } from '@/lib/api';

interface ProDetailClientProps {
  proId: string;
}

export default function ProDetailClient({ proId }: ProDetailClientProps) {
  const { user, isAuthenticated } = useAuthStore();
  const router = useRouter();
  const [isFavorite, setIsFavorite] = useState(false);
  const [loading, setLoading] = useState(false);

  const isClient = user?.role === 'CLIENT';

  // Check if already favorite
  useEffect(() => {
    if (!isAuthenticated || !isClient) return;

    const checkFav = async () => {
      try {
        const favorites = await getJSON<any[]>('/favorites');
        setIsFavorite(favorites.some((f: any) => f.proId === proId));
      } catch {
        // silent
      }
    };
    checkFav();
  }, [isAuthenticated, isClient, proId]);

  const handleToggleFavorite = async () => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }
    if (!isClient) return;

    setLoading(true);
    try {
      if (isFavorite) {
        await deleteJSON(`/favorites/${proId}`);
        setIsFavorite(false);
      } else {
        await postJSON(`/favorites/${proId}`, {});
        setIsFavorite(true);
      }
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      onClick={handleToggleFavorite}
      disabled={loading}
      className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg border transition font-medium text-sm disabled:opacity-50 ${
        isFavorite
          ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-700 dark:text-red-300'
          : 'bg-white dark:bg-zinc-800 border-zinc-300 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-50 dark:hover:bg-zinc-700'
      }`}
      aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
    >
      <span className="text-lg">{isFavorite ? '❤️' : '🤍'}</span>
      {isFavorite ? 'Favori' : 'Ajouter aux favoris'}
    </button>
  );
}
