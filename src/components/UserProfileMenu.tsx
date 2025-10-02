import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Shield, Settings } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

type UserRole = "administrador" | "analista" | "candidato";

interface UserProfile {
  nome: string;
  cpf: string;
  perfil: UserRole;
}

const roleConfig = {
  administrador: {
    label: "Administrador",
    className: "bg-purple-500/20 text-purple-400 border-purple-500/30",
  },
  analista: {
    label: "Analista",
    className: "bg-blue-500/20 text-blue-400 border-blue-500/30",
  },
  candidato: {
    label: "Candidato",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
};

export function UserProfileMenu() {
  const navigate = useNavigate();
  const [user] = useState<UserProfile>(() => {
    const storedUser = localStorage.getItem("ipe_user");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  const handleLogout = () => {
    localStorage.removeItem("ipe_auth");
    localStorage.removeItem("ipe_user");
    toast.success("Logout realizado com sucesso");
    navigate("/login");
  };

  const handleChangeRole = (role: UserRole) => {
    const updatedUser = { ...user, perfil: role };
    localStorage.setItem("ipe_user", JSON.stringify(updatedUser));
    toast.success(`Perfil alterado para ${roleConfig[role].label}`);
    window.location.reload();
  };

  if (!user) return null;

  const initials = user.nome
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="focus:outline-none">
        <div className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-muted transition-colors">
          <Avatar className="h-9 w-9">
            <AvatarFallback className="bg-primary/20 text-primary font-semibold">
              {initials}
            </AvatarFallback>
          </Avatar>
          <div className="hidden lg:block text-left">
            <p className="text-sm font-medium text-foreground">{user.nome}</p>
            <p className="text-xs text-muted-foreground">{roleConfig[user.perfil].label}</p>
          </div>
        </div>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div className="space-y-2">
            <p className="font-medium">{user.nome}</p>
            <p className="text-xs text-muted-foreground font-mono">{user.cpf}</p>
            <Badge variant="outline" className={roleConfig[user.perfil].className}>
              {roleConfig[user.perfil].label}
            </Badge>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Alterar Perfil (POC)
        </DropdownMenuLabel>
        <DropdownMenuItem onClick={() => handleChangeRole("administrador")}>
          <Shield className="h-4 w-4 mr-2 text-purple-400" />
          Administrador
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChangeRole("analista")}>
          <User className="h-4 w-4 mr-2 text-blue-400" />
          Analista
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleChangeRole("candidato")}>
          <User className="h-4 w-4 mr-2 text-green-400" />
          Candidato
        </DropdownMenuItem>
        
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
  );
}
