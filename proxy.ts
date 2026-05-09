/**
 * proxy.ts
 * Protege todas las rutas /admin/* excepto /admin/login.
 * Verifica la cookie de sesión contra el token guardado en variables de entorno.
 */
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const COOKIE_NAME = "admin_session";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Solo aplica a rutas del panel de admin
  if (!pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  // La página de login siempre es accesible
  if (pathname === "/admin/login") {
    // Si ya tiene sesión válida, redirigir al panel
    const session = request.cookies.get(COOKIE_NAME)?.value;
    const token = process.env.ADMIN_TOKEN;
    if (session && token && session === token) {
      return NextResponse.redirect(new URL("/admin", request.url));
    }
    return NextResponse.next();
  }

  // Verificar cookie de sesión
  const session = request.cookies.get(COOKIE_NAME)?.value;
  const token = process.env.ADMIN_TOKEN;

  if (!session || !token || session !== token) {
    const loginUrl = new URL("/admin/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*"],
};
