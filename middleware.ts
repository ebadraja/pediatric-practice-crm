import { auth } from "@/auth"
import { authConfig } from "@/auth.config"

export const middleware = auth(authConfig)

export const config = {
  matcher: [
    // Protected routes: everything except public assets and API
    "/((?!_next/static|_next/image|favicon.ico|public).*)",
    // Explicitly include API routes
    "/api/:path*",
  ],
}
