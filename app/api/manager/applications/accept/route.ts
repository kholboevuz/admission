import ApplicationsModel from "@/models/application-models";
import ModeratorApplicationsModel from "@/models/moderator-applications";
import UsersModel from "@/models/users-models";
import { jwtVerify } from "jose";
import { NextRequest, NextResponse } from "next/server";
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

        const pinfl = (await getAuth(req))?.pinfl;

        const { application_id } = await req.json();
        if (!application_id) {
            return NextResponse.json({ success: false, error: "Required fields are missing" }, { status: 400 });
        }
        const checkApplication = await ApplicationsModel.findById(application_id);
        if (!checkApplication) {
            return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
        }

        const checkModerator = await UsersModel.findOne({ pinfl: pinfl });
        if (!checkModerator || checkModerator.role !== "modirator") {
            return NextResponse.json({ success: false, error: "Moderator not found or unauthorized" }, { status: 401 });
        }

        const isApplicationOtherModiratorAcceptCheck = await ModeratorApplicationsModel.findOne({ application_id: application_id });
        if (isApplicationOtherModiratorAcceptCheck) {
            return NextResponse.json({ success: false, error: "Boshqa moderator tomonidan qabul qilingan ariza" }, { status: 400 });
        }

        const updatedApplication = await ApplicationsModel.findByIdAndUpdate(application_id, { application_status: "reviewed" }, { new: true });
        if (!updatedApplication) {
            return NextResponse.json({ success: false, error: "Application not found" }, { status: 404 });
        }

        const moderatorApplication = new ModeratorApplicationsModel({
            application_id: application_id,
            moderator_pinfl: pinfl || "",
        });

        await moderatorApplication.save();

        return NextResponse.json({ success: true, application: updatedApplication }, { status: 200 });

    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
