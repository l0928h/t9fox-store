import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.role === "ADMIN";
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  const { name, required, multiSelect, position, options } = await req.json();

  const modifier = await prisma.productModifier.update({
    where: { id },
    data: {
      ...(name !== undefined && { name }),
      ...(required !== undefined && { required }),
      ...(multiSelect !== undefined && { multiSelect }),
      ...(position !== undefined && { position }),
      // Replace all options if provided
      ...(options !== undefined && {
        options: {
          deleteMany: {},
          create: options.map((o: { name: string; price?: number; position?: number }, i: number) => ({
            name: o.name,
            price: o.price ?? 0,
            position: o.position ?? i,
          })),
        },
      }),
    },
    include: { options: { orderBy: { position: "asc" } } },
  });
  return NextResponse.json(modifier);
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { id } = await params;
  await prisma.productModifier.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
