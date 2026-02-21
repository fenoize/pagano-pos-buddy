import { defineConfig } from "vite";
import react from "@vitejs/plugin-react-swc";
import path from "path";
import { componentTagger } from "lovable-tagger";

// https://vitejs.dev/config/
export default defineConfig(({ mode }) => ({
  server: {
    host: "::",
    port: 8080,
  },
  plugins: [
    react(),
    mode === 'development' &&
    componentTagger(),
  ].filter(Boolean),
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
    dedupe: ["react", "react-dom"],
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // Vendor chunk - librerías externas comunes
          'vendor-react': ['react', 'react-dom', 'react-router-dom'],
          'vendor-ui': ['@radix-ui/react-dialog', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          'vendor-query': ['@tanstack/react-query'],
          'vendor-supabase': ['@supabase/supabase-js'],
          
          // Customer portal chunk - portal de clientes
          'customer-portal': [
            './src/pages/customer/CustomerLogin.tsx',
            './src/pages/customer/CustomerPortal.tsx',
            './src/contexts/CustomerAuthContext.tsx',
            './src/components/guards/CustomerProtectedRoute.tsx',
            './src/components/customer/PWAInstallPrompt.tsx',
          ],
          
          // POS/Staff chunks - separados por funcionalidad
          'pos-auth': [
            './src/pages/Login.tsx',
            './src/components/guards/StaffProtectedRoute.tsx',
          ],
          'pos-sales': [
            './src/pages/NewSale.tsx',
            './src/pages/Sales.tsx',
            './src/components/pos/Cart.tsx',
            './src/components/pos/PaymentModal.tsx',
          ],
          'pos-kitchen': [
            './src/pages/Kitchen.tsx',
            './src/components/kitchen/OrderCard.tsx',
            './src/components/kitchen/KitchenSounds.tsx',
          ],
          'pos-admin': [
            './src/pages/Dashboard.tsx',
            './src/pages/Products.tsx',
            './src/pages/Categorias.tsx',
            './src/pages/Users.tsx',
            './src/pages/ConfiguracionPage.tsx',
            './src/pages/CierresDiarios.tsx',
            './src/pages/Clientes.tsx',
          ],
        },
      },
    },
    // Aumentar límite de advertencia de chunk size
    chunkSizeWarningLimit: 1000,
  },
}));
