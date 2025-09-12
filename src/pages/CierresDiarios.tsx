import React from 'react';
import { useAuthContext } from '@/contexts/AuthContext';
import { CashSessionReport } from '@/components/cash/CashSessionReport';
import { FileText } from 'lucide-react';

export default function CierresDiarios() {
  const { user } = useAuthContext();

  // Check if user is admin
  if (user?.role !== 'Administrador') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <h2 className="text-xl font-semibold text-muted-foreground">Acceso Denegado</h2>
          <p className="text-sm text-muted-foreground mt-2">
            No tienes permisos para acceder a esta página.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <FileText className="w-8 h-8 text-primary" />
          <h1 className="text-3xl font-bold text-foreground">Cierres Diarios</h1>
        </div>
        <p className="text-muted-foreground">
          Consulta y exporta los reportes de cierres de caja diarios
        </p>
      </div>

      <CashSessionReport />
    </div>
  );
}