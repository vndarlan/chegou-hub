import React, { useEffect } from 'react';
import { toast } from '../../../components/ui/use-toast';
import { 
    Package, 
    TrendingDown, 
    AlertTriangle, 
    ShoppingCart, 
    RefreshCw,
    CheckCircle2,
    Zap
} from 'lucide-react';

function RealtimeNotifications({ lastMessage, onStockUpdate, onProductUpdate }) {
    
    useEffect(() => {
        if (!lastMessage) return;

        handleMessage(lastMessage);
    }, [lastMessage]);

    const handleMessage = (message) => {
        console.log('Processando mensagem em tempo real:', message);

        switch (message.type) {
            case 'stock_update':
                handleStockUpdate(message);
                break;
            case 'shopify_order':
                handleShopifyOrder(message);
                break;
            case 'inventory_sync':
                handleInventorySync(message);
                break;
            case 'low_stock_alert':
                handleLowStockAlert(message);
                break;
            case 'webhook_configured':
                handleWebhookConfigured(message);
                break;
            case 'sync_error':
                handleSyncError(message);
                break;
            default:
                console.log('Tipo de mensagem não reconhecido:', message.type);
        }
    };

    const handleStockUpdate = (message) => {
        const { produto, estoque_anterior, estoque_atual, motivo } = message.data;
        
        const diferenca = estoque_atual - estoque_anterior;
        const isIncrease = diferenca > 0;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    {isIncrease ? (
                        <TrendingDown className="h-4 w-4 text-green-600" />
                    ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                    )}
                    <span>Estoque Atualizado</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium">{produto.nome}</p>
                    <p className="text-sm text-muted-foreground">
                        {estoque_anterior} → {estoque_atual} unidades
                        {motivo && ` (${motivo})`}
                    </p>
                </div>
            ),
            duration: 4000,
            className: isIncrease ? 
                "border-green-200 bg-green-50 dark:bg-green-950/20" : 
                "border-red-200 bg-red-50 dark:bg-red-950/20"
        });

        // Notificar componente pai para atualizar dados
        onStockUpdate?.(message.data);
    };

    const handleShopifyOrder = (message) => {
        const { pedido, itens_afetados } = message.data;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    <ShoppingCart className="h-4 w-4 text-blue-600" />
                    <span>Novo Pedido Shopify</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium">Pedido #{pedido.order_number}</p>
                    <p className="text-sm text-muted-foreground">
                        {itens_afetados} produto(s) com estoque reduzido
                    </p>
                    <p className="text-xs text-muted-foreground">
                        Total: R$ {pedido.total_price}
                    </p>
                </div>
            ),
            duration: 6000,
            className: "border-blue-200 bg-blue-50 dark:bg-blue-950/20"
        });

        // Notificar para recarregar produtos
        onProductUpdate?.();
    };

    const handleInventorySync = (message) => {
        const { produtos_sincronizados, tempo_sincronizacao } = message.data;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 text-green-600" />
                    <span>Sincronização Completa</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium">{produtos_sincronizados} produtos sincronizados</p>
                    <p className="text-sm text-muted-foreground">
                        Completada em {tempo_sincronizacao}ms
                    </p>
                </div>
            ),
            duration: 3000,
            className: "border-green-200 bg-green-50 dark:bg-green-950/20"
        });

        // Recarregar dados após sincronização completa
        onProductUpdate?.();
    };

    const handleLowStockAlert = (message) => {
        const { produto, estoque_atual, estoque_minimo } = message.data;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-orange-600" />
                    <span>Estoque Baixo</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium">{produto.nome}</p>
                    <p className="text-sm text-muted-foreground">
                        Apenas {estoque_atual} unidades restantes (mín: {estoque_minimo})
                    </p>
                    <p className="text-xs text-muted-foreground">
                        SKU: {produto.sku}
                    </p>
                </div>
            ),
            duration: 8000,
            className: "border-orange-200 bg-orange-50 dark:bg-orange-950/20"
        });
    };

    const handleWebhookConfigured = (message) => {
        const { loja_nome } = message.data;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-green-600" />
                    <span>Webhook Configurado</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium">Loja: {loja_nome}</p>
                    <p className="text-sm text-muted-foreground">
                        Sincronização automática ativada
                    </p>
                </div>
            ),
            duration: 4000,
            className: "border-green-200 bg-green-50 dark:bg-green-950/20"
        });
    };

    const handleSyncError = (message) => {
        const { erro, detalhes } = message.data;
        
        toast({
            title: (
                <div className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4 text-red-600" />
                    <span>Erro de Sincronização</span>
                </div>
            ),
            description: (
                <div className="space-y-1">
                    <p className="font-medium text-red-700">{erro}</p>
                    {detalhes && (
                        <p className="text-sm text-muted-foreground">{detalhes}</p>
                    )}
                </div>
            ),
            duration: 10000,
            className: "border-red-200 bg-red-50 dark:bg-red-950/20"
        });
    };

    // Este componente não renderiza nada visualmente
    // Ele apenas processa mensagens e dispara notificações
    return null;
}

export default RealtimeNotifications;