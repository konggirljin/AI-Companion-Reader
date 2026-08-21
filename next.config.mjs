import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // we register manually in pwa-register.tsx
  // TWA cold-start fix: the default start-url route uses NetworkFirst with no
  // network timeout, so a cold TWA launch with a stalled connection blocks the
  // navigation and leaves the splash screen stuck forever. Serve the cached app
  // shell immediately (StaleWhileRevalidate) instead and revalidate in the background.
  dynamicStartUrl: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [
      {
        urlPattern: ({ sameOrigin, url }) => sameOrigin && url.pathname === '/',
        handler: 'StaleWhileRevalidate',
        method: 'GET',
        options: {
          cacheName: 'start-url',
          expiration: { maxEntries: 32, maxAgeSeconds: 86400 },
        },
      },
    ],
  },
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Remove 'output: export' for Vercel deployment so API routes (/api/proxy) work.
  // For static-only deployment (no server), add 'output: export' back and use the
  // standalone proxy: npm run proxy  →  set Proxy URL to http://localhost:8787
};

export default withPWA(nextConfig);
