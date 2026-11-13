/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  transpilePackages: ['@humanity/contracts'],
  i18n: undefined, // Using App Router root locale handling
};

export default nextConfig;

