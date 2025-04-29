// src/components/DifyChat/DifyChat.js
import React, { useEffect } from 'react';

function DifyChat() {
  useEffect(() => {
    // Configurar o Dify Chatbot
    window.difyChatbotConfig = {
      token: 'APq2JOaoSnC4qNqp',
      baseUrl: 'https://web-production-c7e3.up.railway.app',
      systemVariables: {
        // user_id: 'YOU CAN DEFINE USER ID HERE',
        // conversation_id: 'YOU CAN DEFINE CONVERSATION ID HERE, IT MUST BE A VALID UUID',
      },
    };

    // Criar elemento script para o Dify
    const script = document.createElement('script');
    script.src = 'https://web-production-c7e3.up.railway.app/embed.min.js';
    script.id = 'APq2JOaoSnC4qNqp';
    script.defer = true;
    document.body.appendChild(script);

    // Criar elemento style para personalizar o Dify
    const style = document.createElement('style');
    style.innerHTML = `
      #dify-chatbot-bubble-button {
        background-color: #1C64F2 !important;
      }
      #dify-chatbot-bubble-window {
        width: 24rem !important;
        height: 40rem !important;
      }
    `;
    document.head.appendChild(style);

    // Função de limpeza que remove os elementos quando o componente é desmontado
    return () => {
      if (script.parentNode) {
        script.parentNode.removeChild(script);
      }
      if (style.parentNode) {
        style.parentNode.removeChild(style);
      }
      // Limpar quaisquer elementos criados pelo Dify
      const chatButton = document.getElementById('dify-chatbot-bubble-button');
      if (chatButton && chatButton.parentNode) {
        chatButton.parentNode.removeChild(chatButton);
      }
      const chatWindow = document.getElementById('dify-chatbot-bubble-window');
      if (chatWindow && chatWindow.parentNode) {
        chatWindow.parentNode.removeChild(chatWindow);
      }
    };
  }, []); // O array vazio significa que este efeito roda apenas uma vez na montagem

  // Este componente não renderiza nada visível por si mesmo
  return null;
}

export default DifyChat;