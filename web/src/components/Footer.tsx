import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-zinc-200/80 bg-white/60 py-10 text-sm text-zinc-600 backdrop-blur-sm">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 sm:flex-row sm:items-start sm:justify-between sm:px-6 lg:px-8">
        <div>
          <p className="font-semibold text-zinc-900">T9FOX 商店</p>
          <p className="mt-1 max-w-xs text-zinc-600">示範用電子商店：瀏覽商品、購物車、結帳與訂單追蹤。</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2">
          <Link href="/products" className="hover:text-orange-800">
            所有商品
          </Link>
          <Link href="/cart" className="hover:text-orange-800">
            購物車
          </Link>
          <Link href="/account/orders" className="hover:text-orange-800">
            我的訂單
          </Link>
        </nav>
      </div>
      <p className="mx-auto mt-8 max-w-5xl px-4 text-xs text-zinc-500 sm:px-6 lg:px-8">
        © {new Date().getFullYear()} T9FOX Store · 示範環境不處理真實金流
      </p>
    </footer>
  );
}
