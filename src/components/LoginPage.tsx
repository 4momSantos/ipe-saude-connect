import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Shield, Lock, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export default function LoginPage() {
  const navigate = useNavigate();
  const [cpf, setCpf] = useState("");
  const [senha, setSenha] = useState("");

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, "");
    return numbers
      .slice(0, 11)
      .replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, "$1.$2.$3-$4");
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Simulação de login
    if (cpf && senha) {
      localStorage.setItem("ipe_auth", "true");
      localStorage.setItem("ipe_user", JSON.stringify({
        nome: "Usuário IPE Saúde",
        cpf: cpf,
        perfil: "Administrador"
      }));
      toast.success("Login realizado com sucesso!");
      navigate("/");
    } else {
      toast.error("Preencha todos os campos");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8 animate-fade-in">
        <div className="text-center space-y-4">
          <div className="flex justify-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent shadow-glow">
              <Shield className="h-8 w-8 text-white" />
            </div>
          </div>
          <div>
            <h1 className="text-3xl font-bold text-foreground">IPE Saúde</h1>
            <p className="text-muted-foreground mt-2">Sistema de Credenciamento de Prestadores</p>
          </div>
        </div>

        <Card className="border bg-card card-glow">
          <CardHeader className="space-y-1">
            <CardTitle className="text-2xl text-center">Login GOV.BR</CardTitle>
            <CardDescription className="text-center">
              Acesso via autenticação governamental (simulado)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="cpf" className="flex items-center gap-2">
                  <User className="h-4 w-4" />
                  CPF
                </Label>
                <Input
                  id="cpf"
                  placeholder="000.000.000-00"
                  value={cpf}
                  onChange={(e) => setCpf(formatCpf(e.target.value))}
                  className="bg-background"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="senha" className="flex items-center gap-2">
                  <Lock className="h-4 w-4" />
                  Senha
                </Label>
                <Input
                  id="senha"
                  type="password"
                  placeholder="Digite sua senha"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  className="bg-background"
                />
              </div>

              <Button 
                type="submit" 
                className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                Entrar com GOV.BR
              </Button>

              <div className="text-center">
                <p className="text-xs text-muted-foreground">
                  Simulação de login - qualquer CPF e senha funcionam
                </p>
              </div>
            </form>
          </CardContent>
        </Card>

        <div className="text-center text-sm text-muted-foreground">
          <p>© 2025 IPE Saúde - Instituto de Previdência</p>
        </div>
      </div>
    </div>
  );
}
