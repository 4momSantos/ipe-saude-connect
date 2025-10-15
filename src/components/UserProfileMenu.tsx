import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings, FileText, Copy } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useUserRole } from "@/hooks/useUserRole";
import { useQuery } from "@tanstack/react-query";

export function UserProfileMenu() {
  const navigate = useNavigate();
  const [userEmail, setUserEmail] = useState<string>("");
  const [userId, setUserId] = useState<string>("");
  const { isCandidato } = useUserRole();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUserEmail(session?.user?.email || "");
      setUserId(session?.user?.id || "");
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserEmail(session?.user?.email || "");
      setUserId(session?.user?.id || "");
    });

    return () => subscription.unsubscribe();
  }, []);

  // Buscar protocolo mais recente do candidato
  const { data: ultimoProtocolo } = useQuery({
    queryKey: ['ultimo-protocolo', userId],
    queryFn: async () => {
      if (!userId) return null;
      
      const { data } = await supabase
        .from('inscricoes_edital')
        .select('protocolo, editais(titulo)')
        .eq('candidato_id', userId)
        .eq('is_rascunho', false)
        .not('protocolo', 'is', null)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      
      return data;
    },
    enabled: !!userId && isCandidato
  });

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  if (!userEmail) {
    return null;
  }

  const initials = userEmail
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-center gap-2">
      {/* Badge de Protocolo (apenas para candidatos) */}
      {isCandidato && ultimoProtocolo?.protocolo && (
        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2 hidden md:flex">
              <FileText className="h-4 w-4" />
              <span className="font-mono text-xs">{ultimoProtocolo.protocolo}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-80">
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Protocolo da Inscrição</p>
                <p className="font-mono text-lg font-bold mt-1">{ultimoProtocolo.protocolo}</p>
              </div>
              <div>
                <p className="text-sm font-medium text-muted-foreground">Edital</p>
                <p className="text-sm mt-1">{ultimoProtocolo.editais?.titulo}</p>
              </div>
              <Button 
                size="sm" 
                variant="secondary"
                className="w-full"
                onClick={() => {
                  navigator.clipboard.writeText(ultimoProtocolo.protocolo);
                  toast.success('Protocolo copiado!');
                }}
              >
                <Copy className="h-3 w-3 mr-2" />
                Copiar Protocolo
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger className="focus:outline-none">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
            <Avatar className="h-9 w-9">
              <AvatarFallback className="bg-primary/20 text-primary font-semibold">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium text-foreground">Usuário</p>
              <p className="text-xs text-muted-foreground">{userEmail}</p>
            </div>
          </div>
        </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-1">
            <p className="font-medium">Minha Conta</p>
            <p className="text-xs text-muted-foreground">{userEmail}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={() => navigate("/configuracoes")}>
          <Settings className="h-4 w-4 mr-2" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
          <LogOut className="h-4 w-4 mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
