import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import UsersDataModel from "@/models/user-data";
import bcrypt from "bcrypt";
import axios from "axios";
import crypto from "crypto";

function getEncKey(): Buffer {
    const b64 = process.env.DATA_ENC_KEY;
    if (!b64) throw new Error("DATA_ENC_KEY env yo'q");

    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) throw new Error("DATA_ENC_KEY 32-byte bo'lishi shart (base64)");

    return key;
}

function sha256Hex(input: string) {
    return crypto.createHash("sha256").update(input).digest("hex");
}

function makePinflHash(pinfl: string) {
    const pepper = process.env.PINFL_PEPPER || "";
    return sha256Hex(`${pinfl}|${pepper}`);
}

function encryptJson(obj: unknown, keyId = "v1") {
    const key = getEncKey();
    const iv = crypto.randomBytes(12); // GCM uchun 12 byte recommended
    const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);

    const plaintext = Buffer.from(JSON.stringify(obj), "utf-8");
    const encrypted = Buffer.concat([cipher.update(plaintext), cipher.final()]);
    const tag = cipher.getAuthTag();

    const payload = {
        v: keyId,
        iv: iv.toString("base64"),
        tag: tag.toString("base64"),
        data: encrypted.toString("base64"),
    };

    // outer base64 (dbga saqlanadi)
    return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

/* =========================
   MSPD helpers
========================= */
function normalizeIipPhoto(iipData: any) {
    const cloned = iipData ? JSON.parse(JSON.stringify(iipData)) : {};

    // photo.base64 bo'lmasa raw.photo dan olib qo'yamiz
    const p1 = cloned?.photo?.base64;
    const p2 = cloned?.raw?.photo;

    if ((!p1 || typeof p1 !== "string" || !p1.trim()) && typeof p2 === "string" && p2.trim()) {
        cloned.photo = { ...(cloned.photo || {}), base64: p2.trim() };
    }

    // base64 ichidagi whitespace/newline'larni tozalash
    if (typeof cloned?.photo?.base64 === "string") {
        cloned.photo.base64 = cloned.photo.base64.replace(/\s+/g, "");
    }

    return cloned;
}

function pickNames(iipData: any) {
    const p = iipData?.profile || iipData?.raw || {};
    const firstname = p?.namelat || p?.namecyr || p?.engname || "Noma'lum";
    const lastname = p?.surnamelat || p?.surnamecyr || p?.engsurname || "Noma'lum";
    return { firstname: String(firstname), lastname: String(lastname) };
}

function buildSensitivePayload(iipData: any) {
    const normalized = normalizeIipPhoto(iipData);
    return {
        syncedAt: new Date().toISOString(),
        source: "MSPD_REFRESH",
        data: normalized,
    };
}

/* =========================
   Route
========================= */
export async function POST(req: NextRequest) {
    let createdUserId: string | null = null;

    try {
        await connectDB();

        const body = await req.json();
        const password = body?.password;
        const document = body?.document;
        const brithday = body?.brithday; // siz shunaqa nomlab qo'ygansiz
        const role = body?.role || "user";
        const pinfl = body?.pinfl;

        if (!password || !document || !brithday || !pinfl) {
            return NextResponse.json(
                { success: false, message: "password, document, brithday, pinfl talab qilinadi" },
                { status: 400 }
            );
        }

        // duplicate check
        const existing = await UsersModel.findOne({ $or: [{ document }, { pinfl }] }).lean();
        if (existing) {
            return NextResponse.json(
                { success: false, message: "User with the same document or pinfl already exists" },
                { status: 400 }
            );
        }

        // MSPD fetch
        const mspdUrl = process.env.MSPD_URL;
        const mspdSecret = process.env.MSPD_SECRET;
        if (!mspdUrl || !mspdSecret) {
            return NextResponse.json(
                { success: false, message: "MSPD_URL yoki MSPD_SECRET env yo'q" },
                { status: 500 }
            );
        }

        const { data: iipDataRaw } = await axios.get(
            `${mspdUrl}/passport/refresh/?pinfl=${encodeURIComponent(pinfl)}&document=${encodeURIComponent(
                document
            )}&birth_date=${encodeURIComponent(brithday)}&is_photo=Y&langId=3`,
            {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${mspdSecret}`,
                },
                timeout: 20000,
            }
        );

        // MSPD [] => not found
        if (Array.isArray(iipDataRaw) && iipDataRaw.length === 0) {
            return NextResponse.json(
                { success: false, message: "PINFL va document bo‘yicha ma’lumot topilmadi" },
                { status: 404 }
            );
        }

        if (!iipDataRaw || typeof iipDataRaw !== "object") {
            return NextResponse.json(
                { success: false, message: "MSPD javobi noto‘g‘ri formatda keldi" },
                { status: 502 }
            );
        }

        // names
        const { firstname, lastname } = pickNames(iipDataRaw);

        // create user
        const hashPassword = await bcrypt.hash(password, 12);

        const createdUser = await UsersModel.create({
            firstname,
            lastname,
            password: hashPassword,
            document,
            brithday: new Date(brithday),
            role,
            status: true,
            pinfl,
        });

        createdUserId = String(createdUser._id);

        const pinflHash = makePinflHash(pinfl);
        const keyId = process.env.DATA_KEY_ID || "v1";

        const sensitivePayload = buildSensitivePayload(iipDataRaw);
        const encData = encryptJson(sensitivePayload, keyId);

        await UsersDataModel.updateOne(
            { pinflHash },
            { $set: { encData, keyId } },
            { upsert: true }
        );

        return NextResponse.json(
            {
                success: true,
                message: "User muvaffaqiyatli yaratildi",
                data: {
                    id: createdUserId,
                    firstname,
                    lastname,
                    document,
                    pinfl,
                    role,
                },
            },
            { status: 201 }
        );
    } catch (error: any) {
        console.error("REGISTER ERROR:", error);

        // rollback user if created
        if (createdUserId) {
            try {
                await UsersModel.deleteOne({ _id: createdUserId });
            } catch (e) {
                console.error("Rollback delete user failed:", e);
            }
        }

        return NextResponse.json(
            { success: false, message: error?.message || "Server error" },
            { status: 500 }
        );
    }
}