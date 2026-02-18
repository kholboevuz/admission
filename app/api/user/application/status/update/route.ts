import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
import ApplicationsModel from "@/models/application-models";

const ALLOWED = new Set([
    "draft",
    "reviewed",
    "submitted",
    "paid",
    "rejected",
    "accepted",
    "returned",
]);

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { applicationId, pinfl, status, admissionId } = await req.json();

        if (!applicationId || !pinfl || !status || !admissionId) {
            return NextResponse.json(
                { success: false, error: "Missing required fields" },
                { status: 400 }
            );
        }

        const safeStatus = String(status).trim().toLowerCase();
        const safePinfl = String(pinfl).trim();
        const safeAdmissionId = String(admissionId).trim();
        const safeApplicationId = String(applicationId).trim();

        if (!ALLOWED.has(safeStatus)) {
            return NextResponse.json(
                { success: false, error: "Invalid status value" },
                { status: 400 }
            );
        }

        const admissionExists = await AdmissionModel.exists({ _id: safeAdmissionId });
        if (!admissionExists) {
            return NextResponse.json(
                { success: false, error: "Admission not found" },
                { status: 404 }
            );
        }

        const updated = await ApplicationsModel.findOneAndUpdate(
            { _id: safeApplicationId, pinfl: safePinfl, admission_id: safeAdmissionId },
            { $set: { application_status: safeStatus } },
            { new: true }
        ).lean();

        if (!updated) {
            return NextResponse.json(
                { success: false, error: "Application not found (ID/PINFL/admission mismatch)" },
                { status: 404 }
            );
        }

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}
