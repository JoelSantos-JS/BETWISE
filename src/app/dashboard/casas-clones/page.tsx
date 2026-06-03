"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  ExternalLink,
  Search,
  ShieldCheck,
  Star,
  Trophy,
  TrendingUp,
  X,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/context/auth-context";
import { cn } from "@/lib/utils";

type BookmakerGroupRow = {
  id: string;
  group_id: string;
  bookmaker_name: string;
  provider: string | null;
  url: string | null;
  is_clone_group: boolean | null;
  risk_warning: boolean | null;
  better_odds: boolean | null;
  liquidity_type: boolean | null;
  logo_url: string | null;
  group_color: string | null;
  group_order: number | null;
  house_order: number | null;
  group_title_color: string | null;
  early_payment: boolean | null;
  updated_at: string | null;
};

type GroupedBookmakers = {
  groupId: string;
  groupColor: string | null;
  titleColor: string | null;
  order: number;
  houses: BookmakerGroupRow[];
};

type ActiveFilter = "risk" | "odds" | "payment" | "liquidity" | null;

const DUCKTIPS_SUPABASE_URL = "https://rkndrrpqsmqdrbcvsmzl.supabase.co";
const DUCKTIPS_PUBLIC_KEY = "sb_publishable_ap9fFURc52ZcKWvoMZcSOg_tfMnfCCI";
const SELECT_FIELDS = [
  "id",
  "group_id",
  "bookmaker_name",
  "provider",
  "url",
  "is_clone_group",
  "risk_warning",
  "better_odds",
  "liquidity_type",
  "logo_url",
  "group_color",
  "group_order",
  "house_order",
  "group_title_color",
  "early_payment",
  "updated_at",
].join(",");

const fallbackColors = [
  "#f97316",
  "#6366f1",
  "#10b981",
  "#ef4444",
  "#f59e0b",
  "#a855f7",
  "#0ea5e9",
  "#ec4899",
  "#14b8a6",
  "#84cc16",
];

function normalizeUrl(url: string | null) {
  if (!url) return "#";
  const trimmed = url.trim();
  if (trimmed.startsWith("http://") || trimmed.startsWith("https://")) return trimmed;
  return `https://${trimmed}`;
}

function getInitials(name: string) {
  return name.replace(/[^A-Za-z0-9]/g, "").slice(0, 3).toUpperCase() || "BET";
}

function getFallbackColor(name: string) {
  const code = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return fallbackColors[Math.abs(code) % fallbackColors.length];
}

function normalizeText(value: string) {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
}

function groupRows(rows: BookmakerGroupRow[]): GroupedBookmakers[] {
  const grouped = rows.reduce<Record<string, GroupedBookmakers>>((acc, row) => {
    const groupId = row.group_id || "SEM GRUPO";
    if (!acc[groupId]) {
      acc[groupId] = {
        groupId,
        groupColor: row.group_color,
        titleColor: row.group_title_color,
        order: row.group_order ?? Number.MAX_SAFE_INTEGER,
        houses: [],
      };
    }

    acc[groupId].groupColor ||= row.group_color;
    acc[groupId].titleColor ||= row.group_title_color;
    acc[groupId].order = Math.min(acc[groupId].order, row.group_order ?? Number.MAX_SAFE_INTEGER);
    acc[groupId].houses.push(row);
    return acc;
  }, {});

  return Object.values(grouped)
    .map((group) => ({
      ...group,
      houses: group.houses.sort((a, b) => {
        const houseOrderA = a.house_order ?? Number.MAX_SAFE_INTEGER;
        const houseOrderB = b.house_order ?? Number.MAX_SAFE_INTEGER;
        if (houseOrderA !== houseOrderB) return houseOrderA - houseOrderB;
        return a.bookmaker_name.localeCompare(b.bookmaker_name);
      }),
    }))
    .sort((a, b) => {
      if (a.order !== b.order) return a.order - b.order;
      return a.groupId.localeCompare(b.groupId);
    });
}

function matchesFilter(row: BookmakerGroupRow, filter: ActiveFilter) {
  if (filter === "risk") return row.risk_warning === true;
  if (filter === "odds") return row.better_odds === true;
  if (filter === "payment") return row.early_payment === true;
  if (filter === "liquidity") return row.liquidity_type === true;
  return true;
}

export default function CasasClonesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [rows, setRows] = useState<BookmakerGroupRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>(null);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;

    const controller = new AbortController();

    async function loadBookmakers() {
      try {
        setLoading(true);
        setError(null);

        const params = new URLSearchParams({
          select: SELECT_FIELDS,
          order: "group_order.asc,house_order.asc,bookmaker_name.asc",
        });

        const response = await fetch(`${DUCKTIPS_SUPABASE_URL}/rest/v1/bookmaker_groups?${params.toString()}`, {
          signal: controller.signal,
          headers: {
            apikey: DUCKTIPS_PUBLIC_KEY,
            Authorization: `Bearer ${DUCKTIPS_PUBLIC_KEY}`,
          },
        });

        if (!response.ok) throw new Error(`Erro ${response.status} ao buscar casas`);

        const data = (await response.json()) as BookmakerGroupRow[];
        setRows(data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError((err as Error).message || "Nao foi possivel buscar a lista de clones.");
        }
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }

    loadBookmakers();
    return () => controller.abort();
  }, [user]);

  const allGroups = useMemo(() => groupRows(rows), [rows]);
  const allRows = useMemo(() => allGroups.flatMap((group) => group.houses), [allGroups]);
  const normalizedSearch = search.trim().toLowerCase();

  const visibleGroups = useMemo(() => {
    return allGroups
      .map((group) => {
        const groupMatchesSearch = group.houses.some((house) =>
          house.bookmaker_name.toLowerCase().includes(normalizedSearch)
        );

        const houses = group.houses.filter((house) => {
          if (!matchesFilter(house, activeFilter)) return false;
          if (!normalizedSearch) return true;
          if (activeFilter) return house.bookmaker_name.toLowerCase().includes(normalizedSearch);
          return groupMatchesSearch;
        });

        return { ...group, houses };
      })
      .filter((group) => group.houses.length > 0);
  }, [activeFilter, allGroups, normalizedSearch]);

  const stats = useMemo(
    () => ({
      total: allRows.length,
      groups: allGroups.length,
      risk: allRows.filter((row) => row.risk_warning).length,
      odds: allRows.filter((row) => row.better_odds).length,
      payment: allRows.filter((row) => row.early_payment).length,
      liquidity: allRows.filter((row) => row.liquidity_type).length,
      visible: visibleGroups.reduce((sum, group) => sum + group.houses.length, 0),
    }),
    [allGroups.length, allRows, visibleGroups]
  );

  const lastUpdated = useMemo(() => {
    const dates = rows
      .map((row) => (row.updated_at ? new Date(row.updated_at).getTime() : 0))
      .filter((time) => Number.isFinite(time) && time > 0);
    if (!dates.length) return null;
    return new Intl.DateTimeFormat("pt-BR").format(new Date(Math.max(...dates)));
  }, [rows]);

  if (authLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <div className="w-1/2 space-y-4">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Casas e Clones</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Lista atualizada por grupo, com logos quando disponiveis e acesso direto as casas.
        </p>
        <p className="text-xs text-muted-foreground">
          Fonte: ducktipsbr.com/clones{lastUpdated ? ` - Atualizado em: ${lastUpdated}` : ""}
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-3 sm:space-y-4 sm:p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative w-full lg:max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={search}
                onChange={(event) => {
                  setSearch(event.target.value);
                  setActiveFilter(null);
                }}
                placeholder="Buscar casa de apostas..."
                className="pl-9 pr-9"
              />
              {search ? (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label="Limpar busca"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            <div className="grid flex-1 grid-cols-1 gap-2 min-[420px]:grid-cols-2 md:grid-cols-5">
              <FilterButton label="Todas" count={stats.total} active={!activeFilter} onClick={() => setActiveFilter(null)} />
              <FilterButton
                label="Risco"
                count={stats.risk}
                active={activeFilter === "risk"}
                tone="risk"
                onClick={() => {
                  setActiveFilter((value) => (value === "risk" ? null : "risk"));
                  setSearch("");
                }}
              />
              <FilterButton
                label="Melhores Odds"
                count={stats.odds}
                active={activeFilter === "odds"}
                tone="odds"
                onClick={() => {
                  setActiveFilter((value) => (value === "odds" ? null : "odds"));
                  setSearch("");
                }}
              />
              <FilterButton
                label="Pag. Antecipado"
                count={stats.payment}
                active={activeFilter === "payment"}
                tone="payment"
                onClick={() => {
                  setActiveFilter((value) => (value === "payment" ? null : "payment"));
                  setSearch("");
                }}
              />
              <FilterButton
                label="Liquidez Real"
                count={stats.liquidity}
                active={activeFilter === "liquidity"}
                tone="liquidity"
                onClick={() => {
                  setActiveFilter((value) => (value === "liquidity" ? null : "liquidity"));
                  setSearch("");
                }}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 sm:gap-3 lg:grid-cols-4">
            <StatCard label="Casas" value={stats.total} />
            <StatCard label="Grupos" value={stats.groups} />
            <StatCard label="Exibindo" value={stats.visible} />
            <StatCard label="Com logo" value={allRows.filter((row) => row.logo_url).length} />
          </div>
        </CardContent>
      </Card>

      {error ? (
        <Card className="border-destructive">
          <CardContent className="flex items-center gap-3 p-4 text-destructive">
            <AlertTriangle className="h-5 w-5" />
            <span>{error}</span>
          </CardContent>
        </Card>
      ) : null}

      {loading ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, index) => (
            <Skeleton key={index} className="h-56 rounded-lg" />
          ))}
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4 2xl:grid-cols-5">
          {visibleGroups.map((group) => (
            <GroupColumn key={group.groupId} group={group} />
          ))}
        </div>
      )}
    </div>
  );
}

function FilterButton({
  label,
  count,
  active,
  tone = "default",
  onClick,
}: {
  label: string;
  count: number;
  active: boolean;
  tone?: "default" | "risk" | "odds" | "payment" | "liquidity";
  onClick: () => void;
}) {
  const Icon = tone === "risk" ? AlertTriangle : tone === "odds" ? TrendingUp : tone === "payment" ? ShieldCheck : tone === "liquidity" ? Trophy : Star;

  return (
    <Button
      type="button"
      variant={active ? "default" : "outline"}
      onClick={onClick}
      className={cn(
        "h-auto min-h-10 justify-start gap-2 px-3 py-2",
        active && tone === "risk" && "bg-red-600 hover:bg-red-700",
        active && tone === "odds" && "bg-green-600 hover:bg-green-700",
        active && tone === "payment" && "bg-blue-600 hover:bg-blue-700",
        active && tone === "liquidity" && "bg-amber-600 hover:bg-amber-700"
      )}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="min-w-0 truncate text-left text-xs font-semibold">{label}</span>
      <span className="ml-auto text-xs opacity-80">{count}</span>
    </Button>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md border bg-muted/30 p-2.5 sm:p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
    </div>
  );
}

function GroupColumn({ group }: { group: GroupedBookmakers }) {
  const color = group.groupColor || getFallbackColor(group.groupId);
  const providers = Array.from(
    new Set(
      group.houses
        .map((house) => house.provider?.trim())
        .filter(
          (provider): provider is string =>
            !!provider && provider !== "-" && normalizeText(provider) !== "NAO INFORMADO"
        )
    )
  );

  const groupStats = {
    risk: group.houses.filter((house) => house.risk_warning).length,
    odds: group.houses.filter((house) => house.better_odds).length,
    payment: group.houses.filter((house) => house.early_payment).length,
    liquidity: group.houses.filter((house) => house.liquidity_type).length,
  };

  return (
    <Card className="overflow-hidden">
      <CardHeader
        className="space-y-3 border-b p-0"
        style={{
          borderTop: `5px solid ${color}`,
          background: `linear-gradient(135deg, ${color}30, rgba(255,255,255,0.035))`,
        }}
      >
        <div className="px-3 pb-3 pt-3">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <CardTitle
              className="truncate text-lg font-black uppercase leading-tight tracking-normal sm:text-xl"
              style={{ color: group.titleColor || color }}
            >
              {group.groupId}
            </CardTitle>
            <p className="mt-1 line-clamp-2 text-xs font-semibold text-foreground/90 sm:text-sm">
              {group.houses.length} casa{group.houses.length === 1 ? "" : "s"}
              {providers.length ? ` - ${providers.join(" / ")}` : ""}
            </p>
          </div>
          <span
            className="rounded-full border px-2.5 py-1 text-xs font-black"
            style={{ borderColor: `${color}80`, backgroundColor: `${color}22`, color: group.titleColor || color }}
          >
            {group.order}
          </span>
        </div>

        <div className="mt-3 flex flex-wrap gap-1.5">
          {groupStats.risk ? <MiniBadge tone="risk" icon={<AlertTriangle className="h-3 w-3" />} value={groupStats.risk} /> : null}
          {groupStats.odds ? <MiniBadge tone="odds" icon={<TrendingUp className="h-3 w-3" />} value={groupStats.odds} /> : null}
          {groupStats.payment ? <MiniBadge tone="payment" icon={<ShieldCheck className="h-3 w-3" />} value={groupStats.payment} /> : null}
          {groupStats.liquidity ? <MiniBadge tone="liquidity" icon={<Trophy className="h-3 w-3" />} value={groupStats.liquidity} /> : null}
        </div>
        </div>
      </CardHeader>

      <CardContent className="grid grid-cols-2 gap-2 p-2.5 sm:p-3">
        {group.houses.map((house) => (
          <BookmakerLogoCard key={house.id} house={house} />
        ))}
      </CardContent>
    </Card>
  );
}

function MiniBadge({
  icon,
  value,
  tone,
}: {
  icon: React.ReactNode;
  value: number;
  tone: "risk" | "odds" | "payment" | "liquidity";
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-semibold",
        tone === "risk" && "border-red-500/40 bg-red-500/10 text-red-500",
        tone === "odds" && "border-green-500/40 bg-green-500/10 text-green-500",
        tone === "payment" && "border-blue-500/40 bg-blue-500/10 text-blue-500",
        tone === "liquidity" && "border-amber-500/40 bg-amber-500/10 text-amber-500"
      )}
    >
      {icon}
      {value}
    </span>
  );
}

function BookmakerLogoCard({ house }: { house: BookmakerGroupRow }) {
  const [logoFailed, setLogoFailed] = useState(false);
  const color = getFallbackColor(house.bookmaker_name);
  const hasLogo = Boolean(house.logo_url && !logoFailed);

  return (
    <a
      href={normalizeUrl(house.url)}
      target="_blank"
      rel="noopener noreferrer"
      title={`${house.bookmaker_name} - abrir site`}
      className={cn(
        "group relative flex min-h-20 flex-col items-center justify-center overflow-hidden rounded-md border bg-muted/20 p-2 text-center transition hover:-translate-y-0.5 hover:bg-muted/40",
        house.risk_warning && "border-red-500/50",
        house.better_odds && "border-green-500/50",
        house.early_payment && "border-blue-500/50",
        house.liquidity_type && "border-amber-500/60"
      )}
    >
      <ExternalLink className="absolute right-1.5 top-1.5 h-3 w-3 text-muted-foreground opacity-0 transition group-hover:opacity-100" />

      <div
        className="flex h-9 w-full items-center justify-center rounded border bg-background/50 px-1 sm:h-10"
        style={!hasLogo ? { borderColor: `${color}55`, backgroundColor: `${color}18` } : undefined}
      >
        {hasLogo ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={house.logo_url || ""}
            alt={house.bookmaker_name}
            loading="lazy"
            onError={() => setLogoFailed(true)}
            className="max-h-full max-w-full object-contain drop-shadow-sm"
          />
        ) : (
          <span className="text-xs font-black" style={{ color }}>
            {getInitials(house.bookmaker_name)}
          </span>
        )}
      </div>

      <span className="mt-2 line-clamp-2 text-[11px] font-bold leading-tight">{house.bookmaker_name}</span>

      <div className="mt-1 flex gap-1">
        {house.risk_warning ? <AlertTriangle className="h-3 w-3 text-red-500" /> : null}
        {house.better_odds ? <TrendingUp className="h-3 w-3 text-green-500" /> : null}
        {house.early_payment ? <ShieldCheck className="h-3 w-3 text-blue-500" /> : null}
        {house.liquidity_type ? <Trophy className="h-3 w-3 text-amber-500" /> : null}
      </div>
    </a>
  );
}
