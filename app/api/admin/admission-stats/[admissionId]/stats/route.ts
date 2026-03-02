import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";

type JwtPayload = { sub?: string; role?: string; pinfl?: string };

async function getAuth(req: NextRequest): Promise<JwtPayload | null> {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as JwtPayload;
}

function lastNMonthsLabels(n: number) {
    const now = new Date();
    const arr: { key: string; label: string }[] = [];
    for (let i = n - 1; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const label = d.toLocaleString("en-US", { month: "short" });
        arr.push({ key, label });
    }
    return arr;
}

type Ctx = { params: Promise<{ admissionId: string }> }; // ✅ params Promise

export async function GET(req: NextRequest, ctx: Ctx) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth?.pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { admissionId } = await ctx.params; // ✅ await params
        const admissionIdParam = admissionId;

        if (!admissionIdParam) {
            return NextResponse.json({ success: false, error: "admissionId is required" }, { status: 400 });
        }

        const admission =
            (await AdmissionModel.findById(admissionIdParam).lean()) ||
            (await AdmissionModel.findOne({ uuuid: admissionIdParam }).lean());

        if (!admission?._id) {
            return NextResponse.json({ success: false, error: "Admission not found" }, { status: 404 });
        }

        const admissionIdAsObjectString = String(admission._id);
        const admissionUuid = String(admission.uuuid || "");

        const hasByObjectId = await ApplicationsModel.exists({ admission_id: admissionIdAsObjectString });
        const hasByUuid = admissionUuid ? await ApplicationsModel.exists({ admission_id: admissionUuid }) : null;

        const admissionKey =
            hasByObjectId ? admissionIdAsObjectString : hasByUuid ? admissionUuid : admissionIdAsObjectString;

        const [totalApplicants, statusAgg, radarAgg, areaAggRaw, paidCount] = await Promise.all([
            ApplicationsModel.countDocuments({ admission_id: admissionKey }),

            ApplicationsModel.aggregate([
                { $match: { admission_id: admissionKey } },
                { $group: { _id: "$application_status", count: { $sum: 1 } } },
            ]),

            ApplicationsModel.aggregate([
                { $match: { admission_id: admissionKey } },
                { $group: { _id: "$step_1.choice.name", count: { $sum: 1 } } },
                { $sort: { count: -1 } },
                { $limit: 8 },
            ]),

            ApplicationsModel.aggregate([
                { $match: { admission_id: admissionKey } },
                {
                    $group: {
                        _id: { y: { $year: "$createdAt" }, m: { $month: "$createdAt" } },
                        count: { $sum: 1 },
                    },
                },
                { $sort: { "_id.y": 1, "_id.m": 1 } },
            ]),

            ApplicationsModel.countDocuments({ admission_id: admissionKey, payment_status: true }),
        ]);

        const statusMap = (statusAgg as Array<{ _id: string; count: number }>).reduce((acc, cur) => {
            acc[cur._id || "unknown"] = cur.count;
            return acc;
        }, {} as Record<string, number>);

        const openContest =
            (statusMap["submitted"] || 0) +
            (statusMap["reviewed"] || 0) +
            (statusMap["return_submitted"] || 0);

        const inOrder = paidCount; // ✅ faqat payment_status asosida (aniqroq)

        const rejected = statusMap["rejected"] || 0;
        const returned = statusMap["returned"] || 0;

        const last6 = lastNMonthsLabels(6);
        const areaMap = new Map<string, number>();
        for (const row of areaAggRaw as Array<{ _id: { y: number; m: number }; count: number }>) {
            const key = `${row._id.y}-${String(row._id.m).padStart(2, "0")}`;
            areaMap.set(key, row.count);
        }

        const area = last6.map((x) => ({
            month: x.label,
            applications: areaMap.get(x.key) || 0,
        }));

        const areaTotal = area.reduce((s, x) => s + x.applications, 0);
        const lastMonth = area[area.length - 1]?.applications || 0;
        const prevMonth = area[area.length - 2]?.applications || 0;
        const trendPct =
            prevMonth === 0
                ? lastMonth > 0
                    ? 100
                    : 0
                : Math.round(((lastMonth - prevMonth) / prevMonth) * 1000) / 10;

        const radar = (radarAgg as Array<{ _id: string; count: number }>).map((x) => ({
            category: x._id || "Noma'lum",
            applicants: x.count,
        }));

        return NextResponse.json(
            {
                success: true,
                data: {
                    admission: {
                        id: String(admission._id),
                        uuuid: admission.uuuid,
                        title: admission.title,
                        starter_date: admission.starter_date,
                        end_date: admission.end_date,
                    },
                    cards: {
                        totalApplicants,
                        openContest,
                        inOrder,
                        rejected,
                        returned,
                    },
                    statusMap,
                    radar,
                    area,
                    areaMeta: { areaTotal, lastMonth, prevMonth, trendPct },
                },
            },
            { status: 200 }
        );
    } catch (e: any) {
        return NextResponse.json({ success: false, error: e?.message || "Server error" }, { status: 500 });
    }
}