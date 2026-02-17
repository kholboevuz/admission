import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const { pinfl, password } = await req.json();

        if (!pinfl || !password) {
            return NextResponse.json(
                { success: false, error: "PINFL va parol talab qilinadi" },
                { status: 400 }
            );
        }

        const user = await UsersModel.findOne({ pinfl }).lean();
        if (!user) {
            return NextResponse.json(
                { success: false, error: "PINFL yoki parol noto‘g‘ri" },
                { status: 401 }
            );
        }

        if (user.status === false) {
            return NextResponse.json(
                { success: false, error: "Akkaunt bloklangan" },
                { status: 403 }
            );
        }

        const ok = await bcrypt.compare(password, user.password);
        if (!ok) {
            return NextResponse.json(
                { success: false, error: "PINFL yoki parol noto‘g‘ri" },
                { status: 401 }
            );
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET env yo'q");

        const token = jwt.sign(
            { sub: String(user._id), role: user.role, pinfl: user.pinfl },
            jwtSecret,
            { expiresIn: "7d" }
        );

        const res = NextResponse.json(
            {
                success: true,
                message: "Muvaffaqiyatli kirdingiz",
                user: {
                    id: String(user._id),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    role: user.role,
                },
            },
            { status: 200 }
        );

        res.cookies.set("access_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        return res;
    } catch (error: any) {
        console.error("LOGIN ERROR:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Server error" },
            { status: 500 }
        );
    }
}