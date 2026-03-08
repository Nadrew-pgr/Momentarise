"use client";

import React from "react";
import { motion, AnimatePresence } from "motion/react";
import { HelpCircle, Sparkles, ChevronRight, CornerDownLeft } from "lucide-react";
import type { SyncQuestion } from "@momentarise/shared";
import { cn } from "@/lib/utils";

interface InteractiveQuestionUIProps {
    question: SyncQuestion;
    onSelectOption: (option: string) => void;
    onOtherClick: () => void;
}

export function InteractiveQuestionUI({
    question,
    onSelectOption,
    onOtherClick,
}: InteractiveQuestionUIProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.98 }}
            className="w-full flex flex-col gap-3 p-4 mb-4 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xl shadow-zinc-200/50 dark:shadow-none relative overflow-hidden group"
        >
            {/* Decorative background accent */}
            <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity">
                <Sparkles className="w-12 h-12 text-blue-500" />
            </div>

            <div className="flex items-start gap-3">
                <div className="p-2 rounded-xl bg-blue-50 dark:bg-blue-500/10 border border-blue-100 dark:border-blue-500/20">
                    <HelpCircle className="w-5 h-5 text-blue-600 dark:text-blue-400" />
                </div>
                <div className="flex-1 space-y-1">
                    <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                        AI Assistant Question
                        <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-500 uppercase tracking-tight">
                            Action Required
                        </span>
                    </h3>
                    <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                        {question.prompt}
                    </p>
                    {question.help_text && (
                        <p className="text-xs text-zinc-400 dark:text-zinc-500 italic">
                            {question.help_text}
                        </p>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-1">
                <AnimatePresence mode="popLayout">
                    {question.options?.map((option, idx) => (
                        <motion.button
                            key={option}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.05 }}
                            onClick={() => onSelectOption(option)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-zinc-50 dark:bg-zinc-800/50 hover:bg-zinc-100 dark:hover:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 transition-all active:scale-95 group/btn"
                        >
                            <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300 group-hover/btn:text-blue-600 dark:group-hover/btn:text-blue-400 transition-colors">
                                {option}
                            </span>
                            <ChevronRight className="w-3.5 h-3.5 text-zinc-400 group-hover/btn:text-blue-500 transition-colors" />
                        </motion.button>
                    ))}

                    <motion.button
                        key="other"
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: (question.options?.length ?? 0) * 0.05 }}
                        onClick={onOtherClick}
                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white dark:bg-transparent border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-blue-400 dark:hover:border-blue-500 hover:bg-blue-50/30 dark:hover:bg-blue-500/5 transition-all group/other"
                    >
                        <span className="text-sm font-medium text-zinc-500 dark:text-zinc-400 group-hover/other:text-blue-600 dark:group-hover/other:text-blue-400">
                            Other...
                        </span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-zinc-300 group-hover/other:text-blue-500" />
                    </motion.button>
                </AnimatePresence>
            </div>
        </motion.div>
    );
}
