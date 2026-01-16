// frontend/src/features/planejamento_semanal/components/SlideFim.jsx
import React, { useState } from 'react';
import { Flag, AlertTriangle } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Textarea } from '../../../components/ui/textarea';

/**
 * Slide final para apresentacao
 * Exibe "FIM" centralizado com area para avisos importantes
 * @param {string} avisos - Texto inicial dos avisos
 * @param {function} onAvisosChange - Callback quando avisos sao alterados
 */
export function SlideFim({ avisos: initialAvisos = '', onAvisosChange }) {
  const [avisos, setAvisos] = useState(initialAvisos);

  const handleAvisosChange = (e) => {
    const newValue = e.target.value;
    setAvisos(newValue);
    if (onAvisosChange) {
      onAvisosChange(newValue);
    }
  };

  return (
    <div className="h-full w-full flex flex-col items-center justify-center bg-gradient-to-br from-background to-muted p-8">
      {/* Titulo FIM */}
      <div className="text-center mb-12">
        <Flag className="h-16 w-16 mx-auto text-primary mb-4" />
        <h1 className="text-8xl font-bold text-foreground tracking-wider">
          FIM
        </h1>
        <p className="text-xl text-muted-foreground mt-4">
          Obrigado pela atencao
        </p>
      </div>

      {/* Area de Avisos */}
      <Card className="w-full max-w-2xl shadow-lg">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Avisos Importantes
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Digite aqui os avisos importantes para a equipe..."
            value={avisos}
            onChange={handleAvisosChange}
            className="min-h-[120px] resize-none text-base"
          />
        </CardContent>
      </Card>
    </div>
  );
}

export default SlideFim;
