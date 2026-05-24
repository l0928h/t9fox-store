"use client";

import { useEffect, useState, useCallback } from "react";
import Image from "next/image";

// ─── Types ────────────────────────────────────────────────────────────────────

interface ModifierOption {
  id: string;
  name: string;
  price: number;
}

interface Modifier {
  id: string;
  name: string;
  required: boolean;
  multiSelect: boolean;
  options: ModifierOption[];
}

interface Variant {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface Product {
  id: string;
  title: string;
  slug: string;
  description: string;
  images: { url: string }[];
  variants: Variant[];
  modifiers: Modifier[];
}

interface Category {
  id: string;
  name: string;
  products: Product[];
}

interface Table {
  id: string;
  number: string;
  label: string | null;
}

interface CartItem {
  key: string; // unique key for this cart entry
  variantId: string;
  productTitle: string;
  variantName: string;
  basePrice: number;
  modifiers: { modifierId: string; optionId: string; name: string; price: number }[];
  notes: string;
  quantity: number;
}

// ─── Modifier Modal ────────────────────────────────────────────────────────────

function ModifierModal({
  product,
  onClose,
  onAdd,
}: {
  product: Product;
  onClose: () => void;
  onAdd: (item: Omit<CartItem, "key" | "quantity">) => void;
}) {
  const [selectedVariant, setSelectedVariant] = useState<Variant>(product.variants[0]);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");

  const totalPrice =
    selectedVariant.price +
    Object.values(selections)
      .flat()
      .reduce((sum, optId) => {
        for (const mod of product.modifiers) {
          const opt = mod.options.find(o => o.id === optId);
          if (opt) return sum + opt.price;
        }
        return sum;
      }, 0);

  function toggleOption(modifier: Modifier, optionId: string) {
    setSelections(prev => {
      const current = prev[modifier.id] ?? [];
      if (modifier.multiSelect) {
        return {
          ...prev,
          [modifier.id]: current.includes(optionId)
            ? current.filter(id => id !== optionId)
            : [...current, optionId],
        };
      }
      return { ...prev, [modifier.id]: [optionId] };
    });
  }

  function handleAdd() {
    // Validate required modifiers
    for (const mod of product.modifiers) {
      if (mod.required && !(selections[mod.id]?.length)) {
        setError(`請選擇「${mod.name}」`);
        return;
      }
    }

    const selectedModifiers = Object.entries(selections).flatMap(([modId, optIds]) =>
      optIds.map(optId => {
        const mod = product.modifiers.find(m => m.id === modId)!;
        const opt = mod.options.find(o => o.id === optId)!;
        return { modifierId: modId, optionId: optId, name: `${mod.name}: ${opt.name}`, price: opt.price };
      })
    );

    onAdd({
      variantId: selectedVariant.id,
      productTitle: product.title,
      variantName: selectedVariant.name,
      basePrice: selectedVariant.price,
      modifiers: selectedModifiers,
      notes,
    });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg bg-white rounded-t-3xl sm:rounded-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="sticky top-0 bg-white border-b px-5 py-4 flex items-center justify-between">
          <div>
            <h2 className="font-bold text-lg">{product.title}</h2>
            {product.description && (
              <p className="text-sm text-gray-500 mt-0.5">{product.description}</p>
            )}
          </div>
          <button onClick={onClose} className="text-2xl text-gray-400 hover:text-gray-600 leading-none">×</button>
        </div>

        <div className="p-5 space-y-5">
          {/* Variant selection */}
          {product.variants.length > 1 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-2">規格</p>
              <div className="flex flex-wrap gap-2">
                {product.variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`px-3 py-1.5 rounded-full text-sm border transition ${
                      selectedVariant.id === v.id
                        ? "bg-gray-900 text-white border-gray-900"
                        : "border-gray-200 hover:border-gray-400"
                    }`}
                  >
                    {v.name}
                    {v.price !== product.variants[0].price && (
                      <span className="ml-1 text-xs opacity-70">+{(v.price - product.variants[0].price)}</span>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Modifiers */}
          {product.modifiers.map(mod => (
            <div key={mod.id}>
              <p className="text-sm font-semibold text-gray-700 mb-2">
                {mod.name}
                {mod.required && <span className="ml-1 text-red-500 text-xs">必選</span>}
                {mod.multiSelect && <span className="ml-1 text-gray-400 text-xs">可複選</span>}
              </p>
              <div className="flex flex-wrap gap-2">
                {mod.options.map(opt => {
                  const isSelected = (selections[mod.id] ?? []).includes(opt.id);
                  return (
                    <button
                      key={opt.id}
                      onClick={() => toggleOption(mod, opt.id)}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${
                        isSelected
                          ? "bg-gray-900 text-white border-gray-900"
                          : "border-gray-200 hover:border-gray-400"
                      }`}
                    >
                      {opt.name}
                      {opt.price > 0 && <span className="ml-1 text-xs opacity-70">+{opt.price}</span>}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">備註（選填）</p>
            <input
              className="w-full border rounded-xl px-3 py-2 text-sm"
              placeholder="例：不加蔥、多辣"
              value={notes}
              onChange={e => setNotes(e.target.value)}
            />
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t px-5 py-4">
          <button
            onClick={handleAdd}
            className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-semibold text-base hover:bg-gray-700 active:scale-95 transition"
          >
            加入 — NT$ {totalPrice}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────

export default function OrderPage({ params }: { params: Promise<{ tableToken: string }> }) {
  const [tableToken, setTableToken] = useState<string>("");
  const [table, setTable] = useState<Table | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [uncategorized, setUncategorized] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [modalProduct, setModalProduct] = useState<Product | null>(null);
  const [showCart, setShowCart] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  useEffect(() => {
    params.then(p => {
      setTableToken(p.tableToken);
      fetch(`/api/order/${p.tableToken}`)
        .then(r => r.json())
        .then(data => {
          if (data.error) { setError(data.error); setLoading(false); return; }
          setTable(data.table);
          setCategories(data.categories);
          setUncategorized(data.uncategorized ?? []);
          setLoading(false);
        })
        .catch(() => { setError("無法載入菜單"); setLoading(false); });
    });
  }, [params]);

  const allProducts = [
    ...categories.flatMap(c => c.products),
    ...uncategorized,
  ];

  const displayedProducts = activeCategory === "all"
    ? allProducts
    : activeCategory === "uncategorized"
    ? uncategorized
    : categories.find(c => c.id === activeCategory)?.products ?? [];

  const cartTotal = cart.reduce((sum, item) => {
    const modTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
    return sum + (item.basePrice + modTotal) * item.quantity;
  }, 0);

  const cartCount = cart.reduce((s, i) => s + i.quantity, 0);

  const addToCart = useCallback((item: Omit<CartItem, "key" | "quantity">) => {
    setCart(prev => {
      // Try to find existing identical item (same variant + same modifiers)
      const key = `${item.variantId}-${item.modifiers.map(m => m.optionId).sort().join(",")}`;
      const existing = prev.find(i => i.key === key && i.notes === item.notes);
      if (existing) {
        return prev.map(i => i.key === key ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...item, key, quantity: 1 }];
    });
  }, []);

  function updateQty(key: string, delta: number) {
    setCart(prev =>
      prev
        .map(i => i.key === key ? { ...i, quantity: i.quantity + delta } : i)
        .filter(i => i.quantity > 0)
    );
  }

  async function submitOrder() {
    if (!cart.length) return;
    setSubmitting(true);
    const res = await fetch(`/api/order/${tableToken}/submit`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        items: cart.map(i => ({
          variantId: i.variantId,
          quantity: i.quantity,
          modifiers: i.modifiers,
          notes: i.notes || undefined,
        })),
      }),
    });
    const data = await res.json();
    if (res.ok) {
      setOrderId(data.orderId);
      setCart([]);
      setShowCart(false);
    } else {
      alert(data.error ?? "送出失敗，請重試");
    }
    setSubmitting(false);
  }

  // ── Success screen ───────────────────────────────────────────────────────────
  if (orderId) {
    return (
      <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h1 className="text-2xl font-bold mb-2">已送出！</h1>
        <p className="text-gray-500 mb-1">訂單編號</p>
        <p className="font-mono text-sm text-gray-700 bg-white border rounded-lg px-3 py-2 mb-6">{orderId}</p>
        <p className="text-gray-500 text-sm mb-6">請稍候，廚房正在為您準備。</p>
        <button
          onClick={() => setOrderId(null)}
          className="bg-gray-900 text-white px-6 py-3 rounded-xl font-medium"
        >
          繼續點餐
        </button>
      </main>
    );
  }

  // ── Loading / error ──────────────────────────────────────────────────────────
  if (loading) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-400">載入菜單中…</p>
      </main>
    );
  }

  if (error || !table) {
    return (
      <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6 text-center">
        <div>
          <p className="text-4xl mb-3">😕</p>
          <p className="text-gray-600">{error || "找不到此桌位"}</p>
        </div>
      </main>
    );
  }

  // ── Main UI ──────────────────────────────────────────────────────────────────
  return (
    <main className="min-h-screen bg-gray-50 pb-28">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-white shadow-sm px-4 py-3 flex items-center gap-3">
        <div className="flex-1">
          <p className="font-bold text-base leading-none">{table.label ?? `${table.number} 號桌`}</p>
          <p className="text-xs text-gray-400 mt-0.5">掃描點餐</p>
        </div>
      </header>

      {/* Category tabs */}
      <div className="sticky top-[57px] z-20 bg-white border-b overflow-x-auto">
        <div className="flex gap-1 px-3 py-2 min-w-max">
          <button
            onClick={() => setActiveCategory("all")}
            className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
              activeCategory === "all" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            全部
          </button>
          {categories.filter(c => c.products.length > 0).map(c => (
            <button
              key={c.id}
              onClick={() => setActiveCategory(c.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === c.id ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              {c.name}
            </button>
          ))}
          {uncategorized.length > 0 && (
            <button
              onClick={() => setActiveCategory("uncategorized")}
              className={`px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition ${
                activeCategory === "uncategorized" ? "bg-gray-900 text-white" : "text-gray-600 hover:bg-gray-100"
              }`}
            >
              其他
            </button>
          )}
        </div>
      </div>

      {/* Products grid */}
      <div className="grid grid-cols-2 gap-3 p-3 sm:grid-cols-3">
        {displayedProducts.map(product => {
          const minPrice = Math.min(...product.variants.map(v => v.price));
          const imgUrl = product.images[0]?.url;
          return (
            <button
              key={product.id}
              onClick={() => setModalProduct(product)}
              className="bg-white rounded-2xl overflow-hidden shadow-sm text-left active:scale-95 transition"
            >
              {imgUrl ? (
                <div className="relative aspect-square w-full bg-gray-100">
                  <Image src={imgUrl} alt={product.title} fill className="object-cover" unoptimized />
                </div>
              ) : (
                <div className="aspect-square w-full bg-gray-100 flex items-center justify-center text-3xl">🍽️</div>
              )}
              <div className="p-2.5">
                <p className="text-sm font-semibold text-gray-900 leading-snug line-clamp-2">{product.title}</p>
                <p className="text-sm font-bold text-gray-900 mt-1">NT$ {minPrice}</p>
              </div>
            </button>
          );
        })}

        {displayedProducts.length === 0 && (
          <p className="col-span-full text-center text-gray-400 py-12">此分類暫無商品</p>
        )}
      </div>

      {/* Modifier modal */}
      {modalProduct && (
        <ModifierModal
          product={modalProduct}
          onClose={() => setModalProduct(null)}
          onAdd={addToCart}
        />
      )}

      {/* Cart drawer */}
      {showCart && (
        <div className="fixed inset-0 z-40 flex items-end">
          <div className="absolute inset-0 bg-black/50" onClick={() => setShowCart(false)} />
          <div className="relative z-10 w-full bg-white rounded-t-3xl max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between px-5 py-4 border-b">
              <h2 className="font-bold text-lg">購物車</h2>
              <button onClick={() => setShowCart(false)} className="text-gray-400 text-2xl leading-none">×</button>
            </div>

            <div className="flex-1 overflow-y-auto divide-y">
              {cart.map(item => {
                const modTotal = item.modifiers.reduce((s, m) => s + m.price, 0);
                return (
                  <div key={item.key} className="flex items-start gap-3 px-5 py-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">{item.productTitle}</p>
                      {item.variantName !== "預設" && (
                        <p className="text-xs text-gray-500">{item.variantName}</p>
                      )}
                      {item.modifiers.map(m => (
                        <p key={m.optionId} className="text-xs text-gray-400">{m.name}</p>
                      ))}
                      {item.notes && <p className="text-xs text-blue-500">備註: {item.notes}</p>}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => updateQty(item.key, -1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-lg leading-none"
                      >−</button>
                      <span className="text-sm font-medium w-4 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(item.key, 1)}
                        className="w-7 h-7 rounded-full border flex items-center justify-center text-lg leading-none"
                      >+</button>
                    </div>
                    <p className="text-sm font-semibold w-16 text-right shrink-0">
                      NT$ {(item.basePrice + modTotal) * item.quantity}
                    </p>
                  </div>
                );
              })}
            </div>

            <div className="border-t px-5 py-4 space-y-3">
              <div className="flex justify-between font-bold text-base">
                <span>合計</span>
                <span>NT$ {cartTotal}</span>
              </div>
              <button
                onClick={submitOrder}
                disabled={submitting}
                className="w-full bg-gray-900 text-white rounded-xl py-3.5 font-semibold text-base hover:bg-gray-700 disabled:opacity-50"
              >
                {submitting ? "送出中…" : "送出訂單"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating cart button */}
      {cartCount > 0 && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-30">
          <button
            onClick={() => setShowCart(true)}
            className="flex items-center gap-3 bg-gray-900 text-white px-5 py-3.5 rounded-2xl shadow-lg hover:bg-gray-700 active:scale-95 transition"
          >
            <span className="bg-white text-gray-900 text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
              {cartCount}
            </span>
            <span className="font-semibold">查看購物車</span>
            <span className="font-bold">NT$ {cartTotal}</span>
          </button>
        </div>
      )}
    </main>
  );
}
