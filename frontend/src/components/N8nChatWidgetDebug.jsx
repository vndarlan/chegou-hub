import { useEffect, useRef, useState } from 'react'
import './N8nChatWidget.css'

const N8nChatWidgetDebug = ({
  webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL,
  mode = 'window',
  loadPreviousSession = true
}) => {
  const chatInitialized = useRef(false)
  const [debugInfo, setDebugInfo] = useState({
    webhookUrl: '',
    chatLoaded: false,
    error: null,
    domReady: false,
    cssLoaded: false
  })

  useEffect(() => {
    // Debug das variáveis de ambiente
    console.log('🔧 N8N DEBUG - Variáveis de ambiente:', {
      webhookUrl,
      REACT_APP_N8N_WEBHOOK_URL: process.env.REACT_APP_N8N_WEBHOOK_URL,
      NODE_ENV: process.env.NODE_ENV,
      allEnvVars: Object.keys(process.env).filter(key => key.startsWith('REACT_APP_'))
    })

    setDebugInfo(prev => ({
      ...prev,
      webhookUrl: webhookUrl || 'URL não configurada',
      domReady: true
    }))

    // Evita múltiplas inicializações
    if (chatInitialized.current) return

    const initializeChat = async () => {
      try {
        // Validação de segurança
        if (!webhookUrl) {
          const error = 'N8n Chat Widget: Webhook URL não configurada'
          console.error('❌', error)
          setDebugInfo(prev => ({ ...prev, error }))
          return
        }

        console.log('🚀 Inicializando N8N Chat...', { webhookUrl, mode, loadPreviousSession })

        // Importar dinamicamente para debug
        const { createChat } = await import('@n8n/chat')
        console.log('✅ Biblioteca @n8n/chat importada com sucesso')

        // Importar CSS dinamicamente
        await import('@n8n/chat/style.css')
        console.log('✅ CSS @n8n/chat importado com sucesso')
        setDebugInfo(prev => ({ ...prev, cssLoaded: true }))

        // Verificar se o elemento DOM existe
        const targetElement = document.getElementById('n8n-chat-widget-debug')
        if (!targetElement) {
          throw new Error('Elemento DOM #n8n-chat-widget-debug não encontrado')
        }

        console.log('✅ Elemento DOM encontrado:', targetElement)

        const chatConfig = {
          webhookUrl,
          target: '#n8n-chat-widget-debug',
          mode,
          loadPreviousSession,
          initialMessages: [
            {
              role: 'assistant',
              message: '👋 Olá! Sou o assistente do Chegou Hub.\n\nComo posso ajudá-lo hoje?'
            }
          ],
          i18n: {
            en: {
              title: 'Assistente Chegou Hub',
              subtitle: 'Tire suas dúvidas sobre o sistema',
              footer: 'Powered by IA',
              getStarted: 'Iniciar conversa',
              inputPlaceholder: 'Digite sua pergunta...',
              submit: 'Enviar'
            }
          },
          theme: {
            primaryColor: 'hsl(25, 95%, 53%)'
          }
        }

        console.log('🎯 Configuração do chat:', chatConfig)

        createChat(chatConfig)
        console.log('✅ Chat N8N inicializado com sucesso!')

        setDebugInfo(prev => ({ ...prev, chatLoaded: true, error: null }))
        chatInitialized.current = true

      } catch (error) {
        const errorMsg = `Erro ao inicializar chat n8n: ${error.message}`
        console.error('❌', errorMsg, error)
        setDebugInfo(prev => ({ ...prev, error: errorMsg }))
      }
    }

    // Aguardar DOM carregar completamente
    const timer = setTimeout(initializeChat, 500)

    return () => {
      clearTimeout(timer)
    }
  }, [webhookUrl, mode, loadPreviousSession])

  return (
    <>
      {/* Widget do chat */}
      <div id="n8n-chat-widget-debug" />

      {/* Painel de debug - apenas em development */}
      {process.env.NODE_ENV === 'development' && (
        <div
          style={{
            position: 'fixed',
            top: '10px',
            left: '10px',
            background: '#000',
            color: '#fff',
            padding: '10px',
            borderRadius: '8px',
            fontSize: '12px',
            zIndex: 9999,
            maxWidth: '300px',
            fontFamily: 'monospace'
          }}
        >
          <h4>🔧 N8N Chat Debug</h4>
          <p><strong>Webhook URL:</strong> {debugInfo.webhookUrl}</p>
          <p><strong>DOM Ready:</strong> {debugInfo.domReady ? '✅' : '❌'}</p>
          <p><strong>CSS Loaded:</strong> {debugInfo.cssLoaded ? '✅' : '❌'}</p>
          <p><strong>Chat Loaded:</strong> {debugInfo.chatLoaded ? '✅' : '❌'}</p>
          {debugInfo.error && (
            <p style={{ color: '#ff6b6b' }}><strong>Erro:</strong> {debugInfo.error}</p>
          )}
        </div>
      )}
    </>
  )
}

export default N8nChatWidgetDebug