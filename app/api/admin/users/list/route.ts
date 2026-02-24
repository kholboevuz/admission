import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";

function toInt(v: string | null, def: number) {
    const n = Number(v);
    return Number.isFinite(n) ? n : def;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);

        const page = Math.max(1, toInt(searchParams.get("page"), 1));
        const limitRaw = toInt(searchParams.get("limit"), 50);
        const limit = Math.min(Math.max(1, limitRaw), 200);

        const pinfl = (searchParams.get("pinfl") || "").trim();

        const filter: any = {};
        if (pinfl) {

            filter.pinfl = { $regex: `^${pinfl.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`, $options: "i" };
        }

        const skip = (page - 1) * limit;

        const [total, items] = await Promise.all([
            UsersModel.countDocuments(filter),
            UsersModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .select("firstname lastname document brithday role status pinfl createdAt")
                .lean(),
        ]);

        const pages = Math.max(1, Math.ceil(total / limit));

        return NextResponse.json({
            success: true,
            data: {
                items,
                meta: { page, limit, total, pages },
            },
        });
    } catch (e: any) {
        console.error("USERS LIST ERROR:", e);
        return NextResponse.json(
            { success: false, message: e?.message || "Server error" },
            { status: 500 }
        );
    }
}