import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";
import ModeratorApplicationsModel from "@/models/moderator-applications";
import { jwtVerify } from "jose";
import StaffModel from "@/models/staff-model";

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

        const staff = await StaffModel.findOne({ pinfl }).lean();
        if (!staff) {
            return NextResponse.json({ success: false, error: "Connect admission id not found" }, { status: 401 });
        }

        const admission = await AdmissionModel.findOne({ uuuid: staff.admission_id }).lean();
        if (!admission) {
            return NextResponse.json({ success: false, error: "Admission uuid not found" }, { status: 401 });
        }

        const { searchParams } = new URL(req.url);
        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");

        const limit = Math.min(Math.max(parseInt(limitRaw || "50", 10) || 50, 1), 200);
        const page = Math.max(parseInt(pageRaw || "1", 10) || 1, 1);

        const matchStage: any = {
            admission_id: String(admission._id),
            application_status: "submitted",
        };

        const pipeline: any[] = [
            { $match: matchStage },
            {
                $lookup: {
                    from: ModeratorApplicationsModel.collection.name,
                    let: { appIdStr: { $toString: "$_id" } },
                    pipeline: [
                        { $match: { $expr: { $eq: ["$application_id", "$$appIdStr"] } } },
                        { $limit: 1 },
                    ],
                    as: "mods",
                },
            },
            { $match: { "mods.0": { $exists: false } } },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    data: [{ $skip: (page - 1) * limit }, { $limit: limit }],
                    meta: [{ $count: "total" }],
                },
            },
        ];

        const out = await ApplicationsModel.aggregate(pipeline);

        const data = out?.[0]?.data || [];
        const total = out?.[0]?.meta?.[0]?.total || 0;

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