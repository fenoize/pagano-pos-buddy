

## Campañas de Runas - Sistema de Desafíos y Promociones (IMPLEMENTADO)

### Resumen
Sistema de campañas de marketing que otorga runas automáticamente a clientes cuando cumplen condiciones específicas.

### Tipos de campaña
1. **Registro**: runas al registrarse en período
2. **Compra de productos**: runas al comprar N unidades de productos/categorías específicas
3. **Monto acumulado**: runas al gastar $X en período
4. **Primera compra**: runas en primera compra dentro de período

### Archivos implementados
| Acción | Archivo |
|--------|---------|
| Migración | `loyalty_campaigns`, `loyalty_campaign_claims`, 3 RPCs |
| Nuevo | `src/hooks/useLoyaltyCampaigns.ts` |
| Nuevo | `src/components/fidelizacion/CampaignsContent.tsx` |
| Nuevo | `src/components/fidelizacion/CampaignFormModal.tsx` |
| Nuevo | `src/lib/campaignEvaluator.ts` |
| Modificado | `src/pages/FidelizacionHub.tsx` — tab campañas |
| Modificado | `src/components/AppSidebar.tsx` — menú campañas |
| Modificado | `src/App.tsx` — ruta `/pos/fidelizacion/campanas` |
| Modificado | `src/pages/NewSale.tsx` — evaluación post-pedido |
| Modificado | `src/contexts/CustomerAuthContext.tsx` — evaluación post-registro |
