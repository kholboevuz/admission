import { NextRequest, NextResponse } from "next/server";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";
import StaffModel from "@/models/staff-model";
import bcrypt from "bcrypt";
import axios from "axios";
import crypto from "crypto";
import AdmissionModel from "@/models/admission-models";

function getEncKey(): Buffer {
    const b64 = process.env.DATA_ENC_KEY;
    if (!b64) throw new Error("DATA_ENC_KEY env yo'q");
    const key = Buffer.from(b64, "base64");
    if (key.length !== 32) throw new Error("DATA_ENC_KEY 32-byte bo'lishi shart (base64)");
    return key;
}

function encryptJson(obj: unknown, keyId = "v1") {
    const key = getEncKey();
    const iv = crypto.randomBytes(12);
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

    return Buffer.from(JSON.stringify(payload), "utf-8").toString("base64");
}

function normalizeIipPhoto(iipData: any) {
    const cloned = iipData ? JSON.parse(JSON.stringify(iipData)) : {};
    const p1 = cloned?.photo?.base64;
    const p2 = cloned?.raw?.photo;

    if ((!p1 || typeof p1 !== "string" || !p1.trim()) && typeof p2 === "string" && p2.trim()) {
        cloned.photo = { ...(cloned.photo || {}), base64: p2.trim() };
    }
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

function parseAllowedIps(input: string | string[] | undefined): string[] {
    if (!input) return [];
    const raw = Array.isArray(input) ? input.join("\n") : input;
    return raw
        .split(/[\n,;\s]+/g)
        .map((s) => s.trim())
        .filter(Boolean)
        .filter((ip) => ip.length <= 64);
}

function isValidRole(role: any): role is "admin" | "modirator" {
    return role === "admin" || role === "modirator";
}

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();

        const pinfl = body?.pinfl;
        const document = body?.document;
        const brithday = body?.brithday;

        const role = body?.role;
        const password = body?.password;
        const allowedIps = parseAllowedIps(body?.allowedIps);
        const birth = new Date(brithday);
        if (Number.isNaN(birth.getTime())) {
            return NextResponse.json(
                { success: false, message: "brithday formati noto‘g‘ri. YYYY-MM-DD bo‘lishi kerak" },
                { status: 400 }
            );
        }
        if (!pinfl || !document || !brithday || !password || !isValidRole(role)) {
            return NextResponse.json(
                { success: false, message: "pinfl, document, brithday, password, role (admin/modirator) talab qilinadi" },
                { status: 400 }
            );
        }
        const admissionUuuid = body?.admissionUuuid;
        if (!admissionUuuid) {
            return NextResponse.json(
                { success: false, message: "admissionUuuid talab qilinadi" },
                { status: 400 }
            );
        }

        const existsStaff = await StaffModel.findOne({ pinfl }).lean();
        if (existsStaff) {
            return NextResponse.json(
                { success: false, message: "Bu PINFL bilan staff allaqachon mavjud" },
                { status: 400 }
            );
        }

        const existingUser = await UsersModel.findOne({ $or: [{ document }, { pinfl }] }).lean();
        if (existingUser) {
            return NextResponse.json(
                { success: false, message: "User with the same document or pinfl already exists" },
                { status: 400 }
            );
        }
        const admission = await AdmissionModel.findOne({ uuuid: admissionUuuid }).lean();
        if (!admission) {
            return NextResponse.json(
                { success: false, message: "Tanlangan admission topilmadi yoki active emas" },
                { status: 400 }
            );
        }
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

        const normalized = normalizeIipPhoto(iipDataRaw);
        const { firstname, lastname } = pickNames(normalized);

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

        const keyId = process.env.DATA_KEY_ID || "v1";
        const encData = encryptJson(
            {
                syncedAt: new Date().toISOString(),
                source: "MSPD_REFRESH",
                data: normalized,
            },
            keyId
        );

        const staff = await StaffModel.create({
            firstname,
            lastname,
            pinfl,
            document,
            brithday: new Date(brithday),
            role,
            status: true,
            allowedIps,
            encData,
            keyId,
            admission_id: admissionUuuid,
        });

        return NextResponse.json(
            {
                success: true,
                message: "Staff muvaffaqiyatli qo‘shildi",
                data: {
                    staffId: String(staff._id),
                    userId: String(createdUser._id),
                    firstname,
                    lastname,
                    pinfl,
                    document,
                    role,
                    allowedIps,
                    admissionUuuid,
                },
            },
            { status: 201 }
        );
    } catch (e: any) {
        return NextResponse.json({ success: false, message: e?.message || "Server error" }, { status: 500 });
    }
}