import { useState, useEffect } from 'react';
import { useFinanceSettings } from '@/hooks/useFinanceSettings';
import { useFinanceExpenseCategories } from '@/hooks/useFinanceExpenseCategories';
import { usePaymentMethods } from '@/hooks/usePaymentMethods';
import { useUsers } from '@/hooks/useUsers';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { 
  Building2, 
  Calculator, 
  Receipt, 
  Bell, 
  Save, 
  Loader2,
  Tag,
  CreditCard,
  Plus,
  Pencil,
  Trash2,
  CalendarDays,
  Info
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const DIAS_SEMANA = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];

export default function FinanceConfig() {
  const { settings, loading, saving, updateSettings, getNextClosureDate } = useFinanceSettings();
  const { categories, createCategory, updateCategory, deleteCategory } = useFinanceExpenseCategories();
  const { paymentMethods, updatePaymentMethod } = usePaymentMethods();
  const { users, fetchUsers } = useUsers();
  const { toast } = useToast();
  
  // Local state for each card
  const [businessData, setBusinessData] = useState({
    razon_social: '',
    nombre_fantasia: '',
    rut: '',
    giro: '',
    direccion_tributaria: '',
    comuna: '',
    ciudad: 'Santiago',
    pais: 'Chile',
    correo_contable: '',
    telefono_contable: '',
    banco_principal: '',
    fecha_inicio_actividades: '',
  });
  
  const [periodData, setPeriodData] = useState({
    aplicar_redondeo: false,
    regla_redondeo: 'entero' as 'entero' | '1_decimal' | '2_decimales',
    periodo_cierre: 'manual' as 'mensual' | 'semanal' | 'manual',
    dia_corte_mensual: 1,
    dia_corte_semanal: 'Lunes',
  });
  
  const [expenseRules, setExpenseRules] = useState({
    monto_min_orden_compra: 0,
    monto_max_caja_chica: 0,
    exigir_documento_sobre_monto: false,
    monto_exigir_documento: 0,
  });
  
  const [alertsData, setAlertsData] = useState({
    monto_aprobacion_oc: 0,
    usuarios_aprobadores_oc: [] as string[],
    alerta_egreso_sobre_monto: false,
    monto_alerta_egreso: 0,
    alerta_cierre_financiero: false,
    correos_notificacion: '',
  });

  // Modal states
  const [categoryModalOpen, setCategoryModalOpen] = useState(false);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategory, setEditingCategory] = useState<string | null>(null);

  // Load users on mount
  useEffect(() => {
    fetchUsers();
  }, []);

  // Sync local state with settings
  useEffect(() => {
    if (settings) {
      setBusinessData({
        razon_social: settings.razon_social || '',
        nombre_fantasia: settings.nombre_fantasia || '',
        rut: settings.rut || '',
        giro: settings.giro || '',
        direccion_tributaria: settings.direccion_tributaria || '',
        comuna: settings.comuna || '',
        ciudad: settings.ciudad || 'Santiago',
        pais: settings.pais || 'Chile',
        correo_contable: settings.correo_contable || '',
        telefono_contable: settings.telefono_contable || '',
        banco_principal: settings.banco_principal || '',
        fecha_inicio_actividades: settings.fecha_inicio_actividades || '',
      });
      
      setPeriodData({
        aplicar_redondeo: settings.aplicar_redondeo,
        regla_redondeo: settings.regla_redondeo,
        periodo_cierre: settings.periodo_cierre,
        dia_corte_mensual: settings.dia_corte_mensual || 1,
        dia_corte_semanal: settings.dia_corte_semanal || 'Lunes',
      });
      
      setExpenseRules({
        monto_min_orden_compra: settings.monto_min_orden_compra,
        monto_max_caja_chica: settings.monto_max_caja_chica,
        exigir_documento_sobre_monto: settings.exigir_documento_sobre_monto,
        monto_exigir_documento: settings.monto_exigir_documento,
      });
      
      setAlertsData({
        monto_aprobacion_oc: settings.monto_aprobacion_oc,
        usuarios_aprobadores_oc: settings.usuarios_aprobadores_oc || [],
        alerta_egreso_sobre_monto: settings.alerta_egreso_sobre_monto,
        monto_alerta_egreso: settings.monto_alerta_egreso,
        alerta_cierre_financiero: settings.alerta_cierre_financiero,
        correos_notificacion: settings.correos_notificacion || '',
      });
    }
  }, [settings]);

  const handleSaveBusinessData = async () => {
    await updateSettings(businessData);
  };

  const handleSavePeriodData = async () => {
    await updateSettings(periodData);
  };

  const handleSaveExpenseRules = async () => {
    await updateSettings(expenseRules);
  };

  const handleSaveAlertsData = async () => {
    await updateSettings(alertsData);
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    const success = await createCategory(newCategoryName.trim());
    if (success) {
      setNewCategoryName('');
    }
  };

  const handleToggleApprover = (userId: string) => {
    setAlertsData(prev => ({
      ...prev,
      usuarios_aprobadores_oc: prev.usuarios_aprobadores_oc.includes(userId)
        ? prev.usuarios_aprobadores_oc.filter(id => id !== userId)
        : [...prev.usuarios_aprobadores_oc, userId]
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configuración Financiera</h1>
        <p className="text-muted-foreground mt-1">
          Configura los parámetros del negocio, períodos de cierre, reglas de egresos y alertas.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Card 1: Datos del Negocio */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Building2 className="h-5 w-5" />
              Datos del Negocio y Facturación
            </CardTitle>
            <CardDescription>
              Información legal y tributaria del negocio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <Label>Razón Social</Label>
                <Input
                  value={businessData.razon_social}
                  onChange={(e) => setBusinessData({ ...businessData, razon_social: e.target.value })}
                  placeholder="Ej: Paganos SpA"
                />
              </div>
              
              <div>
                <Label>Nombre de Fantasía</Label>
                <Input
                  value={businessData.nombre_fantasia}
                  onChange={(e) => setBusinessData({ ...businessData, nombre_fantasia: e.target.value })}
                  placeholder="Ej: Paganos Burger"
                />
              </div>
              
              <div>
                <Label>RUT</Label>
                <Input
                  value={businessData.rut}
                  onChange={(e) => setBusinessData({ ...businessData, rut: e.target.value })}
                  placeholder="Ej: 76.123.456-7"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Giro</Label>
                <Input
                  value={businessData.giro}
                  onChange={(e) => setBusinessData({ ...businessData, giro: e.target.value })}
                  placeholder="Ej: Restaurante y Venta de Comida Preparada"
                />
              </div>
              
              <div className="col-span-2">
                <Label>Dirección Tributaria</Label>
                <Input
                  value={businessData.direccion_tributaria}
                  onChange={(e) => setBusinessData({ ...businessData, direccion_tributaria: e.target.value })}
                  placeholder="Ej: Av. Principal 1234"
                />
              </div>
              
              <div>
                <Label>Comuna</Label>
                <Input
                  value={businessData.comuna}
                  onChange={(e) => setBusinessData({ ...businessData, comuna: e.target.value })}
                  placeholder="Ej: Santiago"
                />
              </div>
              
              <div>
                <Label>Ciudad</Label>
                <Input
                  value={businessData.ciudad}
                  onChange={(e) => setBusinessData({ ...businessData, ciudad: e.target.value })}
                />
              </div>
              
              <div>
                <Label>Correo Contable</Label>
                <Input
                  type="email"
                  value={businessData.correo_contable}
                  onChange={(e) => setBusinessData({ ...businessData, correo_contable: e.target.value })}
                  placeholder="contabilidad@ejemplo.cl"
                />
              </div>
              
              <div>
                <Label>Teléfono Contable</Label>
                <Input
                  value={businessData.telefono_contable}
                  onChange={(e) => setBusinessData({ ...businessData, telefono_contable: e.target.value })}
                  placeholder="+56 9 1234 5678"
                />
              </div>
              
              <div>
                <Label>Banco Principal</Label>
                <Input
                  value={businessData.banco_principal}
                  onChange={(e) => setBusinessData({ ...businessData, banco_principal: e.target.value })}
                  placeholder="Ej: Banco Estado"
                />
              </div>
              
              <div>
                <Label>Inicio de Actividades</Label>
                <Input
                  type="date"
                  value={businessData.fecha_inicio_actividades}
                  onChange={(e) => setBusinessData({ ...businessData, fecha_inicio_actividades: e.target.value })}
                />
              </div>
            </div>
            
            <Button onClick={handleSaveBusinessData} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Datos del Negocio
            </Button>
          </CardContent>
        </Card>

        {/* Card 2: Parámetros de Período y Moneda */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Parámetros de Período y Moneda
            </CardTitle>
            <CardDescription>
              Configuración de cierres financieros y redondeo
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Moneda</Label>
              <Input value="CLP – Peso Chileno" disabled className="bg-muted" />
            </div>
            
            <Separator />
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Aplicar redondeo automático</Label>
                <p className="text-sm text-muted-foreground">En reportes y exportaciones</p>
              </div>
              <Switch
                checked={periodData.aplicar_redondeo}
                onCheckedChange={(checked) => setPeriodData({ ...periodData, aplicar_redondeo: checked })}
              />
            </div>
            
            {periodData.aplicar_redondeo && (
              <div>
                <Label>Regla de redondeo</Label>
                <Select
                  value={periodData.regla_redondeo}
                  onValueChange={(v) => setPeriodData({ ...periodData, regla_redondeo: v as any })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="entero">Redondear a entero</SelectItem>
                    <SelectItem value="1_decimal">Redondear a 1 decimal</SelectItem>
                    <SelectItem value="2_decimales">Redondear a 2 decimales</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <Separator />
            
            <div>
              <Label>Período de cierre financiero</Label>
              <Select
                value={periodData.periodo_cierre}
                onValueChange={(v) => setPeriodData({ ...periodData, periodo_cierre: v as any })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mensual">Mensual</SelectItem>
                  <SelectItem value="semanal">Semanal</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            {periodData.periodo_cierre === 'mensual' && (
              <div>
                <Label>Día de corte mensual</Label>
                <Select
                  value={periodData.dia_corte_mensual.toString()}
                  onValueChange={(v) => setPeriodData({ ...periodData, dia_corte_mensual: parseInt(v) })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => (
                      <SelectItem key={day} value={day.toString()}>
                        Día {day}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {periodData.periodo_cierre === 'semanal' && (
              <div>
                <Label>Día de corte semanal</Label>
                <Select
                  value={periodData.dia_corte_semanal}
                  onValueChange={(v) => setPeriodData({ ...periodData, dia_corte_semanal: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {DIAS_SEMANA.map((dia) => (
                      <SelectItem key={dia} value={dia}>{dia}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div className="p-3 bg-muted rounded-lg">
              <div className="flex items-center gap-2 text-sm">
                <CalendarDays className="h-4 w-4" />
                <span className="font-medium">Próximo cierre sugerido:</span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                {getNextClosureDate()}
              </p>
            </div>
            
            <Button onClick={handleSavePeriodData} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Parámetros
            </Button>
          </CardContent>
        </Card>

        {/* Card 3: Reglas de Egresos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Receipt className="h-5 w-5" />
              Reglas de Egresos y Métodos de Pago
            </CardTitle>
            <CardDescription>
              Configuración de límites y documentación
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Reglas globales de egresos</h4>
              
              <div>
                <Label>Monto mínimo que requiere Orden de Compra</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={expenseRules.monto_min_orden_compra}
                    onChange={(e) => setExpenseRules({ ...expenseRules, monto_min_orden_compra: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Monto máximo de caja chica por egreso</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={expenseRules.monto_max_caja_chica}
                    onChange={(e) => setExpenseRules({ ...expenseRules, monto_max_caja_chica: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Exigir documento de respaldo</Label>
                  <p className="text-sm text-muted-foreground">Para egresos sobre un monto específico</p>
                </div>
                <Switch
                  checked={expenseRules.exigir_documento_sobre_monto}
                  onCheckedChange={(checked) => setExpenseRules({ ...expenseRules, exigir_documento_sobre_monto: checked })}
                />
              </div>
              
              {expenseRules.exigir_documento_sobre_monto && (
                <div>
                  <Label>Monto mínimo para exigir documento</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={expenseRules.monto_exigir_documento}
                      onChange={(e) => setExpenseRules({ ...expenseRules, monto_exigir_documento: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
            </div>
            
            <Separator />
            
            <div className="space-y-3">
              <h4 className="font-medium">Acceso rápido a configuración</h4>
              
              <div className="flex gap-2">
                <Dialog open={categoryModalOpen} onOpenChange={setCategoryModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <Tag className="h-4 w-4 mr-2" />
                      Categorías de egresos
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Configurar Categorías de Egresos</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="flex gap-2">
                        <Input
                          value={newCategoryName}
                          onChange={(e) => setNewCategoryName(e.target.value)}
                          placeholder="Nueva categoría..."
                          onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
                        />
                        <Button onClick={handleAddCategory}>
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar
                        </Button>
                      </div>
                      
                      <div className="space-y-2">
                        {categories.map((cat) => (
                          <div key={cat.id} className="flex items-center justify-between p-3 border rounded-lg">
                            <div className="flex-1">
                              {editingCategory === cat.id ? (
                                <Input
                                  defaultValue={cat.name}
                                  onBlur={(e) => {
                                    updateCategory(cat.id, { name: e.target.value });
                                    setEditingCategory(null);
                                  }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      updateCategory(cat.id, { name: (e.target as HTMLInputElement).value });
                                      setEditingCategory(null);
                                    }
                                  }}
                                  autoFocus
                                />
                              ) : (
                                <span className="font-medium">{cat.name}</span>
                              )}
                            </div>
                            
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`vat-${cat.id}`}
                                  checked={cat.include_vat}
                                  onCheckedChange={(checked) => updateCategory(cat.id, { include_vat: !!checked })}
                                />
                                <Label htmlFor={`vat-${cat.id}`} className="text-sm">Incluye IVA</Label>
                              </div>
                              
                              <div className="flex items-center gap-2">
                                <Checkbox
                                  id={`doc-${cat.id}`}
                                  checked={cat.requires_document}
                                  onCheckedChange={(checked) => updateCategory(cat.id, { requires_document: !!checked })}
                                />
                                <Label htmlFor={`doc-${cat.id}`} className="text-sm">Requiere documento</Label>
                              </div>
                              
                              <div className="flex gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setEditingCategory(cat.id)}
                                >
                                  <Pencil className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => {
                                    if (confirm(`¿Eliminar la categoría "${cat.name}"?`)) {
                                      deleteCategory(cat.id);
                                    }
                                  }}
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
                
                <Dialog open={paymentModalOpen} onOpenChange={setPaymentModalOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" className="flex-1">
                      <CreditCard className="h-4 w-4 mr-2" />
                      Métodos de pago
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                    <DialogHeader>
                      <DialogTitle>Configurar Métodos de Pago</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-2">
                      {paymentMethods.map((method) => (
                        <div key={method.id} className="flex items-center justify-between p-3 border rounded-lg">
                          <div className="flex-1">
                            <span className="font-medium">{method.display_name}</span>
                            <span className="text-sm text-muted-foreground ml-2">({method.name})</span>
                          </div>
                          
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`cash-${method.id}`}
                                checked={method.affects_cash_flow ?? true}
                                onCheckedChange={(checked) => updatePaymentMethod(method.id, { affects_cash_flow: !!checked })}
                              />
                              <Label htmlFor={`cash-${method.id}`} className="text-sm">Afecta flujo de caja</Label>
                            </div>
                            
                            <div className="flex items-center gap-2">
                              <Checkbox
                                id={`internal-${method.id}`}
                                checked={method.internal_only ?? false}
                                onCheckedChange={(checked) => updatePaymentMethod(method.id, { internal_only: !!checked })}
                              />
                              <Label htmlFor={`internal-${method.id}`} className="text-sm">Solo interno</Label>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="mt-4 p-3 bg-muted rounded-lg">
                      <div className="flex items-start gap-2">
                        <Info className="h-4 w-4 mt-0.5 text-muted-foreground" />
                        <p className="text-sm text-muted-foreground">
                          <strong>Afecta flujo de caja:</strong> El método se considera en reportes de flujo. 
                          <strong className="ml-2">Solo interno:</strong> Para medios como runas o colaciones que no son dinero real.
                        </p>
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            <Button onClick={handleSaveExpenseRules} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Reglas de Egresos
            </Button>
          </CardContent>
        </Card>

        {/* Card 4: Alertas y Permisos */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Alertas y Permisos Financieros
            </CardTitle>
            <CardDescription>
              Configuración de aprobaciones y notificaciones
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Aprobación de Órdenes de Compra</h4>
              
              <div>
                <Label>Monto desde el cual una OC requiere aprobación</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    type="number"
                    className="pl-8"
                    value={alertsData.monto_aprobacion_oc}
                    onChange={(e) => setAlertsData({ ...alertsData, monto_aprobacion_oc: parseInt(e.target.value) || 0 })}
                  />
                </div>
              </div>
              
              <div>
                <Label>Usuarios que pueden aprobar OCs</Label>
                <div className="mt-2 space-y-2 max-h-40 overflow-y-auto border rounded-lg p-2">
                  {users.filter(u => u.active && u.role === 'Administrador').map((user) => (
                    <div key={user.id} className="flex items-center gap-2">
                      <Checkbox
                        id={`approver-${user.id}`}
                        checked={alertsData.usuarios_aprobadores_oc.includes(user.id)}
                        onCheckedChange={() => handleToggleApprover(user.id)}
                      />
                      <Label htmlFor={`approver-${user.id}`} className="text-sm">
                        {user.full_name || user.username}
                        <Badge variant="outline" className="ml-2 text-xs">{user.role}</Badge>
                      </Label>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            
            <Separator />
            
            <div className="space-y-4">
              <h4 className="font-medium">Alertas por Correo</h4>
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alerta de egreso alto</Label>
                  <p className="text-sm text-muted-foreground">Enviar correo cuando se registre un egreso grande</p>
                </div>
                <Switch
                  checked={alertsData.alerta_egreso_sobre_monto}
                  onCheckedChange={(checked) => setAlertsData({ ...alertsData, alerta_egreso_sobre_monto: checked })}
                />
              </div>
              
              {alertsData.alerta_egreso_sobre_monto && (
                <div>
                  <Label>Monto mínimo para alerta</Label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                    <Input
                      type="number"
                      className="pl-8"
                      value={alertsData.monto_alerta_egreso}
                      onChange={(e) => setAlertsData({ ...alertsData, monto_alerta_egreso: parseInt(e.target.value) || 0 })}
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div>
                  <Label>Alerta de cierre financiero</Label>
                  <p className="text-sm text-muted-foreground">Enviar correo cuando se genere un cierre</p>
                </div>
                <Switch
                  checked={alertsData.alerta_cierre_financiero}
                  onCheckedChange={(checked) => setAlertsData({ ...alertsData, alerta_cierre_financiero: checked })}
                />
              </div>
              
              <div>
                <Label>Correos de notificación</Label>
                <Input
                  value={alertsData.correos_notificacion}
                  onChange={(e) => setAlertsData({ ...alertsData, correos_notificacion: e.target.value })}
                  placeholder="correo1@ejemplo.cl, correo2@ejemplo.cl"
                />
                <p className="text-xs text-muted-foreground mt-1">Separar múltiples correos con coma</p>
              </div>
            </div>
            
            <Button onClick={handleSaveAlertsData} disabled={saving} className="w-full">
              {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
              Guardar Alertas y Permisos
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
