import { getToken } from "next-auth/jwt";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * 使用 JWT 驗證，不引用 lib/auth，避免 Edge 執行緒拉入 bcryptjs。
 */
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  if (!path.startsWith("/admin") && !path.startsWith("/api/admin")) {
    return NextResponse.next();
  }
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
  });
  if ((token as { role?: string } | null)?.role !== "ADMIN") {
    if (path.startsWith("/api/")) {
      return NextResponse.json({ error: "沒有權限" }, { status: 403 });
    }
    return NextResponse.redirect(
      new URL("/login?callbackUrl=" + encodeURIComponent(path), req.nextUrl)
    );
  }
  return NextResponse.next();
}

export const config = { matcher: ["/admin", "/admin/:path*", "/api/admin/:path*"] };
