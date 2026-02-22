import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: 'https://khadamat.ma', lastModified: now, changeFrequency: 'daily', priority: 1 },
    { url: 'https://khadamat.ma/blog', lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: 'https://khadamat.ma/help', lastModified: now, changeFrequency: 'monthly', priority: 0.6 },
    { url: 'https://khadamat.ma/legal/cgu', lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://khadamat.ma/legal/mentions', lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: 'https://khadamat.ma/legal/privacy', lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ];
}
