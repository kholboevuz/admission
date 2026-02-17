import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";

export async function GET(req: NextRequest) {
    try {
        const token = req.cookies.get("access_token")?.value;
        if (!token) {
            return NextResponse.json({ success: false, user: null }, { status: 200 });
        }

        const secret = process.env.JWT_SECRET;
        if (!secret) throw new Error("JWT_SECRET env yo'q");

        const decoded = jwt.verify(token, secret) as { sub: string; role: string; pinfl: string };

        await connectDB();
        const user = await UsersModel.findById(decoded.sub).lean();

        if (!user) {
            return NextResponse.json({ success: false, user: null }, { status: 200 });
        }

        return NextResponse.json(
            {
                success: true,
                user: {
                    id: String(user._id),
                    firstname: user.firstname,
                    lastname: user.lastname,
                    role: user.role,
                    pinfl: user.pinfl,
                },
            },
            { status: 200 }
        );
    } catch (e) {
        return NextResponse.json({ success: false, user: null }, { status: 200 });
    }
}