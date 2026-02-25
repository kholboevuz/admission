import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { jwtVerify } from "jose";
import { UPLOAD_ROOT, assertSafeSubPath } from "@/lib/upload-path";

export const runtime = "nodejs";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env topilmadi");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}

function safeSlug(v: string): string | null {
    if (!v) return null;
    return /^[a-zA-Z0-9_-]+$/.test(v) ? v : null;
}

function safeFileName(v: string): string | null {
    if (!v) return null;

    return /^[a-zA-Z0-9_.-]+\.pdf$/.test(v) ? v : null;
}

export async function GET(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const scope = safeSlug(String(searchParams.get("scope") || "").trim().toLowerCase());
        const name = safeFileName(String(searchParams.get("name") || "").trim());

        if (!scope || !name) {
            return NextResponse.json({ success: false, error: "scope va name majburiy" }, { status: 400 });
        }

        let fileDir: string;

        if (scope === "admission") {
            const admission_id = safeSlug(String(searchParams.get("admission_id") || "").trim());
            if (!admission_id) {
                return NextResponse.json({ success: false, error: "admission_id majburiy" }, { status: 400 });
            }
            fileDir = path.join(UPLOAD_ROOT, "admission", admission_id, pinfl);
        } else if (scope === "international") {
            const docType = safeSlug(String(searchParams.get("docType") || "").trim());
            if (!docType) {
                return NextResponse.json({ success: false, error: "docType majburiy" }, { status: 400 });
            }
            fileDir = path.join(UPLOAD_ROOT, "international", pinfl, docType);
        } else {
            return NextResponse.json({ success: false, error: "Noto'g'ri scope" }, { status: 400 });
        }

        const abs = path.join(fileDir, name);

        assertSafeSubPath(UPLOAD_ROOT, abs);

        const buf = await fs.readFile(abs);

        return new NextResponse(buf, {
            status: 200,
            headers: {
                "Content-Type": "application/pdf",
                "Content-Disposition": `inline; filename="${name}"`,
                "Cache-Control": "private, max-age=0, must-revalidate",
            },
        });
    } catch (e: any) {

        if (e?.message === "Path traversal detected") {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }
        console.error(e);
        return NextResponse.json({ success: false, error: "Topilmadi" }, { status: 404 });
    }
}

