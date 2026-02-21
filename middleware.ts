import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

// Simple middleware without NextAuth wrapper to avoid Edge runtime issues
export async function middleware(request: NextRequest) {
  const { nextUrl } = request
  
  // Get session token from cookie
  const sessionToken = request.cookies.get("authjs.session-token")?.value ||
                       request.cookies.get("__Secure-authjs.session-token")?.value
  
  // Parse session if exists (basic check - actual validation happens server-side)
  const isLoggedIn = !!sessionToken
  
  // Define protected routes
  const isAdminRoute = nextUrl.pathname.startsWith("/admin")
  const isManagerRoute = nextUrl.pathname.startsWith("/manager")
  const isStaffRoute = nextUrl.pathname.startsWith("/staff")
  const isAuthRoute = nextUrl.pathname.startsWith("/login")

  // Redirect unauthenticated users to login
  if ((isAdminRoute || isManagerRoute || isStaffRoute) && !isLoggedIn) {
    const loginUrl = new URL("/login", nextUrl.origin)
    loginUrl.searchParams.set("callbackUrl", nextUrl.pathname)
    return NextResponse.redirect(loginUrl)
  }

  // For logged-in users, we need to check role
  // Since we can't decode JWT in Edge without crypto, we'll let the page handle role-based redirects
  // Just redirect logged-in users away from login page to a default route
  if (isAuthRoute && isLoggedIn) {
    // Redirect to a default page - the page will handle role-based routing
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  return NextResponse.next()
}

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/staff/:path*", "/login"],
}
