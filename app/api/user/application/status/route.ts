import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";
import BSACandidatesModel from "@/models/bsacandidates-models";


type AuthPayload = { sub?: string; role?: string; pinfl?: string };

// ─── Admission type helpers ───────────────────────────────────────────────────

type AdmissionTypeEntry = { id: string; name: string };

/**
 * admission_type massividagi name lardan mosini topadi.
 * Ikkala tur ham bo'lishi mumkin — shuning uchun Set ishlatamiz.
 */
function getAdmissionTypes(admissionTypes: AdmissionTypeEntry[] = []): {
    hasOpenCompetition: boolean;
    hasOrderBased: boolean;
} {
    const ids = new Set(admissionTypes.map((t) => String(t.id).trim().toUpperCase()));
    return {
        hasOpenCompetition: ids.has("OPEN_COMPETITION"),
        hasOrderBased: ids.has("ORDER_BASED"),
    };
}

/**
 * ORDER_BASED uchun: foydalanuvchi BSACandidates da bormi?
 */
async function isUserCandidate(admissionId: string, pinfl: string): Promise<boolean> {
    const doc = await BSACandidatesModel.findOne({
        admissionId: String(admissionId),
        "candidates.pinfl": pinfl,
    })
        .select("_id")
        .lean();
    return !!doc;
}

// ─── Generic helpers ──────────────────────────────────────────────────────────

function isNowInRange(start: string | Date, end: string | Date) {
    const now = new Date();
    return now >= new Date(start) && now <= new Date(end);
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
    return !!(await ApplicationsModel.findOne({ pinfl, admission_id: admissionId }).lean());
}

// ─── Core: compute ok for a given admission + pinfl ──────────────────────────

async function computeOk(
    admission: any,
    pinfl: string,
    hasApplication: boolean
): Promise<{
    ok: boolean;
    isOpen: boolean;
    reason?: string;
}> {
    const admissionId = String(admission._id);
    const dateOpen = isNowInRange(admission.starter_date, admission.end_date);
    const { hasOpenCompetition, hasOrderBased } = getAdmissionTypes(admission.admission_type ?? []);

    // ── Ikkalasi ham yoki faqat OPEN_COMPETITION: avvalgi logika ──────────────
    if (hasOpenCompetition || (!hasOpenCompetition && !hasOrderBased)) {
        return {
            ok: dateOpen || hasApplication,
            isOpen: dateOpen,
        };
    }

    // ── Faqat ORDER_BASED ─────────────────────────────────────────────────────
    // Vaqt ochiq bo'lishi kerak VА kandidat ro'yxatida bo'lishi kerak.
    // Ariza allaqachon topshirilgan bo'lsa (hasApplication) — ham ko'rsatamiz.
    const isCandidate = await isUserCandidate(admissionId, pinfl);

    const ok = (dateOpen && isCandidate) || hasApplication;

    return {
        ok,
        isOpen: dateOpen && isCandidate,
        reason: !isCandidate ? "not_candidate" : !dateOpen ? "date_closed" : undefined,
    };
}

// ─── Route handler ────────────────────────────────────────────────────────────

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

        // Fallback: targetAdmission topilmasa
        if (!targetAdmission) {
            if (!lastAdmission.status) {
                return json200({
                    ok: false,
                    isOpen: false,
                    hasApplication: false,
                    admissionId: String(lastAdmission._id),
                    admissionStatus: false,
                });
            }

            const hasApp = await userHasApplication(pinfl, String(lastAdmission._id));
            const computed = await computeOk(lastAdmission, pinfl, hasApp);

            return json200({
                ...computed,
                hasApplication: hasApp,
                admissionId: String(lastAdmission._id),
                admissionStatus: !!lastAdmission.status,
            });
        }

        if (!targetAdmission.status) {
            return json200({
                ok: false,
                isOpen: false,
                hasApplication: false,
                admissionId: String(targetAdmission._id),
                admissionStatus: false,
            });
        }

        // active usable bo'lsa hasApplication false (original logika)
        const hasApplication = activeIsUsable
            ? false
            : !!lastUserApp && String(lastUserApp.admission_id) === String(targetAdmission._id);

        const computed = await computeOk(targetAdmission, pinfl, hasApplication);

        return json200({
            ...computed,
            hasApplication,
            admissionId: String(targetAdmission._id),
            admissionStatus: true,
        });
    } catch (e) {
        console.error(e);
        return json500();
    }
}