import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import InternationalDiplomaModel from "@/models/international-diploma-model";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const items = await InternationalDiplomaModel.find({ pinfl })
            .sort({ createdAt: -1 })
            .lean();

        return NextResponse.json({ success: true, data: items }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}
