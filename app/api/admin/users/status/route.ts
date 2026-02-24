import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";

export async function PATCH(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const id = body?.id;
        const status = body?.status;

        // validation
        if (!id) {
            return NextResponse.json(
                { success: false, message: "User id talab qilinadi" },
                { status: 400 }
            );
        }

        if (typeof status !== "boolean") {
            return NextResponse.json(
                { success: false, message: "status boolean bo‘lishi kerak" },
                { status: 400 }
            );
        }

        // update
        const updatedUser = await UsersModel.findByIdAndUpdate(
            id,
            { $set: { status } },
            { new: true }
        )
            .select("_id status firstname lastname pinfl")
            .lean();

        if (!updatedUser) {
            return NextResponse.json(
                { success: false, message: "User topilmadi" },
                { status: 404 }
            );
        }

        return NextResponse.json({
            success: true,
            message: "Status muvaffaqiyatli yangilandi",
            data: updatedUser,
        });
    } catch (error: any) {
        console.error("USERS STATUS ERROR:", error);

        return NextResponse.json(
            {
                success: false,
                message: error?.message || "Server error",
            },
            { status: 500 }
        );
    }
}