"use client";

import { PolarAngleAxis, PolarGrid, Radar, RadarChart } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";

type RadarItem = { category: string; applicants: number };

const chartConfig = {
    applicants: { label: "Tinglovchilar", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ChartRadarGridCustom({ data }: { data: RadarItem[] }) {
    return (
        <Card className="h-full">
            <CardHeader className="items-center pb-4">
                <CardTitle>Yo'nalishlar kesmida tinglovchilar</CardTitle>
            </CardHeader>

            <CardContent className="pb-0">
                <ChartContainer config={chartConfig} className="mx-auto aspect-square max-h-[250px]">
                    <RadarChart data={data}>
                        <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel />} />
                        <PolarGrid radialLines={false} polarRadius={[90]} strokeWidth={1} />
                        <PolarAngleAxis dataKey="category" />
                        <Radar dataKey="applicants" fill="var(--color-applicants)" fillOpacity={0.6} />
                    </RadarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}