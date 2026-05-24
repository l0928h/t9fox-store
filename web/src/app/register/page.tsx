"use client";

import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || "註冊失敗");
        return;
      }
      const si = await signIn("credentials", { email, password, callbackUrl: "/", redirect: false });
      if (si?.error) {
        setErr("註冊成功但自動登入失敗，請改由登入頁登入");
        return;
      }
      try {
        await fetch("/api/cart/merge", { method: "POST", credentials: "same-origin" });
        window.dispatchEvent(new Event("t9fox-cart-updated"));
      } catch {
        /* ignore */
      }
      window.location.href = si?.url ?? "/";
    } catch {
      setErr("網路錯誤");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="surface-narrow">
      <div className="card p-8 shadow-soft sm:p-10">
        <h1 className="page-title">註冊</h1>
        <p className="page-subtitle">建立新帳號以追蹤訂單</p>
        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="label">顯示名稱</label>
            <input
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="選填"
            />
          </div>
          <div>
            <label className="label">Email</label>
            <input
              type="email"
              required
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div>
            <label className="label">密碼（至少 6 字）</label>
            <input
              type="password"
              required
              minLength={6}
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {err && (
            <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">{err}</p>
          )}
          <button type="submit" disabled={loading} className="btn btn-accent w-full">
            {loading ? "處理中…" : "註冊"}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-zinc-600">
          已有帳號？{" "}
          <Link href="/login" className="font-medium text-orange-800 hover:text-orange-900 hover:underline">
            登入
          </Link>
        </p>
      </div>
    </main>
  );
}
