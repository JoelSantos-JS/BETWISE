"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calculator,
  Layers,
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
      href: `/dashboard/ai-insights`,
      label: "AI Insights",
      icon: Sparkles,
      active: pathname === `/dashboard/ai-insights`,
    },
    {
      href: `/dashboard/calculadora-surebet`,
      label: "Calculadora",
      icon: Calculator,
      active: pathname === `/dashboard/calculadora-surebet`,
    },
    {
      href: `/dashboard/casas-clones`,
      label: "Casas e Clones",
      icon: Layers,
      active: pathname === `/dashboard/casas-clones`,
    },
  ];

  return (
    <nav
      className={cn(
        "flex min-w-0 items-center gap-2 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden md:gap-4 lg:gap-6",
        className
      )}
      {...props}
    >
      {routes.map((route) => (
        <Link
          key={route.href}
          href={route.href}
          className={cn(
            "flex shrink-0 items-center gap-2 rounded-md px-3 py-2 text-xs font-medium transition-colors hover:text-primary md:rounded-none md:px-0 md:py-0 md:text-sm",
            route.active
              ? "bg-primary text-primary-foreground md:bg-transparent md:text-primary md:dark:text-white"
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

    
