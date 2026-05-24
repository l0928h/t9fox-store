"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type CouponType = "PERCENT" | "FIXED";

export function AdminCouponForm({ couponId }: { couponId?: string }) {
  const router = useRouter();
  const isEdit = !!couponId;
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");
  const [type, setType] = useState<CouponType>("PERCENT");
  const [value, setValue] = useState("10");
  const [minAmount, setMinAmount] = useState("");
  const [maxDiscount, setMaxDiscount] = useState("");
  const [startsAt, setStartsAt] = useState("");
  const [endsAt, setEndsAt] = useState("");
  const [usageLimit, setUsageLimit] = useState("");
  const [active, setActive] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [loadErr, setLoadErr] = useState<string | null>(null);

  const loadOne = useCallback(async () => {
    if (!couponId) return;
    const res = await fetch(`/api/admin/coupons/${couponId}`);
    if (!res.ok) {
      setLoadErr("無法載入");
      return;
    }
    const c = await res.json();
    setCode(c.code ?? "");
    setDescription(c.description ?? "");
    setType(c.type === "FIXED" ? "FIXED" : "PERCENT");
    setValue(String(c.value ?? "0"));
    setMinAmount(c.minAmount != null ? String(c.minAmount) : "");
    setMaxDiscount(c.maxDiscount != null ? String(c.maxDiscount) : "");
    setStartsAt(c.startsAt ? new Date(c.startsAt).toISOString().slice(0, 16) : "");
    setEndsAt(c.endsAt ? new Date(c.endsAt).toISOString().slice(0, 16) : "");
    setUsageLimit(c.usageLimit != null ? String(c.usageLimit) : "");
    setActive(!!c.active);
  }, [couponId]);

  useEffect(() => {
    void loadOne();
  }, [loadOne]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    try {
      const payload = {
        code: code.trim(),
        description,
        type,
        value: Number(value),
        minAmount: minAmount.trim() ? Number(minAmount) : null,
        maxDiscount: maxDiscount.trim() ? Number(maxDiscount) : null,
        startsAt: startsAt.trim() ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt.trim() ? new Date(endsAt).toISOString() : null,
        usageLimit: usageLimit.trim() ? Number.parseInt(usageLimit, 10) : null,
        active,
      };
      const res = isEdit
        ? await fetch(`/api/admin/coupons/${couponId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await fetch("/api/admin/coupons", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErr(data.error || (isEdit ? "更新失敗" : "建立失敗"));
        return;
      }
      router.push("/admin/coupons");
      router.refresh();
    } finally {
      setLoading(false);
    }
  }

  if (isEdit && loadErr) {
    return <p className="text-sm text-red-700">{loadErr}</p>;
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-5 p-6 shadow-soft sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="label">優惠碼</label>
          <input className="input font-mono uppercase" value={code} onChange={(e) => setCode(e.target.value)} required />
        </div>
        <div>
          <label className="label">類型</label>
          <select className="input cursor-pointer" value={type} onChange={(e) => setType(e.target.value as CouponType)}>
            <option value="PERCENT">百分比折扣</option>
            <option value="FIXED">固定金額（NT$）</option>
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">說明</label>
          <input className="input" value={description} onChange={(e) => setDescription(e.target.value)} />
        </div>
        <div>
          <label className="label">{type === "PERCENT" ? "折扣％（例：10 = 9 折）" : "折抵金額（NT$）"}</label>
          <input
            type="number"
            step="0.01"
            min="0"
            className="input"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="label">低消門檻（NT$，選填）</label>
          <input type="number" step="0.01" min="0" className="input" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
        </div>
        {type === "PERCENT" && (
          <div>
            <label className="label">折扣上限（NT$，選填）</label>
            <input
              type="number"
              step="0.01"
              min="0"
              className="input"
              value={maxDiscount}
              onChange={(e) => setMaxDiscount(e.target.value)}
            />
          </div>
        )}
        <div>
          <label className="label">開始（選填）</label>
          <input type="datetime-local" className="input" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} />
        </div>
        <div>
          <label className="label">結束（選填）</label>
          <input type="datetime-local" className="input" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} />
        </div>
        <div>
          <label className="label">全站使用上限（次數，選填）</label>
          <input type="number" min="1" className="input" value={usageLimit} onChange={(e) => setUsageLimit(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 sm:col-span-2">
          <input
            id="active"
            type="checkbox"
            checked={active}
            onChange={(e) => setActive(e.target.checked)}
            className="h-4 w-4 rounded border-zinc-300"
          />
          <label htmlFor="active" className="text-sm font-medium text-zinc-800">
            啟用
          </label>
        </div>
      </div>
      {err && <p className="text-sm text-red-700">{err}</p>}
      <div className="flex flex-wrap gap-3">
        <button type="submit" disabled={loading} className="btn btn-accent">
          {loading ? "儲存中…" : isEdit ? "更新" : "建立"}
        </button>
        <Link href="/admin/coupons" className="btn btn-ghost">
          返回
        </Link>
      </div>
    </form>
  );
}
