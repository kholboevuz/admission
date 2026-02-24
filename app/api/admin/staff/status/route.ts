import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import StaffModel from "@/models/staff-model";
import UsersModel from "@/models/users-models";

export async function PATCH(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const id = body?.id;
        const status = body?.status;

        if (!id || typeof status !== "boolean") {
            return NextResponse.json({ success: false, message: "id va status(boolean) talab" }, { status: 400 });
        }

        const staff = await StaffModel.findByIdAndUpdate(id, { $set: { status } }, { new: true }).lean();
        if (!staff) return NextResponse.json({ success: false, message: "Staff topilmadi" }, { status: 404 });

        await UsersModel.updateOne({ pinfl: staff.pinfl }, { $set: { status } });

        return NextResponse.json({ success: true, data: { id, status } });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
    }
}