// app/api/manager/applications/[id]/route.ts

import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";

import UsersDataModel from "@/models/user-data";

import { getEducation, refreshEducation, getEmployment, refreshEmployment, getWithRefreshIfEmpty } from "@/lib/iip";
import { jwtVerify } from "jose";
import crypto from "crypto";
import MalumotnomaModel from "@/models/malumotnoma-models";
import InternationalDiplomaModel from "@/models/international-diploma-model";
import ApplicationsModel from "@/models/application-models";

// ─── Auth ────────────────────────────────────────────────────────────────────

async function getAuth(req: NextRequest) {
    const token = req.cookies.get("access_token")?.value;
    if (!token) return null;

    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");

    const key = new TextEncoder().encode(secret);
    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

// ─── Crypto helpers ───────────────────────────────────────────────────────────

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
    if (key.length !== 32) throw new Error("DATA_ENC_KEY 32-byte bo'lishi shart");
    return key;
}

function decryptEncData(encBase64: string) {
    const key = getEncKey();
    const payload = JSON.parse(Buffer.from(encBase64, "base64").toString("utf-8")) as {
        v: string; iv: string; tag: string; data: string;
    };
    const iv = Buffer.from(payload.iv, "base64");
    const tag = Buffer.from(payload.tag, "base64");
    const encryptedData = Buffer.from(payload.data, "base64");

    const decipher = crypto.createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);

    const decrypted = Buffer.concat([decipher.update(encryptedData), decipher.final()]);
    return JSON.parse(decrypted.toString("utf-8"));
}

// ─── Safe parallel fetcher ────────────────────────────────────────────────────

async function safeCall<T>(fn: () => Promise<T>): Promise<{ data: T | null; error: string | null }> {
    try {
        const data = await fn();
        return { data, error: null };
    } catch (e: any) {
        return { data: null, error: e?.message || "Xatolik" };
    }
}



export async function GET(
    req: NextRequest,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        await connectDB();

        const auth = await getAuth(req);
        if (!auth) {
            return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
        }

        const { id: applicationId } = await params;

        if (!applicationId) {
            return NextResponse.json({ success: false, error: "Application ID talab qilinadi" }, { status: 400 });
        }

        const application = await ApplicationsModel.findOne({ _id: applicationId }).lean();
        console.log("APPLICATION:", application);
        if (!application) {
            return NextResponse.json({ success: false, error: "Ariza topilmadi" }, { status: 404 });
        }

        const pinfl = application.pinfl;

        const [
            userDataResult,
            employmentResult,
            educationResult,
            internationalDiplomaResult,
            malumotnomaResult,
        ] = await Promise.all([

            safeCall(async () => {
                const pinflHash = makePinflHash(pinfl);
                const usersData = await UsersDataModel.findOne({ pinflHash }).lean();
                if (!usersData) return null;
                return decryptEncData(usersData.encData);
            }),

            // Employment from IIP
            safeCall(() =>
                getWithRefreshIfEmpty({
                    getFn: getEmployment,
                    refreshFn: refreshEmployment,
                    pinfl,
                    forceRefresh: false,
                })
            ),

            // Education from IIP
            safeCall(() =>
                getWithRefreshIfEmpty({
                    getFn: getEducation,
                    refreshFn: refreshEducation,
                    pinfl,
                    forceRefresh: false,
                })
            ),

            // International diploma
            safeCall(() =>
                InternationalDiplomaModel.findOne({ pinfl }).lean()
            ),

            // Malumotnoma
            safeCall(() =>
                MalumotnomaModel.findOne({ pinfl }).lean()
            ),
        ]);

        return NextResponse.json({
            success: true,
            data: {
                application,
                passport: userDataResult.data ?? null,
                passportError: userDataResult.error,
                employment: employmentResult.data ?? null,
                employmentError: employmentResult.error,
                education: educationResult.data ?? null,
                educationError: educationResult.error,
                internationalDiploma: internationalDiplomaResult.data ?? null,
                internationalDiplomaError: internationalDiplomaResult.error,
                malumotnoma: malumotnomaResult.data ?? null,
                malumotnomaError: malumotnomaResult.error,
            },
        });
    } catch (error: any) {
        console.error("APPLICATION DETAIL ERROR:", error);
        return NextResponse.json(
            { success: false, error: error?.message || "Server error" },
            { status: 500 }
        );
    }
}