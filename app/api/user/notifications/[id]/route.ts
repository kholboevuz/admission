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

// GET /api/user/notifications/[id]
export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await params;

        const auth = await getAuth(req);
        if (!auth) {
            return NextResponse.json(
                { success: false, error: "Autentifikatsiya talab etiladi" },
                { status: 401 }
            );
        }

        const pinfl = auth?.pinfl ? String(auth.pinfl) : null;
        if (!pinfl) {
            return NextResponse.json(
                { success: false, error: "PINFL topilmadi" },
                { status: 400 }
            );
        }

        await connectDB();

        const notif = await NotificationModel.findOne({
            _id: id,
            users: pinfl,        // faqat o'ziga tegishli bo'lsa
        }).lean();

        if (!notif) {
            return NextResponse.json(
                { success: false, error: "Topilmadi" },
                { status: 404 }
            );
        }

        // Mark as read
        if ((notif as any).unRead) {
            await NotificationModel.findByIdAndUpdate(id, {
                $set: { unRead: false },
            });
            (notif as any).unRead = false;
        }

        return NextResponse.json({ success: true, data: notif });
    } catch (err: any) {
        console.error("[GET /api/user/notifications/[id]]", err);
        return NextResponse.json(
            { success: false, error: "Server xatosi" },
            { status: 500 }
        );
    }
}