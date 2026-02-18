import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import InternationalDiplomaModel from "@/models/international-diploma-model";
import { z } from "zod";
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

const BodySchema = z.object({
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

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const items = await InternationalDiplomaModel.find({ pinfl }).sort({ createdAt: -1 }).lean();
        return NextResponse.json({ success: true, data: items }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const form = await req.formData();

        const raw = {
            university: String(form.get("university") ?? ""),
            direction: String(form.get("direction") ?? ""),
            educationType: String(form.get("educationType") ?? ""),
            diplomaNumber: String(form.get("diplomaNumber") ?? ""),
        };

        const parsed = BodySchema.safeParse(raw);
        if (!parsed.success) {
            return NextResponse.json({ success: false, error: parsed.error.issues?.[0]?.message || "Validation error" }, { status: 400 });
        }

        const diplomaFile = form.get("diplomaFile");
        const nostrificationFile = form.get("nostrificationFile");

        if (!(diplomaFile instanceof File)) {
            return NextResponse.json({ success: false, error: "Diplom PDF faylini yuklang" }, { status: 400 });
        }
        if (!(nostrificationFile instanceof File)) {
            return NextResponse.json({ success: false, error: "Nostrifikatsiya PDF faylini yuklang" }, { status: 400 });
        }

        assertPdf(diplomaFile);
        assertPdf(nostrificationFile);

        const diplomaFilePath = await uploadViaUploadApi(req, diplomaFile, "diploma");
        const nostrificationFilePath = await uploadViaUploadApi(req, nostrificationFile, "nostrification");

        const doc = await InternationalDiplomaModel.create({
            pinfl,
            university: parsed.data.university,
            direction: parsed.data.direction,
            educationType: parsed.data.educationType,
            diplomaNumber: parsed.data.diplomaNumber,
            diplomaFilePath,
            nostrificationFilePath,
        });

        return NextResponse.json({ success: true, data: doc }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}
