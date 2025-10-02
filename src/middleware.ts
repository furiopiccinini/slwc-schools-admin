import { withAuth } from "next-auth/middleware"

export default withAuth(
  function middleware() {
    // Additional middleware logic can go here
  },
  {
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl
        
        // Admin routes
        if (pathname.startsWith("/admin")) {
          return token?.role === "ADMIN"
        }
        
        // Instructor routes
        if (pathname.startsWith("/instructor")) {
          return token?.role === "INSTRUCTOR" || token?.role === "ADMIN"
        }
        
        // Public routes
        if (pathname.startsWith("/iscrizione") || pathname.startsWith("/auth")) {
          return true
        }
        
        return !!token
      },
    },
  }
)

export const config = {
  matcher: ["/admin/:path*", "/instructor/:path*", "/iscrizione/:path*"]
}
