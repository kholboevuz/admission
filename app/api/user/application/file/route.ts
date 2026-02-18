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
    if (!name) return null;
    const base = path.basename(name);
    if (base !== name) return null;
    return base;
}

function safeSlug(v: string) {

    if (!v) return null;
    if (!/^[a-zA-Z0-9_-]+$/.test(v)) return null;
    return v;
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { searchParams } = new URL(req.url);

        const scopeRaw = String(searchParams.get("scope") || "admission").trim().toLowerCase();
        const scope = safeSlug(scopeRaw);
        const nameRaw = String(searchParams.get("name") || "");

        const name = safeBaseName(nameRaw);
        if (!scope || !name) {
            return NextResponse.json({ success: false, error: "scope and name required" }, { status: 400 });
        }

        let abs: string;

        if (scope === "admission") {
            const admission_id = safeSlug(String(searchParams.get("admission_id") || "").trim());
            if (!admission_id) {
                return NextResponse.json({ success: false, error: "admission_id required" }, { status: 400 });
            }

            abs = path.join(process.cwd(), "public", "uploads", "admission", admission_id, pinfl, name);
        } else if (scope === "international") {
            const docType = safeSlug(String(searchParams.get("docType") || "").trim());
            if (!docType) {
                return NextResponse.json({ success: false, error: "docType required" }, { status: 400 });
            }

            abs = path.join(process.cwd(), "public", "uploads", "international", pinfl, docType, name);
        } else {
            return NextResponse.json({ success: false, error: "Invalid scope" }, { status: 400 });
        }

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
