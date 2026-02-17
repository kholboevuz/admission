import { NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";

export async function GET() {
    try {
        await connectDB();
        const active = await AdmissionModel.findOne({ status: true }).lean();

        if (!active) {
            return NextResponse.json({ success: false, error: "No active admission found" }, { status: 404 });
        }

        return NextResponse.json({ success: true, data: active }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
