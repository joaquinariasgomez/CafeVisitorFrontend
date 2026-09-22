import type { NextConfig } from 'next'

if (process.env.NEXT_PUBLIC_USE_MOCKS === 'true' && process.env.VERCEL_ENV === 'production') {
  throw new Error('NEXT_PUBLIC_USE_MOCKS must not be enabled in a production deployment')
}

const nextConfig: NextConfig = {
  reactCompiler: true,
}

export default nextConfig
