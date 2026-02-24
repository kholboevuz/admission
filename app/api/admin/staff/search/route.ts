import { NextRequest, NextResponse } from "next/server";
import axios from "axios";
import { connectDB } from "@/config/dbconn";
import crypto from "crypto";

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

export async function POST(req: NextRequest) {
    try {
        await connectDB();

        const body = await req.json();
        const pinfl = body?.pinfl;
        const document = body?.document;
        const brithday = body?.brithday;

        if (!pinfl || !document || !brithday) {
            return NextResponse.json(
                { success: false, message: "pinfl, document, brithday talab qilinadi" },
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

        return NextResponse.json({
            success: true,
            data: {
                firstname,
                lastname,
                pinfl,
                document,
                brithday,
                photoBase64: normalized?.photo?.base64 || null,
                raw: normalized,
            },
        });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, message: e?.message || "Server error" },
            { status: 500 }
        );
    }
}