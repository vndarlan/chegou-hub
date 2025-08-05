import { useState, useRef, useEffect } from 'react'
import { Button } from "./button"
import { Card, CardContent, CardHeader, CardTitle } from "./card"
import { Input } from "./input"
import { ScrollArea } from "./scroll-area"
import { Badge } from "./badge"
import { Avatar, AvatarFallback, AvatarImage } from "./avatar"
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  Loader2,
  AlertCircle,
  Sparkles
} from 'lucide-react'
import { cn } from '../../lib/utils'
import { useCSRF } from '../../hooks/useCSRF'

const ChatbotWidget = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [remainingRequests, setRemainingRequests] = useState(null)
  
  const { csrfToken, refreshToken } = useCSRF()
  
  const messagesEndRef = useRef(null)
  const inputRef = useRef(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen])

  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return

    const userMessage = currentMessage.trim()
    setCurrentMessage('')
    setError('')
    setIsLoading(true)

    // Adiciona mensagem do usuário
    const newUserMessage = {
      id: Date.now(),
      type: 'user',
      content: userMessage,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, newUserMessage])

    try {
      // Verifica se tem token CSRF, se não tenta renovar
      let token = csrfToken;
      if (!token) {
        console.log('Token CSRF não encontrado, tentando renovar...');
        token = await refreshToken();
      }
      
      if (!token) {
        throw new Error('Não foi possível obter o token CSRF. Você precisa estar logado.');
      }
      
      const response = await fetch('/api/chatbot/ask/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': token
        },
        credentials: 'include',
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()

      if (!response.ok) {
        // Se erro 403 (CSRF), tenta renovar token e fazer nova tentativa
        if (response.status === 403) {
          console.log('Erro 403 detectado, tentando renovar token CSRF...');
          const newToken = await refreshToken();
          
          if (newToken) {
            // Faz nova tentativa com token renovado
            const retryResponse = await fetch('/api/chatbot/ask/', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': newToken
              },
              credentials: 'include',
              body: JSON.stringify({ message: userMessage })
            });
            
            if (retryResponse.ok) {
              const retryData = await retryResponse.json();
              // Processa resposta bem-sucedida
              const botMessage = {
                id: retryData.message_id,
                type: 'bot',
                content: retryData.response,
                timestamp: new Date(),
                responseTime: retryData.response_time_ms
              }
              setMessages(prev => [...prev, botMessage])
              setRemainingRequests(retryData.remaining_requests)
              
              if (retryData.warning) {
                setError(retryData.warning)
              }
              return; // Sai da função após sucesso
            }
          }
        }
        
        throw new Error(data.error || `Erro ${response.status}`)
      }

      // Adiciona resposta do bot
      const botMessage = {
        id: data.message_id,
        type: 'bot',
        content: data.response,
        timestamp: new Date(),
        responseTime: data.response_time_ms
      }
      setMessages(prev => [...prev, botMessage])
      setRemainingRequests(data.remaining_requests)

      if (data.warning) {
        setError(data.warning)
      }

    } catch (err) {
      console.error('Erro ao enviar mensagem:', err)
      
      let errorMessage = 'Erro ao enviar mensagem. Tente novamente.'
      
      // Verifica se é erro de parsing JSON (HTML sendo retornado)
      if (err.message.includes('Unexpected token') || err.message.includes('JSON')) {
        console.error('Resposta não é JSON válido - provavelmente HTML de erro')
        errorMessage = 'Erro no servidor. Verifique se você está logado e tente novamente.'
      } else if (err.message.includes('fetch')) {
        errorMessage = 'Erro de conexão. Verifique sua internet e tente novamente.'
      } else {
        errorMessage = err.message || errorMessage
      }
      
      setError(errorMessage)
      
      // Remove a mensagem do usuário se houve erro
      setMessages(prev => prev.filter(msg => msg.id !== newUserMessage.id))
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSendMessage()
    }
  }

  const formatTime = (date) => {
    return date.toLocaleTimeString('pt-BR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  const formatMessage = (content) => {
    // Formatação básica de markdown
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/\n/g, '<br>')
  }

  if (!isOpen) {
    return (
      <div className={cn("fixed bottom-6 right-6 z-50", className)}>
        <Button
          onClick={() => setIsOpen(true)}
          size="lg"
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-primary hover:bg-primary/90 group relative"
        >
          <MessageCircle className="h-6 w-6 transition-transform group-hover:scale-110" />
          <div className="absolute -top-1 -right-1 h-3 w-3 bg-green-500 rounded-full animate-pulse" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Card className="w-96 h-[500px] shadow-xl border animate-slide-down bg-card">
        <CardHeader className="pb-3 bg-gradient-to-r from-primary to-primary/90 text-primary-foreground">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="relative">
                <Avatar className="h-9 w-9 border-2 border-primary-foreground/20">
                  <AvatarImage src="/bot-avatar.png" />
                  <AvatarFallback className="bg-primary-foreground/10 text-primary-foreground">
                    <Sparkles className="h-4 w-4" />
                  </AvatarFallback>
                </Avatar>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-green-400 border-2 border-primary rounded-full" />
              </div>
              <div>
                <CardTitle className="text-sm font-semibold">
                  Assistente Chegou Hub
                </CardTitle>
                <p className="text-xs text-primary-foreground/80 mt-0.5">
                  Tire suas dúvidas sobre o sistema
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-primary-foreground hover:bg-primary-foreground/10 h-8 w-8 p-0 transition-colors"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 flex flex-col h-[calc(500px-80px)]">
          {/* Área de mensagens */}
          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4">
              {messages.length === 0 && (
                <div className="text-center text-muted-foreground mt-8">
                  <div className="relative mx-auto w-12 h-12 mb-4">
                    <Sparkles className="h-12 w-12 mx-auto text-primary/60" />
                    <div className="absolute inset-0 bg-primary/10 rounded-full animate-pulse" />
                  </div>
                  <p className="text-sm font-medium text-foreground mb-2">
                    Olá! Como posso ajudar você?
                  </p>
                  <p className="text-xs text-muted-foreground mb-4">
                    Tire suas dúvidas sobre o sistema Chegou Hub
                  </p>
                  <div className="space-y-2 text-xs">
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                      <span>💡</span>
                      <span>Como fazer login?</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                      <span>📅</span>
                      <span>Como usar a agenda?</span>
                    </div>
                    <div className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded-full">
                      <span>📊</span>
                      <span>Como ver métricas?</span>
                    </div>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end space-x-2",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  {message.type === 'bot' && (
                    <Avatar className="h-6 w-6 mb-1">
                      <AvatarFallback className="bg-primary/10 text-primary">
                        <Sparkles className="h-3 w-3" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                  <div
                    className={cn(
                      "max-w-[75%] rounded-2xl px-4 py-2 text-sm",
                      message.type === 'user'
                        ? 'bg-primary text-primary-foreground ml-12'
                        : 'bg-muted text-foreground mr-12'
                    )}
                  >
                    <div
                      dangerouslySetInnerHTML={{
                        __html: formatMessage(message.content)
                      }}
                    />
                    <div
                      className={cn(
                        "text-xs mt-1 flex items-center justify-between",
                        message.type === 'user' 
                          ? 'text-primary-foreground/70' 
                          : 'text-muted-foreground'
                      )}
                    >
                      <span>{formatTime(message.timestamp)}</span>
                      {message.responseTime && (
                        <span className="ml-2">
                          {message.responseTime}ms
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex items-end space-x-2 justify-start">
                  <Avatar className="h-6 w-6 mb-1">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      <Sparkles className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="bg-muted rounded-2xl px-4 py-3 text-sm mr-12">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      <span className="text-muted-foreground">Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Status e erro */}
          {(error || remainingRequests !== null) && (
            <div className="px-4 py-3 border-t bg-muted/30">
              {error && (
                <div className="flex items-center space-x-2 text-xs text-destructive mb-2 p-2 bg-destructive/10 rounded-lg">
                  <AlertCircle className="h-3 w-3 flex-shrink-0" />
                  <span>{error}</span>
                </div>
              )}
              {remainingRequests !== null && (
                <Badge variant="secondary" className="text-xs font-medium">
                  <Sparkles className="h-3 w-3 mr-1" />
                  {remainingRequests} perguntas restantes
                </Badge>
              )}
            </div>
          )}

          {/* Input de mensagem */}
          <div className="p-4 border-t bg-background">
            <div className="flex space-x-2">
              <div className="relative flex-1">
                <Input
                  ref={inputRef}
                  value={currentMessage}
                  onChange={(e) => setCurrentMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Digite sua pergunta..."
                  disabled={isLoading}
                  className="pr-12 text-sm focus:ring-2 focus:ring-primary/20 transition-all"
                  maxLength={2000}
                />
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">
                  {currentMessage.length}/2000
                </div>
              </div>
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="sm"
                className="px-3 shadow-sm hover:shadow-md transition-all"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Powered by IA • Respostas podem conter erros
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatbotWidget