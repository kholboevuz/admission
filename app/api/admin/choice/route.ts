
import { connectDB } from "@/config/dbconn";
import ChoiceModel from "@/models/choice-models";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();
        const { uz, ru, en, kaa } = body;
        if (!uz || !ru || !en || !kaa) {
            return NextResponse.json({ error: "All fields are required" }, { status: 400 });
        }
        const saveDaata = await ChoiceModel.create({
            choice: {
                uz,
                ru,
                eng: en,
                kaa,
            },
        });
        return NextResponse.json({ message: "Choice added successfully", data: saveDaata }, { status: 201 });

    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectDB();
        const choices = await ChoiceModel.find();
        return NextResponse.json({ data: choices }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}

export async function DELETE(req: NextRequest) {
    try {
        await connectDB();
        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");
        if (!id) {
            return NextResponse.json({ error: "ID is required" }, { status: 400 });
        }
        await ChoiceModel.findByIdAndDelete(id);
        return NextResponse.json({ message: "Choice deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: "Server error" }, { status: 500 });
    }
}