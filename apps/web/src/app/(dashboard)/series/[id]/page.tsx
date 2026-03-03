"use client";

import { useParams } from "next/navigation";
import { useSeries } from "@/hooks/use-series";

export default function SeriesPage() {
    const params = useParams();
    const seriesId = params.id as string;
    const { data: allSeries = [] } = useSeries();
    const series = allSeries.find(s => s.id === seriesId);

    return (
        <div className="flex flex-1 flex-col gap-4 py-8 lg:px-8 max-w-5xl mx-auto w-full">
            <div className="mx-auto h-24 w-full rounded-xl bg-muted/50 flex flex-col items-center justify-center text-muted-foreground italic">
                {series ? `Rhythm "${series.title}" Template` : "Loading Rhythm..."}
            </div>
            <div className="mx-auto h-[100vh] min-h-[500px] w-full rounded-xl bg-muted/50" />
        </div>
    );
}
