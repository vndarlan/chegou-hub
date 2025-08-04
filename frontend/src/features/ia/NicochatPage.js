// frontend/src/features/ia/NicochatPage.js - VERSÃO SHADCN/UI
import React from 'react';
import { Bot, Clock } from 'lucide-react';

// shadcn/ui imports
import { Card, CardContent } from '../../components/ui/card';

function NicochatPage() {
    return (
        <div className="flex-1 p-6">
            <Card className="max-w-2xl mx-auto">
                <CardContent className="p-12 text-center">
                    <div className="flex flex-col items-center space-y-6">
                        <div className="h-20 w-20 rounded-lg bg-blue-100 flex items-center justify-center">
                            <Bot className="h-10 w-10 text-blue-600" />
                        </div>
                        
                        <div>
                            <h2 className="text-2xl font-bold mb-2">Nicochat - Chatbot</h2>
                            <p className="text-lg text-muted-foreground">
                                Funcionalidades específicas do Nicochat em desenvolvimento
                            </p>
                        </div>
                        
                        <div className="flex items-center gap-2">
                            <div className="h-6 w-6 rounded-full bg-orange-100 flex items-center justify-center">
                                <Clock className="h-4 w-4 text-orange-600" />
                            </div>
                            <span className="font-semibold text-orange-600">Em breve</span>
                        </div>
                        
                        <p className="text-sm text-muted-foreground text-center max-w-md">
                            Por enquanto, use a página <strong>Monitoramento de Erros - IA</strong> 
                            para visualizar logs do Nicochat com filtros por país e ferramenta.
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

export default NicochatPage;