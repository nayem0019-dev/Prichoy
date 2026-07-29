/** @type {import('next').NextConfig} */
const nextConfig = {
  // Admin runs at admin.prichoy.com — no basePath needed since it's a separate subdomain
  reactStrictMode: true,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http',  hostname: 'localhost' },
    ],
  },
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api',
  },
  // cPanel Node.js App deploys Next.js in standalone mode for smaller footprint
  output: 'standalone',
};

export default nextConfig;
