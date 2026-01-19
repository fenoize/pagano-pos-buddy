import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Plus, Pencil, Trash2, Users, Briefcase, Clock, DollarSign, Loader2, CalendarClock } from 'lucide-react';
import { useHREmployees } from '@/hooks/useHREmployees';
import { useHRShiftConfig } from '@/hooks/useHRShiftConfig';
import { useHRSchedules } from '@/hooks/useHRSchedules';
import { useUsers } from '@/hooks/useUsers';
import { useAuthContext } from '@/contexts/AuthContext';
import { HREmployeeFormData, HRSchedule, HRScheduleFormData, HRSchedulePositionFormData } from '@/types/hr';
import { ScheduleCard } from '@/components/rrhh/ScheduleCard';
import { ScheduleFormModal } from '@/components/rrhh/ScheduleFormModal';
import { AddPositionModal } from '@/components/rrhh/AddPositionModal';

function RRHHConfiguracion() {
  const { user } = useAuthContext();
  const [activeTab, setActiveTab] = useState('personal');
  
  // Employees - pasamos el userId del contexto
  const { employees, loading: loadingEmployees, createEmployee, updateEmployee, toggleEmployeeStatus, deleteEmployee } = useHREmployees({ userId: user?.id });
  const { users, loading: loadingUsers, fetchUsers } = useUsers();
  
  // Cargar usuarios cuando haya sesión
  useEffect(() => {
    if (user?.id) {
      fetchUsers();
    }
  }, [user?.id, fetchUsers]);
  
  // Config - pasamos el userId del contexto
  const { 
    roles, shiftTypes, payRules, 
    loading: loadingConfig,
    createRole, updateRole, deleteRole,
    createShiftType, updateShiftType, deleteShiftType,
    updatePayRule,
  } = useHRShiftConfig({ userId: user?.id });

  // Schedules
  const {
    schedules,
    loading: loadingSchedules,
    createSchedule,
    updateSchedule,
    deleteSchedule,
    addPosition,
    removePosition
  } = useHRSchedules();
  
  // Employee Modal State
  const [employeeModalOpen, setEmployeeModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<any>(null);
  const [selectedUserId, setSelectedUserId] = useState<string>('');
  const [employeeForm, setEmployeeForm] = useState<HREmployeeFormData>({
    full_name: '',
    email: '',
    phone: '',
    rut: '',
    user_id: null,
    notes: '',
  });

  // Get users that are not yet employees
  const availableUsers = users.filter(u => 
    u.id && !employees.some(emp => emp.user_id === u.id)
  );
  
  // Role Modal State
  const [roleModalOpen, setRoleModalOpen] = useState(false);
  const [editingRole, setEditingRole] = useState<any>(null);
  const [roleForm, setRoleForm] = useState({ name: '', description: '' });
  
  // Shift Type Modal State  
  const [shiftTypeModalOpen, setShiftTypeModalOpen] = useState(false);
  const [editingShiftType, setEditingShiftType] = useState<any>(null);
  const [shiftTypeForm, setShiftTypeForm] = useState({ name: '', default_hours: 7 });
  
  // Pay Rule Modal State
  const [payRuleModalOpen, setPayRuleModalOpen] = useState(false);
  const [editingPayRule, setEditingPayRule] = useState<any>(null);
  const [payRuleForm, setPayRuleForm] = useState({ pay_per_shift: 0 });

  // Schedule Modal State
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<HRSchedule | null>(null);
  const [addPositionModalOpen, setAddPositionModalOpen] = useState(false);
  const [addPositionScheduleId, setAddPositionScheduleId] = useState<string>('');


  const formatCLP = (amount: number) => {
    return new Intl.NumberFormat('es-CL', { style: 'currency', currency: 'CLP', maximumFractionDigits: 0 }).format(amount);
  };

  // Employee handlers
  const handleOpenEmployeeModal = (employee?: any) => {
    if (employee) {
      setEditingEmployee(employee);
      setSelectedUserId(employee.user_id || '');
      setEmployeeForm({
        full_name: employee.full_name,
        email: employee.email || '',
        phone: employee.phone || '',
        rut: employee.rut || '',
        user_id: employee.user_id,
        notes: employee.notes || '',
      });
    } else {
      setEditingEmployee(null);
      setSelectedUserId('');
      setEmployeeForm({ full_name: '', email: '', phone: '', rut: '', user_id: null, notes: '' });
    }
    setEmployeeModalOpen(true);
  };

  const handleUserSelect = (userId: string) => {
    setSelectedUserId(userId);
    const user = users.find(u => u.id === userId);
    if (user) {
      setEmployeeForm(f => ({
        ...f,
        full_name: user.full_name || '',
        email: user.email || '',
        user_id: userId,
      }));
    }
  };

  const handleSaveEmployee = async () => {
    try {
      if (editingEmployee) {
        await updateEmployee(editingEmployee.id, employeeForm);
      } else {
        await createEmployee(employeeForm);
      }
      setEmployeeModalOpen(false);
    } catch (e) {
      // Error already shown by hook
    }
  };

  // Role handlers
  const handleOpenRoleModal = (role?: any) => {
    if (role) {
      setEditingRole(role);
      setRoleForm({ name: role.name, description: role.description || '' });
    } else {
      setEditingRole(null);
      setRoleForm({ name: '', description: '' });
    }
    setRoleModalOpen(true);
  };

  const handleSaveRole = async () => {
    try {
      if (editingRole) {
        await updateRole(editingRole.id, roleForm);
      } else {
        await createRole(roleForm.name, roleForm.description);
      }
      setRoleModalOpen(false);
    } catch (e) {}
  };

  // Shift Type handlers
  const handleOpenShiftTypeModal = (type?: any) => {
    if (type) {
      setEditingShiftType(type);
      setShiftTypeForm({ name: type.name, default_hours: type.default_hours });
    } else {
      setEditingShiftType(null);
      setShiftTypeForm({ name: '', default_hours: 7 });
    }
    setShiftTypeModalOpen(true);
  };

  const handleSaveShiftType = async () => {
    try {
      if (editingShiftType) {
        await updateShiftType(editingShiftType.id, shiftTypeForm);
      } else {
        await createShiftType(shiftTypeForm.name, shiftTypeForm.default_hours);
      }
      setShiftTypeModalOpen(false);
    } catch (e) {}
  };

  // Pay Rule handlers
  const handleOpenPayRuleModal = (rule: any) => {
    setEditingPayRule(rule);
    setPayRuleForm({ pay_per_shift: rule.pay_per_shift });
    setPayRuleModalOpen(true);
  };

  const handleSavePayRule = async () => {
    try {
      await updatePayRule(editingPayRule.id, { pay_per_shift: payRuleForm.pay_per_shift });
      setPayRuleModalOpen(false);
    } catch (e) {}
  };

  const loading = loadingEmployees || loadingConfig || loadingUsers || loadingSchedules;

  // Schedule handlers
  const handleOpenScheduleModal = (schedule?: HRSchedule) => {
    setEditingSchedule(schedule || null);
    setScheduleModalOpen(true);
  };

  const handleSaveSchedule = async (data: HRScheduleFormData) => {
    if (editingSchedule) {
      await updateSchedule(editingSchedule.id, data);
    } else {
      await createSchedule(data);
    }
  };

  const handleDeleteSchedule = async (id: string) => {
    if (confirm('¿Eliminar este horario?')) {
      await deleteSchedule(id);
    }
  };

  const handleOpenAddPosition = (scheduleId: string) => {
    setAddPositionScheduleId(scheduleId);
    setAddPositionModalOpen(true);
  };

  const handleAddPosition = async (data: HRSchedulePositionFormData) => {
    await addPosition(addPositionScheduleId, data);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración RRHH</h1>
        <p className="text-muted-foreground">Gestiona empleados, roles, tipos de turno y reglas de pago</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="personal" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            <span className="hidden sm:inline">Personal</span>
          </TabsTrigger>
          <TabsTrigger value="horarios" className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4" />
            <span className="hidden sm:inline">Horarios</span>
          </TabsTrigger>
          <TabsTrigger value="roles" className="flex items-center gap-2">
            <Briefcase className="h-4 w-4" />
            <span className="hidden sm:inline">Roles</span>
          </TabsTrigger>
          <TabsTrigger value="tipos" className="flex items-center gap-2">
            <Clock className="h-4 w-4" />
            <span className="hidden sm:inline">Tipos Turno</span>
          </TabsTrigger>
          <TabsTrigger value="pagos" className="flex items-center gap-2">
            <DollarSign className="h-4 w-4" />
            <span className="hidden sm:inline">Reglas Pago</span>
          </TabsTrigger>
        </TabsList>

        {/* TAB: PERSONAL */}
        <TabsContent value="personal">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Empleados</CardTitle>
                <CardDescription>Gestiona el personal de la empresa</CardDescription>
              </div>
              <Button onClick={() => handleOpenEmployeeModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Empleado
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nombre</TableHead>
                      <TableHead>RUT</TableHead>
                      <TableHead>Contacto</TableHead>
                      <TableHead>Usuario Vinculado</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => (
                      <TableRow key={emp.id}>
                        <TableCell className="font-medium">{emp.full_name}</TableCell>
                        <TableCell>{emp.rut || '-'}</TableCell>
                        <TableCell>
                          <div className="text-sm">
                            {emp.email && <div>{emp.email}</div>}
                            {emp.phone && <div className="text-muted-foreground">{emp.phone}</div>}
                          </div>
                        </TableCell>
                        <TableCell>
                          {emp.user?.username ? (
                            <Badge variant="secondary">{emp.user.username}</Badge>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Switch
                            checked={emp.is_active}
                            onCheckedChange={(checked) => toggleEmployeeStatus(emp.id, checked)}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenEmployeeModal(emp)}>
                            <Pencil className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => deleteEmployee(emp.id)}>
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {employees.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No hay empleados registrados
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: HORARIOS */}
        <TabsContent value="horarios">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Horarios / Plantillas</CardTitle>
                <CardDescription>Define plantillas de turnos con días, horas y personal requerido</CardDescription>
              </div>
              <Button onClick={() => handleOpenScheduleModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Horario
              </Button>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin" />
                </div>
              ) : schedules.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No hay horarios configurados. Crea uno para comenzar.
                </div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {schedules.map((schedule) => (
                    <ScheduleCard
                      key={schedule.id}
                      schedule={schedule}
                      roles={roles}
                      shiftTypes={shiftTypes}
                      onEdit={handleOpenScheduleModal}
                      onDelete={handleDeleteSchedule}
                      onToggleActive={(id, isActive) => updateSchedule(id, { is_active: isActive })}
                      onAddPosition={handleOpenAddPosition}
                      onRemovePosition={removePosition}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: ROLES */}
        <TabsContent value="roles">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Roles de Turno</CardTitle>
                <CardDescription>Solo informativo, no impacta el pago</CardDescription>
              </div>
              <Button onClick={() => handleOpenRoleModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Rol
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Descripción</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {roles.map((role) => (
                    <TableRow key={role.id}>
                      <TableCell className="font-medium">{role.name}</TableCell>
                      <TableCell>{role.description || '-'}</TableCell>
                      <TableCell>
                        <Switch
                          checked={role.is_active}
                          onCheckedChange={(checked) => updateRole(role.id, { is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenRoleModal(role)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteRole(role.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: TIPOS TURNO */}
        <TabsContent value="tipos">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Tipos de Turno</CardTitle>
                <CardDescription>Define los tipos de turno y sus horas por defecto</CardDescription>
              </div>
              <Button onClick={() => handleOpenShiftTypeModal()}>
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Tipo
              </Button>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nombre</TableHead>
                    <TableHead>Horas por Defecto</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shiftTypes.map((type) => (
                    <TableRow key={type.id}>
                      <TableCell className="font-medium">{type.name}</TableCell>
                      <TableCell>{type.default_hours}h</TableCell>
                      <TableCell>
                        <Switch
                          checked={type.is_active}
                          onCheckedChange={(checked) => updateShiftType(type.id, { is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenShiftTypeModal(type)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteShiftType(type.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        {/* TAB: REGLAS PAGO */}
        <TabsContent value="pagos">
          <Card>
            <CardHeader>
              <CardTitle>Reglas de Pago</CardTitle>
              <CardDescription>Define el valor de pago por cada tipo de turno</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo de Turno</TableHead>
                    <TableHead>Pago por Turno</TableHead>
                    <TableHead>Estado</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payRules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.shift_type?.name || 'N/A'}</TableCell>
                      <TableCell className="font-mono text-lg">{formatCLP(rule.pay_per_shift)}</TableCell>
                      <TableCell>
                        <Switch
                          checked={rule.is_active}
                          onCheckedChange={(checked) => updatePayRule(rule.id, { is_active: checked })}
                        />
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => handleOpenPayRuleModal(rule)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Employee Modal */}
      <Dialog open={employeeModalOpen} onOpenChange={setEmployeeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingEmployee ? 'Editar Empleado' : 'Agregar Usuario como Empleado'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {!editingEmployee && (
              <div>
                <Label>Seleccionar Usuario *</Label>
                <Select 
                  value={selectedUserId || '__none__'} 
                  onValueChange={(val) => val !== '__none__' && handleUserSelect(val)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecciona un usuario" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__" disabled>Selecciona un usuario</SelectItem>
                    {availableUsers.map((u) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name} ({u.username})</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {availableUsers.length === 0 && (
                  <p className="text-sm text-muted-foreground mt-1">
                    No hay usuarios disponibles. Todos ya están registrados como empleados.
                  </p>
                )}
              </div>
            )}
            
            {(editingEmployee || selectedUserId) && (
              <>
                <div>
                  <Label>Nombre Completo</Label>
                  <Input 
                    value={employeeForm.full_name}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, full_name: e.target.value }))}
                    disabled={!editingEmployee}
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Email</Label>
                    <Input 
                      type="email"
                      value={employeeForm.email}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, email: e.target.value }))}
                      disabled={!editingEmployee}
                    />
                  </div>
                  <div>
                    <Label>Teléfono</Label>
                    <Input 
                      value={employeeForm.phone}
                      onChange={(e) => setEmployeeForm(f => ({ ...f, phone: e.target.value }))}
                    />
                  </div>
                </div>
                <div>
                  <Label>RUT</Label>
                  <Input 
                    value={employeeForm.rut}
                    onChange={(e) => setEmployeeForm(f => ({ ...f, rut: e.target.value }))}
                    placeholder="12.345.678-9"
                  />
                </div>
              </>
            )}
            {(editingEmployee || selectedUserId) && (
              <div>
                <Label>Notas</Label>
                <Textarea 
                  value={employeeForm.notes}
                  onChange={(e) => setEmployeeForm(f => ({ ...f, notes: e.target.value }))}
                />
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEmployeeModalOpen(false)}>Cancelar</Button>
            <Button 
              onClick={handleSaveEmployee}
              disabled={!editingEmployee && !selectedUserId}
            >
              {editingEmployee ? 'Guardar' : 'Agregar'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Role Modal */}
      <Dialog open={roleModalOpen} onOpenChange={setRoleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingRole ? 'Editar Rol' : 'Nuevo Rol'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input 
                value={roleForm.name}
                onChange={(e) => setRoleForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Descripción</Label>
              <Textarea 
                value={roleForm.description}
                onChange={(e) => setRoleForm(f => ({ ...f, description: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRoleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveRole}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Shift Type Modal */}
      <Dialog open={shiftTypeModalOpen} onOpenChange={setShiftTypeModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingShiftType ? 'Editar Tipo de Turno' : 'Nuevo Tipo de Turno'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Nombre *</Label>
              <Input 
                value={shiftTypeForm.name}
                onChange={(e) => setShiftTypeForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div>
              <Label>Horas por Defecto</Label>
              <Input 
                type="number"
                step="0.5"
                value={shiftTypeForm.default_hours}
                onChange={(e) => setShiftTypeForm(f => ({ ...f, default_hours: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShiftTypeModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSaveShiftType}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Pay Rule Modal */}
      <Dialog open={payRuleModalOpen} onOpenChange={setPayRuleModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Editar Regla de Pago</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Tipo de Turno</Label>
              <Input value={editingPayRule?.shift_type?.name || ''} disabled />
            </div>
            <div>
              <Label>Pago por Turno (CLP)</Label>
              <Input 
                type="number"
                value={payRuleForm.pay_per_shift}
                onChange={(e) => setPayRuleForm(f => ({ ...f, pay_per_shift: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPayRuleModalOpen(false)}>Cancelar</Button>
            <Button onClick={handleSavePayRule}>Guardar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Schedule Modal */}
      <ScheduleFormModal
        open={scheduleModalOpen}
        onOpenChange={setScheduleModalOpen}
        schedule={editingSchedule}
        onSave={handleSaveSchedule}
      />

      {/* Add Position Modal */}
      <AddPositionModal
        open={addPositionModalOpen}
        onOpenChange={setAddPositionModalOpen}
        roles={roles}
        shiftTypes={shiftTypes}
        onSave={handleAddPosition}
      />
    </div>
  );
}

export default RRHHConfiguracion;
