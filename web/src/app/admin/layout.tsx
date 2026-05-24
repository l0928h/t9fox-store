import Link from "next/link";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const tabs = [
    { href: "/admin/products", label: "商品" },
    { href: "/admin/orders", label: "訂單" },
    { href: "/admin/categories", label: "分類" },
    { href: "/admin/coupons", label: "優惠券" },
    { href: "/admin/tables", label: "桌位" },
    { href: "/kitchen", label: "廚房顯示" },
    { href: "/admin/settings", label: "設定" },
  ];
  return (
    <div className="min-h-[50vh]">
      <div className="border-b border-zinc-200/80 bg-white/70">
        <nav className="mx-auto flex max-w-5xl flex-wrap gap-1 px-4 py-2 sm:px-6 lg:px-8">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-lg px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-orange-50 hover:text-orange-900"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </div>
      {children}
    </div>
  );
}
