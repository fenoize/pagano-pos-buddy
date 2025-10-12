import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";

export default function RawMaterials() {
  const navigate = useNavigate();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => navigate("/pos/inventario")}>
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div>
          <h1 className="text-3xl font-bold text-primary">Materias Primas</h1>
          <p className="text-muted-foreground">Gestión del catálogo de insumos</p>
        </div>
      </div>
      
      <div className="text-center text-muted-foreground py-12">
        En desarrollo - Próximamente
      </div>
    </div>
  );
}
