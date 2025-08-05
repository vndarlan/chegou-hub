import os
import re
from datetime import datetime
from typing import List, Dict
from django.conf import settings
from django.core.cache import cache
from .models import DocumentCache


class DocumentReader:
    def __init__(self):
        self.docs_path = os.path.join(settings.BASE_DIR.parent, 'docs', 'user-guides')
        self.cache_timeout = 60 * 60  # 1 hora
    
    def get_all_documents(self) -> List[Dict[str, str]]:
        """Retorna todos os documentos de user guides"""
        cache_key = 'chatbot_documents_all'
        cached_docs = cache.get(cache_key)
        
        if cached_docs:
            return cached_docs
        
        documents = []
        
        if not os.path.exists(self.docs_path):
            return documents
        
        for filename in os.listdir(self.docs_path):
            if filename.endswith('.md'):
                file_path = os.path.join(self.docs_path, filename)
                doc_data = self._read_document(file_path)
                if doc_data:
                    documents.append(doc_data)
        
        cache.set(cache_key, documents, self.cache_timeout)
        return documents
    
    def _read_document(self, file_path: str) -> Dict[str, str]:
        """Lê um documento markdown e extrai informações"""
        try:
            # Verifica cache no banco
            relative_path = os.path.relpath(file_path)
            file_stat = os.stat(file_path)
            last_modified = datetime.fromtimestamp(file_stat.st_mtime)
            
            try:
                doc_cache = DocumentCache.objects.get(file_path=relative_path)
                if doc_cache.last_modified >= last_modified.replace(tzinfo=None):
                    return {
                        'title': self._extract_title_from_path(file_path),
                        'content': doc_cache.content,
                        'file_path': relative_path
                    }
            except DocumentCache.DoesNotExist:
                pass
            
            # Lê o arquivo
            with open(file_path, 'r', encoding='utf-8') as file:
                content = file.read()
            
            # Atualiza cache no banco
            DocumentCache.objects.update_or_create(
                file_path=relative_path,
                defaults={
                    'content': content,
                    'last_modified': last_modified
                }
            )
            
            return {
                'title': self._extract_title(content) or self._extract_title_from_path(file_path),
                'content': content,
                'file_path': relative_path
            }
            
        except Exception as e:
            print(f"Erro ao ler documento {file_path}: {str(e)}")
            return None
    
    def _extract_title(self, content: str) -> str:
        """Extrai o título do documento markdown"""
        lines = content.split('\n')
        for line in lines:
            if line.startswith('# '):
                return line[2:].strip()
        return None
    
    def _extract_title_from_path(self, file_path: str) -> str:
        """Extrai título do nome do arquivo"""
        filename = os.path.basename(file_path)
        name_without_ext = os.path.splitext(filename)[0]
        
        # Converte kebab-case para título
        title = name_without_ext.replace('-', ' ').replace('_', ' ')
        return title.title()
    
    def clear_cache(self):
        """Limpa o cache de documentos"""
        cache.delete('chatbot_documents_all')
        DocumentCache.objects.all().delete()


class RateLimiter:
    """Rate limiter simples baseado em cache"""
    
    def __init__(self, max_requests: int = 10, window_minutes: int = 5):
        self.max_requests = max_requests
        self.window_seconds = window_minutes * 60
    
    def is_allowed(self, user_id: int) -> bool:
        """Verifica se o usuário pode fazer uma nova requisição"""
        cache_key = f'chatbot_rate_limit_user_{user_id}'
        current_requests = cache.get(cache_key, 0)
        
        if current_requests >= self.max_requests:
            return False
        
        cache.set(cache_key, current_requests + 1, self.window_seconds)
        return True
    
    def get_remaining_requests(self, user_id: int) -> int:
        """Retorna quantas requisições restam para o usuário"""
        cache_key = f'chatbot_rate_limit_user_{user_id}'
        current_requests = cache.get(cache_key, 0)
        return max(0, self.max_requests - current_requests)