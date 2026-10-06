// web/src/app/layout.jsx
import '@/styles/global.css'

import { Analytics } from '@vercel/analytics/next'
import { SpeedInsights } from '@vercel/speed-insights/next'
import { Toaster } from 'react-hot-toast'
import { Inter, JetBrains_Mono } from 'next/font/google'

import AuthProvider from '@/providers/AuthProvider'
import { ToastProvider } from '@/components/ui/Toast'

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
})

const jetBrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-jetbrains-mono',
  display: 'swap',
})

export const metadata = {
  title: {
    default: 'RoadRescue',
    template: '%s | RoadRescue',
  },
  description:
    'Emergency roadside rescue coordination for drivers, mechanics, and administrators.',
  icons: {
    icon: '/icons/favicon.ico',
    shortcut: '/icons/favicon.ico',
    apple: '/icons/favicon.ico',
  },
}

export const viewport = {
  themeColor: '#1A1A1A',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({
  children,
}) {
  return (
    <html lang="en" className={`${inter.variable} ${jetBrainsMono.variable}`} data-scroll-behavior="smooth">
      <body className="bg-background text-foreground antialiased">
        <AuthProvider>
          <ToastProvider>
            <Toaster
              position="top-right"
              containerStyle={{
                top: '1rem',
                right: '1rem',
                position: 'fixed',
                zIndex: 99999,
              }}
              toastOptions={{
                style: {
                  background: '#ffffff',
                  color: '#0f172a',
                  border: '1px solid #e2e8f0',
                  borderRadius: '16px',
                  boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)',
                  fontWeight: '600',
                  fontSize: '13px',
                },
                success: {
                  iconTheme: {
                    primary: '#16a34a',
                    secondary: '#ffffff',
                  },
                },
              }}
            />

            {children}
            <SpeedInsights />
            <Analytics />
          </ToastProvider>
        </AuthProvider>
      </body>
    </html>
  )
}