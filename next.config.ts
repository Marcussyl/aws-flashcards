import path from 'node:path'
import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  allowedDevOrigins: ['192.168.0.198'],
  turbopack: {
    root: path.join(__dirname),
  },
}

export default nextConfig
