import * as React from "react";
import { Check, ChevronsUpDown, Folder, Layers, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
    CommandSeparator,
} from "@/components/ui/command";
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from "@/components/ui/popover";
import { useProjects, useCreateProject } from "@/hooks/use-projects";
import { useSeries, useCreateSeries } from "@/hooks/use-series";
import { Loader2 } from "lucide-react";
import type { ProjectOut, SeriesOut } from "@momentarise/shared";

interface ProjectSeriesSelectorProps {
    projectId: string | null;
    seriesId: string | null;
    onProjectChange: (id: string | null) => void;
    onSeriesChange: (id: string | null) => void;
}

export function ProjectSeriesSelector({
    projectId,
    seriesId,
    onProjectChange,
    onSeriesChange,
}: ProjectSeriesSelectorProps) {
    const [projectOpen, setProjectOpen] = React.useState(false);
    const [seriesOpen, setSeriesOpen] = React.useState(false);

    const [projectSearch, setProjectSearch] = React.useState("");
    const [seriesSearch, setSeriesSearch] = React.useState("");

    const { data: projects = [], isLoading: isLoadingProjects } = useProjects();
    const { data: allSeries = [], isLoading: isLoadingSeries } = useSeries(null); // Load all initially to find parents

    const { mutateAsync: createProject, isPending: isCreatingProject } = useCreateProject();
    const { mutateAsync: createSeries, isPending: isCreatingSeries } = useCreateSeries();

    // Filter series to show
    // If no project is selected, show all series (so they can pick an orphan series or a series that belongs to a project).
    // If a project is selected, only show series that belong to that project OR orphan series.
    const visibleSeries = React.useMemo(() => {
        if (!projectId) return allSeries;
        return allSeries.filter((s) => s.project_id === projectId || s.project_id === null);
    }, [allSeries, projectId]);

    const selectedProject = projects.find((p) => p.id === projectId);
    const selectedSeries = allSeries.find((s) => s.id === seriesId);

    // Auto-selection smarts
    // 1. If user selects a series that belongs to a project, auto-select that project.
    React.useEffect(() => {
        if (seriesId && !projectId) {
            const s = allSeries.find((s) => s.id === seriesId);
            if (s?.project_id) {
                onProjectChange(s.project_id);
            }
        }
    }, [seriesId, projectId, allSeries, onProjectChange]);

    // Handle direct creation
    const handleCreateProject = async () => {
        if (!projectSearch.trim() || isCreatingProject) return;
        const newProject = await createProject({ title: projectSearch.trim(), color: "sky" });
        onProjectChange(newProject.id);
        setProjectSearch("");
        setProjectOpen(false);
    };

    const handleCreateSeries = async () => {
        if (!seriesSearch.trim() || isCreatingSeries) return;
        const newSeries = await createSeries({
            title: seriesSearch.trim(),
            project_id: projectId // Inherit current project if selected
        });
        onSeriesChange(newSeries.id);
        setSeriesSearch("");
        setSeriesOpen(false);
    };

    return (
        <div className="flex flex-col gap-3">
            {/* Project Selector */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Project <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Popover open={projectOpen} onOpenChange={setProjectOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={projectOpen}
                            className="w-full justify-between font-normal"
                        >
                            {selectedProject ? (
                                <span className="flex items-center truncate">
                                    <div
                                        className={cn(
                                            "w-3 h-3 rounded-full mr-2 shrink-0",
                                            `bg-${selectedProject.color}-500`
                                        )}
                                    />
                                    {selectedProject.title}
                                </span>
                            ) : (
                                <span className="text-muted-foreground flex items-center">
                                    <Folder className="mr-2 h-4 w-4" />
                                    Select project...
                                </span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search projects..."
                                value={projectSearch}
                                onValueChange={setProjectSearch}
                            />
                            <CommandList>
                                <CommandEmpty className="py-2 text-center text-sm">
                                    {isCreatingProject ? (
                                        <span className="flex items-center justify-center text-muted-foreground">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-muted-foreground">No project found.</p>
                                            {projectSearch.trim() && (
                                                <Button variant="ghost" size="sm" onClick={handleCreateProject} className="h-8">
                                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                                    Create &quot;{projectSearch}&quot;
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {projectId && (
                                        <CommandItem
                                            onSelect={() => {
                                                onProjectChange(null);
                                                setProjectOpen(false);
                                            }}
                                            className="text-muted-foreground font-medium"
                                        >
                                            Clear project mapping
                                        </CommandItem>
                                    )}
                                    {projects.map((project) => (
                                        <CommandItem
                                            key={project.id}
                                            value={project.title}
                                            onSelect={() => {
                                                onProjectChange(project.id);

                                                // Smart selection: if they just picked a project that has exactly ONE series, and they don't have a series selected, auto-pick it.
                                                if (!seriesId) {
                                                    const projectSeries = allSeries.filter((s: SeriesOut) => s.project_id === project.id);
                                                    if (projectSeries.length === 1) {
                                                        onSeriesChange(projectSeries[0]!.id);
                                                    }
                                                }

                                                setProjectOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    projectId === project.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            <div
                                                className={cn(
                                                    "w-2 h-2 rounded-full mr-2",
                                                    `bg-${project.color}-500`
                                                )}
                                            />
                                            {project.title}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                {projectSearch.trim() && !projects.some((p: ProjectOut) => p.title.toLowerCase() === projectSearch.toLowerCase()) && (
                                    <>
                                        <CommandSeparator />
                                        <CommandGroup>
                                            <CommandItem onSelect={handleCreateProject}>
                                                <Plus className="mr-2 h-4 w-4 text-blue-500" />
                                                <span className="text-blue-500 font-medium">Create project &quot;{projectSearch}&quot;</span>
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>

            {/* Series Selector */}
            <div className="space-y-1.5">
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                    Series (Rhythm) <span className="text-muted-foreground font-normal">(Optional)</span>
                </label>
                <Popover open={seriesOpen} onOpenChange={setSeriesOpen}>
                    <PopoverTrigger asChild>
                        <Button
                            variant="outline"
                            role="combobox"
                            aria-expanded={seriesOpen}
                            className="w-full justify-between font-normal"
                        >
                            {selectedSeries ? (
                                <span className="truncate">{selectedSeries.title}</span>
                            ) : (
                                <span className="text-muted-foreground flex items-center">
                                    <Layers className="mr-2 h-4 w-4" />
                                    Select series block...
                                </span>
                            )}
                            <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-[300px] p-0" align="start">
                        <Command>
                            <CommandInput
                                placeholder="Search series rhythms..."
                                value={seriesSearch}
                                onValueChange={setSeriesSearch}
                            />
                            <CommandList>
                                <CommandEmpty className="py-2 text-center text-sm">
                                    {isCreatingSeries ? (
                                        <span className="flex items-center justify-center text-muted-foreground">
                                            <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Creating...
                                        </span>
                                    ) : (
                                        <div className="flex flex-col items-center gap-2">
                                            <p className="text-muted-foreground">No series found.</p>
                                            {seriesSearch.trim() && (
                                                <Button variant="ghost" size="sm" onClick={handleCreateSeries} className="h-8">
                                                    <Plus className="mr-2 h-3.5 w-3.5" />
                                                    Create &quot;{seriesSearch}&quot; {projectId ? "in this project" : ""}
                                                </Button>
                                            )}
                                        </div>
                                    )}
                                </CommandEmpty>
                                <CommandGroup>
                                    {seriesId && (
                                        <CommandItem
                                            onSelect={() => {
                                                onSeriesChange(null);
                                                setSeriesOpen(false);
                                            }}
                                            className="text-muted-foreground font-medium"
                                        >
                                            Clear series mapping
                                        </CommandItem>
                                    )}
                                    {visibleSeries.map((series) => (
                                        <CommandItem
                                            key={series.id}
                                            value={series.title}
                                            onSelect={() => {
                                                onSeriesChange(series.id);
                                                setSeriesOpen(false);
                                            }}
                                        >
                                            <Check
                                                className={cn(
                                                    "mr-2 h-4 w-4",
                                                    seriesId === series.id ? "opacity-100" : "opacity-0"
                                                )}
                                            />
                                            {series.title}
                                            {!projectId && series.project_id && (
                                                <span className="ml-2 text-xs text-muted-foreground truncate">
                                                    ({projects.find((p: ProjectOut) => p.id === series.project_id)?.title || 'Linked to project'})
                                                </span>
                                            )}
                                        </CommandItem>
                                    ))}
                                </CommandGroup>
                                {seriesSearch.trim() && !visibleSeries.some((s: SeriesOut) => s.title.toLowerCase() === seriesSearch.toLowerCase()) && (
                                    <>
                                        <CommandSeparator />
                                        <CommandGroup>
                                            <CommandItem onSelect={handleCreateSeries}>
                                                <Plus className="mr-2 h-4 w-4 text-orange-500" />
                                                <span className="text-orange-500 font-medium">Create series &quot;{seriesSearch}&quot;</span>
                                            </CommandItem>
                                        </CommandGroup>
                                    </>
                                )}
                            </CommandList>
                        </Command>
                    </PopoverContent>
                </Popover>
            </div>
        </div>
    );
}
