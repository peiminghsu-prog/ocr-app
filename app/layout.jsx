export const metadata = {
  title: 'AI OCR 點檢表單產生器',
  description: 'AI-powered OCR tool with visual scanning progress',
}

export default function RootLayout({ children }) {
  return (
    <html lang="zh-TW">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>{children}</body>
    </html>
  )
}