import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";
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

type Ctx = { params: Promise<{ admissionId: string }> };

export async function GET(req: NextRequest, ctx: Ctx) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth?.pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { admissionId } = await ctx.params;
        if (!admissionId) {
            return NextResponse.json({ success: false, error: "admissionId is required" }, { status: 400 });
        }

        // admission topish (_id yoki uuuid)
        const admission =
            (await AdmissionModel.findById(admissionId).lean()) ||
            (await AdmissionModel.findOne({ uuuid: admissionId }).lean());

        if (!admission?._id) {
            return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });
        }

        // Applications.admission_id ba'zan _id string, ba'zan uuuid bo'lishi mumkin
        const admissionIdAsObjectString = String(admission._id);
        const admissionUuid = String(admission.uuuid || "");

        const hasByObjectId = await ApplicationsModel.exists({ admission_id: admissionIdAsObjectString });
        const hasByUuid = admissionUuid ? await ApplicationsModel.exists({ admission_id: admissionUuid }) : null;

        const admissionKey =
            hasByObjectId ? admissionIdAsObjectString : hasByUuid ? admissionUuid : admissionIdAsObjectString;

        const { searchParams } = new URL(req.url);

        const pageRaw = searchParams.get("page");
        const limitRaw = searchParams.get("limit");
        const q = (searchParams.get("q") || "").trim(); // pinfl/email/phone bo'yicha qidirish
        const status = (searchParams.get("status") || "").trim(); // optional: submitted, paid, ...
        const paid = (searchParams.get("paid") || "").trim(); // optional: "true" | "false"

        const limit = Math.min(Math.max(parseInt(limitRaw || "50", 10) || 50, 1), 200);
        const page = Math.max(parseInt(pageRaw || "1", 10) || 1, 1);

        const match: any = { admission_id: admissionKey };

        // status filter (ixtiyoriy)
        if (status) match.application_status = status;

        // payment filter (ixtiyoriy)
        if (paid === "true") match.payment_status = true;
        if (paid === "false") match.payment_status = false;

        // search (ixtiyoriy)
        if (q) {
            // pinfl exact yoki partial, email/phone partial
            match.$or = [
                { pinfl: { $regex: q, $options: "i" } },
                { "step_1.email": { $regex: q, $options: "i" } },
                { "step_1.phone_number": { $regex: q, $options: "i" } },
                { "step_1.phone_number_additional": { $regex: q, $options: "i" } },
                { "step_1.choice.name": { $regex: q, $options: "i" } },
            ];
        }

        const pipeline: any[] = [
            { $match: match },
            { $sort: { createdAt: -1, _id: -1 } },
            {
                $facet: {
                    data: [
                        { $skip: (page - 1) * limit },
                        { $limit: limit },
                        {
                            $project: {
                                admission_id: 1,
                                pinfl: 1,
                                step: 1,
                                step_1: 1,
                                payment_status: 1,
                                application_status: 1,
                                comments: 1,
                                createdAt: 1,
                                updatedAt: 1,
                            },
                        },
                    ],
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
                admission: {
                    id: String(admission._id),
                    uuuid: admission.uuuid,
                    title: admission.title,
                },
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
    } catch (e: any) {
        console.error(e);
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}