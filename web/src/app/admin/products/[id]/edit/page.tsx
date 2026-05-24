import Link from "next/link";
import { AdminProductForm } from "@/components/AdminProductForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditProductPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <div className="mb-6">
        <Link href="/admin/products" className="text-sm font-medium text-orange-800 hover:underline">
          ← 返回商品列表
        </Link>
        <h1 className="page-title mt-4">編輯商品</h1>
      </div>
      <AdminProductForm productId={id} />
    </div>
  );
}
