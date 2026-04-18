import './globals.css'
import { Toaster } from 'react-hot-toast'
import { QueryProvider } from '@/components/providers/QueryProvider'

export const metadata = {
  title:       'BariManager - বাড়ি ভাড়া ব্যবস্থাপনা',
  description: 'সহজ বাড়ি ভাড়া ব্যবস্থাপনা সিস্টেম',
}

export default function RootLayout({ children }) {
  return (
    <html lang="bn">
      <body className="bg-gray-50 text-gray-900 min-h-screen pb-10">
        <QueryProvider>
          {children}
          <Toaster
            position="top-center"
            toastOptions={{
              duration: 3000,
              style: { fontSize: '16px', borderRadius: '8px', padding: '14px 18px' },
              success: { style: { background: '#f0fdf4', color: '#15803d', border: '1px solid #bbf7d0' } },
              error:   { style: { background: '#fef2f2', color: '#dc2626', border: '1px solid #fecaca' } },
            }}
          />
        </QueryProvider>
      </body>
    </html>
  )
}
