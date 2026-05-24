import Link from "next/link";
import { AdminCouponForm } from "@/components/AdminCouponForm";

export default function AdminNewCouponPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8">
      <Link href="/admin/coupons" className="text-sm font-medium text-orange-800 hover:underline">
        ← 返回列表
      </Link>
      <h1 className="page-title mt-4">新增優惠券</h1>
      <div className="mt-6">
        <AdminCouponForm />
      </div>
    </div>
  );
}
