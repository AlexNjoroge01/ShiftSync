import { auth } from "@/lib/auth"
import { NextResponse } from "next/server"

export default auth((req) => {
  const { nextUrl, auth: session } = req
  const isLoggedIn = !!session?.user

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

  // Redirect logged-in users away from login page
  if (isAuthRoute && isLoggedIn) {
    const role = session.user.role
    let redirectUrl: string

    switch (role) {
      case "ADMIN":
        redirectUrl = "/admin"
        break
      case "MANAGER":
        redirectUrl = "/manager"
        break
      case "STAFF":
        redirectUrl = "/staff"
        break
      default:
        redirectUrl = "/"
    }

    return NextResponse.redirect(new URL(redirectUrl, nextUrl.origin))
  }

  // Role-based access control
  if (isAdminRoute && session?.user?.role !== "ADMIN") {
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  if (isManagerRoute && !["ADMIN", "MANAGER"].includes(session?.user?.role || "")) {
    return NextResponse.redirect(new URL("/", nextUrl.origin))
  }

  return NextResponse.next()
})

export const config = {
  matcher: ["/admin/:path*", "/manager/:path*", "/staff/:path*", "/login"],
}
