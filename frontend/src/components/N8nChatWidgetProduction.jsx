import { useEffect, useRef, useState } from 'react'
import '@n8n/chat/style.css'
import './N8nChatWidget.css'

const N8nChatWidgetProduction = ({
  webhookUrl = process.env.REACT_APP_N8N_WEBHOOK_URL,
  mode = 'window',
  loadPreviousSession = true
}) => {
  const chatInitialized = useRef(false)
  const [isReady, setIsReady] = useState(false)
  const [error, setError] = useState(null)

  useEffect(() => {
    // Evita múltiplas inicializações
    if (chatInitialized.current) return

    const initializeChat = async () => {
      try {
        // Validação de segurança
        if (!webhookUrl) {
          setError('N8n Chat Widget: Webhook URL não configurada')
          return
        }

        // Aguardar que o DOM esteja completamente carregado
        if (document.readyState !== 'complete') {
          await new Promise(resolve => {
            const checkReady = () => {
              if (document.readyState === 'complete') {
                resolve()
              } else {
                setTimeout(checkReady, 100)
              }
            }
            checkReady()
          })
        }

        // Importar dinamicamente com try/catch individual para cada import
        let createChat
        try {
          const n8nModule = await import('@n8n/chat')
          createChat = n8nModule.createChat
        } catch (importError) {
          console.error('Erro ao importar @n8n/chat:', importError)
          setError('Erro ao carregar biblioteca do chat')
          return
        }

        // CSS já importado estaticamente no topo do arquivo

        // Verificar se o elemento DOM existe
        const targetElement = document.getElementById('n8n-chat-widget-production')
        if (!targetElement) {
          setError('Elemento DOM não encontrado')
          return
        }

        const chatConfig = {
          webhookUrl,
          target: '#n8n-chat-widget-production',
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

        createChat(chatConfig)
        chatInitialized.current = true
        setIsReady(true)
        setError(null)

      } catch (error) {
        const errorMsg = `Erro ao inicializar chat n8n: ${error.message}`
        console.error(errorMsg, error)
        setError(errorMsg)
      }
    }

    // Inicializar após um delay maior para garantir que tudo esteja carregado
    const timer = setTimeout(initializeChat, 1000)

    return () => {
      clearTimeout(timer)
    }
  }, [webhookUrl, mode, loadPreviousSession])

  if (error) {
    console.warn('N8N Chat Widget Error:', error)
    return null // Não mostra nada se houver erro
  }

  return <div id="n8n-chat-widget-production" />
}

export default N8nChatWidgetProduction