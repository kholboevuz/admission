import { NextRequest, NextResponse } from "next/server";

const ONEID_AUTH_URL = "https://sso.egov.uz/sso/oauth/Authorization.do";

function base64url(input: string) {
    return Buffer.from(input).toString("base64url");
}

export async function GET(req: NextRequest) {
    const clientId = process.env.ONEID_CLIENT_ID;
    const redirectUri = process.env.ONEID_REDIRECT_URI;
    const scope = process.env.ONEID_SCOPE;

    if (!clientId || !redirectUri || !scope) {
        return NextResponse.json(
            { success: false, error: "ONEID env sozlanmagan (CLIENT_ID/REDIRECT_URI/SCOPE)" },
            { status: 500 }
        );
    }

    // CSRF uchun state
    const stateRaw = `${Date.now()}|${Math.random()}|${req.headers.get("user-agent") || ""}`;
    const state = base64url(stateRaw);

    const url = new URL(ONEID_AUTH_URL);
    url.searchParams.set("response_type", "one_code");
    url.searchParams.set("client_id", clientId);
    url.searchParams.set("redirect_uri", redirectUri);
    url.searchParams.set("scope", scope);
    url.searchParams.set("state", state);

    const res = NextResponse.redirect(url.toString());

    res.cookies.set("oneid_state", state, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 10,
    });

    return res;
}
