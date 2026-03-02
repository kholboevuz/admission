import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import { jwtVerify } from "jose";
import AdmissionModel from "@/models/admission-models";
import NotificationModel from "@/models/notification-model"; // sizdagi export nomiga moslab o'zgartiring
import UsersModel from "@/models/users-models";
import ApplicationsModel from "@/models/application-models";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

type Ctx = { params: Promise<{ admissionId: string }> };

async function resolveAdmissionKey(admissionIdParam: string) {
    const admission =
        (await AdmissionModel.findById(admissionIdParam).lean()) ||
        (await AdmissionModel.findOne({ uuuid: admissionIdParam }).lean());

    if (!admission?._id) return { admission: null, admissionKey: null };

    const admissionIdAsObjectString = String(admission._id);
    const admissionUuid = String(admission.uuuid || "");

    const hasByObjectId = await ApplicationsModel.exists({ admission_id: admissionIdAsObjectString });
    const hasByUuid = admissionUuid ? await ApplicationsModel.exists({ admission_id: admissionUuid }) : null;

    const admissionKey =
        hasByObjectId ? admissionIdAsObjectString : hasByUuid ? admissionUuid : admissionIdAsObjectString;

    return { admission, admissionKey };
}

// GET: list notifications
export async function GET(req: NextRequest, ctx: Ctx) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth?.pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { admissionId } = await ctx.params;
        if (!admissionId) return NextResponse.json({ success: false, error: "admissionId required" }, { status: 400 });

        const { admission, admissionKey } = await resolveAdmissionKey(admissionId);
        if (!admissionKey) return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });

        const { searchParams } = new URL(req.url);
        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");

        const limit = Math.min(Math.max(parseInt(limitRaw || "20", 10) || 20, 1), 100);
        const page = Math.max(parseInt(pageRaw || "1", 10) || 1, 1);

        const [items, total] = await Promise.all([
            NotificationModel.find({ admission_id: admissionKey })
                .sort({ createdAt: -1, _id: -1 })
                .skip((page - 1) * limit)
                .limit(limit)
                .lean(),
            NotificationModel.countDocuments({ admission_id: admissionKey }),
        ]);

        return NextResponse.json(
            {
                success: true,
                admission: { id: String(admission._id), uuuid: admission.uuuid, title: admission.title },
                data: items,
                pagination: {
                    page,
                    limit,
                    total,
                    totalPages: Math.max(1, Math.ceil(total / limit)),
                    hasNext: page * limit < total,
                    hasPrev: page > 1,
                },
            },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}

// POST: create notification
export async function POST(req: NextRequest, ctx: Ctx) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth?.pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const { admissionId } = await ctx.params;
        if (!admissionId) return NextResponse.json({ success: false, error: "admissionId required" }, { status: 400 });

        const { admissionKey } = await resolveAdmissionKey(admissionId);
        if (!admissionKey) return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });

        const body = await req.json();
        const title = String(body?.title || "").trim();
        const comment = String(body?.comment || "").trim();
        const file = body?.file ? String(body.file) : undefined;

        const sendToAll = Boolean(body?.sendToAll);
        const usersFromBody = Array.isArray(body?.users) ? body.users.map(String) : [];

        if (!title || title.length < 3) {
            return NextResponse.json({ success: false, error: "Title kamida 3 ta belgi bo‘lsin" }, { status: 400 });
        }
        if (!comment || comment.length < 5) {
            return NextResponse.json({ success: false, error: "Xabar kamida 5 ta belgi bo‘lsin" }, { status: 400 });
        }

        let users: string[] = [];

        if (sendToAll) {
            const all = await UsersModel.find({ status: true }).select("pinfl").lean();
            users = all.map((u: any) => u.pinfl).filter(Boolean);
            if (users.length === 0) {
                return NextResponse.json({ success: false, error: "Foydalanuvchilar topilmadi" }, { status: 400 });
            }
        } else {
            users = usersFromBody.filter(Boolean);
            if (users.length === 0) {
                return NextResponse.json({ success: false, error: "Kamida 1 ta user tanlang" }, { status: 400 });
            }
        }

        const doc = await NotificationModel.create({
            admission_id: admissionKey,
            users,
            title,
            file,
            comment,
        });

        return NextResponse.json({ success: true, data: doc }, { status: 201 });
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}