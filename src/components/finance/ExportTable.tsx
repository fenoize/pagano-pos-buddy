import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight, User } from 'lucide-react';
import { DeliveryExportRow } from '@/types/finance';

interface ExportTableProps {
  data: DeliveryExportRow[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onItemsPerPageChange: (items: number) => void;
}

export function ExportTable({ data, currentPage, itemsPerPage, onPageChange, onItemsPerPageChange }: ExportTableProps) {
  const totalPages = Math.ceil(data.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const currentData = data.slice(startIndex, endIndex);

  const goToPage = (page: number) => {
    onPageChange(Math.max(1, Math.min(page, totalPages)));
  };

  const formatCurrency = (value: string | number) => {
    const numValue = typeof value === 'string' ? parseInt(value) : value;
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(numValue);
  };

  if (data.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No hay datos para mostrar
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fecha y Hora</TableHead>
              <TableHead>Nº Orden</TableHead>
              <TableHead>Repartidor</TableHead>
              <TableHead>Dirección</TableHead>
              <TableHead className="text-right">Monto Delivery</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {currentData.map((row, index) => (
              <TableRow key={`${row.numero_orden}-${index}`}>
                <TableCell>{row.fecha_hora}</TableCell>
                <TableCell className="font-medium">{row.numero_orden}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-muted-foreground" />
                    {row.repartidor_nombre || (
                      <span className="text-muted-foreground italic">Sin asignar</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="max-w-md truncate">{row.direccion}</TableCell>
                <TableCell className="text-right font-medium">
                  {formatCurrency(row.monto_delivery)}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Paginación */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Mostrando {startIndex + 1}-{Math.min(endIndex, data.length)} de {data.length}
          </span>
          <Select
            value={itemsPerPage.toString()}
            onValueChange={(value) => {
              onItemsPerPageChange(parseInt(value));
              onPageChange(1); // Reset to first page
            }}
          >
            <SelectTrigger className="w-[100px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="10">10 / pág</SelectItem>
              <SelectItem value="25">25 / pág</SelectItem>
              <SelectItem value="50">50 / pág</SelectItem>
              <SelectItem value="100">100 / pág</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(1)}
            disabled={currentPage === 1}
          >
            <ChevronsLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>

          <div className="flex items-center gap-1 mx-2">
            {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
              let pageNum: number;
              if (totalPages <= 5) {
                pageNum = i + 1;
              } else if (currentPage <= 3) {
                pageNum = i + 1;
              } else if (currentPage >= totalPages - 2) {
                pageNum = totalPages - 4 + i;
              } else {
                pageNum = currentPage - 2 + i;
              }

              return (
                <Button
                  key={pageNum}
                  variant={currentPage === pageNum ? 'default' : 'outline'}
                  size="icon"
                  onClick={() => goToPage(pageNum)}
                  className="w-9 h-9"
                >
                  {pageNum}
                </Button>
              );
            })}
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            onClick={() => goToPage(totalPages)}
            disabled={currentPage === totalPages}
          >
            <ChevronsRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
