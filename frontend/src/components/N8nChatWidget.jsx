import { useEffect, useRef } from 'react'
import '@n8n/chat/style.css'
import './N8nChatWidget.css'
import { createChat } from '@n8n/chat'

const N8nChatWidget = ({
  webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL,
  mode = 'window',
  loadPreviousSession = true
}) => {
  const chatInitialized = useRef(false)

  useEffect(() => {
    // Evita múltiplas inicializações
    if (chatInitialized.current) return

    const initializeChat = () => {
      // Validação de segurança
      if (!webhookUrl) {
        console.error('N8n Chat Widget: Webhook URL não configurada')
        return
      }

      try {
        createChat({
          webhookUrl,
          target: '#n8n-chat-widget',
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
            // CSS movido para arquivo separado: N8nChatWidget.css
          }
        })

        chatInitialized.current = true
      } catch (error) {
        console.error('Erro ao inicializar chat n8n:', error)
      }
    }

    // Pequeno delay para garantir que o DOM esteja pronto
    const timer = setTimeout(initializeChat, 100)

    return () => {
      clearTimeout(timer)
    }
  }, [webhookUrl, mode, loadPreviousSession])

  return <div id="n8n-chat-widget" />
}

export default N8nChatWidget