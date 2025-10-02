import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface MetricCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  color: "blue" | "purple" | "green" | "orange" | "red";
  trend?: {
    value: number;
    isPositive: boolean;
  };
}

const colorClasses = {
  blue: "from-blue-500/20 to-blue-600/20 border-blue-500/30 text-blue-400",
  purple: "from-purple-500/20 to-purple-600/20 border-purple-500/30 text-purple-400",
  green: "from-green-500/20 to-green-600/20 border-green-500/30 text-green-400",
  orange: "from-orange-500/20 to-orange-600/20 border-orange-500/30 text-orange-400",
  red: "from-red-500/20 to-red-600/20 border-red-500/30 text-red-400",
};

const iconBgClasses = {
  blue: "bg-blue-500/20 text-blue-400",
  purple: "bg-purple-500/20 text-purple-400",
  green: "bg-green-500/20 text-green-400",
  orange: "bg-orange-500/20 text-orange-400",
  red: "bg-red-500/20 text-red-400",
};

export function MetricCard({ title, value, icon: Icon, color, trend }: MetricCardProps) {
  return (
    <Card className={`hover-lift card-glow border bg-gradient-to-br ${colorClasses[color]} overflow-hidden relative`}>
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-3xl font-bold text-foreground">{value}</p>
            {trend && (
              <p className={`text-xs font-medium ${trend.isPositive ? "text-green-400" : "text-red-400"}`}>
                {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}% vs mês anterior
              </p>
            )}
          </div>
          <div className={`rounded-lg p-3 ${iconBgClasses[color]}`}>
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
