import { useState, useEffect } from 'react';
import { Plus, Search, Filter, MoreHorizontal, Edit, Trash2, Eye, Coins, CreditCard, Download, X, Shield } from "lucide-react";
import { useRunasConfig } from '@/hooks/useRunasConfig';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCustomers, CustomerFilters } from '@/hooks/useCustomers';
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
  const [currentPage, setCurrentPage] = useState(0);
  const [pageSize, setPageSize] = useState(25);
  
  const {
    customers,
    loading,
    totalCount,
    canManageCustomers,
    fetchCustomers,
    deleteCustomer,
    deleteCustomerPermanently,
    updateCustomerInList,
    exportCustomersCSV
  } = useCustomers({ autoFetch: false });

  const { runaRedemptionValue } = useRunasConfig();

  const totalRunas = customers.reduce((sum, c) => sum + (c.cantidad_runas || 0), 0);
  const totalRunasValue = totalRunas * runaRedemptionValue;

  const getActiveFilters = (): CustomerFilters => ({
    ...filters,
    search: searchTerm.trim().length >= 3 ? searchTerm.trim() : undefined
  });

  // Auto-fetch when filters change, debounced while typing search terms
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      fetchCustomers(getActiveFilters(), currentPage, pageSize);
    }, searchTerm.trim().length > 0 ? 400 : 0);

    return () => window.clearTimeout(timeoutId);
  }, [searchTerm, filters, currentPage, pageSize]);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchTerm, filters]);

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
      {/* Header */}
      <div className="flex items-center justify-end">
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            onClick={exportCustomersCSV}
            className="flex items-center gap-2"
          >
            <Download className="h-4 w-4" />
            Exportar CSV
          </Button>
          {canManageCustomers && (
            <Button onClick={() => setIsNewCustomerModalOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Nuevo Cliente
            </Button>
          )}
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-primary/10 rounded-lg flex items-center justify-center">
                <Plus className="w-4 h-4 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Clientes</p>
                <p className="text-xl font-bold">{totalCount}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                <Badge className="w-4 h-4 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Activos</p>
                <p className="text-xl font-bold">
                  {customers.filter(c => c.estado_cliente === 'Activo').length}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                <CreditCard className="w-4 h-4 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Runas</p>
                <p className="text-xl font-bold">
                  {formatRunas(totalRunas)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                <Coins className="w-4 h-4 text-purple-600" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Valor Runas</p>
                <p className="text-xl font-bold">
                  {formatPrice(totalRunasValue)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
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
              <SelectTrigger className="w-[180px]">
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
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Runas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="true">Con Runas</SelectItem>
                <SelectItem value="false">Sin Runas</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Customers Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lista de Clientes</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Contacto</TableHead>
                  <TableHead>Runas</TableHead>
                  <TableHead>Valor Cliente</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última Compra</TableHead>
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.length === 0 ? (
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
                        <div>
                          <p className="font-medium">
                            {customer.nombres || customer.name} {customer.apellidos || customer.apellido}
                          </p>
                          {customer.rut && (
                            <p className="text-sm text-muted-foreground">{customer.rut}</p>
                          )}
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
          )}
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
              <TabsList className="grid w-full grid-cols-6">
                <TabsTrigger value="datos">Datos</TabsTrigger>
                <TabsTrigger value="direcciones">Direcciones</TabsTrigger>
                <TabsTrigger value="runas">Runas</TabsTrigger>
                <TabsTrigger value="niveles">Niveles</TabsTrigger>
                <TabsTrigger value="suscripciones">Suscripciones</TabsTrigger>
                <TabsTrigger value="pedidos">Pedidos</TabsTrigger>
              </TabsList>
              
              <TabsContent value="datos" className="space-y-4">
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
    </div>
  );
}