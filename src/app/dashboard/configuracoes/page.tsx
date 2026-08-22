"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { KeyRound, Loader2, Save, Sparkles, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAuth } from "@/context/auth-context";
import { useToast } from "@/hooks/use-toast";
import { db } from "@/lib/firebase";
import { doc, getDoc, setDoc, deleteField } from "firebase/firestore";

const SETTINGS_PATH = (uid: string) => doc(db, "users", uid, "settings", "ai");

const MODEL_OPTIONS = [
  { value: "googleai/gemini-2.5-flash", label: "Gemini 2.5 Flash (recomendado)", description: "Melhor equilíbrio. Cota free: ~250/dia" },
  { value: "googleai/gemini-2.5-flash-lite", label: "Gemini 2.5 Flash-Lite", description: "Cota bem maior (~1000/dia), mais rápido" },
  { value: "googleai/gemini-2.5-pro", label: "Gemini 2.5 Pro", description: "Mais preciso, cota menor (~100/dia)" },
  { value: "googleai/gemini-2.0-flash-lite", label: "Gemini 2.0 Flash-Lite", description: "Legado, barato (atenção: deprecado)" },
] as const;

export default function ConfiguracoesPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState<string>("googleai/gemini-2.5-flash");
  const [hasSavedKey, setHasSavedKey] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user, router]);

  useEffect(() => {
    if (!user) return;
    (async () => {
      try {
        const snap = await getDoc(SETTINGS_PATH(user.uid));
        const data = snap.data();
        const saved = (data?.geminiApiKey as string) ?? "";
        setHasSavedKey(Boolean(saved));
        if (data?.geminiModel) setModel(data.geminiModel as string);
      } catch {
        setHasSavedKey(false);
      } finally {
        setLoading(false);
      }
    })();
  }, [user]);

  const handleSave = async () => {
    if (!user) return;
    const key = apiKey.trim();
    if (!key.startsWith("AIza")) {
      toast({ variant: "destructive", title: "Chave inválida", description: "A chave do Gemini começa com 'AIza'." });
      return;
    }
    setSaving(true);
    try {
      await setDoc(
        SETTINGS_PATH(user.uid),
        { geminiApiKey: key, geminiModel: model },
        { merge: true }
      );
      setHasSavedKey(true);
      setApiKey("");
      toast({ title: "Chave salva!", description: "A extração por IA já pode ser usada no formulário." });
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar a chave." });
    } finally {
      setSaving(false);
    }
  };

  const handleSaveModel = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(SETTINGS_PATH(user.uid), { geminiModel: model }, { merge: true });
      toast({ title: "Modelo salvo!", description: "O novo modelo será usado nas próximas extrações." });
    } catch {
      toast({ variant: "destructive", title: "Erro ao salvar", description: "Não foi possível salvar o modelo." });
    } finally {
      setSaving(false);
    }
  };

  const handleClear = async () => {
    if (!user) return;
    setSaving(true);
    try {
      await setDoc(SETTINGS_PATH(user.uid), { geminiApiKey: deleteField() }, { merge: true });
      setHasSavedKey(false);
      toast({ title: "Chave removida", description: "Será usada a chave do arquivo .env.local, se existir." });
    } catch {
      toast({ variant: "destructive", title: "Erro ao remover", description: "Não foi possível remover a chave." });
    } finally {
      setSaving(false);
    }
  };

  if (authLoading || !user) {
    return (
      <div className="flex h-full w-full items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-5">
      <div className="space-y-2">
        <h2 className="text-2xl font-bold tracking-tight md:text-3xl">Configurações</h2>
        <p className="text-sm text-muted-foreground md:text-base">
          Configure a chave do Google Gemini usada na extração automática por IA.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-primary" />
            Chave da API do Gemini
          </CardTitle>
          <CardDescription>
            A chave fica salva na sua conta e é usada para analisar os comprovantes de aposta.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-api-key">Chave de API (Google AI Studio)</Label>
            <Input
              id="gemini-api-key"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={hasSavedKey ? "•••••••••••••• (chave já configurada)" : "Cole sua chave AIza..."}
              autoComplete="off"
            />
            <p className="text-xs text-muted-foreground">
              Crie em{" "}
              <a
                href="https://aistudio.google.com/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary underline"
              >
                aistudio.google.com/apikey
              </a>
              . Gere uma chave restrita ao &quot;Gemini API&quot; (não use chave irrestrita).
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" onClick={handleSave} disabled={saving || !apiKey.trim()}>
              {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Salvar chave
            </Button>
            {hasSavedKey && (
              <Button type="button" variant="outline" onClick={handleClear} disabled={saving}>
                <Trash2 className="mr-2 h-4 w-4" />
                Remover
              </Button>
            )}
          </div>

          <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground">
            <p className="flex items-center gap-2 font-semibold text-foreground">
              <Sparkles className="h-3.5 w-3.5 text-primary" /> Como funciona
            </p>
            <ul className="mt-2 list-inside list-disc space-y-1">
              <li>Na aba &quot;Adicionar Nova Aposta&quot;, envie um print do comprovante.</li>
              <li>A IA lê a imagem e preenche os campos automaticamente.</li>
              <li>A chave fica armazenada apenas na sua conta (Firestore).</li>
              <li>Se nenhuma chave for salva aqui, o app tenta usar a do arquivo <code>.env.local</code>.</li>
            </ul>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            Modelo de IA
          </CardTitle>
          <CardDescription>
            Se estourar a cota gratuita do Gemini 2.5 Flash, troque para o Flash-Lite (cota muito maior).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="gemini-model">Modelo usado na extração</Label>
            <Select value={model} onValueChange={(v) => setModel(v)}>
              <SelectTrigger id="gemini-model" className="min-h-11">
                <SelectValue placeholder="Selecione o modelo" />
              </SelectTrigger>
              <SelectContent>
                {MODEL_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              {MODEL_OPTIONS.find((m) => m.value === model)?.description}
            </p>
          </div>
          <Button type="button" variant="outline" onClick={handleSaveModel} disabled={saving}>
            <Save className="mr-2 h-4 w-4" />
            Salvar modelo
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
