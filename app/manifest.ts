import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Nutrova Doctor Tracker',
    short_name: 'Nutrova MR',
    description: 'Doctor call tracker for Nutrova Medical Representative M Divakar Reddy, Bangalore.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#0e2a1f',
    theme_color: '#0e2a1f',
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  }
}
