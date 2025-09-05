import { useState, useEffect, useRef, useCallback } from 'react';

// 🔥 CIRCUIT BREAKER GLOBAL para WebSocket
const WEBSOCKET_CIRCUIT_BREAKER = {
    isDisabled: false,
    failureCount: 0,
    lastFailure: null,
    disable() {
        this.isDisabled = true;
        console.warn('🚫 WebSocket PERMANENTLY DISABLED para esta sessão');
    },
    shouldTryConnection() {
        return !this.isDisabled;
    },
    recordFailure() {
        this.failureCount++;
        this.lastFailure = Date.now();
        
        // Desabilitar PERMANENTEMENTE após 3 falhas rápidas (menos de 15 seg)
        if (this.failureCount >= 3) {
            this.disable();
        }
    }
};

export function useWebSocket(url, options = {}) {
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Disabled');
    const [messageHistory, setMessageHistory] = useState([]);
    
    const {
        onOpen,
        onClose,
        onMessage,
        onError,
        shouldReconnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 3 // Reduzido para 3
    } = options;

    const reconnectTimeouts = useRef();
    const reconnectAttempts = useRef(0);
    const socketRef = useRef();
    const [isReconnecting, setIsReconnecting] = useState(false);
    const hasShownDisabledNotification = useRef(false);

    const connect = useCallback(() => {
        try {
            // 🔥 CIRCUIT BREAKER - Se desabilitado, NÃO TENTAR
            if (!WEBSOCKET_CIRCUIT_BREAKER.shouldTryConnection()) {
                setConnectionStatus('Disabled');
                if (!hasShownDisabledNotification.current) {
                    console.warn('🚫 WebSocket desabilitado permanentemente - funcionando sem tempo real');
                    onError?.({ 
                        code: 'CIRCUIT_BREAKER', 
                        reason: 'WebSocket desabilitado após múltiplas falhas' 
                    });
                    hasShownDisabledNotification.current = true;
                }
                return;
            }

            // Não conectar se já conectado
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                return;
            }

            // Construir URL do WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}${url}`;

            setConnectionStatus('Connecting');

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            const connectionTimeout = setTimeout(() => {
                if (ws.readyState !== WebSocket.OPEN) {
                    console.warn('⏱️ WebSocket timeout - fechando conexão');
                    ws.close();
                }
            }, 5000); // Timeout de 5 segundos

            ws.onopen = (event) => {
                clearTimeout(connectionTimeout);
                setConnectionStatus('Open');
                setIsReconnecting(false);
                reconnectAttempts.current = 0;
                WEBSOCKET_CIRCUIT_BREAKER.failureCount = 0; // Reset contador
                setSocket(ws);
                onOpen?.(event);
            };

            ws.onclose = (event) => {
                clearTimeout(connectionTimeout);
                setConnectionStatus('Closed');
                setSocket(null);
                socketRef.current = null;
                onClose?.(event);

                // Registrar falha no circuit breaker
                WEBSOCKET_CIRCUIT_BREAKER.recordFailure();

                // Tentar reconectar APENAS se circuit breaker permitir
                if (shouldReconnect && 
                    reconnectAttempts.current < maxReconnectAttempts &&
                    WEBSOCKET_CIRCUIT_BREAKER.shouldTryConnection()) {
                    
                    reconnectAttempts.current += 1;
                    setIsReconnecting(true);
                    
                    reconnectTimeouts.current = setTimeout(() => {
                        connect();
                    }, reconnectInterval);
                } else {
                    setIsReconnecting(false);
                    if (WEBSOCKET_CIRCUIT_BREAKER.isDisabled) {
                        console.warn('🚫 WebSocket circuit breaker ATIVADO - sem mais tentativas');
                    }
                }
            };

            ws.onmessage = (event) => {
                let messageData;
                
                try {
                    messageData = JSON.parse(event.data);
                } catch (error) {
                    messageData = { type: 'error', data: event.data };
                }

                setLastMessage(messageData);
                setMessageHistory(prev => [...prev.slice(-99), messageData]);
                onMessage?.(messageData);
            };

            ws.onerror = (error) => {
                clearTimeout(connectionTimeout);
                setConnectionStatus('Error');
                
                // SÓ reportar erro se circuit breaker não estiver ativo
                if (WEBSOCKET_CIRCUIT_BREAKER.shouldTryConnection()) {
                    const errorWithCode = {
                        ...error,
                        code: 1006,
                        reason: 'Conexão WebSocket falhou'
                    };
                    onError?.(errorWithCode);
                }
            };

        } catch (error) {
            setConnectionStatus('Error');
            WEBSOCKET_CIRCUIT_BREAKER.recordFailure();
            onError?.(error);
        }
    }, [url, onOpen, onClose, onMessage, onError, shouldReconnect, reconnectInterval, maxReconnectAttempts]);

    const disconnect = useCallback(() => {
        if (reconnectTimeouts.current) {
            clearTimeout(reconnectTimeouts.current);
        }
        
        if (socketRef.current) {
            socketRef.current.close();
            socketRef.current = null;
        }
        
        setSocket(null);
        setConnectionStatus('Closed');
        setIsReconnecting(false);
        reconnectAttempts.current = 0;
    }, []);

    const sendMessage = useCallback((message) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            socketRef.current.send(messageStr);
            return true;
        }
        return false;
    }, []);

    const sendJsonMessage = useCallback((object) => {
        return sendMessage(JSON.stringify(object));
    }, [sendMessage]);

    // Tentar conectar APENAS se circuit breaker permitir
    useEffect(() => {
        if (url && WEBSOCKET_CIRCUIT_BREAKER.shouldTryConnection()) {
            connect();
        }

        return () => {
            disconnect();
        };
    }, [url, connect, disconnect]);

    // Cleanup na desmontagem
    useEffect(() => {
        return () => {
            if (reconnectTimeouts.current) {
                clearTimeout(reconnectTimeouts.current);
            }
        };
    }, []);

    return {
        socket,
        lastMessage,
        connectionStatus,
        messageHistory,
        sendMessage,
        sendJsonMessage,
        connect,
        disconnect,
        reconnectAttempts: reconnectAttempts.current,
        maxReconnectAttempts,
        isConnected: connectionStatus === 'Open',
        isReconnecting,
        isDisabled: WEBSOCKET_CIRCUIT_BREAKER.isDisabled
    };
}

export default useWebSocket;