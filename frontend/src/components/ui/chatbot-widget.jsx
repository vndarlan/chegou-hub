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
  AlertCircle 
} from 'lucide-react'
import { cn } from '../../lib/utils'

const ChatbotWidget = ({ className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState([])
  const [currentMessage, setCurrentMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [remainingRequests, setRemainingRequests] = useState(null)
  
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
      const response = await fetch('/api/chatbot/ask/', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]')?.value || ''
        },
        credentials: 'include',
        body: JSON.stringify({ message: userMessage })
      })

      const data = await response.json()

      if (!response.ok) {
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
      setError(err.message || 'Erro ao enviar mensagem. Tente novamente.')
      
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
          className="h-14 w-14 rounded-full shadow-lg hover:shadow-xl transition-all duration-300 bg-blue-600 hover:bg-blue-700"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      </div>
    )
  }

  return (
    <div className={cn("fixed bottom-6 right-6 z-50", className)}>
      <Card className="w-96 h-[500px] shadow-2xl border-0 bg-white">
        <CardHeader className="pb-3 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-t-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src="/bot-avatar.png" />
                <AvatarFallback className="bg-blue-500">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-sm font-medium">
                  Assistente Chegou Hub
                </CardTitle>
                <p className="text-xs text-blue-100 mt-0.5">
                  Tire suas dúvidas sobre o sistema
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-blue-500/20 h-8 w-8 p-0"
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
                <div className="text-center text-gray-500 mt-8">
                  <Bot className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                  <p className="text-sm">
                    Olá! Como posso ajudar você com o sistema Chegou Hub?
                  </p>
                  <div className="mt-3 space-y-1 text-xs">
                    <p>• Como fazer login?</p>
                    <p>• Como usar a agenda?</p>
                    <p>• Como ver métricas?</p>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div
                  key={message.id}
                  className={cn(
                    "flex",
                    message.type === 'user' ? 'justify-end' : 'justify-start'
                  )}
                >
                  <div
                    className={cn(
                      "max-w-[80%] rounded-lg px-3 py-2 text-sm",
                      message.type === 'user'
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-100 text-gray-900'
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
                        message.type === 'user' ? 'text-blue-100' : 'text-gray-500'
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
                <div className="flex justify-start">
                  <div className="bg-gray-100 rounded-lg px-3 py-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Pensando...</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div ref={messagesEndRef} />
          </ScrollArea>

          {/* Status e erro */}
          {(error || remainingRequests !== null) && (
            <div className="px-4 py-2 border-t bg-gray-50">
              {error && (
                <div className="flex items-center space-x-2 text-xs text-red-600 mb-2">
                  <AlertCircle className="h-3 w-3" />
                  <span>{error}</span>
                </div>
              )}
              {remainingRequests !== null && (
                <Badge variant="secondary" className="text-xs">
                  {remainingRequests} perguntas restantes
                </Badge>
              )}
            </div>
          )}

          {/* Input de mensagem */}
          <div className="p-4 border-t">
            <div className="flex space-x-2">
              <Input
                ref={inputRef}
                value={currentMessage}
                onChange={(e) => setCurrentMessage(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Digite sua pergunta..."
                disabled={isLoading}
                className="flex-1 text-sm"
                maxLength={2000}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!currentMessage.trim() || isLoading}
                size="sm"
                className="px-3"
              >
                {isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ChatbotWidget