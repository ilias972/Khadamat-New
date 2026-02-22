import type { Metadata } from 'next';
import BlogContent from '@/components/blog/BlogContent';

export const metadata: Metadata = {
  title: 'Blog — Khadamat',
  description: 'Conseils et astuces pour mieux choisir vos professionnels...',
  alternates: { canonical: 'https://khadamat.ma/blog' },
  openGraph: {
    title: 'Blog — Khadamat',
    description: 'Conseils et astuces pour mieux choisir vos professionnels...',
    url: 'https://khadamat.ma/blog',
    siteName: 'Khadamat',
    locale: 'fr_MA',
    type: 'website',
    images: [{ url: 'https://khadamat.ma/og-image.jpg', width: 1200, height: 630, alt: 'Khadamat' }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Blog — Khadamat',
    description: 'Conseils et astuces pour mieux choisir vos professionnels...',
    images: ['https://khadamat.ma/og-image.jpg'],
  },
};

export default function BlogPage() {
  return <BlogContent />;
}
