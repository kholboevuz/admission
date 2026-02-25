import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const PUBLIC_API_ROUTES = [
    "/api/auth/register",
    "/api/auth/login",
    "/api/sentry-example-api",
    "/api/payment/click/prepare",
    "/api/payment/click/complate",
    "/api/auth/oneid/callback",
    "/api/auth/oneid/start",
];

async function verifyToken(token: string) {
    const secret = process.env.JWT_SECRET;
    if (!secret) throw new Error("JWT_SECRET env yo'q");
    const key = new TextEncoder().encode(secret);

    const { payload } = await jwtVerify(token, key);
    return payload as { sub?: string; role?: string; pinfl?: string };
}

export async function middleware(req: NextRequest) {
    const { pathname } = req.nextUrl;

    const isHomePage = pathname === "/";
    const isApi = pathname.startsWith("/api");
    const isDashboard = pathname.startsWith("/dashboard");
    const isLoginPage = pathname === "/auth/login";

    if (isApi && PUBLIC_API_ROUTES.some((p) => pathname.startsWith(p))) {
        return NextResponse.next();
    }

    if (!isHomePage && !isApi && !isDashboard && !isLoginPage) {
        return NextResponse.next();
    }

    const token = req.cookies.get("access_token")?.value;

    if (!token) {

        if (isHomePage || isDashboard) {
            const url = req.nextUrl.clone();
            url.pathname = "/auth/login";
            return NextResponse.redirect(url);
        }

        if (isApi) {
            return NextResponse.json(
                { success: false, error: "Unauthorized" },
                { status: 401 }
            );
        }

        return NextResponse.next();
    }

    let payload: { role?: string } | null = null;

    try {
        payload = await verifyToken(token);
    } catch {
        if (isApi) {
            return NextResponse.json(
                { success: false, error: "Invalid token" },
                { status: 401 }
            );
        }
        const url = req.nextUrl.clone();
        url.pathname = "/auth/login";
        return NextResponse.redirect(url);
    }

    const role = payload?.role || "user";
    const roleHome = role === "admin" ? "/dashboard/admin" : role === "modirator" ? "/dashboard/manager" : "/dashboard/user";

    if (isHomePage) {
        const url = req.nextUrl.clone();
        url.pathname = roleHome;
        return NextResponse.redirect(url);
    }

    if (isLoginPage) {
        const url = req.nextUrl.clone();
        url.pathname = roleHome;
        return NextResponse.redirect(url);
    }

    if (isDashboard) {
        if (pathname === "/dashboard") {
            const url = req.nextUrl.clone();
            url.pathname = roleHome;
            return NextResponse.redirect(url);
        }

        if (pathname.startsWith("/dashboard/user") && role !== "user") {
            const url = req.nextUrl.clone();
            url.pathname = "/dashboard/admin";
            return NextResponse.redirect(url);
        }

        if (pathname.startsWith("/dashboard/admin") && role !== "admin") {
            const url = req.nextUrl.clone();
            url.pathname = "/dashboard/user";
            return NextResponse.redirect(url);
        }

        if (pathname.startsWith("/dashboard/manager") && role !== "modirator") {
            const url = req.nextUrl.clone();
            url.pathname = "/dashboard/manager";
            return NextResponse.redirect(url);
        }
    }

    if (isApi && pathname.startsWith("/api/admin") && role !== "admin") {
        return NextResponse.json(
            { success: false, error: "Forbidden" },
            { status: 403 }
        );
    }

    return NextResponse.next();
}

export const config = {
    matcher: ["/", "/api/:path*", "/dashboard/:path*", "/auth/login"],
};