"use client";

import { TrendingUp } from "lucide-react";
import { Area, AreaChart, CartesianGrid, XAxis } from "recharts";

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { cn } from "@/lib/utils";

type AreaItem = { month: string; applications: number };
type Meta = { areaTotal: number; lastMonth: number; prevMonth: number; trendPct: number };

const chartConfig = {
    applications: { label: "Arizalar", color: "var(--chart-1)" },
} satisfies ChartConfig;

export function ChartAreaDefault({
    className,
    data,
    meta,
    title,
    description,
}: {
    className?: string;
    data: AreaItem[];
    meta?: Meta;
    title?: string;
    description?: string;
}) {
    const trendText =
        meta?.prevMonth === 0
            ? meta?.lastMonth
                ? `O‘tgan oyga nisbatan +${meta.trendPct}%`
                : "Trend: barqaror"
            : meta
                ? `O‘tgan oyga nisbatan ${meta.trendPct > 0 ? "+" : ""}${meta.trendPct}%`
                : "Trend: -";

    return (
        <Card className={cn("h-full flex flex-col", className)}>
            <CardHeader className="shrink-0">
                <CardTitle>{title || "Arizalar dinamikasi"}</CardTitle>
                <CardDescription>{description || "Oxirgi 6 oy kesimida"}</CardDescription>
            </CardHeader>

            <CardContent className="flex-1 min-h-0">
                <ChartContainer config={chartConfig} className="h-full w-full">
                    <AreaChart accessibilityLayer data={data} margin={{ left: 12, right: 12 }}>
                        <CartesianGrid vertical={false} />
                        <XAxis
                            dataKey="month"
                            tickLine={false}
                            axisLine={false}
                            tickMargin={8}
                            tickFormatter={(value) => String(value).slice(0, 3)}
                        />
                        <ChartTooltip cursor={false} content={<ChartTooltipContent indicator="line" />} />
                        <Area
                            dataKey="applications"
                            type="natural"
                            fill="var(--color-applications)"
                            fillOpacity={0.4}
                            stroke="var(--color-applications)"
                        />
                    </AreaChart>
                </ChartContainer>
            </CardContent>

            <CardFooter className="shrink-0">
                <div className="flex w-full items-start gap-2 text-sm">
                    <div className="grid gap-2">
                        <div className="flex items-center gap-2 leading-none font-medium">
                            {trendText} <TrendingUp className="h-4 w-4" />
                        </div>
                        <div className="text-muted-foreground flex items-center gap-2 leading-none">
                            Jami: {meta?.areaTotal ?? data.reduce((s, x) => s + x.applications, 0)} ta (oxirgi 6 oy)
                        </div>
                    </div>
                </div>
            </CardFooter>
        </Card>
    );
}