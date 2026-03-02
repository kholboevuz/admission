import { connectDB } from "@/config/dbconn";
import ChoiceModel from "@/models/choice-models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
    try {
        await connectDB();
        const choices = await ChoiceModel.find({}).lean();
        return NextResponse.json({ success: true, data: choices });
    } catch (err) {
        console.error("[GET choices]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}