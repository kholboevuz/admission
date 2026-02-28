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
    return payload as { pinfl?: string };
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl;
        if (!pinfl) return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });

        const body = await req.json();
        const admission_id = String(body?.admission_id || "");
        if (!admission_id) return NextResponse.json({ success: false, error: "admission_id required" }, { status: 400 });

        const applicationStatus = await ApplicationsModel.findOne({ admission_id, pinfl }).select("application_status").lean();

        if (applicationStatus?.application_status === "returned") {
            const doc = await ApplicationsModel.findOneAndUpdate(
                { admission_id, pinfl },
                { $set: { application_status: "return_submitted" } },
                { new: true }
            );
            if (!doc) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
        }

        const doc = await ApplicationsModel.findOneAndUpdate(
            { admission_id, pinfl },
            { $set: { application_status: "submitted" } },
            { new: true }
        );

        if (!doc) return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });

        return NextResponse.json({ success: true, data: { payment_status: true } }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
