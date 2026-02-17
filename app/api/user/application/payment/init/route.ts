import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        const { admission_id } = await req.json();
        if (!admission_id) {
            return NextResponse.json({ success: false, error: "Invalid admissionId" }, { status: 400 });
        }
        return NextResponse.json({ success: true, data: { admissionId: admission_id } }, { status: 200 });
    } catch (e) {
        console.error(e);
        return NextResponse.json({ success: false, error: "Server error" }, { status: 500 });
    }
}
