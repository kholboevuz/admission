import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import UsersDataModel from "@/models/user-data";
import crypto from "crypto";
import { jwtVerify } from "jose";

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

function sha256Hex(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function makePinflHash(pinfl: string) {
    const pepper = process.env.PINFL_PEPPER || "";
    return sha256Hex(`${pinfl}|${pepper}`);
}

function getEncKey(): Buffer {
    const b64 = process.env.DATA_ENC_KEY;
    if (!b64) throw new Error("DATA_ENC_KEY env yo'q");
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) throw new Error("DATA_ENC_KEY 32-byte bo'lishi shart (base64)");
    return key;
}

function decryptEncData(encBase64: string) {
    const key = getEncKey();

    const payloadJson = Buffer.from(encBase64, "base64").toString("utf-8");
    const payload = JSON.parse(payloadJson) as { v: string; iv: string; tag: string; data: string };

    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");
    const encryptedData = Buffer.from(payload.data, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return JSON.parse(decrypted.toString("utf-8"));
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        // auth
        const auth = await getAuth(req);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const pinfl = body?.pinfl;

        if (!pinfl || typeof pinfl !== "string") {
            return NextResponse.json({ success: false, error: "PINFL talab qilinadi" }, { status: 400 });
        }

        // RBAC
        const role = auth.role || "user";
        if (role !== "admin" && auth.pinfl !== pinfl) {
            return NextResponse.json({ success: false, error: "Forbidden" }, { status: 403 });
        }

        // base user
        const user = await UsersModel.findOne({ pinfl }, { password: 0 }).lean();

        // usersdata
        const pinflHash = makePinflHash(pinfl);
        const usersData = await UsersDataModel.findOne({ pinflHash }).lean();

        if (!usersData) {
            return NextResponse.json(
                { success: false, error: "UsersData topilmadi (pinflHash bo‘yicha)" },
                { status: 404 }
            );
        }

        const decoded = decryptEncData(usersData.encData);

        return NextResponse.json(
            {
                success: true,
                data: {
                    user: user || null,
                    secure: {
                        keyId: usersData.keyId,
                        pinflHash: usersData.pinflHash,
                        createdAt: usersData.createdAt,
                        updatedAt: usersData.updatedAt,
                        decoded,
                    },
                },
            },
            { status: 200 }
        );
    } catch (error: any) {
        console.error("DECODE ERROR:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Server error" },
            { status: 500 }
        );
    }
}