import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Coins, CreditCard, Download, X, Shield, FileText, FileSpreadsheet, Tag, Crown, ArrowUp, ArrowDown, ArrowUpDown, Mail } from "lucide-react";
import { useAuthContext } from '@/contexts/AuthContext';
import { InviteCustomerDialog } from '@/components/clientes/InviteCustomerDialog';
import { useRunasConfig } from '@/hooks/useRunasConfig';
import { useCustomerTags } from '@/hooks/useCustomerTags';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers, CustomerFilters, CustomerSortColumn } from '@/hooks/useCustomers';
import { Customer, EstadoCliente } from '@/types';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import CustomerForm from '@/components/clientes/CustomerForm';
import CustomerAddresses from '@/components/clientes/CustomerAddresses';
import CustomerRunes from '@/components/clientes/CustomerRunes';
import CustomerRunaSubscriptions from '@/components/clientes/CustomerRunaSubscriptions';
import CustomerDiscountSubscription from '@/components/clientes/CustomerDiscountSubscription';
import CustomerOrders from '@/components/clientes/CustomerOrders';
import CustomerLevelsBadges from '@/components/clientes/CustomerLevelsBadges';
import DeleteCustomerModal from '@/components/clientes/DeleteCustomerModal';
import { CustomerAuthManagementModal } from '@/components/clientes/CustomerAuthManagementModal';
import CustomerTagChips from '@/components/clientes/CustomerTagChips';
import CustomerTagsManager from '@/components/clientes/CustomerTagsManager';

export default function Clientes() {
  const { user: currentUser } = useAuthContext();
  const [showInviteCustomerDialog, setShowInviteCustomerDialog] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [isCustomerModalOpen, setIsCustomerModalOpen] = useState(false);
  const [isNewCustomerModalOpen, setIsNewCustomerModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [deleteModalType, setDeleteModalType] = useState<'deactivate' | 'permanent' | null>(null);
  const [customerToDelete, setCustomerToDelete] = useState<Customer | null>(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [selectedCustomerForPassword, setSelectedCustomerForPassword] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<CustomerFilters>({ estado: 'Activo' });
  const [sortBy, setSortBy] = useState<CustomerSortColumn>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  
  const {
    customers,
    loading,
    totalCount,
    totalRunasSum,
    canManageCustomers,
    canViewCustomers,
    fetchCustomers,
    deleteCustomer,
    deleteCustomerPermanently,
    updateCustomerInList,
    exportCustomersCSV,
    exportCustomersPDF
  } = useCustomers({ autoFetch: false });

  const { tags } = useCustomerTags();

  const { runaRedemptionValue } = useRunasConfig();

  const totalRunasValue = totalRunasSum * runaRedemptionValue;

  const getActiveFilters = (): CustomerFilters => ({
    ...filters,
    search: searchTerm.trim().length >= 3 ? searchTerm.trim() : undefined,
    sortBy,
    sortOrder,
  });

  const handleSort = (col: CustomerSortColumn) => {
    if (sortBy === col) {
      setSortOrder(prev => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortOrder('asc');
    }
  };

  const sortIcon = (col: CustomerSortColumn) => {
    if (sortBy !== col) return <ArrowUpDown className="w-3 h-3 ml-1 opacity-40" />;
    return sortOrder === 'asc'
      ? <ArrowUp className="w-3 h-3 ml-1" />
      : <ArrowDown className="w-3 h-3 ml-1" />;
  };

  // Auto-fetch when filters change, debounced while typing search terms
  useEffect(() => {
    if (!canViewCustomers) return;
    const timeoutId = window.setTimeout(() => {
      fetchCustomers(getActiveFilters(), currentPage, pageSize);
    }, searchTerm.trim().length > 0 ? 400 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, filters, currentPage, pageSize, canViewCustomers, sortBy, sortOrder]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filters, sortBy, sortOrder]);

  // Auto-open customer modal when ?customerId=... is in URL (deep link from Sales)
  const [searchParams, setSearchParams] = useSearchParams();
  useEffect(() => {
    const customerId = searchParams.get('customerId');
    if (!customerId || !canViewCustomers) return;
    (async () => {
      const { data } = await supabase
        .from('customers')
        .select('*')
        .eq('id', customerId)
        .maybeSingle();
      if (data) {
        setSelectedCustomer(data as Customer);
        setIsCustomerModalOpen(true);
      }
      const next = new URLSearchParams(searchParams);
      next.delete('customerId');
      setSearchParams(next, { replace: true });
    })();
  }, [searchParams, canViewCustomers]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('es-CL', {
      style: 'currency',
      currency: 'CLP',
      minimumFractionDigits: 0
    }).format(price);
  };

  const formatRunas = (runas: number) => {
    return new Intl.NumberFormat('es-CL').format(runas);
  };

  const getEstadoBadgeVariant = (estado: EstadoCliente | undefined) => {
    switch (estado) {
      case 'Activo': return 'default';
      case 'Inactivo': return 'secondary';
      case 'Bloqueado': return 'destructive';
      default: return 'outline';
    }
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setIsCustomerModalOpen(true);
  };

  const handleDeleteCustomer = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalType('deactivate');
    setIsDeleteModalOpen(true);
  };

  const handleDeleteCustomerPermanently = (customer: Customer) => {
    setCustomerToDelete(customer);
    setDeleteModalType('permanent');
    setIsDeleteModalOpen(true);
  };

  const handleConfirmDeactivate = async (customer: Customer) => {
    const success = await deleteCustomer(customer.id);
    if (success) {
      fetchCustomers(getActiveFilters(), currentPage, pageSize);
    }
  };

  const handleConfirmDeletePermanently = async (customer: Customer) => {
    const success = await deleteCustomerPermanently(customer.id);
    if (success) {
      fetchCustomers(getActiveFilters(), currentPage, pageSize);
    }
  };

  const handleCloseDeleteModal = () => {
    setIsDeleteModalOpen(false);
    setDeleteModalType(null);
    setCustomerToDelete(null);
  };

  const handleCustomerCreated = () => {
    setIsNewCustomerModalOpen(false);
    fetchCustomers(getActiveFilters(), currentPage, pageSize);
  };

  const handleCustomerUpdated = () => {
    setIsCustomerModalOpen(false);
    fetchCustomers(getActiveFilters(), currentPage, pageSize);
  };

  const handleManageAuth = (customer: Customer) => {
    setSelectedCustomerForPassword(customer);
    setShowPasswordModal(true);
  };

  return (
    <div className="space-y-6">
      <Tabs defaultValue="lista" className="w-full">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <TabsList>
            <TabsTrigger value="lista">Clientes</TabsTrigger>
            <TabsTrigger value="etiquetas">Etiquetas</TabsTrigger>
          </TabsList>
          <div className="flex gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Exportar
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem onClick={() => exportCustomersCSV(getActiveFilters())}>
                  <FileSpreadsheet className="w-4 h-4 mr-2" />
                  CSV
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => exportCustomersPDF(getActiveFilters())}>
                  <FileText className="w-4 h-4 mr-2" />
                  PDF
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
            {canManageCustomers && (
              <div className="flex gap-2">
                <Button variant="outline" onClick={() => setShowInviteCustomerDialog(true)}>
                  <Mail className="w-4 h-4 mr-2" />
                  Invitar Cliente
                </Button>
                <Button onClick={() => setIsNewCustomerModalOpen(true)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Nuevo Cliente
                </Button>
              </div>
            )}
          </div>
        </div>

        <TabsContent value="etiquetas" className="mt-4">
          <CustomerTagsManager />
        </TabsContent>

        <TabsContent value="lista" className="mt-4 space-y-6">

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center shrink-0">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Total Clientes</p>
                <p className="text-lg md:text-xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center shrink-0">
                <Badge className="w-4 h-4 text-green-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Activos</p>
                <p className="text-lg md:text-xl font-bold">
                  {customers.filter(c => c.estado_cliente === 'Activo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center shrink-0">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Total Runas</p>
                <p className="text-lg md:text-xl font-bold">
                  {formatRunas(totalRunasSum)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-3 md:p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center shrink-0">
                <Coins className="w-4 h-4 text-purple-600" />
              </div>
              <div className="min-w-0">
                <p className="text-xs md:text-sm text-muted-foreground truncate">Valor Runas</p>
                <p className="text-lg md:text-xl font-bold truncate">
                  {formatPrice(totalRunasValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-3 md:p-4">
          <div className="flex flex-col md:flex-row gap-3 md:gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
                <Input
                  placeholder="Buscar por nombre, email, teléfono o RUT..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 md:flex md:flex-row gap-2 md:gap-4">
              {/* Estado Filter */}
              <Select
                value={filters.estado || 'Activo'}
                onValueChange={(value) => {
                  if (value === 'all') {
                    setFilters({...filters, estado: undefined});
                  } else {
                    setFilters({...filters, estado: value as EstadoCliente});
                  }
                }}
              >
                <SelectTrigger className="w-full md:w-[180px]">
                  <SelectValue placeholder="Todos los estados" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos los estados</SelectItem>
                  <SelectItem value="Activo">Activo</SelectItem>
                  <SelectItem value="Inactivo">Inactivo</SelectItem>
                  <SelectItem value="Bloqueado">Bloqueado</SelectItem>
                </SelectContent>
              </Select>

              {/* Has Runas Filter */}
              <Select
                value={filters.hasRunas ? 'true' : filters.hasRunas === false ? 'false' : 'all'}
                onValueChange={(value) => setFilters({...filters, hasRunas: value === 'true' ? true : value === 'false' ? false : undefined})}
              >
                <SelectTrigger className="w-full md:w-[150px]">
                  <SelectValue placeholder="Runas" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="true">Con Runas</SelectItem>
                  <SelectItem value="false">Sin Runas</SelectItem>
                </SelectContent>
              </Select>

              {/* Tag Filter */}
              <Select
                value={filters.tagId || 'all'}
                onValueChange={(value) => setFilters({...filters, tagId: value === 'all' ? undefined : value})}
              >
                <SelectTrigger className="col-span-2 w-full md:w-[200px]">
                  <div className="flex items-center gap-2 min-w-0">
                    <Tag className="w-4 h-4 shrink-0" />
                    <SelectValue placeholder="Etiqueta" />
                  </div>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas las etiquetas</SelectItem>
                  {tags.map((tag) => (
                    <SelectItem key={tag.id} value={tag.id}>
                      <span className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        />
                        {tag.name}
                        {typeof tag.customer_count === 'number' && (
                          <span className="text-xs text-muted-foreground">({tag.customer_count})</span>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card className="relative">
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent className="relative">
          {/* Loading overlay to prevent visual jumps while keeping previous list visible */}
          {loading && customers.length > 0 && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-start justify-center pt-20 z-10 rounded-lg">
              <div className="flex flex-col items-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                <span className="text-sm text-muted-foreground mt-2">Actualizando clientes...</span>
              </div>
            </div>
          )}

          {/* Desktop table */}
          <div className={`hidden md:block ${loading && customers.length > 0 ? 'pointer-events-none opacity-60' : ''}`}>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button onClick={() => handleSort('nombres')} className="flex items-center hover:text-foreground transition-colors">
                      Cliente {sortIcon('nombres')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('email')} className="flex items-center hover:text-foreground transition-colors">
                      Contacto {sortIcon('email')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('cantidad_runas')} className="flex items-center hover:text-foreground transition-colors">
                      Runas {sortIcon('cantidad_runas')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('valor_cliente')} className="flex items-center hover:text-foreground transition-colors">
                      Valor Cliente {sortIcon('valor_cliente')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('estado_cliente')} className="flex items-center hover:text-foreground transition-colors">
                      Estado {sortIcon('estado_cliente')}
                    </button>
                  </TableHead>
                  <TableHead>
                    <button onClick={() => handleSort('ultima_compra')} className="flex items-center hover:text-foreground transition-colors">
                      Última Compra {sortIcon('ultima_compra')}
                    </button>
                  </TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading && customers.length === 0 ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={`skel-${i}`}>
                      <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-40" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16 mx-auto" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-16" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-20" /></TableCell>
                      <TableCell><Skeleton className="h-4 w-6" /></TableCell>
                    </TableRow>
                  ))
                ) : customers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      {searchTerm.length >= 3 || Object.keys(filters).some(key => filters[key as keyof CustomerFilters]) 
                        ? 'No se encontraron clientes con los filtros aplicados'
                        : 'No hay clientes registrados'}
                    </TableCell>
                  </TableRow>
                ) : (
                  customers.map((customer) => (
                    <TableRow key={customer.id}>
                      <TableCell>
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">
                              {customer.nombres || customer.name} {customer.apellidos || customer.apellido}
                            </p>
                            {customer.is_vip && (
                              <span className="inline-flex items-center rounded-full bg-yellow-100 px-2 py-0.5 text-xs font-medium text-yellow-800 border border-yellow-300">
                                <Crown className="w-3 h-3 mr-1" />
                                VIP
                              </span>
                            )}
                          </div>
                          {customer.rut && (
                            <p className="text-sm text-muted-foreground">{customer.rut}</p>
                          )}
                          <div className="max-w-[260px]">
                            <CustomerTagChips customerId={customer.id} size="sm" editable={false} />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div>
                          {customer.email && (
                            <p className="text-sm">{customer.email}</p>
                          )}
                          {customer.phone && (
                            <p className="text-sm text-muted-foreground">{customer.phone}</p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-center">
                          <p className="font-medium">{formatRunas(customer.cantidad_runas || 0)}</p>
                          <p className="text-xs text-muted-foreground">runas</p>
                        </div>
                      </TableCell>
                      <TableCell>
                        {formatPrice(customer.valor_cliente || 0)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getEstadoBadgeVariant(customer.estado_cliente)}>
                          {customer.estado_cliente || 'Activo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {customer.ultima_compra ? (
                          <p className="text-sm">
                            {format(new Date(customer.ultima_compra), 'dd MMM yyyy', { locale: es })}
                          </p>
                        ) : (
                          <p className="text-sm text-muted-foreground">Ninguna</p>
                        )}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreHorizontal className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                              <Eye className="w-4 h-4 mr-2" />
                              Ver Detalles
                            </DropdownMenuItem>
                            {canManageCustomers && (
                              <>
                                <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                  <Edit className="w-4 h-4 mr-2" />
                                  Editar
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => handleManageAuth(customer)}>
                                  <Shield className="w-4 h-4 mr-2" />
                                  Gestionar cuenta
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCustomer(customer)}
                                  className="text-red-600"
                                >
                                  <Trash2 className="w-4 h-4 mr-2" />
                                  Desactivar
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleDeleteCustomerPermanently(customer)}
                                  className="text-red-800 bg-red-50 focus:bg-red-100"
                                >
                                  <X className="w-4 h-4 mr-2" />
                                  Eliminar definitivamente
                                </DropdownMenuItem>
                              </>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile card list */}
          <div className={`md:hidden space-y-2 ${loading && customers.length > 0 ? 'pointer-events-none opacity-60' : ''}`}>
            {loading && customers.length === 0 ? (
              Array.from({ length: 4 }).map((_, i) => (
                <div key={`mob-skel-${i}`} className="rounded-lg border border-border bg-card p-3 space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1 space-y-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-40" />
                    </div>
                    <Skeleton className="h-8 w-8 rounded-md" />
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center pt-2 border-t border-border/60">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-full" />
                  </div>
                </div>
              ))
            ) : customers.length === 0 ? (
              <p className="text-center py-8 text-sm text-muted-foreground">
                {searchTerm.length >= 3 || Object.keys(filters).some(key => filters[key as keyof CustomerFilters])
                  ? 'No se encontraron clientes con los filtros aplicados'
                  : 'No hay clientes registrados'}
              </p>
            ) : (
              customers.map((customer) => (
                <div
                  key={customer.id}
                  className="rounded-lg border border-border bg-card p-3 active:bg-accent/40 transition-colors"
                  onClick={() => handleViewCustomer(customer)}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="font-medium text-sm truncate">
                          {customer.nombres || customer.name} {customer.apellidos || customer.apellido}
                        </p>
                        {customer.is_vip && (
                          <span className="inline-flex items-center rounded-full bg-yellow-100 px-1.5 py-0.5 text-[10px] font-medium text-yellow-800 border border-yellow-300">
                            <Crown className="w-2.5 h-2.5 mr-0.5" />
                            VIP
                          </span>
                        )}
                        <Badge variant={getEstadoBadgeVariant(customer.estado_cliente)} className="text-[10px] px-1.5 py-0">
                          {customer.estado_cliente || 'Activo'}
                        </Badge>
                      </div>
                      {customer.email && (
                        <p className="text-xs text-muted-foreground truncate mt-0.5">{customer.email}</p>
                      )}
                      {customer.phone && (
                        <p className="text-xs text-muted-foreground truncate">{customer.phone}</p>
                      )}
                    </div>
                    <div onClick={(e) => e.stopPropagation()}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="z-[60]">
                          <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                            <Eye className="w-4 h-4 mr-2" />
                            Ver Detalles
                          </DropdownMenuItem>
                          {canManageCustomers && (
                            <>
                              <DropdownMenuItem onClick={() => handleViewCustomer(customer)}>
                                <Edit className="w-4 h-4 mr-2" />
                                Editar
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleManageAuth(customer)}>
                                <Shield className="w-4 h-4 mr-2" />
                                Gestionar cuenta
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDeleteCustomer(customer)}
                                className="text-red-600"
                              >
                                <Trash2 className="w-4 h-4 mr-2" />
                                Desactivar
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={() => handleDeleteCustomerPermanently(customer)}
                                className="text-red-800 bg-red-50 focus:bg-red-100"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Eliminar definitivamente
                              </DropdownMenuItem>
                            </>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>

                  <div className="mt-2 grid grid-cols-3 gap-2 text-center border-t border-border/60 pt-2">
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Runas</p>
                      <p className="text-sm font-semibold">{formatRunas(customer.cantidad_runas || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Valor</p>
                      <p className="text-sm font-semibold">{formatPrice(customer.valor_cliente || 0)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wide">Últ. compra</p>
                      <p className="text-xs font-medium">
                        {customer.ultima_compra
                          ? format(new Date(customer.ultima_compra), 'dd MMM', { locale: es })
                          : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pagination */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <p className="text-sm text-muted-foreground">
            Mostrando {totalCount === 0 ? 0 : currentPage * pageSize + 1} - {Math.min((currentPage + 1) * pageSize, totalCount)} de {totalCount} clientes
          </p>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">Por página:</span>
            <Select 
              value={pageSize.toString()} 
              onValueChange={(value) => {
                setPageSize(parseInt(value));
                setCurrentPage(0); // Reset to first page when changing page size
              }}
            >
              <SelectTrigger className="w-[80px] h-8">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="10">10</SelectItem>
                <SelectItem value="25">25</SelectItem>
                <SelectItem value="50">50</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex items-center space-x-2">
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(Math.max(0, currentPage - 1))}
            disabled={currentPage === 0}
          >
            Anterior
          </Button>
          <span className="text-sm text-muted-foreground px-2">
            Página {currentPage + 1} de {Math.max(1, Math.ceil(totalCount / pageSize))}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setCurrentPage(currentPage + 1)}
            disabled={(currentPage + 1) * pageSize >= totalCount}
          >
            Siguiente
          </Button>
        </div>
      </div>
        </TabsContent>
      </Tabs>

      {/* New Customer Modal */}
      <Dialog open={isNewCustomerModalOpen} onOpenChange={setIsNewCustomerModalOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Nuevo Cliente</DialogTitle>
          </DialogHeader>
          <CustomerForm onSuccess={handleCustomerCreated} />
        </DialogContent>
      </Dialog>

      {/* Customer Details Modal */}
      <Dialog open={isCustomerModalOpen} onOpenChange={setIsCustomerModalOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {selectedCustomer?.nombres || selectedCustomer?.name} {selectedCustomer?.apellidos || selectedCustomer?.apellido}
            </DialogTitle>
          </DialogHeader>
          
          {selectedCustomer && (
            <Tabs defaultValue="datos" className="w-full">
              <TabsList className="flex w-full overflow-x-auto md:grid md:grid-cols-6">
                <TabsTrigger value="datos" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Datos</TabsTrigger>
                <TabsTrigger value="direcciones" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Direcciones</TabsTrigger>
                <TabsTrigger value="runas" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Runas</TabsTrigger>
                <TabsTrigger value="niveles" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Niveles</TabsTrigger>
                <TabsTrigger value="suscripciones" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Suscripciones</TabsTrigger>
                <TabsTrigger value="pedidos" className="whitespace-nowrap text-xs md:text-sm px-2 md:px-3">Pedidos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="datos" className="space-y-4">
                <div className="rounded-lg border p-4 space-y-2">
                  <p className="text-sm font-medium">Etiquetas</p>
                  <CustomerTagChips customerId={selectedCustomer.id} />
                </div>
                <CustomerForm
                  customer={selectedCustomer}
                  onSuccess={handleCustomerUpdated}
                />
              </TabsContent>
              
              <TabsContent value="direcciones" className="space-y-4">
                <CustomerAddresses customerId={selectedCustomer.id} />
              </TabsContent>
              
              <TabsContent value="runas" className="space-y-4">
                <CustomerRunes 
                  customerId={selectedCustomer.id} 
                  onRunasChange={(newBalance) => {
                    updateCustomerInList(selectedCustomer.id, { cantidad_runas: newBalance });
                    setSelectedCustomer(prev => prev ? { ...prev, cantidad_runas: newBalance } : prev);
                  }}
                />
              </TabsContent>

              <TabsContent value="niveles" className="space-y-4">
                <CustomerLevelsBadges customerId={selectedCustomer.id} />
              </TabsContent>
              
              <TabsContent value="suscripciones" className="space-y-6">
                <CustomerDiscountSubscription customerId={selectedCustomer.id} />
                <CustomerRunaSubscriptions 
                  customerId={selectedCustomer.id} 
                  customerBirthday={selectedCustomer.fecha_nacimiento}
                />
              </TabsContent>
              
              <TabsContent value="pedidos" className="space-y-4">
                <CustomerOrders customerId={selectedCustomer.id} />
              </TabsContent>
            </Tabs>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Customer Modal */}
      <DeleteCustomerModal
        customer={customerToDelete}
        isOpen={isDeleteModalOpen}
        onClose={handleCloseDeleteModal}
        onConfirmDeactivate={handleConfirmDeactivate}
        onConfirmDeletePermanently={handleConfirmDeletePermanently}
        type={deleteModalType}
      />

      {/* Auth Management Modal */}
      <CustomerAuthManagementModal
        customer={selectedCustomerForPassword}
        isOpen={showPasswordModal}
        onClose={() => {
          setShowPasswordModal(false);
          setSelectedCustomerForPassword(null);
        }}
        onAuthUpdated={() => fetchCustomers(getActiveFilters(), currentPage, pageSize)}
      />

      <InviteCustomerDialog
        open={showInviteCustomerDialog}
        onOpenChange={setShowInviteCustomerDialog}
        currentUser={currentUser}
      />
    </div>
  );
}