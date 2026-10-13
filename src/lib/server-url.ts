export function serverURL() {
  const configured = process.env.NEXT_PUBLIC_SERVER_URL
  if (process.env.VERCEL && (!configured || !configured.startsWith('https://')))
    throw new Error('Production requires an explicit public HTTPS server URL')
  return (configured || 'http://localhost:3000').replace(/\/$/, '')
}
