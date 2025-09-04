import { useState, useEffect, useRef, useCallback } from 'react';

export function useWebSocket(url, options = {}) {
    const [socket, setSocket] = useState(null);
    const [lastMessage, setLastMessage] = useState(null);
    const [connectionStatus, setConnectionStatus] = useState('Connecting');
    const [messageHistory, setMessageHistory] = useState([]);
    
    const {
        onOpen,
        onClose,
        onMessage,
        onError,
        shouldReconnect = true,
        reconnectInterval = 3000,
        maxReconnectAttempts = 5
    } = options;

    const reconnectTimeouts = useRef();
    const reconnectAttempts = useRef(0);
    const socketRef = useRef();
    const [isReconnecting, setIsReconnecting] = useState(false);

    const connect = useCallback(() => {
        try {
            if (socketRef.current?.readyState === WebSocket.OPEN) {
                return;
            }

            // Construir URL do WebSocket
            const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
            const host = window.location.host;
            const wsUrl = `${protocol}//${host}${url}`;

            console.log('Conectando ao WebSocket:', wsUrl, {
                tentativa: reconnectAttempts.current + 1,
                statusAtual: connectionStatus
            });

            const ws = new WebSocket(wsUrl);
            socketRef.current = ws;

            ws.onopen = (event) => {
                console.log('WebSocket conectado:', event);
                setConnectionStatus('Open');
                setIsReconnecting(false);
                reconnectAttempts.current = 0;
                setSocket(ws);
                onOpen?.(event);
            };

            ws.onclose = (event) => {
                console.log('WebSocket desconectado:', event.code, event.reason);
                setConnectionStatus('Closed');
                setSocket(null);
                socketRef.current = null;
                onClose?.(event);

                // Tentar reconectar se habilitado
                if (shouldReconnect && reconnectAttempts.current < maxReconnectAttempts) {
                    reconnectAttempts.current += 1;
                    setIsReconnecting(true);
                    console.log(`Tentativa de reconexão ${reconnectAttempts.current}/${maxReconnectAttempts}`);
                    
                    reconnectTimeouts.current = setTimeout(() => {
                        setConnectionStatus('Connecting');
                        connect();
                    }, reconnectInterval);
                } else if (reconnectAttempts.current >= maxReconnectAttempts) {
                    setIsReconnecting(false);
                    console.log('Máximo de tentativas de reconexão excedido');
                }
            };

            ws.onmessage = (event) => {
                console.log('Mensagem WebSocket recebida:', event.data);
                let messageData;
                
                try {
                    messageData = JSON.parse(event.data);
                } catch (error) {
                    console.error('Erro ao parsear mensagem WebSocket:', error);
                    messageData = { type: 'error', data: event.data };
                }

                setLastMessage(messageData);
                setMessageHistory(prev => [...prev.slice(-99), messageData]); // Manter últimas 100 mensagens
                onMessage?.(messageData);
            };

            ws.onerror = (error) => {
                console.error('Erro no WebSocket:', error);
                setConnectionStatus('Error');
                onError?.(error);
            };

        } catch (error) {
            console.error('Erro ao criar WebSocket:', error);
            setConnectionStatus('Error');
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
    }, []);

    const sendMessage = useCallback((message) => {
        if (socketRef.current?.readyState === WebSocket.OPEN) {
            const messageStr = typeof message === 'string' ? message : JSON.stringify(message);
            socketRef.current.send(messageStr);
            return true;
        } else {
            console.warn('WebSocket não está conectado. Estado:', socketRef.current?.readyState);
            return false;
        }
    }, []);

    const sendJsonMessage = useCallback((object) => {
        return sendMessage(JSON.stringify(object));
    }, [sendMessage]);

    // Conectar ao montar e desconectar ao desmontar
    useEffect(() => {
        if (url) {
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
        isReconnecting
    };
}

export default useWebSocket;