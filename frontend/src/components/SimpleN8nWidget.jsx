import { useState, useEffect, useRef } from 'react'
import './N8nChatWidget.css'

const SimpleN8nWidget = () => {
  const [isOpen, setIsOpen] = useState(false)
  const [chatLoaded, setChatLoaded] = useState(false)
  const [error, setError] = useState(null)
  const chatInitialized = useRef(false)

  // WEBHOOK URL HARDCODED conforme solicitado
  const WEBHOOK_URL = 'https://n8ngc.up.railway.app/webhook/11fb9f8b-76b6-4b14-9bb9-a04c2229efd8/chat'

  console.log('🎯 SimpleN8nWidget renderizado - SEMPRE VISÍVEL')

  useEffect(() => {
    if (!isOpen || chatInitialized.current) return

    console.log('🚀 Inicializando N8N Chat...', {
      webhookUrl: WEBHOOK_URL,
      isOpen,
      chatInitialized: chatInitialized.current
    })

    const initializeChat = async () => {
      try {
        // Aguardar DOM estar pronto
        await new Promise(resolve => setTimeout(resolve, 500))

        console.log('📦 Importando @n8n/chat...')

        // Importar dinamicamente
        const { createChat } = await import('@n8n/chat')
        await import('@n8n/chat/style.css')

        console.log('✅ Biblioteca @n8n/chat importada')

        // Verificar elemento DOM
        const targetElement = document.getElementById('simple-n8n-chat')
        if (!targetElement) {
          throw new Error('Elemento DOM não encontrado')
        }

        console.log('✅ Elemento DOM encontrado:', targetElement)

        // Configuração do chat
        const chatConfig = {
          webhookUrl: WEBHOOK_URL,
          target: '#simple-n8n-chat',
          mode: 'window',
          loadPreviousSession: true,
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
        }

        console.log('🎯 Criando chat com configuração:', chatConfig)

        createChat(chatConfig)

        console.log('✅ Chat N8N inicializado com sucesso!')
        setChatLoaded(true)
        setError(null)
        chatInitialized.current = true

      } catch (error) {
        const errorMsg = `Erro ao inicializar chat: ${error.message}`
        console.error('❌ Erro no chat N8N:', errorMsg, error)
        setError(errorMsg)

        // MAS CONTINUA MOSTRANDO O WIDGET MESMO COM ERRO!
        setChatLoaded(false)
      }
    }

    initializeChat()
  }, [isOpen])

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 2147483647,
      fontFamily: 'Inter, sans-serif'
    }}>
      {/* BOTÃO SEMPRE VISÍVEL */}
      {!isOpen ? (
        <button
          onClick={() => {
            console.log('🔥 Abrindo chat N8N')
            setIsOpen(true)
          }}
          style={{
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            background: 'hsl(25, 95%, 53%)',
            border: 'none',
            color: 'white',
            fontSize: '20px',
            cursor: 'pointer',
            boxShadow: '0 8px 25px -5px hsl(25, 95%, 53% / 0.35)',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
          title="Assistente IA - Chegou Hub"
        >
          🤖
          {/* Indicador online */}
          <div style={{
            position: 'absolute',
            top: '4px',
            right: '4px',
            width: '14px',
            height: '14px',
            background: '#22c55e',
            border: '2px solid white',
            borderRadius: '50%',
            animation: 'pulse 2s infinite'
          }} />
        </button>
      ) : (
        <div style={{
          width: '380px',
          height: '500px',
          background: 'white',
          borderRadius: '0.65rem',
          boxShadow: '0 20px 25px -5px rgb(0 0 0 / 0.1)',
          border: '1px solid hsl(240, 5.9%, 90%)',
          display: 'flex',
          flexDirection: 'column',
          animation: 'slideUp 0.3s ease'
        }}>
          {/* Header */}
          <div style={{
            background: 'linear-gradient(135deg, hsl(25, 95%, 53%) 0%, hsl(25, 95%, 48%) 100%)',
            color: 'white',
            padding: '16px 20px',
            borderRadius: '0.65rem 0.65rem 0 0',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div>
              <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '600' }}>Assistente Chegou Hub</h3>
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>
                {chatLoaded ? '✅ Conectado' : error ? '⚠️ Com problemas mas funcionando' : '⏳ Carregando...'}
              </p>
            </div>
            <button
              onClick={() => {
                console.log('🔥 Fechando chat N8N')
                setIsOpen(false)
              }}
              style={{
                background: 'transparent',
                border: 'none',
                color: 'white',
                fontSize: '18px',
                cursor: 'pointer',
                padding: '4px'
              }}
            >
              ✕
            </button>
          </div>

          {/* Área do Chat */}
          <div style={{ flex: 1, position: 'relative' }}>
            {/* Container do N8N Chat */}
            <div id="simple-n8n-chat" style={{ height: '100%' }} />

            {/* Fallback se não carregar */}
            {!chatLoaded && (
              <div style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexDirection: 'column',
                padding: '20px',
                textAlign: 'center',
                background: 'white'
              }}>
                <div style={{
                  background: 'hsl(240, 4.8%, 95.9%)',
                  padding: '12px 16px',
                  borderRadius: '18px 18px 18px 4px',
                  marginBottom: '16px',
                  fontSize: '14px',
                  lineHeight: 1.4
                }}>
                  👋 Olá! Sou o assistente do Chegou Hub.
                  <br /><br />
                  {error ? (
                    <>
                      Estou passando por uma manutenção, mas você pode tentar novamente ou entrar em contato conosco diretamente.
                      <br /><br />
                      <small style={{ opacity: 0.7 }}>Erro técnico: {error}</small>
                    </>
                  ) : (
                    'Aguarde um momento enquanto me preparo para ajudá-lo...'
                  )}
                </div>

                {error && (
                  <button
                    onClick={() => {
                      console.log('🔄 Tentando recarregar chat...')
                      setChatLoaded(false)
                      setError(null)
                      chatInitialized.current = false
                      // Trigger re-initialization
                      setIsOpen(false)
                      setTimeout(() => setIsOpen(true), 100)
                    }}
                    style={{
                      background: 'hsl(25, 95%, 53%)',
                      border: 'none',
                      borderRadius: '0.65rem',
                      padding: '8px 16px',
                      color: 'white',
                      fontSize: '12px',
                      cursor: 'pointer'
                    }}
                  >
                    🔄 Tentar Novamente
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

    </div>
  )
}

export default SimpleN8nWidget