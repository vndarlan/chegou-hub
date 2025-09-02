# backend/features/processamento/management/commands/validate_store_setup.py
import requests
import json
from django.core.management.base import BaseCommand
from django.utils import timezone
from features.processamento.models import ShopifyConfig
from features.estoque.services.shopify_webhook_service import ShopifyWebhookService


class Command(BaseCommand):
    help = 'Valida configuração de lojas Shopify e identifica problemas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--loja-id',
            type=int,
            help='ID específico da loja para validar',
        )
        parser.add_argument(
            '--check-connectivity',
            action='store_true',
            help='Testa conectividade com APIs do Shopify',
        )

    def handle(self, *args, **options):
        loja_id = options.get('loja_id')
        check_connectivity = options['check_connectivity']
        
        self.stdout.write(
            self.style.SUCCESS('🔍 VALIDANDO CONFIGURAÇÃO DAS LOJAS SHOPIFY')
        )
        
        try:
            if loja_id:
                configs = ShopifyConfig.objects.filter(id=loja_id)
                if not configs.exists():
                    self.stdout.write(self.style.ERROR(f'❌ Loja ID {loja_id} não encontrada'))
                    return
            else:
                configs = ShopifyConfig.objects.all()
            
            self._validate_stores(configs, check_connectivity)
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'💥 ERRO: {e}'))
            raise

    def _validate_stores(self, configs, check_connectivity):
        """Valida todas as configurações de lojas"""
        
        total_configs = configs.count()
        problemas_encontrados = 0
        
        self.stdout.write(f'\n📊 Validando {total_configs} configuração(ões)...\n')
        
        for i, config in enumerate(configs, 1):
            self.stdout.write(f'[{i}/{total_configs}] 🏪 {config.nome_loja} ({config.shop_url})')
            
            issues = self._validate_single_store(config, check_connectivity)
            
            if issues:
                problemas_encontrados += len(issues)
                for issue in issues:
                    self.stdout.write(f'  ❌ {issue}')
            else:
                self.stdout.write(f'  ✅ Configuração válida')
            
            self.stdout.write('')  # Linha em branco
        
        # RESUMO FINAL
        self.stdout.write('=' * 60)
        self.stdout.write(f'📋 RESUMO DA VALIDAÇÃO:')
        self.stdout.write(f'  • Total de lojas: {total_configs}')
        self.stdout.write(f'  • Problemas encontrados: {problemas_encontrados}')
        
        if problemas_encontrados > 0:
            self.stdout.write(self.style.WARNING(f'\n⚠️ Encontrados {problemas_encontrados} problema(s)'))
            self.stdout.write('\n🔧 SOLUÇÕES RECOMENDADAS:')
            self.stdout.write('1. Execute: python manage.py fix_webhook_secrets')
            self.stdout.write('2. Configure webhooks: python manage.py configure_webhooks')
            self.stdout.write('3. Remova duplicatas pelo Django Admin')
        else:
            self.stdout.write(self.style.SUCCESS('\n✅ Todas as lojas estão configuradas corretamente!'))

    def _validate_single_store(self, config, check_connectivity):
        """Valida uma única loja e retorna lista de problemas"""
        issues = []
        
        # 1. VALIDAÇÃO BÁSICA DE CAMPOS
        if not config.shop_url:
            issues.append('URL da loja ausente')
        elif not config.shop_url.endswith(('.myshopify.com', '.shopifypreview.com')):
            issues.append('URL da loja não parece ser do Shopify')
            
        if not config.access_token:
            issues.append('Access token ausente')
        elif len(config.access_token) < 20:
            issues.append('Access token parece inválido (muito curto)')
            
        if not config.webhook_secret:
            issues.append('Webhook secret ausente - CRÍTICO para segurança')
        elif len(config.webhook_secret) < 16:
            issues.append('Webhook secret muito fraco (< 16 caracteres)')
            
        if not config.nome_loja:
            issues.append('Nome da loja ausente')
            
        # 2. VALIDAÇÃO DE DUPLICATAS
        duplicates = ShopifyConfig.objects.filter(
            shop_url=config.shop_url
        ).exclude(id=config.id)
        
        if duplicates.exists():
            issues.append(f'URL duplicada (outras {duplicates.count()} configuração(ões) com mesma URL)')
            
        # 3. VALIDAÇÃO DE STATUS
        if not config.ativo:
            issues.append('Loja marcada como inativa')
            
        # 4. TESTE DE CONECTIVIDADE (opcional)
        if check_connectivity and config.access_token and config.shop_url:
            connectivity_issue = self._test_shopify_connectivity(config)
            if connectivity_issue:
                issues.append(f'Conectividade: {connectivity_issue}')
        
        return issues

    def _test_shopify_connectivity(self, config):
        """Testa conectividade com a API do Shopify"""
        try:
            # Teste simples: buscar informações da loja
            url = f'https://{config.shop_url}/admin/api/{config.api_version}/shop.json'
            headers = {
                'X-Shopify-Access-Token': config.access_token,
                'Content-Type': 'application/json'
            }
            
            response = requests.get(url, headers=headers, timeout=10)
            
            if response.status_code == 200:
                return None  # Sem problemas
            elif response.status_code == 401:
                return 'Token de acesso inválido ou expirado'
            elif response.status_code == 404:
                return 'Loja não encontrada'
            else:
                return f'Erro HTTP {response.status_code}'
                
        except requests.exceptions.Timeout:
            return 'Timeout na conexão (>10s)'
        except requests.exceptions.ConnectionError:
            return 'Erro de conexão'
        except Exception as e:
            return f'Erro inesperado: {str(e)[:50]}...'