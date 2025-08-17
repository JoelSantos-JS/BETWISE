"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  PlusCircle,
  Sparkles,
} from "lucide-react";

export function MainNav({
  className,
  ...props
}: React.HTMLAttributes<HTMLElement>) {
  const pathname = usePathname();

  const routes = [
    {
      href: `/dashboard`,
      label: "Dashboard",
      icon: LayoutDashboard,
      active: pathname === `/dashboard`,
    },
    {
      href: `/dashboard/add-bet`,
      label: "Add Bet",
      icon: PlusCircle,
      active: pathname === `/dashboard/add-bet`,
    },
    {
      href: `/dashboard/ai-insights`,
      label: "AI Insights",
      icon: Sparkles,
      active: pathname === `/dashboard/ai-insights`,
    },
  ];

  return (
    <nav
      className={cn("flex items-center space-x-4 lg:space-x-6", className)}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "text-sm font-medium transition-colors hover:text-primary flex items-center gap-2",
            route.active
              ? "text-primary dark:text-white"
              : "text-muted-foreground"
          )}
        >
          <route.icon className="h-4 w-4" />
          {route.label}
        </Link>
      ))}
    </nav>
  );
}
