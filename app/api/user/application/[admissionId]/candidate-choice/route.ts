import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { connectDB } from "@/config/dbconn";
import BSACandidatesModel from "@/models/bsacandidates-models";


async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;
    const key = new TextEncoder().encode(process.env.JWT_SECRET!);
    const { payload } = await jwtVerify(token, key);
    return payload as { pinfl?: string };
}

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ admissionId: string }> }
) {
    try {
        const { admissionId } = await params;

        const auth = await getAuth(req);
        const pinfl = auth?.pinfl ? String(auth.pinfl) : null;
        if (!pinfl) return NextResponse.json({ choice: null });

        await connectDB();

        const doc = await BSACandidatesModel.findOne({ admissionId }).lean();
        if (!doc) return NextResponse.json({ choice: null });

        const candidate = (doc.candidates as any[]).find((c) => c.pinfl === pinfl);
        return NextResponse.json({ choice: candidate?.choice ?? null });
    } catch {
        return NextResponse.json({ choice: null });
    }
}