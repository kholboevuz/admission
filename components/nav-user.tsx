"use client";

import React from "react";
import Image from "next/image";
import { LogOut, Settings, User, FileText, Shield } from "lucide-react";
import { useRouter } from "next/navigation";

import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { axiosClient } from "@/http/axios";

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
};

function mapRole(role?: string) {
    const r = String(role || "").toLowerCase();
    if (r === "admin") return "Administrator";
    if (r === "user") return "Nomzod";
    return role || "—";
}

function normRole(role?: string) {
    return String(role || "").toLowerCase();
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

async function handleLogout() {
    try {
        await axiosClient.post("/auth/logout");
    } catch (e) {
        console.error(e);
    } finally {
        window.location.href = "/auth/login";
    }
}

function UserNavSkeleton() {
    return (
        <Button
            variant="ghost"
            className="h-auto px-2 py-1 rounded-xl flex items-center gap-3"
            disabled
        >
            <Skeleton className="size-9 rounded-full" />
            <div className="flex flex-col gap-1">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-20" />
            </div>
        </Button>
    );
}

export function UserNav() {
    const router = useRouter();

    const [loading, setLoading] = React.useState(true);
    const [name, setName] = React.useState("Foydalanuvchi");
    const [roleLabel, setRoleLabel] = React.useState("—");
    const [roleRaw, setRoleRaw] = React.useState<string>("user");
    const [image, setImage] = React.useState("/assets/avatar.png");

    const loadUser = React.useCallback(async () => {
        setLoading(true);

        try {
            const sess = await axiosClient.get<SessionResponse>("/auth/session");
            const user = sess.data.user;

            if (!user?.pinfl) return;

            setName(`${user.lastname} ${user.firstname}`.trim());
            setRoleLabel(mapRole(user.role));
            setRoleRaw(normRole(user.role));

            const dec = await axiosClient.post<DecodeResponse>("/user/data", {
                pinfl: user.pinfl,
            });

            if (dec.data.success) {
                const decoded = dec.data.data?.secure?.decoded;
                const root = decoded?.data || decoded;
                const iip = root?.data || root;

                const avatar = makeAvatarDataUrl(iip);
                if (avatar) setImage(avatar);
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    }, []);

    React.useEffect(() => {
        loadUser();
    }, [loadUser]);

    const go = React.useCallback(
        (path: string) => {
            router.push(path);
        },
        [router]
    );

    const isAdmin = roleRaw === "admin";

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                {loading ? (
                    <UserNavSkeleton />
                ) : (
                    <Button
                        variant="ghost"
                        className="h-auto px-2 py-1 rounded-xl hover:bg-muted flex items-center gap-3"
                    >
                        <div className="relative size-9 rounded-full overflow-hidden border">
                            <Image
                                src={image}
                                alt="User avatar"
                                fill
                                className="object-cover"
                            />
                        </div>

                        <div className="flex flex-col items-start leading-tight">
                            <span className="text-sm font-semibold">{name}</span>
                            <span className="text-xs text-muted-foreground">{roleLabel}</span>
                        </div>
                    </Button>
                )}
            </DropdownMenuTrigger>

            <DropdownMenuContent align="end" className="w-56 rounded-xl">
                <DropdownMenuLabel>
                    <div className="flex flex-col">
                        <span className="font-medium">{name}</span>
                        <span className="text-xs text-muted-foreground">{roleLabel}</span>
                    </div>
                </DropdownMenuLabel>

                <DropdownMenuSeparator />

                {/* ===== ROLE BASED MENU ===== */}
                {isAdmin ? (
                    <>
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onSelect={(e) => {
                                e.preventDefault();
                                go("/dashboard/admin");
                            }}
                        >
                            <Shield className="size-4" />
                            Admin panel
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onSelect={(e) => {
                                e.preventDefault();
                                go("/dashboard/admin/settings");
                            }}
                        >
                            <Settings className="size-4" />
                            Sozlamalar
                        </DropdownMenuItem>
                    </>
                ) : (
                    <>
                        <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onSelect={(e) => {
                                e.preventDefault();
                                go("/dashboard/user");
                            }}
                        >
                            <User className="size-4" />
                            Profil
                        </DropdownMenuItem>

                        <DropdownMenuItem
                            className="gap-2 cursor-pointer"
                            onSelect={(e) => {
                                e.preventDefault();
                                go("/dashboard/user/application");
                            }}
                        >
                            <FileText className="size-4" />
                            Arizalar
                        </DropdownMenuItem>
                    </>
                )}

                <DropdownMenuSeparator />

                <DropdownMenuItem
                    className="gap-2 text-destructive cursor-pointer"
                    onSelect={(e) => {
                        e.preventDefault();
                        handleLogout();
                    }}
                >
                    <LogOut className="size-4" />
                    Chiqish
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
