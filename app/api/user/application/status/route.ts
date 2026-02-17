import { NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";

function inRange(start: string, end: string) {
    const now = new Date();
    const s = new Date(start);
    const e = new Date(end);
    return now >= s && now <= e;
}

export async function GET() {
    try {
        await connectDB();
        const active = await AdmissionModel.findOne({ status: true }).lean();

        if (!active) return NextResponse.json({ success: true, data: { status: false } }, { status: 200 });

        const ok = !!active.status && inRange(active.starter_date, active.end_date);
        return NextResponse.json({ success: true, data: { status: ok } }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
