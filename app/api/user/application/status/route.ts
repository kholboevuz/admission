import { NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
export async function GET() {
    try {
        await connectDB();
        const activeAdmission = await AdmissionModel.findOne({ status: true });

        if (!activeAdmission) {
            return NextResponse.json({
                success: false,
                error: "No active admission found"
            }, { status: 404 });
        }

        return NextResponse.json({
            success: true,
            data: activeAdmission
        }, { status: 200 });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
