import { auth } from "@/auth"

export default auth(async (req) => {
  const session = req.auth
  const pathname = req.nextUrl.pathname

  // Public routes — no auth required
  if (pathname.includes("/api/webhooks")) return
  if (pathname.includes("/api/auth")) return

  const isLoggedIn = !!session?.user
  const isOnLogin = pathname === "/login"
  const isOnRoot = pathname === "/"

  // Already logged in — redirect away from login/root to dashboard
  if ((isOnLogin || isOnRoot) && isLoggedIn) {
    return Response.redirect(new URL("/dashboard", req.nextUrl))
  }

  // Public login route
  if (isOnLogin) return

  // Protected routes — must be logged in
  if (!isLoggedIn) {
    return Response.redirect(new URL("/login", req.nextUrl))
  }
})

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|public).*)",
  ],
}
