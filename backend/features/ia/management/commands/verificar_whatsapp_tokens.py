# backend/features/ia/management/commands/verificar_whatsapp_tokens.py

from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from features.ia.models import BusinessManager
from features.ia.services import WhatsAppMetaAPIService
from config.whatsapp_config import check_encryption_health
import logging

logger = logging.getLogger(__name__)


class Command(BaseCommand):
    help = 'Verifica e corrige tokens WhatsApp corrompidos'
    
    def add_arguments(self, parser):
        parser.add_argument(
            '--check-only',
            action='store_true',
            help='Apenas verifica tokens sem fazer correções',
        )
        parser.add_argument(
            '--fix-corrupted',
            action='store_true',
            help='Limpa tokens corrompidos (marca como necessário re-cadastro)',
        )
        parser.add_argument(
            '--business-manager-id',
            type=int,
            help='ID específico de Business Manager para verificar',
        )
        parser.add_argument(
            '--show-health',
            action='store_true',
            help='Mostra saúde geral do sistema de criptografia',
        )
    
    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== VERIFICAÇÃO DE TOKENS WHATSAPP BUSINESS ===\n')
        )
        
        # Mostrar saúde da criptografia
        if options['show_health']:
            self.show_encryption_health()
        
        # Verificar tokens
        problematic_bms = self.check_tokens(options.get('business_manager_id'))
        
        if not problematic_bms:
            self.stdout.write(
                self.style.SUCCESS('[OK] Todos os tokens estão funcionando corretamente!')
            )
            return
        
        # Mostrar problemas encontrados
        self.stdout.write(
            self.style.WARNING(f'\n[AVISO] {len(problematic_bms)} Business Manager(s) com problemas:\n')
        )
        
        for bm_info in problematic_bms:
            self.stdout.write(
                f"  - ID: {bm_info['id']} | Nome: {bm_info['nome']}"
            )
            self.stdout.write(
                f"    Business Manager ID: {bm_info['business_manager_id']}"
            )
            self.stdout.write(
                f"    Erro: {bm_info['erro']}\n"
            )
        
        # Ações de correção
        if options['check_only']:
            self.stdout.write(
                self.style.WARNING('Modo apenas verificação. Para corrigir, use --fix-corrupted')
            )
            return
        
        if options['fix_corrupted']:
            self.fix_corrupted_tokens(problematic_bms)
        else:
            self.stdout.write(
                self.style.WARNING('Para corrigir tokens corrompidos, use: --fix-corrupted')
            )
    
    def show_encryption_health(self):
        """Mostra saúde do sistema de criptografia"""
        self.stdout.write('Verificando saúde da criptografia...\n')
        
        try:
            health = check_encryption_health()
            
            # Status geral
            if health['can_encrypt'] and health['can_decrypt']:
                self.stdout.write(self.style.SUCCESS('[OK] Sistema de criptografia funcionando'))
            else:
                self.stdout.write(self.style.ERROR('[ERRO] Sistema de criptografia com problemas'))
            
            # Detalhes
            self.stdout.write(f"  - cryptography disponível: {'[OK]' if health['cryptography_available'] else '[ERRO]'}")
            self.stdout.write(f"  - Chave configurada: {'[OK]' if health['encryption_key_configured'] else '[ERRO]'}")
            self.stdout.write(f"  - Chave válida: {'[OK]' if health['encryption_key_valid'] else '[ERRO]'}")
            self.stdout.write(f"  - Pode criptografar: {'[OK]' if health['can_encrypt'] else '[ERRO]'}")
            self.stdout.write(f"  - Pode descriptografar: {'[OK]' if health['can_decrypt'] else '[ERRO]'}")
            
            # Recomendações
            if health['recommendations']:
                self.stdout.write('\nRecomendacoes:')
                for rec in health['recommendations']:
                    self.stdout.write(f"  - {rec}")
            
            self.stdout.write('')
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[ERRO] Erro ao verificar saúde da criptografia: {e}')
            )
    
    def check_tokens(self, specific_bm_id=None):
        """Verifica tokens e retorna lista de BMs problemáticas"""
        self.stdout.write('Verificando tokens das Business Managers...\n')
        
        # Filtrar Business Managers
        if specific_bm_id:
            business_managers = BusinessManager.objects.filter(id=specific_bm_id, ativo=True)
            if not business_managers.exists():
                raise CommandError(f'Business Manager com ID {specific_bm_id} não encontrada')
        else:
            business_managers = BusinessManager.objects.filter(ativo=True)
        
        total_bms = business_managers.count()
        self.stdout.write(f'Total de Business Managers ativas: {total_bms}')
        
        whatsapp_service = WhatsAppMetaAPIService()
        problematic_bms = []
        
        for bm in business_managers:
            if not bm.access_token_encrypted:
                problematic_bms.append({
                    'id': bm.id,
                    'nome': bm.nome,
                    'business_manager_id': bm.business_manager_id,
                    'erro': 'Token não configurado',
                    'tipo_erro': 'no_token'
                })
                continue
            
            # Verificar se token funciona
            sucesso, erro, _ = whatsapp_service._get_access_token_safe(bm)
            if not sucesso:
                problematic_bms.append({
                    'id': bm.id,
                    'nome': bm.nome,
                    'business_manager_id': bm.business_manager_id,
                    'erro': erro,
                    'tipo_erro': 'corrupted'
                })
        
        return problematic_bms
    
    def fix_corrupted_tokens(self, problematic_bms):
        """Corrige tokens corrompidos limpando-os"""
        corrupted_bms = [bm for bm in problematic_bms if bm['tipo_erro'] == 'corrupted']
        
        if not corrupted_bms:
            self.stdout.write(self.style.SUCCESS('[OK] Nenhum token corrompido para corrigir'))
            return
        
        self.stdout.write(
            self.style.WARNING(f'\nCorrigindo {len(corrupted_bms)} token(s) corrompido(s)...')
        )
        
        try:
            with transaction.atomic():
                for bm_info in corrupted_bms:
                    bm = BusinessManager.objects.get(id=bm_info['id'])
                    
                    # Limpar token corrompido
                    bm.access_token_encrypted = ''
                    bm.erro_ultima_sincronizacao = 'Token corrompido limpo - necessário re-cadastrar access token'
                    bm.save()
                    
                    self.stdout.write(
                        f"  [OK] Token limpo: {bm.nome} (ID: {bm.id})"
                    )
                
                self.stdout.write(
                    self.style.SUCCESS(f'\n[OK] {len(corrupted_bms)} token(s) corrompido(s) limpo(s) com sucesso!')
                )
                self.stdout.write(
                    self.style.WARNING('[AVISO] AÇÃO NECESSÁRIA: Re-cadastre os access tokens no painel administrativo')
                )
        
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[ERRO] Erro ao corrigir tokens: {e}')
            )
            raise CommandError(f'Erro ao corrigir tokens: {e}')
    
    def handle_health_check(self):
        """Verifica saúde geral do sistema"""
        try:
            health = check_encryption_health()
            
            if not health['cryptography_available']:
                self.stdout.write(
                    self.style.ERROR('[ERRO] cryptography não instalado. Execute: pip install cryptography')
                )
                return False
            
            if not health['encryption_key_configured']:
                self.stdout.write(
                    self.style.ERROR('[ERRO] WHATSAPP_ENCRYPTION_KEY não configurada')
                )
                if health['recommendations']:
                    self.stdout.write('Sugestão de chave:')
                    for rec in health['recommendations']:
                        if 'export WHATSAPP_ENCRYPTION_KEY=' in rec:
                            self.stdout.write(f'   {rec}')
                return False
            
            return True
            
        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'[ERRO] Erro ao verificar saúde do sistema: {e}')
            )
            return False