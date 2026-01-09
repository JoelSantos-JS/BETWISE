"use client";

import { useAuth } from "@/context/auth-context";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

type HouseTag = "regulated" | "not_recommended" | "not_regulated" | "new_clone";

type Column = {
  id: string;
  sourceLabel: string;
  sourceVariant: "opta" | "uefa" | "none" | "stats";
  statusLabel: string;
  statusValue: string;
  groupLabel: string;
  items: Array<{ domain: string; tag?: HouseTag }>;
};

const tagTextClass: Record<HouseTag, string> = {
  regulated: "text-sky-600 dark:text-sky-400",
  not_recommended: "text-amber-600 dark:text-amber-400",
  not_regulated: "text-red-600 dark:text-red-400",
  new_clone: "text-green-600 dark:text-green-400",
};

const sourceHeaderClass: Record<Column["sourceVariant"], string> = {
  opta: "bg-green-600 text-white",
  uefa: "bg-orange-500 text-white",
  none: "bg-neutral-700 text-white",
  stats: "bg-neutral-900 text-white",
};

const statusValueClass = (value: string) => {
  if (value === "SIM") return "text-green-600 dark:text-green-400";
  if (value === "NÃO") return "text-red-600 dark:text-red-400";
  return "text-amber-600 dark:text-amber-400";
};

const columns: Column[] = [
  {
    id: "sem-clones-sem-estatisticas",
    sourceLabel: "ESTATÍSTICAS",
    sourceVariant: "stats",
    statusLabel: "CASHOUT DISP.",
    statusValue: "SIM",
    groupLabel: "SEM CLONES & SEM ESTATÍSTICAS",
    items: [
      { domain: "casadeapostas.bet.br" },
      { domain: "betsul.bet.br" },
      { domain: "pinnacle.bet.br" },
      { domain: "alfa.bet.br" },
      { domain: "rivalo.bet.br", tag: "not_recommended" },
      { domain: "betboom.bet.br", tag: "not_recommended" },
      { domain: "sporty.bet.br" },
      { domain: "betsson.bet.br" },
      { domain: "brazino777.bet.br" },
      { domain: "papigames.bet.br" },
      { domain: "betespecial.bet.br" },
      { domain: "betnacional.bet.br" },
      { domain: "1xbet.bet.br" },
      { domain: "meridianbet.bet.br", tag: "not_recommended" },
      { domain: "luck.bet.br", tag: "not_recommended" },
      { domain: "reals.bet.br" },
    ],
  },
  {
    id: "sem-clones",
    sourceLabel: "OPTA",
    sourceVariant: "opta",
    statusLabel: "",
    statusValue: "SIM",
    groupLabel: "SEM CLONES",
    items: [
      { domain: "bet365.bet.br" },
      { domain: "betano.bet.br" },
      { domain: "superbet.bet.br" },
      { domain: "novibet.bet.br" },
      { domain: "betfair.bet.br" },
    ],
  },
  {
    id: "clone-1",
    sourceLabel: "OPTA",
    sourceVariant: "opta",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 1",
    items: [
      { domain: "kto.bet.br" },
      { domain: "stake.bet.br" },
      { domain: "betwarrior.bet.br" },
      { domain: "betmgm.bet.br" },
      { domain: "reidopitaco.bet.br", tag: "not_recommended" },
    ],
  },
  {
    id: "clone-2",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 2",
    items: [
      { domain: "betfast.bet.br" },
      { domain: "rivo.bet.br" },
      { domain: "betapp.bet.br" },
      { domain: "gf.bet.br" },
      { domain: "6r.bet.br" },
      { domain: "jogo.bet.br" },
      { domain: "fog777.bet.br" },
      { domain: "p9.bet.br" },
      { domain: "9i.bet.br" },
      { domain: "6z.bet.br" },
      { domain: "wicasino.bet.br" },
      { domain: "faz1.bet.br" },
      { domain: "10.game", tag: "not_regulated" },
      { domain: "claze.com", tag: "not_regulated" },
    ],
  },
  {
    id: "clone-3",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 3",
    items: [
      { domain: "galera.bet.br" },
      { domain: "versus.bet.br" },
      { domain: "brasil.bet.br" },
    ],
  },
  {
    id: "clone-4",
    sourceLabel: "OPTA",
    sourceVariant: "opta",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 4",
    items: [
      { domain: "estrelabet.bet.br" },
      { domain: "mcgames.bet.br" },
      { domain: "br4.bet.br" },
      { domain: "lotogreen.bet.br" },
      { domain: "goldbet.bet.br" },
      { domain: "jogodeouro.bet.br" },
      { domain: "esportiva.bet.br" },
      { domain: "multi.bet.br" },
      { domain: "lottoland.bet.br" },
      { domain: "sorteonline.bet.br" },
      { domain: "aposta1.bet.br" },
      { domain: "batue.bet.br" },
      { domain: "paolo.bet.br" },
      { domain: "cassino.bet.br" },
      { domain: "vovo.bet.br" },
      { domain: "aposta.bet.br", tag: "new_clone" },
      { domain: "nossa.bet.br" },
      { domain: "brasildasorte.bet.br", tag: "not_recommended" },
      { domain: "betfusion.bet.br" },
      { domain: "up.bet.br" },
      { domain: "brbet.bet.br", tag: "new_clone" },
    ],
  },
  {
    id: "clone-5",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 5",
    items: [
      { domain: "7games.bet.br" },
      { domain: "vbet.bet.br" },
      { domain: "r7.bet.br" },
      { domain: "ultra.bet.br" },
      { domain: "supreme.bet.br" },
      { domain: "betpark.bet.br", tag: "not_recommended" },
      { domain: "h2.bet.br" },
      { domain: "maxima.bet.br" },
      { domain: "seguro.bet.br" },
      { domain: "bravo.bet.br" },
      { domain: "seu.bet.br" },
    ],
  },
  {
    id: "clone-6",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 6",
    items: [
      { domain: "7k.bet.br" },
      { domain: "vera.bet.br" },
      { domain: "pix.bet.br" },
      { domain: "donald.bet.br" },
      { domain: "bullsbet.bet.br" },
      { domain: "brx.bet.br" },
      { domain: "rico.bet.br" },
      { domain: "sortenabet.bet.br" },
      { domain: "betgorillas.bet.br" },
      { domain: "apostatudobet.br" },
      { domain: "betdasorte.bet.br" },
      { domain: "joqao.bet.br", tag: "not_recommended" },
      { domain: "betpontobet.bet.br" },
      { domain: "betfalcons.bet.br" },
      { domain: "betou.bet.br" },
      { domain: "apostamax.bet.br" },
      { domain: "b2x.bet.br" },
      { domain: "betaki.bet.br" },
      { domain: "b1bet.bet.br" },
      { domain: "mmabet.bet.br" },
      { domain: "lider.bet.br" },
      { domain: "kingpanda.bet.br" },
      { domain: "ice.bet.br" },
      { domain: "geralbet.bet.br" },
      { domain: "play.bet.br", tag: "new_clone" },
    ],
  },
  {
    id: "clone-7",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 7",
    items: [
      { domain: "blaze.bet.br" },
      { domain: "betvip.bet.br" },
      { domain: "jonbet.bet.br" },
      { domain: "afun.bet.br", tag: "new_clone" },
      { domain: "bingo.bet.br", tag: "new_clone" },
      { domain: "pin.bet.br", tag: "new_clone" },
      { domain: "apostaganha.bet.br", tag: "new_clone" },
      { domain: "apostafacil.bet", tag: "new_clone" },
      { domain: "brabet.com", tag: "not_regulated" },
      { domain: "insbetgame.com", tag: "not_regulated" },
      { domain: "viabet.com.br", tag: "not_regulated" },
      { domain: "98k.game", tag: "not_regulated" },
      { domain: "rivalry.com", tag: "not_regulated" },
      { domain: "puskasbet.com.br", tag: "not_regulated" },
      { domain: "bcgamebr1.com", tag: "not_regulated" },
      { domain: "rainbet.com", tag: "not_regulated" },
      { domain: "rico-2.com", tag: "not_regulated" },
      { domain: "betplay.io", tag: "not_regulated" },
    ],
  },
  {
    id: "clone-8",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 8",
    items: [
      { domain: "luva.bet.br" },
      { domain: "start.bet.br" },
      { domain: "apostaonline.bet.br" },
      { domain: "esporte365.bet.br" },
      { domain: "ona.bet.br", tag: "new_clone" },
      { domain: "big.bet.br" },
      { domain: "apostar.bet.br" },
      { domain: "1pra1.bet.br" },
      { domain: "zonadejogo.bet.br", tag: "not_recommended" },
    ],
  },
  {
    id: "clone-9",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "SIM",
    groupLabel: "CLONE 9",
    items: [{ domain: "sportingbet.bet.br" }, { domain: "betboo.bet.br" }],
  },
  {
    id: "clone-10",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "NÃO",
    groupLabel: "CLONE 10",
    items: [
      { domain: "betesporte.bet.br" },
      { domain: "lancedesorte.bet.br" },
      { domain: "cbesportes.bet.br" },
      { domain: "donosdabola.bet.br" },
      { domain: "esportivavip.bet.br" },
    ],
  },
  {
    id: "clone-11",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 11",
    items: [
      { domain: "apostou.bet.br" },
      { domain: "lutto.bet.br" },
      { domain: "bestbet.com.br", tag: "not_regulated" },
      { domain: "mariosports.com.br", tag: "not_regulated" },
    ],
  },
  {
    id: "clone-12",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 12",
    items: [
      { domain: "vaidebet.bet.br" },
      { domain: "betpix365.bet.br" },
      { domain: "esportesdasorte.bet.br" },
      { domain: "hiper.bet.br" },
      { domain: "olybet.bet.br" },
    ],
  },
  {
    id: "clone-13",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "NÃO",
    groupLabel: "CLONE 13",
    items: [
      { domain: "vivasorte.bet.br" },
      { domain: "qinga.bet.br" },
      { domain: "qg.bet.br" },
      { domain: "4win.bet.br", tag: "new_clone" },
      { domain: "4play.bet.br", tag: "new_clone" },
      { domain: "energia.bet.br", tag: "new_clone" },
      { domain: "zeroum.bet", tag: "not_regulated" },
    ],
  },
  {
    id: "clone-14",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "NÃO",
    groupLabel: "CLONE 14",
    items: [
      { domain: "f12.bet.br" },
      { domain: "spin.bet.br" },
    ],
  },
  {
    id: "clone-15",
    sourceLabel: "UEFA",
    sourceVariant: "uefa",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 15",
    items: [
      { domain: "fazo.bet.br", tag: "new_clone" },
      { domain: "aposta.bet.br", tag: "new_clone" },
      { domain: "bet4.bet.br" },
    ],
  },
  {
    id: "clone-16",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "NÃO",
    groupLabel: "CLONE 16",
    items: [
      { domain: "band.bet.br", tag: "not_recommended" },
      { domain: "minha.bet.br", tag: "not_recommended" },
    ],
  },
  {
    id: "clone-17",
    sourceLabel: "NÃO TEM",
    sourceVariant: "none",
    statusLabel: "",
    statusValue: "DEPENDE",
    groupLabel: "CLONE 17",
    items: [
      { domain: "betbra.bet.br" },
      { domain: "bolsadeaposta.bet.br" },
      { domain: "fullbet.bet.br" },
      { domain: "matchbook.bet.br", tag: "new_clone" },
    ],
  },
];

const normalizeUrl = (domain: string) => {
  if (domain.startsWith("http://") || domain.startsWith("https://")) return domain;
  return `https://${domain}`;
};

export default function CasasClonesPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !user) router.replace("/login");
  }, [loading, user, router]);

  if (loading || !user) {
    return (
      <div className="w-full h-full flex items-center justify-center">
        <div className="space-y-4 w-1/2">
          <Skeleton className="h-12 w-full" />
          <Skeleton className="h-32 w-full" />
          <Skeleton className="h-8 w-1/2" />
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="space-y-2">
        <h2 className="text-3xl font-bold tracking-tight">Casas e Clones</h2>
        <p className="text-muted-foreground">
          Separação das casas por grupo e por clone, conforme a tabela.
        </p>
      </div>

      <div className="flex flex-wrap gap-5 text-sm mt-4">
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-sky-500" />
          <span>Azul = Casas regulamentadas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-amber-500" />
          <span>Amarelo = Casas não recomendadas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-500" />
          <span>Vermelho = Casas não regulamentadas</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-500" />
          <span>Verde = Clone nova</span>
        </div>
      </div>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-background">
        <div className="grid grid-flow-col auto-cols-[240px] min-w-max">
          {columns.map((col) => (
            <div key={col.id} className="border-r last:border-r-0">
              <div className={`px-3 py-2 text-center text-xs font-semibold ${sourceHeaderClass[col.sourceVariant]}`}>
                {col.sourceLabel}
              </div>
              <div className="px-3 py-2 text-center text-xs font-semibold bg-muted/70">
                <div className="flex items-center justify-center gap-2">
                  {col.statusLabel ? <span className="text-muted-foreground">{col.statusLabel}</span> : null}
                  <span className={statusValueClass(col.statusValue)}>{col.statusValue}</span>
                </div>
              </div>
              <div className="px-3 py-2 text-center text-xs font-bold bg-background">
                {col.groupLabel}
              </div>

              <div className="px-3 pb-3">
                <div className="space-y-1">
                  {col.items.map((item) => {
                    const tag: HouseTag = item.tag ?? "regulated";
                    return (
                      <a
                        key={item.domain}
                        href={normalizeUrl(item.domain)}
                        target="_blank"
                        rel="noreferrer"
                        className={`block text-sm underline-offset-4 hover:underline ${tagTextClass[tag]}`}
                      >
                        {item.domain}
                      </a>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

