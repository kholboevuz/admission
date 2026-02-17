import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
import { jwtVerify } from "jose";

export const runtime = "nodejs";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const form = await req.formData();
        const file = form.get("file");
        const admission_id = String(form.get("admission_id") || "");

        if (!admission_id) {
            return NextResponse.json({ success: false, error: "admission_id required" }, { status: 400 });
        }

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ success: false, error: "file required" }, { status: 400 });
        }

        if (file.type !== "application/pdf") {
            return NextResponse.json({ success: false, error: "Only PDF allowed" }, { status: 400 });
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        const max = 2 * 1024 * 1024;
        if (bytes.length > max) {
            return NextResponse.json({ success: false, error: "Max 2MB" }, { status: 400 });
        }

        const safeName = `${Date.now()}-${crypto.randomUUID()}.pdf`;

        const dir = path.join(process.cwd(), "public", "uploads", "admission", admission_id, pinfl);
        await fs.mkdir(dir, { recursive: true });

        const abs = path.join(dir, safeName);
        await fs.writeFile(abs, bytes);

        const publicPath = `/uploads/admission/${admission_id}/${pinfl}/${safeName}`;

        return NextResponse.json({ success: true, data: { path: publicPath, name: safeName } }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
