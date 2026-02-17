import { NextResponse } from "next/server";

export async function POST() {
    try {
        const res = NextResponse.json(
            {
                success: true,
                message: "Muvaffaqiyatli logout qilindi",
            },
            { status: 200 }
        );

        res.cookies.set("access_token", "", {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 0,
        });

        return res;
    } catch (error: any) {
        console.error("LOGOUT ERROR:", error);
        return NextResponse.json(
            { success: false, message: "Server error" },
            { status: 500 }
        );
    }
}