import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Badge } from '../../../components/ui/badge';
import { Button } from '../../../components/ui/button';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '../../../components/ui/dialog';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { 
    Wifi, 
    WifiOff, 
    Activity, 
    Settings, 
    RefreshCw, 
    CheckCircle2, 
    AlertCircle, 
    Clock,
    Zap,
    Loader2,
    Link,
    ExternalLink
} from 'lucide-react';
import apiClient from '../../../utils/axios';
import { getCSRFToken } from '../../../utils/csrf';

function SyncStatus({ 
    connectionStatus, 
    lastMessage, 
    messageHistory, 
    reconnectAttempts, 
    maxReconnectAttempts,
    lojaSelecionada,
    lojas = [],
    onConfigWebhook 
}) {
    const [showConfig, setShowConfig] = useState(false);
    const [showLogs, setShowLogs] = useState(false);
    const [webhookConfig, setWebhookConfig] = useState({
        webhook_url: '',
        webhook_secret: '',
        eventos: ['orders/create', 'orders/updated', 'orders/paid']
    });
    const [configuringWebhook, setConfiguringWebhook] = useState(false);
    
    const getConnectionBadge = () => {
        switch (connectionStatus) {
            case 'Open':
                return { 
                    variant: 'default', 
                    color: 'text-green-600 dark:text-green-400',
                    bg: 'bg-green-100 dark:bg-green-900/30',
                    icon: Wifi, 
                    text: 'Conectado' 
                };
            case 'Connecting':
                return { 
                    variant: 'secondary', 
                    color: 'text-yellow-600 dark:text-yellow-400',
                    bg: 'bg-yellow-100 dark:bg-yellow-900/30',
                    icon: Activity, 
                    text: 'Conectando' 
                };
            case 'Closed':
                return { 
                    variant: 'outline', 
                    color: 'text-gray-600 dark:text-gray-400',
                    bg: 'bg-gray-100 dark:bg-gray-900/30',
                    icon: WifiOff, 
                    text: 'Desconectado' 
                };
            case 'Error':
                return { 
                    variant: 'destructive', 
                    color: 'text-red-600 dark:text-red-400',
                    bg: 'bg-red-100 dark:bg-red-900/30',
                    icon: AlertCircle, 
                    text: 'Erro' 
                };
            default:
                return { 
                    variant: 'outline', 
                    color: 'text-gray-600 dark:text-gray-400',
                    bg: 'bg-gray-100 dark:bg-gray-900/30',
                    icon: Clock, 
                    text: 'Desconhecido' 
                };
        }
    };

    const configureWebhook = async () => {
        if (!lojaSelecionada) {
            alert('Selecione uma loja primeiro');
            return;
        }

        setConfiguringWebhook(true);
        try {
            const response = await apiClient.post('/estoque/webhook/configure/', {
                loja_id: lojaSelecionada,
                webhook_url: webhookConfig.webhook_url,
                webhook_secret: webhookConfig.webhook_secret,
                eventos: webhookConfig.eventos
            }, {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data.success) {
                alert('Webhook configurado com sucesso!');
                setShowConfig(false);
                onConfigWebhook?.();
            } else {
                alert(response.data.error || 'Erro ao configurar webhook');
            }
        } catch (error) {
            console.error('Erro ao configurar webhook:', error);
            alert(error.response?.data?.error || 'Erro ao configurar webhook');
        } finally {
            setConfiguringWebhook(false);
        }
    };

    const badge = getConnectionBadge();
    const Icon = badge.icon;
    
    const loja = lojas.find(l => l.id === lojaSelecionada);
    const recentMessages = messageHistory.slice(-5);

    return (
        <Card className="bg-card border-border">
            <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-sm font-medium text-foreground flex items-center gap-2">
                        <Zap className="h-4 w-4 text-primary" />
                        Sincronização em Tempo Real
                    </CardTitle>
                    <div className="flex items-center gap-2">
                        {connectionStatus === 'Connecting' && (
                            <Loader2 className="h-4 w-4 animate-spin text-yellow-500" />
                        )}
                        <Badge variant={badge.variant} className={`text-xs ${badge.color}`}>
                            <Icon className="h-3 w-3 mr-1" />
                            {badge.text}
                        </Badge>
                    </div>
                </div>
            </CardHeader>
            
            <CardContent className="space-y-4">
                {/* Status da Loja */}
                {loja && (
                    <div className={`p-3 rounded-lg border ${badge.bg} border-current/20`}>
                        <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium text-foreground">
                                {loja.nome_loja}
                            </span>
                            <Badge variant="outline" className="text-xs">
                                ID: {loja.id}
                            </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            {connectionStatus === 'Open' ? 
                                'Recebendo atualizações da Shopify em tempo real' :
                                'Aguardando conexão para sincronização automática'
                            }
                        </div>
                    </div>
                )}

                {/* Última Mensagem */}
                {lastMessage && connectionStatus === 'Open' && (
                    <div className="p-3 bg-muted/50 rounded-lg border">
                        <div className="flex items-center gap-2 mb-2">
                            <CheckCircle2 className="h-4 w-4 text-green-600" />
                            <span className="text-sm font-medium text-foreground">Última Sincronização</span>
                        </div>
                        <div className="text-xs text-muted-foreground">
                            <p>Tipo: {lastMessage.type}</p>
                            {lastMessage.produto && <p>Produto: {lastMessage.produto.nome}</p>}
                            {lastMessage.quantidade_alterada && <p>Quantidade: {lastMessage.quantidade_alterada}</p>}
                            <p>Em: {new Date().toLocaleTimeString('pt-BR')}</p>
                        </div>
                    </div>
                )}

                {/* Tentativas de Reconexão */}
                {connectionStatus === 'Closed' && reconnectAttempts > 0 && (
                    <Alert className="bg-yellow-50 dark:bg-yellow-950/20 border-yellow-200 dark:border-yellow-800">
                        <RefreshCw className="h-4 w-4 text-yellow-600" />
                        <AlertDescription className="text-yellow-700 dark:text-yellow-300">
                            Tentativa de reconexão {reconnectAttempts}/{maxReconnectAttempts}
                        </AlertDescription>
                    </Alert>
                )}

                {/* Botões de Ação */}
                <div className="flex gap-2">
                    <Dialog open={showConfig} onOpenChange={setShowConfig}>
                        <DialogTrigger asChild>
                            <Button variant="outline" size="sm" className="text-xs">
                                <Settings className="h-3 w-3 mr-1" />
                                Configurar Webhook
                            </Button>
                        </DialogTrigger>
                        <DialogContent className="max-w-md bg-background border-border">
                            <DialogHeader>
                                <DialogTitle className="text-foreground">Configurar Webhook Shopify</DialogTitle>
                                <DialogDescription className="text-muted-foreground">
                                    Configure o webhook para receber notificações automáticas da Shopify
                                </DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4">
                                <div>
                                    <Label htmlFor="webhook_url" className="text-foreground">URL do Webhook</Label>
                                    <Input
                                        id="webhook_url"
                                        placeholder="https://seu-dominio.com/webhook/shopify"
                                        value={webhookConfig.webhook_url}
                                        onChange={(e) => setWebhookConfig(prev => ({...prev, webhook_url: e.target.value}))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>
                                
                                <div>
                                    <Label htmlFor="webhook_secret" className="text-foreground">Secret (Opcional)</Label>
                                    <Input
                                        id="webhook_secret"
                                        type="password"
                                        placeholder="webhook-secret-123"
                                        value={webhookConfig.webhook_secret}
                                        onChange={(e) => setWebhookConfig(prev => ({...prev, webhook_secret: e.target.value}))}
                                        className="bg-background border-input text-foreground"
                                    />
                                </div>

                                <Alert className="bg-blue-50 dark:bg-blue-950/20 border-blue-200 dark:border-blue-800">
                                    <ExternalLink className="h-4 w-4 text-blue-600" />
                                    <AlertDescription className="text-blue-700 dark:text-blue-300 text-xs">
                                        Configure este webhook no painel da Shopify para receber notificações automáticas de pedidos e estoque.
                                    </AlertDescription>
                                </Alert>

                                <div className="flex justify-end gap-2 pt-4">
                                    <Button variant="outline" size="sm" onClick={() => setShowConfig(false)}>
                                        Cancelar
                                    </Button>
                                    <Button size="sm" onClick={configureWebhook} disabled={configuringWebhook}>
                                        {configuringWebhook ? (
                                            <>
                                                <Loader2 className="h-3 w-3 animate-spin mr-1" />
                                                Configurando...
                                            </>
                                        ) : (
                                            <>
                                                <Link className="h-3 w-3 mr-1" />
                                                Configurar
                                            </>
                                        )}
                                    </Button>
                                </div>
                            </div>
                        </DialogContent>
                    </Dialog>

                    {recentMessages.length > 0 && (
                        <Dialog open={showLogs} onOpenChange={setShowLogs}>
                            <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="text-xs">
                                    <Activity className="h-3 w-3 mr-1" />
                                    Logs ({recentMessages.length})
                                </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-lg bg-background border-border max-h-[80vh]">
                                <DialogHeader>
                                    <DialogTitle className="text-foreground">Logs de Sincronização</DialogTitle>
                                    <DialogDescription className="text-muted-foreground">
                                        Últimas mensagens recebidas via WebSocket
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="space-y-2 max-h-96 overflow-y-auto">
                                    {recentMessages.map((msg, index) => (
                                        <div key={index} className="p-2 bg-muted/50 rounded text-xs">
                                            <div className="flex justify-between items-center mb-1">
                                                <Badge variant="outline" className="text-xs">
                                                    {msg.type}
                                                </Badge>
                                                <span className="text-muted-foreground">
                                                    {new Date().toLocaleTimeString('pt-BR')}
                                                </span>
                                            </div>
                                            <pre className="text-muted-foreground whitespace-pre-wrap">
                                                {JSON.stringify(msg.data || msg, null, 2)}
                                            </pre>
                                        </div>
                                    ))}
                                </div>
                            </DialogContent>
                        </Dialog>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export default SyncStatus;