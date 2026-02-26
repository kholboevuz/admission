import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import { z } from "zod";
import MalumotnomaModel from "@/models/malumotnoma-models";

const RelativeSchema = z.object({
    relation: z.string().min(2, "Qarindoshligi majburiy"),
    fio: z.string().min(5, "F.I.Sh majburiy"),
    birth: z.string().min(4, "Tug'ilgan yili/joyi majburiy"),
    job: z.string().min(2, "Ish joyi/lavozimi majburiy"),
    address: z.string().min(2, "Turar joyi majburiy"),
});

const WorkHistorySchema = z.object({
    startYear: z.string().min(1, "Boshlangan yili majburiy"),
    endYear: z.string().default("hozirgacha"),
    organization: z.string().min(2, "Tashkilot nomi majburiy"),
    position: z.string().min(2, "Lavozim majburiy"),
    department: z.string().default(""),
});

const PayloadSchema = z.object({
    orgLine1: z.string().min(3, "Majburiy"),
    orgLine2: z.string().min(3, "Majburiy"),

    birthYear: z.string().min(4, "Majburiy"),
    birthPlace: z.string().min(3, "Majburiy"),
    nationality: z.string().min(2, "Majburiy"),
    party: z.string().min(1, "Majburiy"),
    education: z.string().min(2, "Majburiy"),
    specialty: z.string().min(2, "Majburiy"),
    degree: z.string().min(1, "Majburiy"),
    title: z.string().min(1, "Majburiy"),
    languages: z.string().min(2, "Majburiy"),
    awards: z.string().min(1, "Majburiy"),
    deputy: z.string().min(1, "Majburiy"),

    workItems: z.array(WorkHistorySchema).default([]),
    relatives: z.array(RelativeSchema).min(1, "Kamida 1 ta qarindosh kiriting"),
});

const BodySchema = z.object({
    pinfl: z.string().min(5, "PINFL_REQUIRED"),
    fullName: z.string().optional().nullable(),
    passportSeriesNumber: z.string().optional().nullable(),
    payload: PayloadSchema,
});

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const parsed = BodySchema.safeParse(body);

        if (!parsed.success) {
            return NextResponse.json(
                { success: false, error: "VALIDATION_ERROR", details: parsed.error.flatten() },
                { status: 400 }
            );
        }

        const { pinfl, fullName, passportSeriesNumber, payload } = parsed.data;

        const updated = await MalumotnomaModel.findOneAndUpdate(
            { pinfl },
            {
                $set: {
                    pinfl,
                    full_name: fullName ?? null,
                    passport_series_number: passportSeriesNumber ?? null,
                    payload,
                },
            },
            { upsert: true, returnDocument: "after", new: true }
        ).lean();

        return NextResponse.json({ success: true, data: updated }, { status: 200 });
    } catch (e: any) {
        console.error(e);
        return NextResponse.json(
            { success: false, error: e?.message || "Server error" },
            { status: 500 }
        );
    }
}