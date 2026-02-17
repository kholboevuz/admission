import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";

import { z } from "zod";
import MalumotnomaModel from "@/models/malumotnoma-models";

const QuerySchema = z.object({
    pinfl: z.string().min(5, "PINFL_REQUIRED"),
});

export async function GET(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const pinfl = String(searchParams.get("pinfl") || "").trim();

        const getStatus = await MalumotnomaModel.findOne({ pinfl }).lean();

        if (!getStatus) {
            return NextResponse.json({ success: true, data: { status: false } }, { status: 200 });
        }

        return NextResponse.json({ success: true, data: { status: getStatus.status } }, { status: 200 });

    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}
