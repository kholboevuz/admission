import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import ApplicationsModel from "@/models/application-models";

export const runtime = "nodejs";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env topilmadi");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string; role?: string };
}

function safeSlug(v: string): string | null {
    if (!v) return null;
    return /^[a-zA-Z0-9_-]+$/.test(v) ? v : null;
}

export async function POST(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        if (!auth?.pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const application_id = safeSlug(String(body?.application_id || "").trim());

        if (!application_id) {
            return NextResponse.json({ success: false, error: "application_id majburiy" }, { status: 400 });
        }

        await connectDB();

        await ApplicationsModel.findOneAndUpdate({ _id: application_id }, { application_status: "accepted" });
        return NextResponse.json({ success: true });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server xatoligi" }, { status: 500 });
    }
}