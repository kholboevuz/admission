import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import InternationalDiplomaModel from "@/models/international-diploma-model";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import axios from "axios";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_PDF = 5 * 1024 * 1024;

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}

const UpdateSchema = z.object({
    university: z.string().min(2),
    direction: z.string().min(2),
    educationType: z.enum(["bachelor", "master"]),
    diplomaNumber: z.string().min(3),
});

function assertPdf(file: File) {
    if (file.type !== "application/pdf") throw new Error("Only PDF allowed");
    if (file.size > MAX_PDF) throw new Error("Max 5MB");
}

async function uploadViaUploadApi(req: NextRequest, file: File, docType: "diploma" | "nostrification") {

    const cookie = req.headers.get("cookie") || "";

    const fd = new FormData();
    fd.append("file", file);
    fd.append("scope", "international");
    fd.append("docType", docType);

    const res = await axios.post(`${process.env.NEXT_PUBLIC_BASE_URL}/api/user/application/upload`, fd, {
        headers: {
            "Content-Type": "multipart/form-data",
            Cookie: cookie,
        },
    });

    const json = res.data;

    if (!json?.success) {
        throw new Error(json?.error || json?.message || `Upload failed (${res.status})`);
    }

    const p = json?.data?.path as string | undefined;
    if (!p) throw new Error("upload path missing");
    return p;
}

function publicPathToAbs(publicPath: string) {
    const clean = publicPath.startsWith("/") ? publicPath.slice(1) : publicPath;
    return path.join(process.cwd(), "public", clean);
}

async function tryUnlinkByPublicPath(p?: string) {
    if (!p) return;
    try {
        await fs.unlink(publicPathToAbs(p));
    } catch { }
}

type ParamsPromise = { params: Promise<{ id: string }> };

export async function PUT(req: NextRequest, { params }: ParamsPromise) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { id } = await params; // ✅ FIX
        const safeId = String(id || "").trim();
        if (!safeId) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

        const existing = await InternationalDiplomaModel.findOne({ _id: safeId, pinfl }).lean();
        if (!existing) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

        const form = await req.formData();

        const raw = {
            university: String(form.get("university") ?? ""),
            direction: String(form.get("direction") ?? ""),
            educationType: String(form.get("educationType") ?? ""),
            diplomaNumber: String(form.get("diplomaNumber") ?? ""),
        };

        const parsed = UpdateSchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: parsed.error.issues?.[0]?.message || "Validation error" },
                { status: 400 }
            );
        }

        const diplomaFile = form.get("diplomaFile");
        const nostrificationFile = form.get("nostrificationFile");

        let diplomaFilePath = existing.diplomaFilePath as string;
        let nostrificationFilePath = existing.nostrificationFilePath as string;

        if (diplomaFile instanceof File) {
            assertPdf(diplomaFile);
            const newPath = await uploadViaUploadApi(req, diplomaFile, "diploma");
            await tryUnlinkByPublicPath(diplomaFilePath);
            diplomaFilePath = newPath;
        }

        if (nostrificationFile instanceof File) {
            assertPdf(nostrificationFile);
            const newPath = await uploadViaUploadApi(req, nostrificationFile, "nostrification");
            await tryUnlinkByPublicPath(nostrificationFilePath);
            nostrificationFilePath = newPath;
        }

        const updated = await InternationalDiplomaModel.findOneAndUpdate(
            { _id: safeId, pinfl },
            {
                $set: {
                    university: parsed.data.university,
                    direction: parsed.data.direction,
                    educationType: parsed.data.educationType,
                    diplomaNumber: parsed.data.diplomaNumber,
                    diplomaFilePath,
                    nostrificationFilePath,
                },
            },
            { new: true }
        ).lean();

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest, { params }: ParamsPromise) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { id } = await params; // ✅ FIX
        const safeId = String(id || "").trim();
        if (!safeId) return NextResponse.json({ success: false, error: "id required" }, { status: 400 });

        const doc = await InternationalDiplomaModel.findOneAndDelete({ _id: safeId, pinfl }).lean();
        if (!doc) return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });

        await tryUnlinkByPublicPath(doc.diplomaFilePath);
        await tryUnlinkByPublicPath(doc.nostrificationFilePath);

        return NextResponse.json({ success: true, data: { deleted: true } }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}
