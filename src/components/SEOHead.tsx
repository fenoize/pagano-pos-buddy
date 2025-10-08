import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

export function SEOHead() {
  const location = useLocation();
  const isPOSRoute = location.pathname.startsWith('/pos');

  if (isPOSRoute) {
    return (
      <Helmet>
        <meta name="robots" content="noindex, nofollow" />
        <meta name="googlebot" content="noindex, nofollow" />
        <meta name="bingbot" content="noindex, nofollow" />
        <title>Paganos POS - Área Privada</title>
      </Helmet>
    );
  }

  // Portal de clientes: SEO optimizado
  return (
    <Helmet>
      <meta name="robots" content="index, follow" />
      <meta name="description" content="Pide tus hamburguesas favoritas de Paganos Burger. Programa de fidelización con Runas y beneficios exclusivos." />
      <meta name="keywords" content="paganos burger, hamburguesas, delivery, pedidos online, fidelización" />
      
      {/* Open Graph */}
      <meta property="og:title" content="Paganos Burger - Pedidos Online" />
      <meta property="og:description" content="Las mejores hamburguesas artesanales. Pide ahora y acumula Runas." />
      <meta property="og:type" content="website" />
      
      {/* Twitter Card */}
      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content="Paganos Burger - Pedidos Online" />
      <meta name="twitter:description" content="Las mejores hamburguesas artesanales. Pide ahora y acumula Runas." />
      
      <title>Paganos Burger - Pedidos y Fidelización</title>
    </Helmet>
  );
}
