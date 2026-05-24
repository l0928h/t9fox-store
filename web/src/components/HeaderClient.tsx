"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";

export function HeaderClient({
  isLoggedIn,
  userEmail,
}: {
  isLoggedIn: boolean;
  userEmail?: string | null;
}) {
  if (isLoggedIn) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <span
          className="hidden max-w-[160px] truncate rounded-lg bg-zinc-100 px-2 py-1 text-xs text-zinc-600 sm:inline"
          title={userEmail ?? undefined}
        >
          {userEmail}
        </span>
        <Link href="/account/orders" className="btn btn-ghost btn-sm !py-1">
          訂單
        </Link>
        <button
          type="button"
          className="btn btn-ghost btn-sm !py-1"
          onClick={() => signOut({ callbackUrl: "/" })}
        >
          登出
        </button>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-2 text-sm">
      <Link href="/login" className="btn btn-ghost btn-sm !py-1">
        登入
      </Link>
      <Link href="/register" className="btn btn-accent btn-sm !py-1 !shadow-sm">
        註冊
      </Link>
    </div>
  );
}
