import { NextResponse } from "next/server";
import { getPaymentProvider } from "@/lib/payment-config";

export async function GET() {
  return NextResponse.json({ provider: getPaymentProvider() });
}
