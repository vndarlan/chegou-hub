# backend/features/metricas_ecomhub/models.py - VERSÃO COMPLETA COM TODOS OS MODELS
from django.db import models
from django.utils import timezone
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import os
import json

class AnaliseEcomhub(models.Model):
    nome = models.CharField(max_length=255, verbose_name="Nome da Análise")
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    
    # Dados salvos como JSON
    dados_efetividade = models.JSONField(null=True, blank=True, verbose_name="Dados de Efetividade por Produto")
    
    # Nova coluna para indicar se é por loja ou produto
    tipo_metrica = models.CharField(max_length=20, choices=[
        ('loja', 'Por Loja'),
        ('produto', 'Por Produto')
    ], default='produto', verbose_name="Tipo de Métrica")
    
    # Loja Shopify usada (se aplicável)
    loja_shopify = models.ForeignKey('LojaShopify', on_delete=models.SET_NULL, null=True, blank=True)
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Análise ECOMHUB"
        verbose_name_plural = "Análises ECOMHUB"
        ordering = ['-atualizado_em']
        unique_together = ['nome', 'criado_por']
    
    def __str__(self):
        return f"[ECOMHUB] {self.nome}"
    
    def save(self, *args, **kwargs):
        if not self.nome.startswith('[ECOMHUB]'):
            self.nome = f"[ECOMHUB] {self.nome}"
        super().save(*args, **kwargs)

class StatusMappingEcomhub(models.Model):
    """Mapeamento de status para ECOMHUB"""
    status_original = models.CharField(max_length=100, verbose_name="Status Original")
    status_mapeado = models.CharField(max_length=50, verbose_name="Status Mapeado")
    ativo = models.BooleanField(default=True)
    criado_em = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = "Mapeamento de Status ECOMHUB"
        verbose_name_plural = "Mapeamentos de Status ECOMHUB"
        unique_together = ['status_original']
    
    def __str__(self):
        return f"ECOMHUB: {self.status_original} → {self.status_mapeado}"

class LojaShopify(models.Model):
    """Configurações das lojas Shopify"""
    nome = models.CharField(max_length=100, unique=True, verbose_name="Nome da Loja")
    shopify_domain = models.CharField(max_length=255, verbose_name="Domínio Shopify (ex: minhaloja.myshopify.com)")
    access_token = models.TextField(verbose_name="Access Token")
    api_version = models.CharField(max_length=20, default="2024-01", verbose_name="Versão da API")
    
    # Configurações opcionais
    descricao = models.TextField(blank=True, null=True, verbose_name="Descrição")
    pais = models.CharField(max_length=50, blank=True, null=True, verbose_name="País")
    moeda = models.CharField(max_length=10, blank=True, null=True, verbose_name="Moeda")
    
    # Status
    ativo = models.BooleanField(default=True, verbose_name="Ativo")
    testado_em = models.DateTimeField(null=True, blank=True, verbose_name="Última Conexão Testada")
    ultimo_erro = models.TextField(blank=True, null=True, verbose_name="Último Erro")
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True, verbose_name="Criado em")
    atualizado_em = models.DateTimeField(auto_now=True, verbose_name="Atualizado em")
    
    class Meta:
        verbose_name = "Loja Shopify"
        verbose_name_plural = "Lojas Shopify"
        ordering = ['nome']
    
    def __str__(self):
        return f"{self.nome} ({self.shopify_domain})"
    
    def save(self, *args, **kwargs):
        # Criptografar access_token antes de salvar
        if self.access_token and not self.access_token.startswith('encrypted:'):
            self.access_token = self.encrypt_token(self.access_token)
        super().save(*args, **kwargs)
    
    def encrypt_token(self, token):
        """Criptografa o access token"""
        key = self.get_encryption_key()
        f = Fernet(key)
        encrypted_token = f.encrypt(token.encode())
        return f"encrypted:{base64.b64encode(encrypted_token).decode()}"
    
    def decrypt_token(self):
        """Descriptografa o access token"""
        if not self.access_token.startswith('encrypted:'):
            return self.access_token
        
        try:
            key = self.get_encryption_key()
            f = Fernet(key)
            encrypted_data = base64.b64decode(self.access_token[10:])  # Remove 'encrypted:'
            return f.decrypt(encrypted_data).decode()
        except Exception:
            return None
    
    @staticmethod
    def get_encryption_key():
        """Gera ou obtém chave de criptografia"""
        secret_key = getattr(settings, 'SECRET_KEY', 'fallback-key-for-encryption')
        # Deriva uma chave de 32 bytes da SECRET_KEY
        from hashlib import sha256
        return base64.urlsafe_b64encode(sha256(secret_key.encode()).digest())
    
    def test_connection(self):
        """Testa conexão com Shopify"""
        try:
            from .shopify_client import ShopifyClient
            client = ShopifyClient(self)
            shop_info = client.get_shop_info()
            
            self.ultimo_erro = None
            self.testado_em = timezone.now()
            self.save()
            
            return True, shop_info
        except Exception as e:
            self.ultimo_erro = str(e)
            self.save()
            return False, str(e)

class CacheProdutoShopify(models.Model):
    """Cache para produtos Shopify para evitar chamadas desnecessárias à API"""
    loja_shopify = models.ForeignKey(LojaShopify, on_delete=models.CASCADE)
    order_number = models.CharField(max_length=50, verbose_name="Número do Pedido")
    produto_nome = models.CharField(max_length=255, verbose_name="Nome do Produto")
    produto_id = models.CharField(max_length=50, verbose_name="ID do Produto")
    variant_id = models.CharField(max_length=50, blank=True, null=True, verbose_name="ID da Variante")
    sku = models.CharField(max_length=100, blank=True, null=True, verbose_name="SKU")
    
    # Metadados do cache
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Cache Produto Shopify"
        verbose_name_plural = "Cache Produtos Shopify"
        unique_together = ['loja_shopify', 'order_number']
        indexes = [
            models.Index(fields=['loja_shopify', 'order_number']),
        ]
    
    def __str__(self):
        return f"{self.loja_shopify.nome} - Pedido #{self.order_number} - {self.produto_nome}"

class ProcessamentoJob(models.Model):
    """Job de processamento assíncrono"""
    
    STATUS_CHOICES = [
        ('pending', 'Pendente'),
        ('processing', 'Processando'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
        ('cancelled', 'Cancelado'),
    ]
    
    # Identificação
    job_id = models.CharField(max_length=100, unique=True, verbose_name="ID do Job")
    nome = models.CharField(max_length=255, verbose_name="Nome do Processamento")
    tipo_metrica = models.CharField(max_length=20, choices=[
        ('loja', 'Por Loja'),
        ('produto', 'Por Produto')
    ], default='produto')
    
    # Configuração
    loja_shopify = models.ForeignKey('LojaShopify', on_delete=models.CASCADE, null=True, blank=True)
    arquivo_nome = models.CharField(max_length=255, verbose_name="Nome do Arquivo")
    arquivo_path = models.TextField(verbose_name="Caminho do Arquivo Temporário")
    
    # Status e Progresso
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    progresso_atual = models.IntegerField(default=0, verbose_name="Progresso Atual")
    progresso_total = models.IntegerField(default=0, verbose_name="Total de Itens")
    progresso_porcentagem = models.FloatField(default=0.0, verbose_name="Porcentagem")
    
    # Mensagens e Logs
    mensagem_atual = models.TextField(blank=True, null=True, verbose_name="Mensagem Atual")
    log_processamento = models.JSONField(default=list, verbose_name="Log de Processamento")
    erro_detalhes = models.TextField(blank=True, null=True, verbose_name="Detalhes do Erro")
    
    # Resultados
    dados_resultado = models.JSONField(null=True, blank=True, verbose_name="Dados do Resultado")
    estatisticas = models.JSONField(null=True, blank=True, verbose_name="Estatísticas")
    produtos_nao_encontrados = models.JSONField(default=list, verbose_name="Produtos Não Encontrados")
    
    # Configurações de Cache/Performance
    cache_hits = models.IntegerField(default=0, verbose_name="Cache Hits")
    api_calls = models.IntegerField(default=0, verbose_name="Chamadas API")
    tempo_inicio = models.DateTimeField(null=True, blank=True)
    tempo_fim = models.DateTimeField(null=True, blank=True)
    
    # Metadados
    criado_por = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="Criado por")
    criado_em = models.DateTimeField(auto_now_add=True)
    atualizado_em = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = "Job de Processamento"
        verbose_name_plural = "Jobs de Processamento"
        ordering = ['-criado_em']
        indexes = [
            models.Index(fields=['job_id']),
            models.Index(fields=['status', 'criado_em']),
            models.Index(fields=['criado_por', 'status']),
        ]
    
    def __str__(self):
        return f"{self.nome} ({self.get_status_display()})"
    
    def update_progress(self, atual, total=None, mensagem=None):
        """Atualiza progresso do job"""
        self.progresso_atual = atual
        if total is not None:
            self.progresso_total = total
        
        if self.progresso_total > 0:
            self.progresso_porcentagem = (self.progresso_atual / self.progresso_total) * 100
        
        if mensagem:
            self.mensagem_atual = mensagem
            self.add_log(f"Progresso: {self.progresso_atual}/{self.progresso_total} - {mensagem}")
        
        self.save()
    
    def add_log(self, mensagem):
        """Adiciona entrada ao log"""
        if not isinstance(self.log_processamento, list):
            self.log_processamento = []
        
        self.log_processamento.append({
            'timestamp': timezone.now().isoformat(),
            'mensagem': mensagem
        })
        self.save()
    
    def marcar_inicio(self):
        """Marca início do processamento"""
        self.status = 'processing'
        self.tempo_inicio = timezone.now()
        self.add_log("Processamento iniciado")
        self.save()
    
    def marcar_conclusao(self, dados_resultado, estatisticas=None):
        """Marca conclusão com sucesso"""
        self.status = 'completed'
        self.tempo_fim = timezone.now()
        self.dados_resultado = dados_resultado
        self.estatisticas = estatisticas or {}
        self.progresso_porcentagem = 100.0
        self.mensagem_atual = "Processamento concluído com sucesso!"
        self.add_log("Processamento concluído com sucesso")
        self.save()
    
    def marcar_erro(self, erro):
        """Marca erro no processamento"""
        self.status = 'failed'
        self.tempo_fim = timezone.now()
        self.erro_detalhes = str(erro)
        self.mensagem_atual = f"Erro: {erro}"
        self.add_log(f"Erro no processamento: {erro}")
        self.save()
    
    def cancelar(self):
        """Cancela o processamento"""
        self.status = 'cancelled'
        self.tempo_fim = timezone.now()
        self.mensagem_atual = "Processamento cancelado pelo usuário"
        self.add_log("Processamento cancelado")
        self.save()
    
    @property
    def duracao(self):
        """Calcula duração do processamento"""
        if self.tempo_inicio and self.tempo_fim:
            return self.tempo_fim - self.tempo_inicio
        elif self.tempo_inicio:
            return timezone.now() - self.tempo_inicio
        return None
    
    @property
    def pode_cancelar(self):
        """Verifica se pode ser cancelado"""
        return self.status in ['pending', 'processing']
    
    @property
    def esta_finalizado(self):
        """Verifica se está finalizado"""
        return self.status in ['completed', 'failed', 'cancelled']

class ProcessamentoChunk(models.Model):
    """Chunks de processamento para controle granular"""
    
    job = models.ForeignKey(ProcessamentoJob, on_delete=models.CASCADE, related_name='chunks')
    chunk_index = models.IntegerField(verbose_name="Índice do Chunk")
    pedidos = models.JSONField(verbose_name="Lista de Pedidos do Chunk")
    
    # Status do chunk
    status = models.CharField(max_length=20, choices=[
        ('pending', 'Pendente'),
        ('processing', 'Processando'),
        ('completed', 'Concluído'),
        ('failed', 'Falhou'),
    ], default='pending')
    
    # Resultados do chunk
    produtos_encontrados = models.JSONField(default=dict, verbose_name="Produtos Encontrados")
    cache_hits_chunk = models.IntegerField(default=0)
    api_calls_chunk = models.IntegerField(default=0)
    erro_chunk = models.TextField(blank=True, null=True)
    
    # Timing
    inicio_chunk = models.DateTimeField(null=True, blank=True)
    fim_chunk = models.DateTimeField(null=True, blank=True)
    
    class Meta:
        verbose_name = "Chunk de Processamento"
        verbose_name_plural = "Chunks de Processamento"
        ordering = ['chunk_index']
        unique_together = ['job', 'chunk_index']
    
    def __str__(self):
        return f"Chunk {self.chunk_index} - {self.job.nome}"