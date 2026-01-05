import { useState } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Search, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatCurrency } from '@/lib/utils';

interface ProductSale {
  productId: string;
  productName: string;
  category: string;
  quantity: number;
  revenue: number;
  percentOfTotal: number;
}

interface ProductSalesTableProps {
  data: ProductSale[];
  loading?: boolean;
  searchTerm: string;
  onSearchChange: (term: string) => void;
  categoryFilter: string;
  onCategoryChange: (category: string) => void;
  categories: string[];
  limit: number;
  onLimitChange: (limit: number) => void;
  onExport: () => void;
}

const PAGE_SIZE = 10;

export function ProductSalesTable({
  data,
  loading = false,
  searchTerm,
  onSearchChange,
  categoryFilter,
  onCategoryChange,
  categories,
  limit,
  onLimitChange,
  onExport
}: ProductSalesTableProps) {
  const [currentPage, setCurrentPage] = useState(0);

  // Reset page when filters change
  const handleSearchChange = (term: string) => {
    setCurrentPage(0);
    onSearchChange(term);
  };

  const handleCategoryChange = (category: string) => {
    setCurrentPage(0);
    onCategoryChange(category);
  };

  // Pagination
  const totalPages = Math.ceil(data.length / PAGE_SIZE);
  const paginatedData = data.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);

  // Max quantity for bar visualization
  const maxQuantity = data.length > 0 ? Math.max(...data.map(p => p.quantity)) : 1;

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <CardTitle className="text-base">Detalle por Producto</CardTitle>
          <div className="flex flex-wrap items-center gap-2">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar producto..."
                value={searchTerm}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="pl-8 w-[200px] h-9"
              />
            </div>

            {/* Category filter */}
            <Select value={categoryFilter} onValueChange={handleCategoryChange}>
              <SelectTrigger className="w-[150px] h-9">
                <SelectValue placeholder="Categoría" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {categories.map(cat => (
                  <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Limit */}
            <Select value={limit.toString()} onValueChange={(v) => onLimitChange(Number(v))}>
              <SelectTrigger className="w-[100px] h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">Top 10</SelectItem>
                <SelectItem value="25">Top 25</SelectItem>
                <SelectItem value="50">Top 50</SelectItem>
                <SelectItem value="100">Top 100</SelectItem>
                <SelectItem value="0">Todos</SelectItem>
              </SelectContent>
            </Select>

            {/* Export */}
            <Button variant="outline" size="sm" onClick={onExport} className="h-9">
              <Download className="h-4 w-4 mr-1" />
              CSV
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p className="text-center text-muted-foreground py-8">Cargando...</p>
        ) : data.length === 0 ? (
          <p className="text-center text-muted-foreground py-8">No hay datos para mostrar</p>
        ) : (
          <>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Producto</TableHead>
                    <TableHead className="hidden sm:table-cell">Categoría</TableHead>
                    <TableHead className="text-right">Cantidad</TableHead>
                    <TableHead className="text-right hidden sm:table-cell">Ingresos</TableHead>
                    <TableHead className="text-right hidden md:table-cell">% Total</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedData.map((product, index) => {
                    const globalIndex = currentPage * PAGE_SIZE + index + 1;
                    const barWidth = (product.quantity / maxQuantity) * 100;
                    
                    return (
                      <TableRow key={product.productId}>
                        <TableCell className="font-medium text-muted-foreground">
                          {globalIndex}
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col gap-1">
                            <span className="font-medium">{product.productName}</span>
                            <span className="text-xs text-muted-foreground sm:hidden">
                              {product.category}
                            </span>
                            {/* Progress bar */}
                            <div className="w-full bg-muted rounded-full h-1.5 max-w-[120px]">
                              <div 
                                className="bg-primary h-1.5 rounded-full transition-all" 
                                style={{ width: `${barWidth}%` }}
                              />
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell">
                          <Badge variant="outline" className="font-normal">
                            {product.category}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right font-medium">
                          {product.quantity.toLocaleString('es-CL')}
                        </TableCell>
                        <TableCell className="text-right hidden sm:table-cell">
                          {formatCurrency(product.revenue)}
                        </TableCell>
                        <TableCell className="text-right hidden md:table-cell text-muted-foreground">
                          {product.percentOfTotal.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="flex items-center justify-between mt-4 pt-4 border-t">
                <span className="text-sm text-muted-foreground">
                  Mostrando {currentPage * PAGE_SIZE + 1}-{Math.min((currentPage + 1) * PAGE_SIZE, data.length)} de {data.length}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.max(0, p - 1))}
                    disabled={currentPage === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm">
                    {currentPage + 1} / {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage(p => Math.min(totalPages - 1, p + 1))}
                    disabled={currentPage >= totalPages - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}
