import { NextResponse } from "next/server";

const locales = ["uz", "ru", "en", "kaa"];

export async function POST(req: Request) {
    const { locale } = await req.json();

    if (!locales.includes(locale)) {
        return NextResponse.json({ ok: false }, { status: 400 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set("locale", locale, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
        maxAge: 60 * 60 * 24 * 365,
    });

    return res;
}
