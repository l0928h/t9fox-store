import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { mergeGuestCartIntoUser } from "@/lib/cart-helpers";

export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "請先登入" }, { status: 401 });
  }
  const result = await mergeGuestCartIntoUser(session.user.id);
  return NextResponse.json(result);
}
