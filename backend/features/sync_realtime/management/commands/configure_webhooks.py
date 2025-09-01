# backend/features/sync_realtime/management/commands/configure_webhooks.py
from django.core.management.base import BaseCommand, CommandError
from django.contrib.auth.models import User
from features.processamento.models import ShopifyConfig
from features.sync_realtime.shopify_webhook_manager import ShopifyWebhookManager, WebhookBulkManager
from typing import Optional


class Command(BaseCommand):
    help = 'Configura webhooks do Shopify automaticamente para lojas ativas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--user',
            type=str,
            help='Username do usuário para configurar webhooks (se não especificado, configura para todos)',
        )
        parser.add_argument(
            '--loja-id',
            type=int,
            help='ID específico da loja para configurar (se não especificado, configura todas)',
        )
        parser.add_argument(
            '--webhook-url',
            type=str,
            help='URL base para webhooks (ex: https://api.chegouhub.com)',
        )
        parser.add_argument(
            '--test-only',
            action='store_true',
            help='Apenas testa conectividade sem criar webhooks',
        )
        parser.add_argument(
            '--cleanup',
            action='store_true',
            help='Remove webhooks antigos antes de criar novos',
        )
        parser.add_argument(
            '--force',
            action='store_true',
            help='Força configuração mesmo se já existirem webhooks',
        )

    def handle(self, *args, **options):
        try:
            # Obter parâmetros
            username = options.get('user')
            loja_id = options.get('loja_id')
            webhook_url = options.get('webhook_url', 'https://api.chegouhub.com')
            test_only = options.get('test_only', False)
            cleanup = options.get('cleanup', False)
            force = options.get('force', False)
            
            self.stdout.write(
                self.style.SUCCESS('🚀 Iniciando configuração automática de webhooks Shopify')
            )
            
            # Filtrar usuários
            if username:
                try:
                    users = [User.objects.get(username=username)]
                    self.stdout.write(f"📋 Configurando para usuário: {username}")
                except User.DoesNotExist:
                    raise CommandError(f"Usuário '{username}' não encontrado")
            else:
                users = User.objects.filter(
                    shopifyconfig__ativo=True
                ).distinct()
                self.stdout.write(f"📋 Configurando para todos os usuários com lojas ativas")
            
            # Gerar URL do webhook
            webhook_endpoint_url = WebhookBulkManager.generate_webhook_endpoint_url(webhook_url)
            self.stdout.write(f"🔗 URL do webhook: {webhook_endpoint_url}")
            
            total_users = len(users)
            total_stores = 0
            total_configured = 0
            total_failed = 0
            
            # Processar cada usuário
            for i, user in enumerate(users, 1):
                self.stdout.write(f"\n{'='*60}")
                self.stdout.write(f"👤 Processando usuário {i}/{total_users}: {user.username}")
                
                # Filtrar lojas
                lojas_query = ShopifyConfig.objects.filter(user=user, ativo=True)
                if loja_id:
                    lojas_query = lojas_query.filter(id=loja_id)
                
                lojas = lojas_query.all()
                
                if not lojas.exists():
                    self.stdout.write(
                        self.style.WARNING(f"⚠️  Nenhuma loja ativa encontrada para {user.username}")
                    )
                    continue
                
                self.stdout.write(f"🏪 Encontradas {lojas.count()} lojas ativas")
                total_stores += lojas.count()
                
                # Processar cada loja
                for j, loja in enumerate(lojas, 1):
                    self.stdout.write(f"\n  📦 Loja {j}/{lojas.count()}: {loja.nome_loja}")
                    
                    try:
                        manager = ShopifyWebhookManager(loja)
                        
                        # Teste de conectividade
                        self.stdout.write("  🔍 Testando conectividade...")
                        connectivity_test = manager.test_webhook_connectivity()
                        
                        if not connectivity_test['success']:
                            self.stdout.write(
                                self.style.ERROR(f"  ❌ Conectividade falhou: {connectivity_test['error']}")
                            )
                            total_failed += 1
                            continue
                        
                        self.stdout.write(
                            self.style.SUCCESS(f"  ✅ Conectividade OK: {connectivity_test.get('shop_name', 'N/A')}")
                        )
                        
                        if test_only:
                            self.stdout.write("  ℹ️  Modo teste - pulando configuração de webhooks")
                            continue
                        
                        # Limpeza de webhooks antigos se solicitado
                        if cleanup:
                            self.stdout.write("  🧹 Limpando webhooks antigos...")
                            cleanup_result = manager.cleanup_old_webhooks(webhook_url)
                            if cleanup_result['total_removed'] > 0:
                                self.stdout.write(
                                    self.style.WARNING(f"  🗑️  Removidos {cleanup_result['total_removed']} webhooks antigos")
                                )
                        
                        # Configurar webhooks
                        self.stdout.write("  ⚙️  Configurando webhooks...")
                        result = manager.configure_all_webhooks(webhook_endpoint_url)
                        
                        if result['success']:
                            self.stdout.write(
                                self.style.SUCCESS(f"  ✅ Webhooks configurados: {result['total_configured']} sucessos")
                            )
                            total_configured += 1
                        else:
                            self.stdout.write(
                                self.style.ERROR(
                                    f"  ❌ Falha na configuração: {result['total_configured']} sucessos, "
                                    f"{result['total_failed']} falhas"
                                )
                            )
                            total_failed += 1
                        
                        # Mostrar detalhes dos webhooks configurados
                        for webhook in result['webhooks_configured']:
                            status_emoji = "🆕" if webhook['status'] == 'created' else "♻️"
                            self.stdout.write(f"    {status_emoji} {webhook['topic']} - ID: {webhook['id']}")
                        
                        # Mostrar erros se houver
                        for webhook_error in result['webhooks_failed']:
                            self.stdout.write(
                                self.style.ERROR(f"    ❌ {webhook_error['topic']}: {webhook_error['error']}")
                            )
                    
                    except Exception as e:
                        self.stdout.write(
                            self.style.ERROR(f"  ❌ Erro na loja {loja.nome_loja}: {str(e)}")
                        )
                        total_failed += 1
            
            # Resumo final
            self.stdout.write(f"\n{'='*60}")
            self.stdout.write(self.style.SUCCESS('📊 RESUMO DA CONFIGURAÇÃO'))
            self.stdout.write(f"👥 Usuários processados: {total_users}")
            self.stdout.write(f"🏪 Lojas processadas: {total_stores}")
            
            if not test_only:
                self.stdout.write(f"✅ Lojas configuradas com sucesso: {total_configured}")
                self.stdout.write(f"❌ Lojas com erro: {total_failed}")
                
                success_rate = (total_configured / total_stores * 100) if total_stores > 0 else 0
                self.stdout.write(f"📈 Taxa de sucesso: {success_rate:.1f}%")
            else:
                self.stdout.write("ℹ️  Modo teste executado - nenhum webhook foi criado")
            
            if total_failed == 0 and not test_only:
                self.stdout.write(
                    self.style.SUCCESS('\n🎉 Todos os webhooks foram configurados com sucesso!')
                )
            elif total_failed > 0:
                self.stdout.write(
                    self.style.WARNING(f'\n⚠️  Configuração concluída com {total_failed} erro(s)')
                )
            
        except KeyboardInterrupt:
            self.stdout.write(
                self.style.WARNING('\n⏹️  Operação cancelada pelo usuário')
            )
        except Exception as e:
            raise CommandError(f'Erro inesperado: {str(e)}')


# Exemplos de uso:
# python manage.py configure_webhooks
# python manage.py configure_webhooks --user admin --test-only
# python manage.py configure_webhooks --loja-id 1 --webhook-url https://api.chegouhub.com
# python manage.py configure_webhooks --cleanup --force