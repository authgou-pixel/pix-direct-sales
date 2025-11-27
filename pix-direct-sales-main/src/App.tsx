import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Suspense, lazy, Component, ReactNode } from "react";
class ErrorBoundary extends Component<{ children: ReactNode }, { hasError: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {}
  render() {
    if (this.state.hasError) {
      return <div className="min-h-screen flex items-center justify-center bg-background text-foreground">Falha ao carregar a interface. Tente recarregar.</div>;
    }
    return this.props.children;
  }
}
const Index = lazy(() => import("./pages/Index"));
const Auth = lazy(() => import("./pages/Auth"));
const Dashboard = lazy(() => import("./pages/Dashboard"));
const NewProduct = lazy(() => import("./pages/NewProduct"));
const Settings = lazy(() => import("./pages/Settings"));
const PaymentPage = lazy(() => import("./pages/PaymentPage"));
const ProductManage = lazy(() => import("./pages/ProductManage"));
const Members = lazy(() => import("./pages/Members"));
const Products = lazy(() => import("./pages/Products"));
const LessonView = lazy(() => import("./pages/LessonView"));
const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter basename={import.meta.env.BASE_URL}>
        <ErrorBoundary>
        <Suspense fallback={<div className="min-h-screen bg-background" />}> 
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/auth" element={<Auth />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/dashboard/products" element={<Products />} />
            <Route path="/dashboard/new-product" element={<NewProduct />} />
            <Route path="/dashboard/settings" element={<Settings />} />
            <Route path="/dashboard/product/:productId" element={<ProductManage />} />
            <Route path="/members" element={<Members />} />
            <Route path="/members/product/:productId/lesson/:lessonId" element={<LessonView />} />
            <Route path="/pay/:productId" element={<PaymentPage />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
        </ErrorBoundary>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
