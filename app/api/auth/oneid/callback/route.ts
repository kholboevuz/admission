import { NextRequest, NextResponse } from "next/server";
import jwt from "jsonwebtoken";
import { connectDB } from "@/config/dbconn";
import UsersModel from "@/models/users-models";

const ONEID_URL = "https://sso.egov.uz/sso/oauth/Authorization.do";

type OneIdTokenResponse = {
    access_token?: string;
    refresh_token?: string;
    token_type?: string;
    expires_in?: number | string;
    scope?: string;
};

type OneIdUserInfo = {
    valid?: string | boolean;
    validation_method?: string[];
    pin?: string;
    user_id?: string;
    full_name?: string;
    pport_no?: string;
    birth_date?: string;
    sur_name?: string;
    first_name?: string;
    mid_name?: string;
    user_type?: string;
    sess_id?: string;
    ret_cd?: string;
    auth_method?: string;
    pkcs_legal_tin?: string;
    legal_info?: any[];
};

async function oneidPost(form: Record<string, string>) {
    const body = new URLSearchParams(form);
    const r = await fetch(ONEID_URL, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
    });

    const text = await r.text();

    try {
        return JSON.parse(text);
    } catch {
        return { raw: text };
    }
}

function normalizeRole(role?: string) {
    const r = String(role || "").toLowerCase();
    if (r === "admin") return "admin";
    return "user";
}

export async function GET(req: NextRequest) {
    try {
        const clientId = process.env.ONEID_CLIENT_ID;
        const clientSecret = process.env.ONEID_CLIENT_SECRET;
        const redirectUri = process.env.ONEID_REDIRECT_URI;
        const scope = process.env.ONEID_SCOPE;

        if (!clientId || !clientSecret || !redirectUri || !scope) {
            return NextResponse.json(
                { success: false, error: "ONEID env sozlanmagan" },
                { status: 500 }
            );
        }

        const jwtSecret = process.env.JWT_SECRET;
        if (!jwtSecret) throw new Error("JWT_SECRET env yo'q");

        const url = new URL(req.url);
        const code = url.searchParams.get("code") || "";
        const state = url.searchParams.get("state") || "";

        // CSRF check
        const cookieState = req.cookies.get("oneid_state")?.value || "";
        if (!code || !state || !cookieState || state !== cookieState) {
            return NextResponse.redirect(new URL("/auth/login?err=oneid_state", req.url));
        }

        // 1) code -> access_token
        const tokenJson = (await oneidPost({
            grant_type: "one_authorization_code",
            client_id: clientId,
            client_secret: clientSecret,
            code,
            redirect_uri: redirectUri,
        })) as OneIdTokenResponse & { raw?: string };

        const accessToken = tokenJson?.access_token;
        if (!accessToken) {
            return NextResponse.redirect(new URL("/auth/login?err=oneid_token", req.url));
        }

        // 2) access_token -> user info
        const userJson = (await oneidPost({
            grant_type: "one_access_token_identify",
            client_id: clientId,
            client_secret: clientSecret,
            access_token: accessToken,
            scope,
        })) as OneIdUserInfo & { raw?: string };

        if (String(userJson?.ret_cd || "") !== "0") {
            return NextResponse.redirect(new URL("/auth/login?err=oneid_identify", req.url));
        }

        const pinfl = String(userJson?.pin || "").trim();
        if (!pinfl || pinfl.length !== 14) {
            return NextResponse.redirect(new URL("/auth/login?err=oneid_pin", req.url));
        }

        await connectDB();

        let user = await UsersModel.findOne({ pinfl });

        if (!user) {

            user = await UsersModel.create({
                pinfl,
                firstname: userJson?.first_name || (userJson?.full_name?.split(" ")?.[1] ?? "—"),
                lastname: userJson?.sur_name || (userJson?.full_name?.split(" ")?.[0] ?? "—"),
                role: "user",
                status: true,

            });
        }

        if (user.status === false) {
            return NextResponse.redirect(new URL("/auth/login?err=blocked", req.url));
        }

        const role = normalizeRole(user.role);

        const token = jwt.sign(
            { sub: String(user._id), role, pinfl: user.pinfl },
            jwtSecret,
            { expiresIn: "7d" }
        );

        const redirectTo = role === "admin" ? "/dashboard/admin" : "/dashboard/user";
        const res = NextResponse.redirect(new URL(redirectTo, req.url));

        res.cookies.set("access_token", token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: 60 * 60 * 24 * 7,
        });

        res.cookies.set("oneid_state", "", { path: "/", maxAge: 0 });

        return res;
    } catch (e) {
        console.error("ONEID CALLBACK ERROR:", e);
        return NextResponse.redirect(new URL("/auth/login?err=oneid_server", req.url));
    }
}
