export default function manifest() {
  return {
    name: 'RoadRescue',
    short_name: 'RoadRescue',
    description: 'Roadside emergency coordination and dispatch platform.',
    start_url: '/dashboard/driver',
    display: 'standalone',
    background_color: '#FDFBF7',
    theme_color: '#1A1A1A',
    orientation: 'portrait',
    icons: [
      {
        src: '/icons/favicon.ico',
        sizes: 'any',
        type: 'image/x-icon',
        purpose: 'any',
      },
      {
        src: '/icons/favicon.ico',
        sizes: '64x64',
        type: 'image/x-icon',
        purpose: 'any',
      },
    ],
  }
}
