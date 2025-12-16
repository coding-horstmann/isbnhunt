import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  // Prüfe ob Passwort-Schutz aktiviert ist
  const password = process.env.APP_PASSWORD;
  
  // Wenn kein Passwort gesetzt ist, keinen Schutz aktivieren
  if (!password) {
    return NextResponse.next();
  }

  // Prüfe ob bereits authentifiziert (Cookie)
  const isAuthenticated = request.cookies.get('authenticated')?.value === 'true';

  // Wenn bereits authentifiziert, weiterleiten
  if (isAuthenticated) {
    return NextResponse.next();
  }

  // Prüfe ob es ein Login-Versuch ist
  const url = request.nextUrl.clone();
  const providedPassword = url.searchParams.get('password');

  if (providedPassword === password) {
    // Passwort korrekt - Cookie setzen und weiterleiten
    const response = NextResponse.next();
    response.cookies.set('authenticated', 'true', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30 // 30 Tage
    });
    // Entferne Passwort aus URL
    url.searchParams.delete('password');
    return NextResponse.redirect(url);
  }

  // Wenn bereits auf Login-Seite, erlauben
  if (url.pathname === '/login') {
    return NextResponse.next();
  }

  // Weiterleitung zur Login-Seite
  url.pathname = '/login';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - icon.svg (icon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico|icon.svg|login).*)',
  ],
};

