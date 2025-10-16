import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Database, Loader2 } from 'lucide-react';
import { ProtectedRoute as RoleGuard } from '@/components/ProtectedRoute';

export default function SeedDatabaseRS() {
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const { toast } = useToast();

  const runSeed = async (volume: 'small' | 'medium' | 'full') => {
    setLoading(true);
    setProgress(0);
    setLogs([]);

    try {
      setLogs(prev => [...prev, `🚀 Iniciando seed com volume: ${volume}`]);
      setProgress(10);

      const { data, error } = await supabase.functions.invoke('seed-database-rs', {
        body: { config: { volume, dryRun: false } }
      });

      if (error) throw error;

      setProgress(100);
      setLogs(prev => [...prev, `✅ Seed concluído! ${data.totalCreated} registros criados`]);
      
      toast({
        title: 'Seed executado com sucesso',
        description: `${data.totalCreated} registros criados em ${data.totalDuration}ms`
      });
    } catch (error: any) {
      setLogs(prev => [...prev, `❌ Erro: ${error.message}`]);
      toast({
        title: 'Erro ao executar seed',
        description: error.message,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
        <div className="flex items-center gap-3">
          <Database className="h-8 w-8" />
          <div>
            <h1 className="text-3xl font-bold">Seed Database - RS</h1>
            <p className="text-muted-foreground">Popular banco de dados com dados fictícios de Porto Alegre/RS</p>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle>Pequeno (30-50)</CardTitle>
              <CardDescription>Teste rápido</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runSeed('small')} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Executar'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Médio (150-200)</CardTitle>
              <CardDescription>Volume recomendado</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runSeed('medium')} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Executar'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Completo (200+)</CardTitle>
              <CardDescription>Volume máximo</CardDescription>
            </CardHeader>
            <CardContent>
              <Button onClick={() => runSeed('full')} disabled={loading} className="w-full">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Executar'}
              </Button>
            </CardContent>
          </Card>
        </div>

        {loading && (
          <Card>
            <CardHeader>
              <CardTitle>Progresso</CardTitle>
            </CardHeader>
            <CardContent>
              <Progress value={progress} className="w-full" />
            </CardContent>
          </Card>
        )}

        {logs.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Logs de Execução</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="bg-black text-green-400 p-4 rounded font-mono text-sm max-h-96 overflow-y-auto">
                {logs.map((log, i) => (
                  <div key={i}>{log}</div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
  );
}
