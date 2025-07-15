# backend/features/metricas_ecomhub/models.py - VERSÃO ATUALIZADA COM SHOPIFY
from django.db import models
from django.contrib.auth.models import User
from cryptography.fernet import Fernet
from django.conf import settings
import base64
import os

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
            self.testado_em = models.DateTimeField.auto_now_add
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