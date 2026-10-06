/** @type {import('next').NextConfig} */
const nextConfig = {
  /* config options here */
   images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'subvxqapaekpkufqtlza.supabase.co',
        port: '',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  // next.config.js

   // allowedDevOrigins: ['Add local IP for mobile testing'],


  reactCompiler: true,
};

export default nextConfig;
