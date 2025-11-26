import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Package, QrCode, TrendingUp, Zap, Shield } from "lucide-react";

const Index = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-hero">
        <div className="container mx-auto px-4 py-20 text-center text-primary-foreground">
          <h1 className="text-4xl md:text-6xl font-bold mb-6 animate-fade-in">
            Venda Produtos Digitais com PIX
          </h1>
          <p className="text-xl md:text-2xl mb-8 opacity-90 max-w-2xl mx-auto">
            Plataforma inovadora para vender e-books, PDFs e vídeos com pagamento instantâneo via PIX
          </p>
          <div className="flex gap-4 justify-center">
            <Button 
              size="lg"
              onClick={() => navigate("/auth")}
              className="bg-accent hover:bg-accent/90 text-accent-foreground"
            >
              Começar Agora
            </Button>
            <Button 
              size="lg"
              variant="outline"
              onClick={() => navigate("/auth")}
              className="bg-white/10 text-white border-white/20 hover:bg-white/20"
            >
              Fazer Login
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 bg-secondary/30">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Como Funciona
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <Package className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Cadastre Produtos</CardTitle>
                <CardDescription>
                  Adicione seus e-books, PDFs ou vídeos do YouTube em minutos
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center mb-4">
                  <QrCode className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Compartilhe o Link</CardTitle>
                <CardDescription>
                  Gere e compartilhe links únicos com QR Code PIX automático
                </CardDescription>
              </CardHeader>
            </Card>

            <Card>
              <CardHeader>
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center mb-4">
                  <DollarSign className="h-6 w-6 text-success" />
                </div>
                <CardTitle>Receba Instantâneo</CardTitle>
                <CardDescription>
                  Pagamentos via PIX caem direto na sua conta do Mercado Pago
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-12">
            Por Que Escolher Nossa Plataforma?
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Zap className="h-6 w-6 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Pagamento Instantâneo</h3>
                <p className="text-muted-foreground">
                  Sem checkout complexo. Seus clientes veem o QR Code PIX direto na tela.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Shield className="h-6 w-6 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Seguro e Confiável</h3>
                <p className="text-muted-foreground">
                  Integração direta com Mercado Pago. Seus dados e pagamentos 100% seguros.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <TrendingUp className="h-6 w-6 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Acompanhe Vendas</h3>
                <p className="text-muted-foreground">
                  Dashboard completo com faturamento diário, semanal e mensal.
                </p>
              </div>
            </div>

            <div className="flex gap-4">
              <div className="flex-shrink-0">
                <div className="w-12 h-12 bg-success/10 rounded-lg flex items-center justify-center">
                  <Package className="h-6 w-6 text-success" />
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-2">Múltiplos Produtos</h3>
                <p className="text-muted-foreground">
                  Venda PDFs, e-books e aulas em vídeo. Tudo em um só lugar.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gradient-success">
        <div className="container mx-auto px-4 text-center text-success-foreground">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">
            Pronto para Começar a Vender?
          </h2>
          <p className="text-xl mb-8 opacity-90 max-w-2xl mx-auto">
            Crie sua conta grátis e comece a receber pagamentos via PIX hoje mesmo
          </p>
          <Button 
            size="lg"
            onClick={() => navigate("/auth")}
            className="bg-white text-success hover:bg-white/90"
          >
            Criar Conta Gratuita
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-8 bg-card">
        <div className="container mx-auto px-4 text-center text-muted-foreground">
          <p>© 2024 Plataforma de Vendas. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  );
};

export default Index;
