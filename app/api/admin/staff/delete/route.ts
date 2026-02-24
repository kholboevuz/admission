import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import StaffModel from "@/models/staff-model";
import UsersModel from "@/models/users-models";

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) return NextResponse.json({ success: false, message: "id talab" }, { status: 400 });

        const staff = await StaffModel.findById(id).lean();
        if (!staff) return NextResponse.json({ success: false, message: "Staff topilmadi" }, { status: 404 });

        await StaffModel.deleteOne({ _id: id });
        await UsersModel.deleteOne({ pinfl: staff.pinfl });

        return NextResponse.json({ success: true, message: "Staff o‘chirildi" });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
    }
}