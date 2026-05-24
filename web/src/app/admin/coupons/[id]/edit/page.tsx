import Link from "next/link";
import { AdminCouponForm } from "@/components/AdminCouponForm";

type Props = { params: Promise<{ id: string }> };

export default async function AdminEditCouponPage({ params }: Props) {
  const { id } = await params;
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin/coupons" className="text-sm font-medium text-orange-800 hover:underline">
        ← 返回列表
      </Link>
      <h1 className="page-title mt-4">編輯優惠券</h1>
      <div className="mt-6">
        <AdminCouponForm couponId={id} />
      </div>
    </div>
  );
}
