import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import ApplicationsModel from "@/models/application-models";
import { jwtVerify } from "jose";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;

        if (!pinfl)
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const { admission_id, step, step_1, esse } = body ?? {};

        if (!admission_id)
            return NextResponse.json({ success: false, error: "admission_id required" }, { status: 400 });

        const existing = await ApplicationsModel.findOne({ admission_id, pinfl });

        const update: any = {};

        if (typeof step === "number") update.step = step;
        if (step_1) update.step_1 = step_1;
        if (typeof esse === "string") update.esse = esse;

        if (!existing) {
            update.application_status = "draft";
        } else if (existing.application_status === "draft") {
            update.application_status = "draft";
        }

        const doc = await ApplicationsModel.findOneAndUpdate(
            { admission_id, pinfl },
            { $set: update },
            { new: true, upsert: true }
        );

        return NextResponse.json({ success: true, data: doc }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
