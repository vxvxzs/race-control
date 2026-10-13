import { withPayload } from '@payloadcms/next/withPayload'
import { PHASE_DEVELOPMENT_SERVER } from 'next/constants'
import type { NextConfig } from 'next'
import path from 'path'
import { fileURLToPath } from 'url'

const __filename = fileURLToPath(import.meta.url)
const dirname = path.dirname(__filename)

const nextConfig: NextConfig = {
  redirects: async () => [{ source: '/favicon.ico', destination: '/favicon.svg', permanent: true }],
  eslint: {
    ignoreDuringBuilds: false,
  },
  images: {
    localPatterns: [
      {
        pathname: '/api/media/file/**',
      },
    ],
  },
  webpack: (webpackConfig) => {
    webpackConfig.resolve.extensionAlias = {
      '.cjs': ['.cts', '.cjs'],
      '.js': ['.ts', '.tsx', '.js', '.jsx'],
      '.mjs': ['.mts', '.mjs'],
    }

    return webpackConfig
  },
  turbopack: {
    root: path.resolve(dirname),
  },
}

// A running development server must not overwrite the production build used by QA.
export default (phase: string) =>
  withPayload(
    {
      ...nextConfig,
      distDir: process.env.VERCEL
        ? '.next'
        : phase === PHASE_DEVELOPMENT_SERVER
          ? '.next-development'
          : '.next-production',
    },
    { devBundleServerPackages: false },
  )
