// frontend/src/features/planejamento_semanal/components/SlideWelcome.jsx
import { Calendar } from 'lucide-react';

/**
 * Slide de boas-vindas para apresentacao
 * Titulo centralizado ocupando toda a tela
 */
export function SlideWelcome() {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted">
      <div className="text-center space-y-6">
        <Calendar className="h-20 w-20 mx-auto text-primary" />
        <h1 className="text-6xl font-bold text-foreground tracking-tight">
          Bem-vindo
        </h1>
        <h2 className="text-4xl font-semibold text-primary">
          Planejamento Semanal
        </h2>
      </div>
    </div>
  );
}

export default SlideWelcome;
