import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";
import { type NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

async function isAdmin(req: NextRequest) {
  const token = await getToken({ req, secret: process.env.AUTH_SECRET });
  return token?.role === "ADMIN";
}

export async function GET(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const tables = await prisma.table.findMany({ orderBy: { number: "asc" } });
  return NextResponse.json(tables);
}

export async function POST(req: NextRequest) {
  if (!(await isAdmin(req))) return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  const { number, label, capacity } = await req.json();
  if (!number) return NextResponse.json({ error: "桌號必填" }, { status: 400 });
  const table = await prisma.table.create({ data: { number, label, capacity: capacity ?? 2 } });
  return NextResponse.json(table, { status: 201 });
}
