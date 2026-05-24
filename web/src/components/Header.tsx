import Link from "next/link";
import { auth } from "@/lib/auth";
import { HeaderClient } from "./HeaderClient";
import { CartNavLink } from "./CartNavLink";

export async function Header() {
  const session = await auth();
  return (
    <header className="sticky top-0 z-50 border-b border-zinc-200/80 bg-white/75 shadow-sm shadow-zinc-200/20 backdrop-blur-md supports-[backdrop-filter]:bg-white/60">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-6 lg:px-8">
        <Link
          href="/"
          className="group flex items-center gap-2 text-lg font-semibold tracking-tight text-zinc-900"
        >
          <span
            className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-sm font-bold text-white shadow-md shadow-orange-600/30 transition group-hover:shadow-lg group-hover:shadow-orange-500/25"
            aria-hidden
          >
            T9
          </span>
          <span>T9FOX 商店</span>
        </Link>
        <nav className="order-3 flex w-full items-center gap-1 sm:order-none sm:w-auto sm:flex-1 sm:justify-center">
          <Link href="/products" className="nav-link">
            商品
          </Link>
          <CartNavLink />
          {session?.user?.role === "ADMIN" && (
            <Link
              href="/admin"
              className="nav-link font-medium text-orange-800 hover:bg-orange-50 hover:text-orange-900"
            >
              管理後台
            </Link>
          )}
        </nav>
        <HeaderClient isLoggedIn={!!session} userEmail={session?.user?.email} />
      </div>
    </header>
  );
}
