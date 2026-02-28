import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";

type AuthPayload = { sub?: string; role?: string; pinfl?: string };

function isNowInRange(start: string | Date, end: string | Date) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    return now >= s && now <= e;
}

function json200(data: unknown) {
    return NextResponse.json({ success: true, data }, { status: 200 });
}

function json401() {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}

function json500() {
    return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
}

async function getAuth(req: NextRequest): Promise<AuthPayload | null> {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as AuthPayload;
}

async function getLatestAdmission() {
    return AdmissionModel.findOne({}).sort({ createdAt: -1 }).lean();
}

async function getActiveAdmission() {
    return AdmissionModel.findOne({ status: true }).sort({ createdAt: -1 }).lean();
}

async function getLastUserApplication(pinfl: string) {
    return ApplicationsModel.findOne({ pinfl }).sort({ createdAt: -1 }).lean();
}

async function userHasApplication(pinfl: string, admissionId: string) {
    const app = await ApplicationsModel.findOne({ pinfl, admission_id: admissionId }).lean();
    return !!app;
}

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return json401();

        const [activeAdmission, lastAdmission, lastUserApp] = await Promise.all([
            getActiveAdmission(),
            getLatestAdmission(),
            getLastUserApplication(pinfl),
        ]);

        if (!lastAdmission) {
            return json200({ ok: false, reason: "no_admission" });
        }

        const activeIsUsable =
            !!activeAdmission?.status &&
            isNowInRange(activeAdmission.starter_date, activeAdmission.end_date);

        const targetAdmissionId = activeIsUsable
            ? String(activeAdmission!._id)
            : lastUserApp?.admission_id
                ? String(lastUserApp.admission_id)
                : String(lastAdmission._id);

        const targetAdmission =
            String(lastAdmission._id) === targetAdmissionId
                ? lastAdmission
                : activeAdmission && String(activeAdmission._id) === targetAdmissionId
                    ? activeAdmission
                    : await AdmissionModel.findById(targetAdmissionId).lean();

        // Agar target topilmasa — fallback: lastAdmission bo‘yicha hisoblaymiz
        if (!targetAdmission) {
            const admissionStatus = !!lastAdmission.status;
            const isOpen =
                admissionStatus && isNowInRange(lastAdmission.starter_date, lastAdmission.end_date);

            const hasApplication = admissionStatus
                ? await userHasApplication(pinfl, String(lastAdmission._id))
                : false;

            const ok = admissionStatus ? isOpen || hasApplication : false;

            return json200({
                ok,
                isOpen,
                hasApplication,
                admissionId: String(lastAdmission._id),
                admissionStatus,
            });
        }

        const admissionStatus = !!targetAdmission.status;

        if (!admissionStatus) {
            return json200({
                ok: false,
                isOpen: false,
                hasApplication: false,
                admissionId: String(targetAdmission._id),
                admissionStatus: false,
            });
        }

        const isOpen = isNowInRange(targetAdmission.starter_date, targetAdmission.end_date);

        // active usable bo‘lsa hasApplication false (sizning original logikangiz)
        const hasApplication = activeIsUsable
            ? false
            : !!lastUserApp && String(lastUserApp.admission_id) === String(targetAdmission._id);

        const ok = isOpen || hasApplication;

        return json200({
            ok,
            isOpen,
            hasApplication,
            admissionId: String(targetAdmission._id),
            admissionStatus: true,
        });
    } catch (e) {
        console.error(e);
        return json500();
    }
}