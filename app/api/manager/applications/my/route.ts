import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import { jwtVerify } from "jose";
import StaffModel from "@/models/staff-model";
import ApplicationsModel from "@/models/application-models";
import ModeratorApplicationsModel from "@/models/moderator-applications";

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

        const pinfl = (await getAuth(req))?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const staff = await StaffModel.findOne({ pinfl }).select("pinfl").lean();
        if (!staff) {
            return NextResponse.json({ success: false, error: "Staff not found" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);

        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");
        const qRaw = searchParams.get("q");

        const limit = Math.min(Math.max(parseInt(limitRaw || "50", 10) || 50, 1), 200);
        const page = Math.max(parseInt(pageRaw || "1", 10) || 1, 1);
        const q = (qRaw || "").trim();

        const modFilter: any = { moderator_pinfl: staff.pinfl };
        if (q) modFilter.application_id = { $regex: q, $options: "i" };

        const total = await ModeratorApplicationsModel.countDocuments(modFilter);

        const modRows = await ModeratorApplicationsModel.find(modFilter)
            .sort({ updatedAt: -1, _id: -1 })
            .skip((page - 1) * limit)
            .limit(limit)
            .select("application_id moderator_pinfl comment createdAt updatedAt")
            .lean();

        const appIds = Array.from(new Set(modRows.map((r: any) => String(r.application_id)).filter(Boolean)));

        const appDocs = await ApplicationsModel.find({ _id: { $in: appIds } })
            .select("pinfl admission_id step step_1 esse payment_status application_status comments createdAt updatedAt")
            .lean();

        const appMap = new Map<string, any>();
        for (const a of appDocs) appMap.set(String(a._id), a);

        const data = modRows
            .map((m: any) => ({
                _id: String(m._id),
                application_id: String(m.application_id),
                moderator_pinfl: String(m.moderator_pinfl),
                moderator_comments: m.comment || [],
                createdAt: m.createdAt,
                updatedAt: m.updatedAt,
                application: appMap.get(String(m.application_id)) || null,
            }))
            .filter((x: any) => !!x.application);

        return NextResponse.json(
            {
                success: true,
                data,
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
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}