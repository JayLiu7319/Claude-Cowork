import * as React from "react";

type BadgeVariant = "command" | "skill" | "file" | "default";

const variantStyles: Record<BadgeVariant, string> = {
    command: "bg-purple-100 text-purple-700 border-purple-300",
    skill: "bg-blue-100 text-blue-700 border-blue-300",
    file: "bg-green-100 text-green-700 border-green-300",
    default: "bg-gray-100 text-gray-700 border-gray-300",
};

export interface BadgeProps {
    variant?: BadgeVariant;
    children: React.ReactNode;
    className?: string;
}

export function Badge({ variant = "default", children, className = "" }: BadgeProps) {
    const baseStyles = "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-sm font-medium border leading-none";
    const variantStyle = variantStyles[variant] || variantStyles.default;

    return (
        <span className={`${baseStyles} ${variantStyle} ${className}`}>
            {children}
        </span>
    );
}
