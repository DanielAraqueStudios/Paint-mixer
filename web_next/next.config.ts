import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // On Windows the repo lives at a very long path; Turbopack panics when its
  // output files exceed the filesystem limit. NEXT_DIST_DIR redirects .next/
  // to a short path (set by start_local.py via the subst drive).
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  turbopack: {
    root: __dirname,
  },
}

export default nextConfig
