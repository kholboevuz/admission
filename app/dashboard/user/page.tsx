"use client";

import React from "react";
import ProfileTabsCard from "@/components/profile-tabs-card";
import { MalumotnomaBuilder } from "@/components/malumotnoma-builder";
import { axiosClient } from "@/http/axios";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

type SessionResponse = {
    success: boolean;
    user: null | {
        id: string;
        firstname: string;
        lastname: string;
        role: string;
        pinfl: string;
    };
};

type DecodeResponse = {
    success: boolean;
    data?: { secure: { decoded: any } };
    error?: string;
    message?: string;
};

function ddmmyyyy(iso?: string) {
    if (!iso) return "";
    const m = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) return `${m[3]}.${m[2]}.${m[1]}`;
    const m2 = String(iso).match(/^(\d{4})-(\d{2})-(\d{2})T/);
    if (m2) return `${m2[3]}.${m2[2]}.${m2[1]}`;
    return String(iso);
}

function formatFioTitle(iip: any) {
    const p = iip?.profile || iip?.raw || {};
    const last = p?.surnamelat || "";
    const first = p?.namelat || "";
    const mid = p?.patronymlat || "";
    return [last, `${first} ${mid}`.trim()].filter(Boolean).join("\n");
}

function pickMainDocument(iip: any) {
    const docs = iip?.documents || iip?.raw?.documents || [];
    if (!Array.isArray(docs) || docs.length === 0) return null;
    return docs.find((d: any) => String(d?.type || "").includes("CITIZ_DOCUMENTS")) || docs[0] || null;
}

function getPhotoBase64(iip: any): string | null {
    const b1 = iip?.photo?.base64;
    if (typeof b1 === "string" && b1.trim()) return b1.trim();
    const b2 = iip?.raw?.photo;
    if (typeof b2 === "string" && b2.trim()) return b2.trim();
    return null;
}

function guessMimeFromBase64(b64: string): string {
    if (b64.startsWith("/9j/")) return "image/jpeg";
    if (b64.startsWith("iVBORw0KGgo")) return "image/png";
    if (b64.startsWith("R0lGOD")) return "image/gif";
    if (b64.startsWith("UklGR")) return "image/webp";
    return "image/jpeg";
}

function makeAvatarDataUrl(iip: any): string | null {
    const b64 = getPhotoBase64(iip);
    if (!b64) return null;
    if (b64.startsWith("data:image/")) return b64;
    return `data:${guessMimeFromBase64(b64)};base64,${b64}`;
}

function mapWorkToUi(workArr: any[]) {
    if (!Array.isArray(workArr)) return [];
    return workArr.map((w: any, idx: number) => ({
        id: w?.payload?.transaction_id ?? `${w?.employer_inn}-${idx}`,
        startDate: ddmmyyyy(w?.hired_at),
        endDate: w?.fired_at ? ddmmyyyy(w?.fired_at) : "-",
        organization: w?.employer_name || "-",
        position: w?.position || "-",
        department: w?.department || w?.payload?.structure_name || "-",
    }));
}

function mapEducationToUi(eduArr: any[]) {
    if (!Array.isArray(eduArr)) return [];
    return eduArr.map((e: any, idx: number) => {
        const serial = e?.diploma_serial || "";
        const num = e?.diploma_number || "";
        const docSeriesNumber = [serial, num].filter(Boolean).join(" ") || "-";

        const institution =
            e?.institution_name_translate?.name_oz ||
            e?.institution_name_translate?.name_uz ||
            e?.institution_name ||
            "-";

        const educationType =
            e?.degree_name_translate?.name_oz ||
            e?.degree_name_translate?.name_uz ||
            e?.degree_name ||
            e?.edu_type_name ||
            "-";

        const specialty =
            e?.speciality_name_translate?.name_oz ||
            e?.speciality_name ||
            "-";

        const graduationYear =
            e?.diploma_given_date ? ddmmyyyy(e.diploma_given_date) : "-";

        return {
            id: e?.id ?? `${e?.pinfl}-${idx}`,
            docSeriesNumber,
            institution,
            educationType,
            specialty,
            graduationYear,
        };
    });
}

function buildProfileCardData(
    sessionUser: SessionResponse["user"],
    decoded: any,
    workUi: any[],
    eduUi: any[]
) {
    const root = decoded?.data || decoded;
    const iip = root?.data || root;
    const profile = iip?.profile || iip?.raw || {};
    const doc = pickMainDocument(iip);

    const fullNameLat = [profile?.surnamelat, profile?.namelat, profile?.patronymlat].filter(Boolean).join(" ").trim();
    const avatarUrl = makeAvatarDataUrl(iip) || "/assets/avatar.png";

    return {
        avatarUrl,
        fioTitle: formatFioTitle(iip),
        passport: {
            fullName: fullNameLat || `${sessionUser?.lastname ?? ""} ${sessionUser?.firstname ?? ""}`.trim(),
            birthDate: ddmmyyyy(profile?.birth_date),
            passportSeriesNumber: doc?.document || iip?.document || "",
            pinfl: iip?.pinfl || sessionUser?.pinfl || "",
            issueDate: ddmmyyyy(doc?.datebegin),
            expiryDate: ddmmyyyy(doc?.dateend),
            issuedBy: doc?.docgiveplace || "",
        },
        address: {
            country: profile?.birthcountry || "O‘ZBEKISTON",
            region: "",
            district: profile?.birthplace || "",
            addressLine: "—",
        },
        contacts: { phone: null, extraPhone: null, email: null },
        work: workUi,
        education: eduUi,
    };
}

function ProfileSkeleton() {
    return (
        <div className="p-4">
            <div className="flex gap-2">
                <Skeleton className="h-10 w-40 rounded-xl" />
                <Skeleton className="h-10 w-40 rounded-xl" />
                <Skeleton className="h-10 w-40 rounded-xl" />
            </div>

            <Card className="mt-4">
                <CardContent className="p-6">
                    <div className="flex items-center gap-4">
                        <Skeleton className="h-24 w-24 rounded-2xl" />
                        <div className="space-y-2">
                            <Skeleton className="h-6 w-64" />
                            <Skeleton className="h-4 w-40" />
                        </div>
                    </div>

                    <div className="mt-6 grid gap-4 lg:grid-cols-3">
                        <Skeleton className="h-72 rounded-2xl" />
                        <div className="grid gap-4 lg:col-span-2">
                            <Skeleton className="h-32 rounded-2xl" />
                            <Skeleton className="h-32 rounded-2xl" />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default function Page() {
    const [loading, setLoading] = React.useState(true);
    const [error, setError] = React.useState<string | null>(null);
    const [cardData, setCardData] = React.useState<any | null>(null);

    // ✅ viewMode: profile yoki malumotnoma
    const [viewMode, setViewMode] = React.useState<"profile" | "malumotnoma">("profile");

    const loadProfile = React.useCallback(async (opts?: { forceRefresh?: boolean }) => {
        setLoading(true);
        setError(null);

        try {
            const sess = await axiosClient.get<SessionResponse>("/auth/session");
            const sessionUser = sess.data.user;

            if (!sessionUser?.pinfl) {
                setError("Session topilmadi. Qayta login qiling.");
                setCardData(null);
                return;
            }

            const dec = await axiosClient.post<DecodeResponse>("/user/data", { pinfl: sessionUser.pinfl });
            if (!dec.data.success) {
                setError(dec.data.error || dec.data.message || "Ma'lumot olishda xatolik");
                setCardData(null);
                return;
            }

            const decoded = dec.data.data?.secure?.decoded;
            if (!decoded) {
                setError("Decoded ma'lumot topilmadi");
                setCardData(null);
                return;
            }

            const refreshQ = opts?.forceRefresh ? "&refresh=1" : "";
            const [empRes, eduRes] = await Promise.all([
                axiosClient.get(`/user/data/iip/employment?pinfl=${sessionUser.pinfl}${refreshQ}`),
                axiosClient.get(`/user/data/iip/education?pinfl=${sessionUser.pinfl}${refreshQ}`),
            ]);

            if (!empRes.data?.success) throw new Error(empRes.data?.error || "Employment error");
            if (!eduRes.data?.success) throw new Error(eduRes.data?.error || "Education error");

            const employmentRaw = Array.isArray(empRes.data.data)
                ? empRes.data.data
                : (empRes.data.data?.data ?? empRes.data.data ?? []);

            const educationRaw = Array.isArray(eduRes.data.data)
                ? eduRes.data.data
                : (eduRes.data.data?.data ?? eduRes.data.data ?? []);

            const workUi = mapWorkToUi(employmentRaw);
            const eduUi = mapEducationToUi(educationRaw);

            const uiData = buildProfileCardData(sessionUser, decoded, workUi, eduUi);
            setCardData(uiData);
        } catch (e: any) {
            const msg =
                e?.response?.data?.error ||
                e?.response?.data?.message ||
                e?.message ||
                "Serverda xatolik";
            setError(String(msg));
            setCardData(null);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadProfile();
    }, [loadProfile]);

    if (loading) return <ProfileSkeleton />;

    if (error) {
        return (
            <div className="p-4">
                <Card>
                    <CardHeader className="pb-2">
                        <div className="text-sm font-semibold text-red-600">Xatolik</div>
                    </CardHeader>
                    <CardContent>
                        <div className="text-sm text-muted-foreground">{error}</div>
                        <Button
                            className="mt-4"
                            variant="outline"
                            onClick={() => loadProfile({ forceRefresh: true })}
                        >
                            Qayta yuklash (refresh bilan)
                        </Button>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (!cardData) {
        return <div className="p-4 text-sm text-muted-foreground">Ma&apos;lumot topilmadi</div>;
    }

    if (viewMode === "malumotnoma") {
        return (
            <MalumotnomaBuilder
                data={cardData}
                onBack={() => setViewMode("profile")}
            />
        );
    }

    return (
        <div className="p-4">
            <ProfileTabsCard
                data={cardData}
                onRefresh={() => loadProfile({ forceRefresh: true })}
                isRefreshing={loading}
                onOpenMalumotnoma={() => setViewMode("malumotnoma")}
            />
        </div>
    );
}
