import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.role === "ADMIN";
}

// GET /api/admin/modifiers?productId=xxx
export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const productId = req.nextUrl.searchParams.get("productId");
  const modifiers = await prisma.productModifier.findMany({
    where: productId ? { productId } : undefined,
    include: { options: { orderBy: { position: "asc" } } },
    orderBy: { position: "asc" },
  });
  return NextResponse.json(modifiers);
}

// POST /api/admin/modifiers
export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { productId, name, required, multiSelect, position, options } = await req.json();
  if (!productId || !name) return NextResponse.json({ error: "productId 與名稱必填" }, { status: 400 });

  const modifier = await prisma.productModifier.create({
    data: {
      productId,
      name,
      required: required ?? false,
      multiSelect: multiSelect ?? false,
      position: position ?? 0,
      options: options?.length
        ? { create: options.map((o: { name: string; price?: number; position?: number }, i: number) => ({
            name: o.name,
            price: o.price ?? 0,
            position: o.position ?? i,
          })) }
        : undefined,
    },
    include: { options: true },
  });
  return NextResponse.json(modifier, { status: 201 });
}
