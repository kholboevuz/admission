import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import StaffModel from "@/models/staff-model";
import UsersModel from "@/models/users-models";

import bcrypt from "bcrypt";
import AdmissionModel from "@/models/admission-models";

function parseAllowedIps(input: string | string[] | undefined): string[] {
    if (!input) return [];
    const raw = Array.isArray(input) ? input.join("\n") : input;
    return raw
        .split(/[\n,;\s]+/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((ip) => ip.length <= 64);
}

function isValidRole(role: any): role is "admin" | "modirator" {
    return role === "admin" || role === "modirator";
}

export async function PATCH(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const id = body?.id;
        const role = body?.role;
        const password = body?.password;
        const admissionUuuid = body?.admissionUuuid;
        const allowedIps = parseAllowedIps(body?.allowedIps);

        if (!id) {
            return NextResponse.json({ success: false, message: "id talab qilinadi" }, { status: 400 });
        }
        if (!isValidRole(role)) {
            return NextResponse.json({ success: false, message: "role noto‘g‘ri" }, { status: 400 });
        }
        if (!admissionUuuid) {
            return NextResponse.json({ success: false, message: "admissionUuuid talab qilinadi" }, { status: 400 });
        }

        const admission = await AdmissionModel.findOne({ uuuid: admissionUuuid }).lean();
        if (!admission) {
            return NextResponse.json({ success: false, message: "Admission topilmadi" }, { status: 404 });
        }

        const staff = await StaffModel.findById(id).lean();
        if (!staff) {
            return NextResponse.json({ success: false, message: "Staff topilmadi" }, { status: 404 });
        }

        const updateStaff: any = {
            role,
            allowedIps,
            admission_id: admissionUuuid,
        };

        await StaffModel.updateOne({ _id: id }, { $set: updateStaff });

        const user = await UsersModel.findOne({ pinfl: staff.pinfl }).select("_id").lean();
        if (user) {
            const updateUser: any = { role };
            if (typeof password === "string" && password.trim().length >= 4) {
                updateUser.password = await bcrypt.hash(password.trim(), 12);
            }
            await UsersModel.updateOne({ _id: user._id }, { $set: updateUser });
        }

        return NextResponse.json({ success: true, message: "Staff yangilandi" }, { status: 200 });
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
    }
}