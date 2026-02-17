import { NextRequest, NextResponse } from "next/server";
import { getWithRefreshIfEmpty, getEducation, refreshEducation } from "@/lib/iip";

export async function GET(req: NextRequest) {
    try {
        const pinfl = req.nextUrl.searchParams.get("pinfl") || "";
        const refresh = req.nextUrl.searchParams.get("refresh") === "1";

        if (!pinfl) {
            return NextResponse.json({ success: false, error: "pinfl is required" }, { status: 400 });
        }

        const data = await getWithRefreshIfEmpty({
            getFn: getEducation,
            refreshFn: refreshEducation,
            pinfl,
            forceRefresh: refresh,
        });

        return NextResponse.json({ success: true, data });
    } catch (e: any) {
        return NextResponse.json(
            { success: false, error: e?.response?.data?.message || e?.message || "Education fetch error" },
            { status: 500 }
        );
    }
}