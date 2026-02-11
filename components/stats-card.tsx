import { cn } from "@/lib/utils";
import { Card, CardContent } from "@/components/ui/card";
interface StatsCardProps {
    title?: string;
    value?: string;
    className?: string;
}
const StatsCard = ({
    title = "Total Sales",
    value = "$23,456",

    className,
}: StatsCardProps) => {
    return (
        <Card
            className={cn(
                "w-full max-w-xs border-l-4",
                className
            )}
        >
            <CardContent className="pt-6">
                <div className="flex items-start justify-between">
                    <div>
                        <p className="text-sm font-medium text-muted-foreground">{title}</p>
                        <p className="mt-1 text-3xl font-bold">{value}</p>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
};

export { StatsCard };
