import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

export interface CustomerFieldsData {
  nombres: string;
  apellidos: string;
  email?: string;
  phone?: string;
  fecha_nacimiento?: string;
}

interface CustomerFieldsFormProps {
  data: CustomerFieldsData;
  onChange: (data: CustomerFieldsData) => void;
  disabled?: boolean;
  showEmail?: boolean;
  emailReadOnly?: boolean;
  phoneRequired?: boolean;
  birthDateRequired?: boolean;
  compact?: boolean;
}

export function CustomerFieldsForm({
  data,
  onChange,
  disabled = false,
  showEmail = true,
  emailReadOnly = false,
  phoneRequired = false,
  birthDateRequired = false,
  compact = false,
}: CustomerFieldsFormProps) {
  const handleChange = (field: keyof CustomerFieldsData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const gridClass = compact ? 'grid grid-cols-2 gap-3' : 'grid grid-cols-1 md:grid-cols-2 gap-4';

  return (
    <div className="space-y-4">
      {/* Nombres y Apellidos */}
      <div className={gridClass}>
        <div className="space-y-2">
          <Label htmlFor="customer-nombres">
            Nombres <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-nombres"
            placeholder="Ej: Juan Pablo"
            value={data.nombres}
            onChange={(e) => handleChange('nombres', e.target.value)}
            disabled={disabled}
            required
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-apellidos">
            Apellidos <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-apellidos"
            placeholder="Ej: Pérez González"
            value={data.apellidos}
            onChange={(e) => handleChange('apellidos', e.target.value)}
            disabled={disabled}
            required
            className="bg-muted/50"
          />
        </div>
      </div>

      {/* Email */}
      {showEmail && (
        <div className="space-y-2">
          <Label htmlFor="customer-email">
            Correo electrónico <span className="text-destructive">*</span>
          </Label>
          <Input
            id="customer-email"
            type="email"
            placeholder="ejemplo@email.com"
            value={data.email || ''}
            onChange={(e) => handleChange('email', e.target.value)}
            disabled={disabled || emailReadOnly}
            required
            className={`bg-muted/50 ${emailReadOnly ? 'cursor-not-allowed opacity-70' : ''}`}
          />
          {emailReadOnly && (
            <p className="text-xs text-muted-foreground">
              El email no se puede modificar
            </p>
          )}
        </div>
      )}

      {/* Teléfono y Fecha de Nacimiento */}
      <div className={gridClass}>
        <div className="space-y-2">
          <Label htmlFor="customer-phone">
            Teléfono {phoneRequired && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="customer-phone"
            type="tel"
            placeholder="+56 9 1234 5678"
            value={data.phone || ''}
            onChange={(e) => handleChange('phone', e.target.value)}
            disabled={disabled}
            required={phoneRequired}
            className="bg-muted/50"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="customer-birthdate">
            Fecha de nacimiento {birthDateRequired && <span className="text-destructive">*</span>}
          </Label>
          <Input
            id="customer-birthdate"
            type="date"
            value={data.fecha_nacimiento || ''}
            onChange={(e) => handleChange('fecha_nacimiento', e.target.value)}
            disabled={disabled}
            required={birthDateRequired}
            className="bg-muted/50"
            max={new Date().toISOString().split('T')[0]}
          />
        </div>
      </div>
    </div>
  );
}

export default CustomerFieldsForm;
