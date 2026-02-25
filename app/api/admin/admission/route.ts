import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import ChoiceModel from "@/models/choice-models";
import AdmissionModel from "@/models/admission-models";
import { success } from "zod";

function toISODateString(d: string | Date) {
    const date = typeof d === "string" ? new Date(d) : d;
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, "0");
    const dd = String(date.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function endOfDay(dateStr: string) {
    // YYYY-MM-DD -> o'sha kun 23:59:59.999
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return null;
    d.setHours(23, 59, 59, 999);
    return d;
}

function uuidLike() {
    try {
        return crypto.randomUUID();
    } catch {
        return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    }
}

function extractMessage(err: any) {
    return err?.message || "Server error";
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();
        const body = await req.json();

        const { title, startDate, endDate, admissionTypes, choices, isOpen } = body ?? {};

        if (!title || !startDate || !endDate) {
            return NextResponse.json({ error: "title, startDate, endDate are required" }, { status: 400 });
        }
        if (!Array.isArray(admissionTypes) || admissionTypes.length === 0) {
            return NextResponse.json({ error: "admissionTypes is required" }, { status: 400 });
        }
        if (!Array.isArray(choices) || choices.length === 0) {
            return NextResponse.json({ error: "choices is required" }, { status: 400 });
        }

        if (Boolean(isOpen)) {
            const end = endOfDay(toISODateString(endDate));
            if (!end) return NextResponse.json({ error: "endDate noto‘g‘ri formatda" }, { status: 400 });
            if (end < new Date()) {
                return NextResponse.json(
                    { error: "Tugash sanasi o‘tib ketgan admissionni aktiv qilib bo‘lmaydi" },
                    { status: 403 }
                );
            }
        }

        const activeExists = await AdmissionModel.exists({ status: true });
        if (activeExists) {
            return NextResponse.json(
                { error: "Sizda aktiv admission bor. Yangi admission qo‘shib bo‘lmaydi." },
                { status: 409 }
            );
        }

        // choices validatsiya
        const choiceIds = choices.map((c: any) => c?.id).filter(Boolean);
        const existing = await ChoiceModel.find({ _id: { $in: choiceIds } }).select("_id").lean();

        if (existing.length !== choiceIds.length) {
            return NextResponse.json({ error: "Some choices not found in DB" }, { status: 400 });
        }

        const saveData = await AdmissionModel.create({
            title,
            starter_date: toISODateString(startDate),
            end_date: toISODateString(endDate),
            admission_type: admissionTypes.map((t: any) => ({ id: String(t.id), name: String(t.name) })),
            choices: choices.map((c: any) => ({ id: String(c.id), name: String(c.name) })),
            uuuid: uuidLike(),
            status: Boolean(isOpen),
        });

        return NextResponse.json({ message: "Admission added successfully", data: saveData }, { status: 201 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: extractMessage(error) }, { status: 500 });
    }
}

export async function GET() {
    try {
        await connectDB();
        const admissions = await AdmissionModel.find().sort({ _id: -1 });
        return NextResponse.json({ success: true, data: admissions }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: extractMessage(error) }, { status: 500 });
    }
}

export async function PUT(req: NextRequest) {
    try {
        await connectDB();

        const { searchParams } = new URL(req.url);
        const id = searchParams.get("id");

        if (!id) return NextResponse.json({ error: "ID is required" }, { status: 400 });

        const body = await req.json();
        const { title, startDate, endDate, admissionTypes, choices, isOpen } = body ?? {};

        if (!title || !startDate || !endDate) {
            return NextResponse.json({ error: "title, startDate, endDate are required" }, { status: 400 });
        }
        if (!Array.isArray(admissionTypes) || admissionTypes.length === 0) {
            return NextResponse.json({ error: "admissionTypes is required" }, { status: 400 });
        }
        if (!Array.isArray(choices) || choices.length === 0) {
            return NextResponse.json({ error: "choices is required" }, { status: 400 });
        }

        const current = await AdmissionModel.findById(id).select("status end_date");
        if (!current) return NextResponse.json({ error: "Admission not found" }, { status: 404 });

        if (Boolean(isOpen)) {
            const end = endOfDay(toISODateString(endDate));
            if (!end) return NextResponse.json({ error: "endDate noto‘g‘ri formatda" }, { status: 400 });
            if (end < new Date()) {
                return NextResponse.json(
                    { error: "Tugash sanasi o‘tib ketgan admissionni aktiv qilib bo‘lmaydi" },
                    { status: 403 }
                );
            }

            const anotherActive = await AdmissionModel.exists({ _id: { $ne: id }, status: true });
            if (anotherActive) {
                return NextResponse.json(
                    { error: "Sizda aktiv admission bor. Boshqasini aktiv qilib bo‘lmaydi." },
                    { status: 409 }
                );
            }
        }

        const choiceIds = choices.map((c: any) => c?.id).filter(Boolean);
        const existing = await ChoiceModel.find({ _id: { $in: choiceIds } }).select("_id").lean();
        if (existing.length !== choiceIds.length) {
            return NextResponse.json({ error: "Some choices not found in DB" }, { status: 400 });
        }

        const updated = await AdmissionModel.findByIdAndUpdate(
            id,
            {
                title,
                starter_date: toISODateString(startDate),
                end_date: toISODateString(endDate),
                admission_type: admissionTypes.map((t: any) => ({ id: String(t.id), name: String(t.name) })),
                choices: choices.map((c: any) => ({ id: String(c.id), name: String(c.name) })),
                status: Boolean(isOpen),
            },
            { new: true }
        );

        return NextResponse.json({ message: "Admission updated successfully", data: updated }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: extractMessage(error) }, { status: 500 });
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

        await AdmissionModel.findByIdAndDelete(id);
        return NextResponse.json({ message: "Admission deleted successfully" }, { status: 200 });
    } catch (error) {
        console.error("Error:", error);
        return NextResponse.json({ error: extractMessage(error) }, { status: 500 });
    }
}
