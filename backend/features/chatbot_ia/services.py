import os
import time
import logging
from typing import List, Dict, Optional
from django.conf import settings
from django.core.cache import cache
import anthropic
from .utils import DocumentReader

logger = logging.getLogger(__name__)


class ChatbotService:
    def __init__(self):
        self.client = anthropic.Anthropic(
            api_key=os.getenv('ANTHROPIC_API_KEY')
        )
        self.document_reader = DocumentReader()
        self.model = "claude-3-5-sonnet-20241022"
    
    def get_response(self, user_message: str, user_id: int) -> Dict[str, any]:
        start_time = time.time()
        
        try:
            # Carrega documentos relevantes
            relevant_docs = self._get_relevant_documents(user_message)
            
            # Monta o contexto
            system_prompt = self._build_system_prompt(relevant_docs)
            
            # Chama a API Claude
            response = self.client.messages.create(
                model=self.model,
                max_tokens=2000,
                temperature=0.1,
                system=system_prompt,
                messages=[
                    {
                        "role": "user",
                        "content": user_message
                    }
                ]
            )
            
            response_text = response.content[0].text
            response_time = int((time.time() - start_time) * 1000)
            
            logger.info(f"Chatbot response generated for user {user_id} in {response_time}ms")
            
            return {
                'response': response_text,
                'response_time_ms': response_time,
                'success': True
            }
            
        except Exception as e:
            response_time = int((time.time() - start_time) * 1000)
            logger.error(f"Error generating chatbot response for user {user_id}: {str(e)}")
            
            return {
                'response': self._get_fallback_response(),
                'response_time_ms': response_time,
                'success': False,
                'error': str(e)
            }
    
    def _get_relevant_documents(self, user_message: str) -> List[Dict[str, str]]:
        """Busca documentos relevantes baseado na mensagem do usuário"""
        all_docs = self.document_reader.get_all_documents()
        
        # Busca simples por palavras-chave
        keywords = user_message.lower().split()
        relevant_docs = []
        
        for doc in all_docs:
            score = 0
            content_lower = doc['content'].lower()
            
            for keyword in keywords:
                if keyword in content_lower:
                    score += content_lower.count(keyword)
            
            if score > 0:
                doc['relevance_score'] = score
                relevant_docs.append(doc)
        
        # Ordena por relevância e retorna os top 3
        relevant_docs.sort(key=lambda x: x['relevance_score'], reverse=True)
        return relevant_docs[:3]
    
    def _build_system_prompt(self, relevant_docs: List[Dict[str, str]]) -> str:
        """Constrói o prompt do sistema com contexto dos documentos"""
        base_prompt = """Você é o assistente de IA do Chegou Hub, especializado em ajudar a equipe com dúvidas sobre o sistema.

INSTRUÇÕES IMPORTANTES:
- Responda sempre em português brasileiro
- Seja claro, objetivo e prestativo
- Use as informações dos guias de usuário fornecidos
- Se não souber algo, diga que não tem informação sobre isso
- Mantenha um tom profissional e amigável
- Forneça passos práticos quando possível

"""
        
        if relevant_docs:
            base_prompt += "\nGUIAS DE USUÁRIO RELEVANTES:\n\n"
            
            for i, doc in enumerate(relevant_docs, 1):
                base_prompt += f"=== GUIA {i}: {doc['title']} ===\n"
                base_prompt += f"{doc['content']}\n\n"
        
        base_prompt += "\nResponda à pergunta do usuário baseando-se nas informações dos guias acima:"
        
        return base_prompt
    
    def _get_fallback_response(self) -> str:
        """Resposta padrão quando há erro"""
        return """Desculpe, ocorreu um erro ao processar sua pergunta. 

Você pode tentar:
- Reformular sua pergunta
- Verificar os guias de usuário disponíveis no sistema
- Entrar em contato com o suporte técnico

Como posso ajudar de outra forma?"""