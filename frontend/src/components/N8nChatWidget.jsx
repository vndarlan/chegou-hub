import { useEffect, useRef } from 'react'
import './N8nChatWidget.css'

const N8nChatWidget = ({
  webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL,
  mode = 'window',
  loadPreviousSession = true
}) => {
  const chatInitialized = useRef(false)

  useEffect(() => {
    // Evita múltiplas inicializações
    if (chatInitialized.current) return

    const initializeChat = async () => {
      try {
        // Validação de segurança
        if (!webhookUrl) {
          console.error('N8n Chat Widget: Webhook URL não configurada')
          console.log('Variáveis de ambiente disponíveis:', Object.keys(process.env).filter(key => key.startsWith('REACT_APP_')))
          return
        }

        // Importar dinamicamente para evitar erros de SSR
        const { createChat } = await import('@n8n/chat')
        await import('@n8n/chat/style.css')

        // Verificar se o elemento DOM existe
        const targetElement = document.getElementById('n8n-chat-widget')
        if (!targetElement) {
          console.error('Elemento DOM #n8n-chat-widget não encontrado')
          return
        }

        createChat({
          webhookUrl,
          target: '#n8n-chat-widget',
          mode,
          loadPreviousSession,
          initialMessages: [
            '👋 Olá! Sou o assistente do Chegou Hub.',
            'Como posso ajudá-lo hoje?'
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
        })

        chatInitialized.current = true
      } catch (error) {
        console.error('Erro ao inicializar chat n8n:', error)
      }
    }

    // Aguardar DOM e CSS carregarem
    const timer = setTimeout(initializeChat, 300)

    return () => {
      clearTimeout(timer)
    }
  }, [webhookUrl, mode, loadPreviousSession])

  return <div id="n8n-chat-widget" />
}

export default N8nChatWidget