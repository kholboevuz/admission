import { NextRequest, NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import crypto from "crypto";
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

const ALLOWED_SCOPE = new Set(["admission", "international"]);
const ALLOWED_DOCTYPE = new Set(["diploma", "nostrification", "other"]);

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const form = await req.formData();
        const file = form.get("file");
        const admission_id = String(form.get("admission_id") || "").trim();
        const scopeRaw = String(form.get("scope") || "").trim().toLowerCase();
        const docTypeRaw = String(form.get("docType") || "other").trim().toLowerCase();

        if (!file || !(file instanceof File)) {
            return NextResponse.json({ success: false, error: "file required" }, { status: 400 });
        }
        if (file.type !== "application/pdf") {
            return NextResponse.json({ success: false, error: "Faqat PDF qabul qilinadi" }, { status: 400 });
        }

        const bytes = Buffer.from(await file.arrayBuffer());
        if (bytes.length > 2 * 1024 * 1024) {
            return NextResponse.json({ success: false, error: "Maksimal hajm 2MB" }, { status: 400 });
        }

        const safeName = `${Date.now()}-${crypto.randomUUID()}.pdf`;

        if (admission_id) {
            // admission_id faqat xavfsiz belgilardan iborat bo'lishi kerak
            if (!/^[a-zA-Z0-9_-]+$/.test(admission_id)) {
                return NextResponse.json({ success: false, error: "Noto'g'ri admission_id" }, { status: 400 });
            }

            const dir = path.join(UPLOAD_ROOT, "admission", admission_id, pinfl);
            assertSafeSubPath(UPLOAD_ROOT, dir);

            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, safeName), bytes);

            return NextResponse.json({
                success: true,
                data: {
                    // Fayl URL'i — GET route orqali olinadi (public/ emas)
                    path: `/api/files?scope=admission&admission_id=${admission_id}&name=${safeName}`,
                    name: safeName,
                },
            });
        }

        const scope = scopeRaw || "international";
        if (!ALLOWED_SCOPE.has(scope)) {
            return NextResponse.json({ success: false, error: "Noto'g'ri scope" }, { status: 400 });
        }

        const docType = ALLOWED_DOCTYPE.has(docTypeRaw) ? docTypeRaw : "other";

        if (scope === "international") {
            const dir = path.join(UPLOAD_ROOT, "international", pinfl, docType);
            assertSafeSubPath(UPLOAD_ROOT, dir);

            await fs.mkdir(dir, { recursive: true });
            await fs.writeFile(path.join(dir, safeName), bytes);

            return NextResponse.json({
                success: true,
                data: {
                    path: `/api/files?scope=international&docType=${docType}&name=${safeName}`,
                    name: safeName,
                },
            });
        }

        return NextResponse.json({ success: false, error: "Qo'llab-quvvatlanmagan scope" }, { status: 400 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}