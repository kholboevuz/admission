"use client";

import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";

import { AdmissionTable } from "@/components/admission-table";
import { ChartAreaDefault } from "@/components/area-chart";
import { ChartRadarGridCustom } from "@/components/radar-chart";
import { StatsCard } from "@/components/stats-card";
import { axiosClient } from "@/http/axios";


type StatsResponse = {
    success: boolean;
    data: {
        admission: { id: string; title: string; starter_date: string; end_date: string } | null;
        cards: {
            totalUsers: number;
            totalApplicants: number;
            openContest: number;
            inOrder: number;
            rejected: number;
            returned: number;
        };
        radar: { category: string; applicants: number }[];
        area: { month: string; applications: number }[];
        areaMeta: { areaTotal: number; lastMonth: number; prevMonth: number; trendPct: number };
    };
};

export default function Page() {
    const [data, setData] = useState<StatsResponse | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                setLoading(true);
                setError(null);
                const res = await axiosClient.get("/admin/admission-stats", { signal: controller.signal });
                console.log("Stats data:", res.data);
                setData(res.data);
            } catch (e: any) {
                if (axios.isCancel?.(e) || e?.name === "CanceledError") return;
                setError(e?.response?.data?.error || e?.message || "Xatolik yuz berdi");
            } finally {
                setLoading(false);
            }
        })();

        return () => controller.abort();
    }, []);

    const cards = data?.data?.cards;
    const radar = data?.data?.radar ?? [];
    const area = data?.data?.area ?? [];
    const areaMeta = data?.data?.areaMeta;

    const rejectedReturned = useMemo(() => {
        return (cards?.rejected ?? 0) + (cards?.returned ?? 0);
    }, [cards?.rejected, cards?.returned]);

    return (
        <>
            {error && (
                <div className="mb-4 rounded-xl border p-3 text-sm">
                    <div className="font-medium">Xatolik</div>
                    <div className="text-muted-foreground">{error}</div>
                </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatsCard
                    title="Umumiy foydalanuvchilar"
                    value={loading ? "..." : String(cards?.totalUsers ?? 0)}
                    className="border-l-green-500"
                />
                <StatsCard
                    title="Ariza to'ldirganlar"
                    value={loading ? "..." : String(cards?.totalApplicants ?? 0)}
                    className="border-l-yellow-500"
                />
                <StatsCard
                    title="Ochiq tanlovda"
                    value={loading ? "..." : String(cards?.openContest ?? 0)}
                    className="border-l-blue-500"
                />
                <StatsCard
                    title="Buyurtmada"
                    value={loading ? "..." : String(cards?.inOrder ?? 0)}
                    className="border-l-purple-500"
                />
                <StatsCard
                    title="Bekor qilingan / qaytarilgan"
                    value={loading ? "..." : String(rejectedReturned)}
                    className="border-l-red-500"
                />
            </div>

            <div className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                    <div className="lg:col-span-1 h-[400px] flex flex-col">
                        <ChartRadarGridCustom data={radar} />
                    </div>

                    <div className="lg:col-span-2 h-[400px] flex flex-col">
                        <ChartAreaDefault
                            data={area}
                            meta={areaMeta}
                            title="Arizalar dinamikasi"
                            description="Oxirgi 6 oy kesimida arizalar soni"
                        />
                    </div>
                </div>

                <div className="mt-4">
                    <AdmissionTable add={false} />
                </div>
            </div>
        </>
    );
}