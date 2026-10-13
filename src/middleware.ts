import { NextResponse, type NextRequest } from 'next/server'
export function middleware(req: NextRequest) {
  if (!['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
    const origin = req.headers.get('origin')
    const configured = process.env.NEXT_PUBLIC_SERVER_URL
    const trusted = new Set([
      req.nextUrl.origin,
      ...(configured ? [new URL(configured).origin] : []),
    ])
    if (origin && !trusted.has(origin))
      return NextResponse.json({ error: 'Niedozwolone źródło żądania.' }, { status: 403 })
  }
  const response = NextResponse.next()
  response.headers.set('Cache-Control', 'no-store')
  response.headers.set('X-Content-Type-Options', 'nosniff')
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  return response
}
export const config = { matcher: ['/api/:path*'] }
