import { FidelizationConfig } from '@/components/config/FidelizationConfig';
import { BadgesConfig } from '@/components/config/BadgesConfig';
import { NivelesContent } from '@/components/fidelizacion/NivelesContent';
import { FeedbackContent } from '@/components/fidelizacion/FeedbackContent';
import { CampaignsContent } from '@/components/fidelizacion/CampaignsContent';
import { useLocation } from 'react-router-dom';
import { useAuthContext } from '@/contexts/AuthContext';

export default function FidelizacionHub() {
  const location = useLocation();
  const { user } = useAuthContext();

  const getActiveTab = () => {
    if (location.pathname.includes('/niveles')) return 'niveles';
    if (location.pathname.includes('/insignias')) return 'insignias';
    if (location.pathname.includes('/campanas')) return 'campanas';
    if (location.pathname.includes('/feedback')) return 'feedback';
    return 'runas';
  };

  const activeTab = getActiveTab();

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

  const renderContent = () => {
    switch (activeTab) {
      case 'niveles':
        return <NivelesContent />;
      case 'insignias':
        return <BadgesConfig />;
      case 'campanas':
        return <CampaignsContent />;
      case 'feedback':
        return <FeedbackContent />;
      case 'runas':
      default:
        return <FidelizationConfig />;
    }
  };

  const getTitle = () => {
    switch (activeTab) {
      case 'niveles': return 'Niveles';
      case 'insignias': return 'Insignias';
      case 'campanas': return 'Campañas';
      case 'feedback': return 'Feedback';
      case 'runas':
      default: return 'Runas';
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold text-foreground">Fidelización - {getTitle()}</h1>
        <p className="text-muted-foreground">
          Gestiona runas, niveles, insignias, campañas y feedback de clientes
        </p>
      </div>
      {renderContent()}
    </div>
  );
}