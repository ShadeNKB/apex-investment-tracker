import React from "react";

interface KPICardProps {
  label: string;
  value: string;
  sub?: string;
  subColor?: "profit" | "loss" | "warn" | "info" | "muted";
  trend?: "up" | "down" | "flat";
  icon?: React.ReactNode;
  className?: string;
}

const subColorMap: Record<string, string> = {
  profit: "text-profit",
  loss: "text-loss",
  warn: "text-warn",
  info: "text-info",
  muted: "text-ink-muted",
};

export function KPICard({
  label,
  value,
  sub,
  subColor = "muted",
  icon,
  className = "",
}: KPICardProps) {
  return (
    <div className={`card p-4 sm:p-5 flex flex-col gap-3 animate-slide-up min-h-[112px] ${className}`}>
      <div className="flex items-center justify-between">
        <span className="section-label">{label}</span>
        {icon && <span className="text-ink-muted">{icon}</span>}
      </div>
      <div>
        <p className="stat-value text-xl sm:text-2xl leading-none break-words">{value}</p>
        {sub && (
          <p className={`text-xs mt-1.5 font-medium ${subColorMap[subColor]}`}>
            {sub}
          </p>
        )}
      </div>
    </div>
  );
}
