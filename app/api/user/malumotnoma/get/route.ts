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

        const parsed = QuerySchema.safeParse({ pinfl });
        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: "VALIDATION_ERROR", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const doc = await MalumotnomaModel.findOne({ pinfl }).lean();

        return NextResponse.json({ success: true, data: doc }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}
