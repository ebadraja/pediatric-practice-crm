import { auth } from "@/auth"
import { authConfig } from "@/auth.config"

export const proxy = auth(authConfig)

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon\\.ico|public).*)",
    "/api/:path*",
  ],
}
