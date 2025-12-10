import { useLocation, Link } from "react-router-dom";
import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-secondary/20">
      <div className="text-center space-y-6 p-8">
        <h1 className="text-6xl font-bold text-foreground">404</h1>
        <p className="text-2xl text-muted-foreground mb-4">Página no encontrada</p>
        <p className="text-muted-foreground mb-8">
          La ruta <code className="bg-muted px-2 py-1 rounded text-sm">{location.pathname}</code> no existe
        </p>
        
        <Link to="/">
          <Button className="gap-2">
            <Home className="h-4 w-4" />
            Volver al inicio
          </Button>
        </Link>
      </div>
    </div>
  );
};

export default NotFound;
