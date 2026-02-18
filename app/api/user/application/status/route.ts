import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";
import { jwtVerify } from "jose";

function inRange(start: string, end: string) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    return now >= s && now <= e;
}

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
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const activeAdmission = await AdmissionModel
            .findOne({ status: true })
            .sort({ createdAt: -1 })
            .lean();

        const lastAdmission = activeAdmission
            ? activeAdmission
            : await AdmissionModel.findOne({}).sort({ createdAt: -1 }).lean();

        if (!lastAdmission) {
            return NextResponse.json(
                { success: true, data: { ok: false, reason: "no_admission" } },
                { status: 200 }
            );
        }

        const isOpen =
            !!lastAdmission.status &&
            inRange(lastAdmission.starter_date, lastAdmission.end_date);
        const userHasApplication = await ApplicationsModel
            .findOne({ pinfl, admission_id: String(lastAdmission._id) })
            .lean();

        const ok = isOpen || !!userHasApplication;

        return NextResponse.json(
            {
                success: true,
                data: {
                    ok,
                    isOpen,
                    hasApplication: !!userHasApplication,
                    admissionId: String(lastAdmission._id),
                },
            },
            { status: 200 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
