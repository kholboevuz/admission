'use client'
import { AdmissionTable } from "@/components/admission-table";
import { ChartAreaDefault } from "@/components/area-chart";
import { ChartRadarGridCustom } from "@/components/radar-chart";
import { StatsCard } from "@/components/stats-card";
import React from "react";

export default function Page() {
    return (
        <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                <StatsCard title="Umumiy foydalanuvchilar" value="1000" className="border-l-green-500" />
                <StatsCard title="Ariza to'ldirganlar" value="400" className="border-l-yellow-500" />
                <StatsCard title="Ochiq tanlovda" value="100" className="border-l-blue-500" />
                <StatsCard title="Buyurtmada" value="300" className="border-l-purple-500" />
                <StatsCard title="Arizasi bekor qilinganlar" value="600" className="border-l-red-500" />
            </div>

            <div className="pt-4">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-stretch">

                    {/* Radar chart */}
                    <div className="lg:col-span-1 h-[400px] flex flex-col">
                        <ChartRadarGridCustom />
                    </div>

                    {/* Area chart */}
                    <div className="lg:col-span-2 h-[400px] flex flex-col">
                        <ChartAreaDefault />
                    </div>

                </div>
                <div className="mt-4">
                    <AdmissionTable add={false} />
                </div>
            </div>
        </>
    );
}
