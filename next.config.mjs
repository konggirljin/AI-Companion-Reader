import withPWAInit from '@ducanh2912/next-pwa';

const withPWA = withPWAInit({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
  register: false, // we register manually in pwa-register.tsx
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  // Remove 'output: export' for Vercel deployment so API routes (/api/proxy) work.
  // For static-only deployment (no server), add 'output: export' back and use the
  // standalone proxy: npm run proxy  →  set Proxy URL to http://localhost:8787
};

export default withPWA(nextConfig);
