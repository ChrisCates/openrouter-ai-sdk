import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'OpenRouter AI SDK v4 - React Demo',
  description:
    'Test OpenRouter AI SDK v4 with React using Next.js App Router and AI SDK v4'
}

export default function RootLayout({
  children
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
