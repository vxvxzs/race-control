export function serverURL() {
  // Server tools and isolated HTTP tests can use a different origin at runtime.
  // Avoid Next.js replacing a direct NEXT_PUBLIC_* reference with the build URL.
  const { NEXT_PUBLIC_SERVER_URL: configured } = process.env
  if (process.env.VERCEL && (!configured || !configured.startsWith('https://')))
    throw new Error('Production requires an explicit public HTTPS server URL')
  return (configured || 'http://localhost:3000').replace(/\/$/, '')
}
