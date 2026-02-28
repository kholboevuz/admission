import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";

export async function PUT(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }

        const admission = await AdmissionModel.findById(id).select("status end_date");
        if (!admission) {
            return NextResponse.json({ error: "Admission not found" }, { status: 404 });
        }

        const willBeActive = !admission.status;

        if (willBeActive) {
            const now = new Date();
            const endDate = new Date(admission.end_date);

            if (Number.isNaN(endDate.getTime())) {
                return NextResponse.json(
                    { error: "end_date noto‘g‘ri formatda" },
                    { status: 400 }
                );
            }
        }

        const updated = await AdmissionModel.findByIdAndUpdate(
            id,
            { status: willBeActive },
            { new: true }
        );

        return NextResponse.json(
            { message: "Admission status updated successfully", data: updated },
            { status: 200 }
        );
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}
