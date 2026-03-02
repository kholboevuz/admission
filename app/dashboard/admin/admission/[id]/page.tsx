"use client";

import React, { useEffect, useState } from "react";
import axios from "axios";
import { useParams } from "next/navigation";

import { StatsCard } from "@/components/stats-card";
import { ChartRadarGridCustom } from "@/components/radar-chart";
import { ChartAreaDefault } from "@/components/area-chart";
import { axiosClient } from "@/http/axios";
import { Skeleton } from "@/components/ui/skeleton";

type Resp = {
    success: boolean;
    data: {
        admission: { id: string; uuuid: string; title: string; starter_date: string; end_date: string };
        cards: {
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

function StatsCardSkeleton() {
    return (
        <div className="rounded-xl border p-4 space-y-3">
            <Skeleton className="h-4 w-32" />
            <Skeleton className="h-8 w-20" />
        </div>
    );
}

function ChartSkeleton() {
    return (
        <div className="rounded-xl border p-4 h-full">
            <Skeleton className="h-6 w-40 mb-4" />
            <Skeleton className="h-[250px] w-full" />
        </div>
    );
}

export default function Page() {
    const params = useParams();
    const admissionId = typeof params?.id === "string" ? params.id : null;

    const [data, setData] = useState<Resp | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const controller = new AbortController();

        (async () => {
            try {
                setLoading(true);

                if (!admissionId) {
                    setData(null);
                    return;
                }

                const res = await axiosClient.get<Resp>(
                    `/admin/admission-stats/${admissionId}/stats`,
                    { signal: controller.signal }
                );

                setData(res.data);
            } catch (e: any) {
                if (axios.isCancel?.(e) || e?.name === "CanceledError") return;
                console.error(e);
                setData(null);
            } finally {
                setLoading(false);
            }
        })();

        return () => controller.abort();
    }, [admissionId]);

    const cards = data?.data?.cards;
    const radar = data?.data?.radar ?? [];
    const area = data?.data?.area ?? [];
    const areaMeta = data?.data?.areaMeta;

    return (
        <div>
            <hr className="mb-4" />

            {/* STATS */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                {loading ? (
                    <>
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                        <StatsCardSkeleton />
                    </>
                ) : (
                    <>
                        <StatsCard title="Ariza to'ldirganlar" value={String(cards?.totalApplicants ?? 0)} className="border-l-yellow-500" />
                        <StatsCard title="Ochiq tanlovda" value={String(cards?.openContest ?? 0)} className="border-l-blue-500" />
                        <StatsCard title="Buyurtmada" value={String(cards?.inOrder ?? 0)} className="border-l-purple-500" />
                        <StatsCard title="Arizasi bekor qilinganlar" value={String(cards?.rejected ?? 0)} className="border-l-red-500" />
                        <StatsCard title="Arizasi qaytarilganlar" value={String(cards?.returned ?? 0)} className="border-l-gray-500" />
                    </>
                )}
            </div>

            {/* CHARTS */}
            <div className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">
                    <div className="lg:col-span-1 h-[400px] flex flex-col">
                        {loading ? <ChartSkeleton /> : <ChartRadarGridCustom data={radar} />}
                    </div>

                    <div className="lg:col-span-2 h-[400px] flex flex-col">
                        {loading ? (
                            <ChartSkeleton />
                        ) : (
                            <ChartAreaDefault
                                data={area}
                                meta={areaMeta}
                                title="Arizalar dinamikasi"
                                description="Oxirgi 6 oy kesimida arizalar soni"
                            />
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}