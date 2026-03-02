import { connectDB } from "@/config/dbconn";
import BSACandidatesModel from "@/models/bsacandidates-models";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ admissionId: string }> }
) {
    try {
        const { admissionId } = await params;
        const { searchParams } = new URL(req.url);

        const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
        const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "20", 10)));
        const skip = (page - 1) * limit;

        await connectDB();

        const doc = await BSACandidatesModel.findOne({ admissionId }).lean();

        if (!doc) {
            return NextResponse.json({
                success: true,
                data: [],
                pagination: { page, limit, total: 0, totalPages: 0, hasPrev: false, hasNext: false },
            });
        }

        const allCandidates = doc.candidates || [];
        const total = allCandidates.length;
        const totalPages = Math.ceil(total / limit) || 1;
        const paginated = allCandidates.slice(skip, skip + limit);

        return NextResponse.json({
            success: true,
            data: paginated,
            pagination: {
                page,
                limit,
                total,
                totalPages,
                hasPrev: page > 1,
                hasNext: page < totalPages,
            },
        });
    } catch (err) {
        console.error("[GET candidates]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: Promise<{ admissionId: string }> }
) {
    try {
        const { admissionId } = await params;
        const body = await req.json();

        const incoming: Array<{ pinfl: string; choice: string }> = body.candidates || [];

        if (!Array.isArray(incoming) || incoming.length === 0) {
            return NextResponse.json(
                { success: false, error: "Kamida 1 ta kandidat bo'lishi kerak" },
                { status: 400 }
            );
        }

        for (const c of incoming) {
            if (!c.pinfl || typeof c.pinfl !== "string" || c.pinfl.trim().length === 0) {
                return NextResponse.json(
                    { success: false, error: `Noto'g'ri PINFL: ${c.pinfl}` },
                    { status: 400 }
                );
            }
            if (!c.choice || typeof c.choice !== "string") {
                return NextResponse.json(
                    { success: false, error: "Yo'nalish tanlanmagan" },
                    { status: 400 }
                );
            }
        }

        await connectDB();

        const doc = await BSACandidatesModel.findOne({ admissionId });

        if (!doc) {
            await BSACandidatesModel.create({ admissionId, candidates: incoming });
        } else {
            const existingPinfls = new Set(doc.candidates.map((c: any) => c.pinfl));
            const newOnes = incoming.filter((c) => !existingPinfls.has(c.pinfl));

            const duplicates = incoming.length - newOnes.length;

            if (newOnes.length > 0) {
                await BSACandidatesModel.findByIdAndUpdate(doc._id, {
                    $push: { candidates: { $each: newOnes } },
                });
            }

            return NextResponse.json({
                success: true,
                added: newOnes.length,
                duplicates,
                message: `${newOnes.length} ta qo'shildi${duplicates ? `, ${duplicates} ta takroriy o'tkazib yuborildi` : ""}`,
            });
        }

        return NextResponse.json({
            success: true,
            added: incoming.length,
            duplicates: 0,
            message: `${incoming.length} ta kandidat qo'shildi`,
        });
    } catch (err) {
        console.error("[POST candidates]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}

export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ admissionId: string }> }
) {
    try {
        const { admissionId } = await params;
        const { pinfl } = await req.json();

        if (!pinfl) {
            return NextResponse.json({ success: false, error: "PINFL kerak" }, { status: 400 });
        }

        await connectDB();

        await BSACandidatesModel.findOneAndUpdate(
            { admissionId },
            { $pull: { candidates: { pinfl } } }
        );

        return NextResponse.json({ success: true });
    } catch (err) {
        console.error("[DELETE candidates]", err);
        return NextResponse.json({ success: false, error: "Server xatosi" }, { status: 500 });
    }
}