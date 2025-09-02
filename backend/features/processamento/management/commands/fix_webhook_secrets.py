# backend/features/processamento/management/commands/fix_webhook_secrets.py
import secrets
import string
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.utils import timezone
from features.processamento.models import ShopifyConfig, ProcessamentoLog


class Command(BaseCommand):
    help = 'Corrige webhook_secrets ausentes e remove lojas duplicadas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--dry-run',
            action='store_true',
            help='Simula as mudanças sem aplicar (modo teste)',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força a execução mesmo com duplicatas',
        )

    def handle(self, *args, **options):
        dry_run = options['dry_run']
        force = options['force']
        
        self.stdout.write(
            self.style.SUCCESS('🔧 INICIANDO CORREÇÃO DE WEBHOOK SECRETS') if not dry_run 
            else self.style.WARNING('🧪 MODO SIMULAÇÃO (DRY-RUN)')
        )
        
        try:
            with transaction.atomic():
                self._fix_webhook_secrets(dry_run, force)
                
            if not dry_run:
                self.stdout.write(
                    self.style.SUCCESS('\n✅ CORREÇÃO CONCLUÍDA COM SUCESSO!')
                )
            else:
                self.stdout.write(
                    self.style.WARNING('\n🧪 SIMULAÇÃO CONCLUÍDA - Nenhuma mudança foi aplicada')
                )
                
        except CommandError as e:
            self.stdout.write(self.style.ERROR(f'\n❌ ERRO: {e}'))
            return
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'\n💥 ERRO INESPERADO: {e}'))
            raise

    def _fix_webhook_secrets(self, dry_run, force):
        """Executa as correções principais"""
        
        # 1. ANALISAR SITUAÇÃO ATUAL
        self.stdout.write('\n📊 ANALISANDO SITUAÇÃO ATUAL...\n')
        
        configs = ShopifyConfig.objects.all()
        total_lojas = configs.count()
        lojas_sem_secret = configs.filter(webhook_secret__in=['', None]).count()
        lojas_com_secret = configs.exclude(webhook_secret__in=['', None]).count()
        
        self.stdout.write(f'📈 Total de lojas configuradas: {total_lojas}')
        self.stdout.write(f'✅ Lojas com webhook_secret: {lojas_com_secret}')
        self.stdout.write(f'❌ Lojas sem webhook_secret: {lojas_sem_secret}')
        
        # 2. IDENTIFICAR DUPLICATAS
        self.stdout.write('\n🔍 VERIFICANDO DUPLICATAS...\n')
        
        duplicates = self._find_duplicates()
        if duplicates:
            self.stdout.write(f'⚠️ Encontradas {len(duplicates)} URLs com múltiplas configurações:')
            for url, configs_list in duplicates.items():
                self.stdout.write(f'  • {url}: {len(configs_list)} configurações')
                for config in configs_list:
                    status_secret = "✅" if config.webhook_secret else "❌"
                    self.stdout.write(f'    - ID {config.id}: {config.nome_loja} {status_secret}')
            
            if not force:
                raise CommandError(
                    'Duplicatas encontradas. Use --force para continuar ou remova-as manualmente.'
                )

        # 3. GERAR WEBHOOK SECRETS PARA LOJAS SEM SECRET
        self.stdout.write('\n🔑 GERANDO WEBHOOK SECRETS...\n')
        
        configs_sem_secret = configs.filter(webhook_secret__in=['', None])
        secrets_gerados = 0
        
        for config in configs_sem_secret:
            novo_secret = self._generate_webhook_secret()
            
            if not dry_run:
                config.webhook_secret = novo_secret
                config.save()
            
            self.stdout.write(
                f'{"🔑" if not dry_run else "🧪"} {config.nome_loja} ({config.shop_url}): '
                f'{"Secret gerado" if not dry_run else "Secret seria gerado"}'
            )
            secrets_gerados += 1
        
        # 4. RELATÓRIO FINAL
        self.stdout.write(f'\n📋 RESUMO DA OPERAÇÃO:')
        self.stdout.write(f'  • Webhook secrets {"gerados" if not dry_run else "que seriam gerados"}: {secrets_gerados}')
        
        # 5. INSTRUÇÕES PARA O USUÁRIO
        if not dry_run and secrets_gerados > 0:
            self.stdout.write('\n📝 PRÓXIMOS PASSOS OBRIGATÓRIOS:')
            self.stdout.write('1. Configure os webhooks no Shopify com os secrets gerados')
            self.stdout.write('2. Use o comando: python manage.py configure_webhooks')
            self.stdout.write('3. Teste os endpoints com: python manage.py test_webhook_setup')

    def _find_duplicates(self):
        """Identifica lojas duplicadas por shop_url"""
        from django.db.models import Count
        
        duplicates = {}
        urls_duplicadas = (
            ShopifyConfig.objects
            .values('shop_url')
            .annotate(count=Count('shop_url'))
            .filter(count__gt=1)
        )
        
        for item in urls_duplicadas:
            url = item['shop_url']
            configs = list(ShopifyConfig.objects.filter(shop_url=url))
            duplicates[url] = configs
            
        return duplicates

    def _generate_webhook_secret(self):
        """Gera um webhook secret seguro"""
        # Gerar 32 caracteres aleatórios (256 bits de entropia)
        alphabet = string.ascii_letters + string.digits + '-_'
        secret = ''.join(secrets.choice(alphabet) for _ in range(32))
        return secret