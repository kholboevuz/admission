import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import { jwtVerify } from "jose";
import ModeratorApplicationsModel from "@/models/moderator-applications";

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
        const pinfl = auth?.pinfl;
        if (!pinfl) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        const application_id = (req.nextUrl.searchParams.get("application_id") || "").trim();
        if (!application_id) {
            return NextResponse.json(
                { success: false, error: "application_id required" },
                { status: 400 }
            );
        }

        const doc = await ModeratorApplicationsModel.findOne({ application_id })
            .select("application_id moderator_pinfl comment updatedAt createdAt")
            .lean();

        if (!doc || !Array.isArray(doc.comment) || doc.comment.length === 0) {
            return NextResponse.json(
                { success: true, data: null },
                { status: 200 }
            );
        }

        const lastComment = doc.comment[doc.comment.length - 1];

        return NextResponse.json(
            {
                success: true,
                data: {
                    application_id: doc.application_id,
                    moderator_pinfl: doc.moderator_pinfl,
                    comment: lastComment.comment,
                    files: lastComment.files || [],
                    date: lastComment.date,
                    updatedAt: doc.updatedAt,
                    createdAt: doc.createdAt,
                },
            },
            { status: 200 }
        );
    } catch (e) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: "Server error" },
            { status: 500 }
        );
    }
}