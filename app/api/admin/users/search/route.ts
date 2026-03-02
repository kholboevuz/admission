import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import { jwtVerify } from "jose";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth?.pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const q = (searchParams.get("q") || "").trim();
        const limitRaw = searchParams.get("limit");

        const limit = Math.min(Math.max(parseInt(limitRaw || "20", 10) || 20, 1), 50);

        const filter: any = {};
        if (q) filter.pinfl = { $regex: q, $options: "i" };

        const users = await UsersModel.find(filter)
            .select("pinfl firstname lastname role status")
            .sort({ pinfl: 1 })
            .limit(limit)
            .lean();

        return NextResponse.json({ success: true, data: users }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}