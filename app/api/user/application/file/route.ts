import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
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

function safeBaseName(name: string) {
    // path traversalni bloklaymiz
    if (!name) return null;
    const base = path.basename(name);
    if (base !== name) return null;
    return base;
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);
        const admission_id = String(searchParams.get("admission_id") || "");
        const nameRaw = String(searchParams.get("name") || "");

        const name = safeBaseName(nameRaw);
        if (!admission_id || !name) {
            return NextResponse.json({ success: false, error: "admission_id and name required" }, { status: 400 });
        }

        const abs = path.join(process.cwd(), "public", "uploads", "admission", admission_id, pinfl, name);

        const buf = await fs.readFile(abs);

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${name}"`,
                "Cache-Control": "private, max-age=0, must-revalidate",
            },
        });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }
}
