import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import StaffModel from "@/models/staff-model";

export async function GET(req: NextRequest) {
    try {
        await connectDB();
        const list = await StaffModel.find({})
            .sort({ createdAt: -1 })
            .select("firstname lastname pinfl document brithday role status allowedIps createdAt")
            .lean();

        return NextResponse.json({ success: true, data: list });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
    }
}