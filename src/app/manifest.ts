import type { MetadataRoute } from 'next'

import { APP_NAME } from '@/lib/config'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: APP_NAME,
    short_name: APP_NAME,
    description: 'Collect stamps at your favorite cafeterias and let staff register your orders with a QR code.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#faf7f1',
    theme_color: '#faf7f1',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
