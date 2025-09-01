import React from 'react';
import { Badge } from '../../../components/ui/badge';
import { Zap, TrendingUp, TrendingDown } from 'lucide-react';

// Hook para gerenciar produtos destacados
export function useProductHighlight() {
    const [highlightedProducts, setHighlightedProducts] = React.useState(new Map());

    const highlightProduct = React.useCallback((productId, type = 'update', duration = 5000) => {
        setHighlightedProducts(prev => {
            const newMap = new Map(prev);
            newMap.set(productId, {
                type,
                timestamp: Date.now(),
                duration
            });
            return newMap;
        });

        // Remover destaque após a duração
        setTimeout(() => {
            setHighlightedProducts(prev => {
                const newMap = new Map(prev);
                newMap.delete(productId);
                return newMap;
            });
        }, duration);
    }, []);

    const isHighlighted = React.useCallback((productId) => {
        return highlightedProducts.has(productId);
    }, [highlightedProducts]);

    const getHighlight = React.useCallback((productId) => {
        return highlightedProducts.get(productId);
    }, [highlightedProducts]);

    const clearHighlight = React.useCallback((productId) => {
        setHighlightedProducts(prev => {
            const newMap = new Map(prev);
            newMap.delete(productId);
            return newMap;
        });
    }, []);

    const clearAllHighlights = React.useCallback(() => {
        setHighlightedProducts(new Map());
    }, []);

    return {
        highlightProduct,
        isHighlighted,
        getHighlight,
        clearHighlight,
        clearAllHighlights,
        highlightedProducts
    };
}

// Componente para mostrar badge de destaque
export function ProductHighlightBadge({ productId, highlight }) {
    if (!highlight) return null;

    const getHighlightConfig = () => {
        switch (highlight.type) {
            case 'stock_increase':
                return {
                    icon: TrendingUp,
                    text: 'Adicionado',
                    className: 'bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800',
                    iconClass: 'text-green-600 dark:text-green-400'
                };
            case 'stock_decrease':
                return {
                    icon: TrendingDown,
                    text: 'Vendido',
                    className: 'bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800',
                    iconClass: 'text-blue-600 dark:text-blue-400'
                };
            case 'low_stock':
                return {
                    icon: TrendingDown,
                    text: 'Estoque Baixo',
                    className: 'bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900/30 dark:text-orange-400 dark:border-orange-800',
                    iconClass: 'text-orange-600 dark:text-orange-400'
                };
            default:
                return {
                    icon: Zap,
                    text: 'Atualizado',
                    className: 'bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800',
                    iconClass: 'text-yellow-600 dark:text-yellow-400'
                };
        }
    };

    const config = getHighlightConfig();
    const Icon = config.icon;

    return (
        <Badge 
            variant="outline" 
            className={`text-xs animate-pulse ${config.className}`}
        >
            <Icon className={`h-3 w-3 mr-1 ${config.iconClass}`} />
            {config.text}
        </Badge>
    );
}

// Componente wrapper para linha da tabela destacada
export function HighlightedTableRow({ children, highlight, ...props }) {
    const getRowClass = () => {
        if (!highlight) return '';
        
        const baseClass = 'animate-pulse bg-gradient-to-r';
        
        switch (highlight.type) {
            case 'stock_increase':
                return `${baseClass} from-green-50 to-transparent dark:from-green-950/20`;
            case 'stock_decrease':
                return `${baseClass} from-blue-50 to-transparent dark:from-blue-950/20`;
            case 'low_stock':
                return `${baseClass} from-orange-50 to-transparent dark:from-orange-950/20`;
            default:
                return `${baseClass} from-yellow-50 to-transparent dark:from-yellow-950/20`;
        }
    };

    return (
        <tr 
            {...props} 
            className={`${props.className || ''} ${getRowClass()}`}
        >
            {children}
        </tr>
    );
}

// Componente para animação de atualização
export function UpdateAnimation({ show, type = 'update' }) {
    if (!show) return null;

    const getAnimationClass = () => {
        switch (type) {
            case 'stock_increase':
                return 'animate-bounce text-green-600';
            case 'stock_decrease':
                return 'animate-bounce text-blue-600';
            case 'low_stock':
                return 'animate-pulse text-orange-600';
            default:
                return 'animate-spin text-primary';
        }
    };

    const getIcon = () => {
        switch (type) {
            case 'stock_increase':
                return TrendingUp;
            case 'stock_decrease':
                return TrendingDown;
            default:
                return Zap;
        }
    };

    const Icon = getIcon();

    return (
        <div className="absolute -top-1 -right-1">
            <Icon className={`h-4 w-4 ${getAnimationClass()}`} />
        </div>
    );
}

export default { 
    useProductHighlight, 
    ProductHighlightBadge, 
    HighlightedTableRow, 
    UpdateAnimation 
};