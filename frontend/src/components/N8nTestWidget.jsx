import { useState } from 'react'

const N8nTestWidget = () => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div style={{
      position: 'fixed',
      bottom: '24px',
      right: '24px',
      zIndex: 2147483647,
      fontFamily: 'Inter, sans-serif'
    }}>
      {!isOpen ? (
        <button
          onClick={() => setIsOpen(true)}
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
            transition: 'all 0.3s ease'
          }}
          onMouseOver={(e) => e.target.style.transform = 'scale(1.05)'}
          onMouseOut={(e) => e.target.style.transform = 'scale(1)'}
        >
          💬
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
          flexDirection: 'column'
        }}>
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
              <p style={{ margin: '4px 0 0 0', fontSize: '12px', opacity: 0.9 }}>Tire suas dúvidas sobre o sistema</p>
            </div>
            <button
              onClick={() => setIsOpen(false)}
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

          <div style={{
            flex: 1,
            padding: '16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexDirection: 'column',
            textAlign: 'center'
          }}>
            <div style={{
              background: 'hsl(240, 4.8%, 95.9%)',
              padding: '12px 16px',
              borderRadius: '18px 18px 18px 4px',
              marginBottom: '16px'
            }}>
              👋 Olá! Sou o assistente do Chegou Hub.
              <br />
              <br />
              Como posso ajudá-lo hoje?
            </div>

            <div style={{
              color: 'hsl(240, 3.8%, 46.1%)',
              fontSize: '14px'
            }}>
              <strong>Status do Widget N8N:</strong>
              <br />
              Webhook URL: {process.env.REACT_APP_N8N_WEBHOOK_URL ? '✅ Configurada' : '❌ Não configurada'}
              <br />
              Pacote @n8n/chat: ✅ Instalado
              <br />
              <br />
              {process.env.REACT_APP_N8N_WEBHOOK_URL && (
                <div style={{ fontSize: '12px', wordBreak: 'break-all' }}>
                  URL: {process.env.REACT_APP_N8N_WEBHOOK_URL}
                </div>
              )}
            </div>
          </div>

          <div style={{
            padding: '16px 20px',
            borderTop: '1px solid hsl(240, 5.9%, 90%)'
          }}>
            <input
              placeholder="Digite sua pergunta..."
              style={{
                width: '100%',
                padding: '12px 16px',
                border: '1px solid hsl(240, 5.9%, 90%)',
                borderRadius: '0.65rem',
                fontSize: '14px'
              }}
              disabled
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default N8nTestWidget