import { APP_VERSION } from "@/config/version";

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-card mt-auto">
      <div className="container py-4 px-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>© {currentYear} Paganos Burger. Todos los derechos reservados.</span>
          </div>
          <div className="flex items-center gap-3">
            <span>v{APP_VERSION}</span>
            <span className="hidden sm:inline">|</span>
            <span>
              Desarrollado por:{" "}
              <a 
                href="https://diegoulloa.cl" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                diegoulloa.cl
              </a>
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
