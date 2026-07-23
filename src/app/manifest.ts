import type { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AI Reading Companion',
    short_name: 'ARC',
    description: 'Read together with AI companions',
    start_url: '/',
    display: 'standalone',
    background_color: '#0A0603',
    theme_color: '#1C0F07',
    icons: [
      { src: '/icons/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  };
}
