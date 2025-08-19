
"use client";

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/context/auth-context';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, ShieldCheck } from 'lucide-react';

const formSchema = z.object({
  email: z.string().email({ message: 'Por favor, insira um email válido.' }),
  password: z.string().min(6, { message: 'A senha deve ter pelo menos 6 caracteres.' }),
  confirmPassword: z.string()
}).refine(data => data.password === data.confirmPassword, {
    message: "As senhas não coincidem.",
    path: ["confirmPassword"],
});

export default function SignUpPage() {
  const router = useRouter();
  const { signup } = useAuth();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (values: z.infer<typeof formSchema>) => {
    setIsLoading(true);
    try {
      await signup(values.email, values.password);
      toast({
        title: 'Cadastro realizado com sucesso!',
        description: 'Você será redirecionado para o painel.',
      });
      router.push('/dashboard');
    } catch (error: any) {
        console.error(error);
        const errorCode = error.code;
        let errorMessage = 'Ocorreu um erro ao criar a conta.';
        if (errorCode === 'auth/email-already-in-use') {
            errorMessage = 'Este email já está em uso. Redirecionando para o login...';
             toast({
                variant: 'destructive',
                title: 'Email já cadastrado',
                description: errorMessage,
            });
            setTimeout(() => router.push('/login'), 2000);
        } else {
            toast({
                variant: 'destructive',
                title: 'Falha no Cadastro',
                description: errorMessage,
            });
        }
    } finally {
        setIsLoading(false);
    }
  };

  return (
    <div className="w-full min-h-screen lg:grid lg:grid-cols-2">
      <div className="relative hidden flex-col items-center justify-center bg-muted p-10 text-white lg:flex">
        <div className="absolute inset-0 bg-zinc-900" />
        <div className="relative z-20 flex items-center text-lg font-medium">
             <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 256" className="mr-2 h-6 w-6">
                <rect width="256" height="256" fill="none"></rect>
                <path d="M144,16.8,32.3,108.5a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L193.2,48A112,112,0,0,0,48,193.2L157.5,83.7a8,8,0,0,0,4.3,14.2l20.6,3.4a8,8,0,0,1,6.5,6.5l3.4,20.6a8,8,0,0,0,14.2,4.3L239.2,112A112.2,112.2,0,0,0,144,16.8Z" fill="currentColor"></path>
            </svg>
            BetWise
        </div>
        <div className="relative z-20 mt-auto">
          <blockquote className="space-y-2">
            <p className="text-lg">
              &ldquo;Bem-vindo ao futuro das apostas inteligentes. Analise, gerencie e maximize seus resultados com nossas ferramentas de ponta.&rdquo;
            </p>
            <footer className="text-sm">Equipe BetWise</footer>
          </blockquote>
        </div>
      </div>
      <div className="flex min-h-screen items-center justify-center p-4">
        <Card className="w-full max-w-md">
            <CardHeader className="space-y-1">
            <CardTitle className="text-2xl">Crie sua Conta</CardTitle>
            <CardDescription>Comece a gerenciar suas apostas de forma inteligente.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4">
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <FormField
                        control={form.control}
                        name="email"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Email</FormLabel>
                            <FormControl>
                            <Input type="email" placeholder="seu@email.com" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Senha</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="Mínimo 6 caracteres" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Confirmar Senha</FormLabel>
                            <FormControl>
                            <Input type="password" placeholder="Confirme sua senha" {...field} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                    <Button type="submit" className="w-full" disabled={isLoading}>
                        {isLoading ? <Loader2 className="animate-spin" /> : "Criar Conta Grátis"}
                    </Button>
                    </form>
                </Form>
            </CardContent>
            <CardFooter>
                 <p className="w-full text-center text-sm text-muted-foreground">
                    Já tem uma conta?{" "}
                    <Link href="/login" className="font-medium text-primary hover:underline">
                        Faça login
                    </Link>
                </p>
            </CardFooter>
        </Card>
      </div>
    </div>
  );
}
