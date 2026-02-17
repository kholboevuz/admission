"use client";

import React, { useEffect, useState } from "react";

import { ToastContainer } from "react-toastify";
import { axiosClient } from "@/http/axios";
import Image from "next/image";

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
function FullPageLoading() {
    return (
        <div className="fixed inset-0 z-[9999] grid place-items-center bg-background">
            <div className="flex flex-col items-center gap-6">
                <Image
                    src="/logo/logo-dark.svg"
                    alt="logo"
                    width={110}
                    height={110}
                    priority
                />

                <div className="flex items-center gap-2">
                    <span className="h-4 w-4 rounded-full bg-[#18355e] animate-bounce [animation-delay:-0.3s]" />
                    <span className="h-4 w-4 rounded-full bg-[#18355e] animate-bounce [animation-delay:-0.15s]" />
                    <span className="h-4 w-4 rounded-full bg-[#18355e] animate-bounce" />
                </div>
            </div>
        </div>
    );
}

export default function Providers({ children }: { children: React.ReactNode }) {
    const [ready, setReady] = useState(false);

    useEffect(() => {
        let alive = true;

        const load = async () => {
            try {
                await axiosClient.get<SessionResponse>("/auth/session");
            } catch (e) {
            } finally {
                if (alive) setReady(true);
            }
        };

        load();
        return () => {
            alive = false;
        };
    }, []);

    if (!ready) return <FullPageLoading />;

    return (
        <>
            {children}
            <ToastContainer />
        </>
    );
}
