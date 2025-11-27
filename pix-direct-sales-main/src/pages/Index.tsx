import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Upload, Banknote, ArrowRightLeft, Library, Download, QrCode, Shield, User } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#1A1A1A] text-white">
      <header className="w-full sticky top-0 z-40 border-b border-[#8A2BE2]/30 bg-[#1A1A1A]/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="https://i.imgur.com/JaOLGxd.png" alt="Logo" className="h-8 w-auto object-contain" loading="eager" referrerPolicy="no-referrer" onError={(e) => { e.currentTarget.src = "/placeholder.svg"; }} />
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" className="border-[#8A2BE2]/40 text-white hover:bg-[#8A2BE2]/10" onClick={() => navigate("/auth")}> 
              <User className="h-4 w-4 mr-2" /> Entrar
            </Button>
            <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90" onClick={() => navigate("/auth?signup=1")}> 
              Criar conta
            </Button>
          </div>
        </div>
      </header>

      <main>
        <section className="relative overflow-hidden py-24">
          <div className="absolute -top-40 -left-40 w-[520px] h-[520px] rounded-full bg-[#8A2BE2]/20 blur-[100px]"></div>
          <div className="absolute -bottom-40 -right-40 w-[520px] h-[520px] rounded-full bg-[#5E2DBE]/20 blur-[100px]"></div>
          <div className="mx-auto max-w-6xl px-4 text-center">
            <h1 className="text-4xl md:text-6xl font-extrabold mb-6 bg-gradient-to-r from-white to-[#C6A3FF] bg-clip-text text-transparent">Hospede e venda seus produtos digitais sem taxas</h1>
            <p className="text-lg md:text-xl text-[#CFCFCF] mb-10 max-w-3xl mx-auto">Hospedagem gratuita, vendas diretas e integração bancária instantânea. Esqueça o checkout tradicional.</p>
            <div className="flex gap-4 justify-center">
              <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90" onClick={() => navigate("/auth?signup=1")}>Criar conta</Button>
              <Button variant="outline" className="border-[#8A2BE2]/40 text-white hover:bg-[#8A2BE2]/10" onClick={() => navigate("/auth")}>Entrar</Button>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">Diferenciais</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card className="bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><Upload className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Hospedagem gratuita</CardTitle>
                  <CardDescription>Faça upload dos seus e-books, PDFs e vídeos sem custo.</CardDescription>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 120 60" className="w-full h-24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="8" y="14" width="80" height="32" rx="6" fill="#2B2B2B" stroke="#8A2BE2" opacity="0.6" />
                    <rect x="20" y="22" width="56" height="6" rx="3" fill="#8A2BE2" />
                    <rect x="20" y="32" width="40" height="6" rx="3" fill="#B08CFF" />
                  </svg>
                </CardContent>
              </Card>

              <Card className="bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><Banknote className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Vendas diretas</CardTitle>
                  <CardDescription>Receba via PIX direto na sua conta, sem taxas intermediárias.</CardDescription>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 120 60" className="w-full h-24" xmlns="http://www.w3.org/2000/svg">
                    <circle cx="28" cy="30" r="14" fill="#2B2B2B" stroke="#8A2BE2" opacity="0.6" />
                    <path d="M22 30h12" stroke="#8A2BE2" strokeWidth="3" />
                    <rect x="54" y="22" width="46" height="16" rx="4" fill="#2B2B2B" stroke="#B08CFF" opacity="0.6" />
                  </svg>
                </CardContent>
              </Card>

              <Card className="bg-[#232323] border-[#8A2BE2]/20 hover:border-[#8A2BE2]/40 transition transform hover:-translate-y-1 hover:shadow-2xl">
                <CardHeader>
                  <div className="w-12 h-12 rounded-lg bg-[#8A2BE2]/20 flex items-center justify-center mb-3"><ArrowRightLeft className="h-6 w-6 text-[#8A2BE2]" /></div>
                  <CardTitle>Integração bancária direta</CardTitle>
                  <CardDescription>Fluxo simples e seguro, sem checkout tradicional.</CardDescription>
                </CardHeader>
                <CardContent>
                  <svg viewBox="0 0 120 60" className="w-full h-24" xmlns="http://www.w3.org/2000/svg">
                    <rect x="14" y="20" width="32" height="20" rx="4" fill="#2B2B2B" stroke="#8A2BE2" opacity="0.6" />
                    <rect x="74" y="20" width="32" height="20" rx="4" fill="#2B2B2B" stroke="#B08CFF" opacity="0.6" />
                    <path d="M48 30h24" stroke="#8A2BE2" strokeWidth="2" />
                  </svg>
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="py-16">
          <div className="mx-auto max-w-6xl px-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold mb-6">Área de Membros</h2>
                <div className="space-y-3 text-[#CFCFCF]">
                  <div className="flex items-center gap-2"><Library className="h-5 w-5 text-[#8A2BE2]" /> Acesso a produtos adquiridos</div>
                  <div className="flex items-center gap-2"><QrCode className="h-5 w-5 text-[#8A2BE2]" /> Biblioteca de conteúdos digitais</div>
                  <div className="flex items-center gap-2"><Download className="h-5 w-5 text-[#8A2BE2]" /> Gerenciamento de downloads</div>
                </div>
                <div className="mt-6 flex gap-3">
                  <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90" onClick={() => navigate("/auth?signup=1")}>Criar conta</Button>
                  <Button variant="outline" className="border-[#8A2BE2]/40 text-white hover:bg-[#8A2BE2]/10" onClick={() => navigate("/auth")}>Entrar</Button>
                </div>
              </div>
              <div>
                <img src="https://i.imgur.com/a6O13Qu.png" alt="Área de Membros" className="rounded-xl shadow-lg border border-[#8A2BE2]/30" />
              </div>
            </div>
          </div>
        </section>

        <section className="py-20">
          <div className="mx-auto max-w-6xl px-4 text-center">
            <div className="inline-flex items-center gap-3 px-6 py-4 rounded-xl bg-[#232323] border border-[#8A2BE2]/30 shadow">
              <Shield className="h-5 w-5 text-[#8A2BE2]" />
              <span className="text-[#CFCFCF]">Segurança e performance com integração Mercado Pago</span>
            </div>
            <div className="mt-8">
              <Button className="bg-gradient-to-r from-[#8A2BE2] to-[#D34FE2] text-black font-semibold hover:opacity-90" onClick={() => navigate("/auth?signup=1")}>Comece agora</Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-[#8A2BE2]/30 py-8">
        <div className="mx-auto max-w-6xl px-4 text-center text-[#9A9A9A]">
          <p>© 2024 PIX Direct Sales. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
