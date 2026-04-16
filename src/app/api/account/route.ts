import { NextRequest, NextResponse } from "next/server";
import { getDb } from "@/lib/db";
import bcrypt from "bcryptjs";

export const dynamic = "force-dynamic";

export async function PUT(req: NextRequest) {
  const sql = getDb();
  const body = await req.json();
  const { email, current_password, new_password } = body;

  if (!email || !current_password || !new_password) {
    return NextResponse.json({ error: "All fields required" }, { status: 400 });
  }

  const rows = await sql`SELECT * FROM admins WHERE email = ${email}`;
  if (rows.length === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const admin = rows[0];
  const valid = await bcrypt.compare(current_password, admin.password_hash);
  if (!valid) return NextResponse.json({ error: "Current password is incorrect" }, { status: 401 });

  const hash = await bcrypt.hash(new_password, 10);
  await sql`UPDATE admins SET password_hash = ${hash} WHERE email = ${email}`;

  return NextResponse.json({ success: true });
}
