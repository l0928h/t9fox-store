"use client";

import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import { useState, Suspense } from "react";
import Link from "next/link";

function LoginForm() {
  const search = useSearchParams();
  const callbackUrl = search.get("callbackUrl") || "/";
  const [email, setEmail] = useState("user@t9fox.local");
  const [password, setPassword] = useState("user1234");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await signIn("credentials", { email, password, redirect: false, callbackUrl });
    setLoading(false);
    if (res?.error) {
      setErr("帳號或密碼錯誤");
      return;
    }
    try {
      await fetch("/api/cart/merge", { method: "POST", credentials: "same-origin" });
      window.dispatchEvent(new Event("t9fox-cart-updated"));
    } catch {
      /* 合併失敗不阻擋登入 */
    }
    if (res?.url) {
      window.location.href = res.url;
    }
  }

  return (
    <main className="surface-narrow">
      <div className="card p-8 shadow-soft sm:p-10">
        <h1 className="page-title">登入</h1>
        <p className="page-subtitle">使用 Email 與密碼登入帳號</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
          <div>
            <label className="label">密碼</label>
            <input
              type="password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </div>
          {err && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          )}
          <button type="submit" disabled={loading} className="btn btn-accent w-full">
            {loading ? "登入中…" : "登入"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          沒有帳號？{" "}
          <Link href="/register" className="font-medium text-orange-800 hover:text-orange-900 hover:underline">
            註冊
          </Link>
        </p>
      </div>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="surface-narrow">
          <p className="text-center text-zinc-500">載入中…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
