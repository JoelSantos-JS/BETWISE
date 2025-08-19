"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Loader2 } from "lucide-react";

import type { Bookmaker } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

const bookmakerSchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres."),
  initialBankroll: z.coerce.number().min(0, "A banca inicial não pode ser negativa."),
});

interface BookmakerFormProps {
  onSave: (bookmaker: Omit<Bookmaker, 'id'>) => void;
  bookmakerToEdit?: Bookmaker | null;
  onCancel: () => void;
}

export function BookmakerForm({ onSave, bookmakerToEdit, onCancel }: BookmakerFormProps) {
  const form = useForm<z.infer<typeof bookmakerSchema>>({
    resolver: zodResolver(bookmakerSchema),
    defaultValues: bookmakerToEdit ? {
        name: bookmakerToEdit.name,
        initialBankroll: bookmakerToEdit.initialBankroll,
    } : {
        name: "",
        initialBankroll: 1000,
    },
  });

  const { control, handleSubmit, formState: { isSubmitting } } = form;

  const onSubmit = (data: z.infer<typeof bookmakerSchema>) => {
    onSave(data);
  };

  return (
      <>
        <DialogHeader className="p-6 pb-4">
            <DialogTitle>{bookmakerToEdit ? "Editar Casa de Apostas" : "Adicionar Nova Casa"}</DialogTitle>
            <DialogDescription>
                Gerencie suas bancas individualmente para cada casa de apostas.
            </DialogDescription>
        </DialogHeader>
        <Form {...form}>
            <form onSubmit={handleSubmit(onSubmit)}>
                <div className="space-y-4 px-6 py-2">
                    <FormField control={control} name="name" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Nome da Casa</FormLabel>
                            <FormControl><Input {...field} placeholder="Ex: Bet365" /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                    <FormField control={control} name="initialBankroll" render={({ field }) => (
                        <FormItem>
                            <FormLabel>Banca Inicial (R$)</FormLabel>
                            <FormControl><Input type="number" step="10" {...field} /></FormControl>
                            <FormMessage />
                        </FormItem>
                    )} />
                </div>
                <DialogFooter className="p-6 pt-4 border-t">
                    <Button type="button" variant="ghost" onClick={onCancel} disabled={isSubmitting}>Cancelar</Button>
                    <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? <Loader2 className="animate-spin" /> : (bookmakerToEdit ? "Salvar Alterações" : "Adicionar Casa")}
                    </Button>
                </DialogFooter>
            </form>
        </Form>
      </>
  );
}

    