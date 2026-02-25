import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import StaffModel from "@/models/staff-model";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

type UserRole = "admin" | "modirator" | "user";

interface LoginBody {
    pinfl: string;
    password: string;
}

function getClientIp(req: NextRequest): string {
    const forwarded = req.headers.get("x-forwarded-for");
    if (forwarded) return forwarded.split(",")[0].trim();

    return req.headers.get("x-real-ip")?.trim() ?? "unknown";
}

function parseBody(body: unknown): LoginBody | null {
    if (!body || typeof body !== "object") return null;
    const { pinfl, password } = body as Record<string, unknown>;

    if (typeof pinfl !== "string" || !pinfl.trim()) return null;
    if (typeof password !== "string" || !password.trim()) return null;

    return { pinfl: pinfl.trim(), password };
}

function signToken(payload: { sub: string; role: string; pinfl: string }, secret: string): string {
    return jwt.sign(payload, secret, { expiresIn: "24h" });
}

async function checkModeratorIp(pinfl: string, clientIp: string): Promise<{ allowed: boolean; reason?: string }> {
    const staff = await StaffModel.findOne({ pinfl })
        .select("allowedIps firstname lastname")
        .lean();

    if (!staff) {
        return { allowed: false, reason: "Staff ma'lumoti topilmadi" };
    }

    const allowedIps: string[] = staff.allowedIps ?? [];

    console.info(
        `[MODERATOR LOGIN] ${staff.firstname} ${staff.lastname} (${pinfl}) | IP: ${clientIp} | Allowed: [${allowedIps.join(", ")}]`
    );

    if (!allowedIps.includes(clientIp)) {
        console.warn(`[MODERATOR LOGIN] REJECTED — IP not in allowedIps: ${clientIp}`);
        return { allowed: false, reason: "Bu IP manzildan kirishga ruxsat yo'q" };
    }

    return { allowed: true };
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const raw = await req.json().catch(() => null);
        const body = parseBody(raw);

        if (!body) {
            return NextResponse.json(
                { success: false, error: "PINFL va parol talab qilinadi" },
                { status: 400 }
            );
        }

        const { pinfl, password } = body;

        const user = await UsersModel.findOne({ pinfl }).lean();
        if (!user) {
            return NextResponse.json(
                { success: false, error: "PINFL yoki parol noto'g'ri" },
                { status: 401 }
            );
        }

        if (user.status === false) {
            return NextResponse.json(
                { success: false, error: "Akkaunt bloklangan. Murojaat uchun administratorga yozing." },
                { status: 403 }
            );
        }

        const ALLOWED_ROLES: UserRole[] = ["admin", "modirator", "user"];
        if (!ALLOWED_ROLES.includes(user.role as UserRole)) {
            return NextResponse.json(
                { success: false, error: "Ruxsat etilmagan rol" },
                { status: 403 }
            );
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            return NextResponse.json(
                { success: false, error: "PINFL yoki parol noto'g'ri" },
                { status: 401 }
            );
        }

        if (user.role === "modirator") {
            const clientIp = getClientIp(req);
            const ipCheck = await checkModeratorIp(pinfl, clientIp);

            if (!ipCheck.allowed) {
                return NextResponse.json(
                    { success: false, error: ipCheck.reason },
                    { status: 403 }
                );
            }
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET env topilmadi");

        const token = signToken(
            { sub: String(user._id), role: user.role, pinfl: user.pinfl },
            jwtSecret
        );

        const response = NextResponse.json(
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

        response.cookies.set("access_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 24 * 60 * 60,
        });

        return response;
    } catch (error) {
        console.error("[LOGIN ERROR]", error);
        return NextResponse.json(
            { success: false, error: "Ichki server xatosi" },
            { status: 500 }
        );
    }
}