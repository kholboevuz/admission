import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import AdmissionModel from "@/models/admission-models";
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

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl ? String(auth.pinfl) : null;

        if (!pinfl) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const active = await AdmissionModel.findOne({ status: true }).sort({ _id: -1 }).lean();

        if (active) {
            return NextResponse.json({ success: true, data: active }, { status: 200 });
        }

        const last = await AdmissionModel.findOne({}).sort({ _id: -1 }).lean();

        if (!last) {
            return NextResponse.json({ success: true, data: null }, { status: 200 });
        }

        const userHasApplication = await ApplicationsModel.findOne({
            pinfl,
            admission_id: String(last._id),
        }).lean();

        if (userHasApplication) {
            return NextResponse.json({ success: true, data: last }, { status: 200 });
        }

        return NextResponse.json({ success: true, data: null }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}