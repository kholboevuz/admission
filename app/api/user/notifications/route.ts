import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import NotificationModel from "@/models/notification-model";


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
        const auth = await getAuth(req);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Autentifikatsiya talab etiladi" }, { status: 401 });
        }

        const pinfl = auth?.pinfl ? String(auth.pinfl) : null;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "PINFL topilmadi" }, { status: 400 });
        }

        const { searchParams } = new URL(req.url);
        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const skip = (page - 1) * limit;

        await connectDB();

        const filter = { users: pinfl };

        const [data, total] = await Promise.all([
            NotificationModel.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean(),
            NotificationModel.countDocuments(filter),
        ]);

        const totalPages = Math.ceil(total / limit);

        return NextResponse.json({
            success: true,
            data,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        });
    } catch (err: any) {
        console.error("[GET /api/user/notifications]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}

// PATCH /api/user/notifications  — mark all as read for this pinfl
export async function PATCH(req: NextRequest) {
    try {
        const auth = await getAuth(req);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Autentifikatsiya talab etiladi" }, { status: 401 });
        }

        const pinfl = auth?.pinfl ? String(auth.pinfl) : null;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "PINFL topilmadi" }, { status: 400 });
        }

        await connectDB();

        await NotificationModel.updateMany(
            { users: pinfl, unRead: true },
            { $set: { unRead: false } }
        );

        return NextResponse.json({ success: true });
    } catch (err: any) {
        console.error("[PATCH /api/user/notifications]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}