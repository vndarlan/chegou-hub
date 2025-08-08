from django.core.management.base import BaseCommand
from django.utils import timezone
from features.api_monitoring.services import OpenAIAPIService
import os


class Command(BaseCommand):
    help = 'Testa a configuração da API OpenAI e identifica problemas'

    def add_arguments(self, parser):
        parser.add_argument(
            '--fix-timestamps',
            action='store_true',
            help='Testa especificamente problemas de timestamps',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('=== TESTE DE CONFIGURAÇÃO OPENAI ===')
        )

        # Verificar variáveis de ambiente
        self.stdout.write('\n1. Verificando variáveis de ambiente...')
        
        api_key = os.getenv('OPENAI_ADMIN_API_KEY')
        if not api_key:
            self.stdout.write(
                self.style.ERROR('ERRO: OPENAI_ADMIN_API_KEY nao configurada')
            )
            self.stdout.write('Configure no arquivo .env:')
            self.stdout.write('OPENAI_ADMIN_API_KEY=sua-admin-key-aqui')
            return
        
        if api_key.startswith('your_') or 'placeholder' in api_key.lower():
            self.stdout.write(
                self.style.ERROR(f'ERRO: API key parece ser placeholder: {api_key[:20]}...')
            )
            self.stdout.write('Substitua por uma API key real da OpenAI')
            return
        
        if not api_key.startswith('sk-'):
            self.stdout.write(
                self.style.ERROR('ERRO: API key nao comeca com "sk-"')
            )
            self.stdout.write('Verifique se é uma API key válida da OpenAI')
            return
        
        self.stdout.write(
            self.style.SUCCESS(f'OK: API key configurada: ...{api_key[-8:]}')
        )

        # Tentar inicializar serviço
        self.stdout.write('\n2. Inicializando serviço OpenAI...')
        try:
            service = OpenAIAPIService()
            self.stdout.write(self.style.SUCCESS('OK: Servico inicializado'))
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERRO: Erro ao inicializar: {e}'))
            return

        # Validar API key
        self.stdout.write('\n3. Validando API key com OpenAI...')
        try:
            validation = service.validate_api_key()
            
            if validation.get('valid'):
                self.stdout.write(self.style.SUCCESS('OK: API key valida'))
                
                if validation.get('has_admin_permissions'):
                    self.stdout.write(
                        self.style.SUCCESS('OK: Tem permissoes de admin')
                    )
                    org_name = validation.get('organization', 'Desconhecida')
                    self.stdout.write(f'  Organização: {org_name}')
                else:
                    self.stdout.write(
                        self.style.WARNING('AVISO: Sem permissoes de admin')
                    )
                    self.stdout.write('Crie uma Admin Key em:')
                    self.stdout.write('https://platform.openai.com/settings/organization/admin-keys')
            else:
                self.stdout.write(
                    self.style.ERROR(f'ERRO: API key invalida: {validation.get("error")}')
                )
                if validation.get('suggestion'):
                    self.stdout.write(f'Sugestão: {validation.get("suggestion")}')
                return
                
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERRO: Erro na validacao: {e}'))
            return

        # Teste de timestamps se solicitado
        if options['fix_timestamps']:
            self.stdout.write('\n4. Testando conversão de timestamps...')
            from datetime import datetime, timedelta
            
            # Testar diferentes cenários
            test_cases = [
                ('2025-01-15', '2025-01-22', 'Período normal'),
                ('2025-08-01', '2025-08-08', 'Período próximo ao problema reportado'),
            ]
            
            for start_date, end_date, description in test_cases:
                self.stdout.write(f'\n  {description}: {start_date} a {end_date}')
                
                try:
                    # Simular exatamente o que o service faz
                    start_dt = datetime.strptime(start_date, '%Y-%m-%d')
                    end_dt = datetime.strptime(end_date, '%Y-%m-%d')
                    
                    start_ts = int(start_dt.timestamp())
                    end_ts = int(end_dt.timestamp())
                    
                    self.stdout.write(f'    Start: {start_ts} = {start_dt}')
                    self.stdout.write(f'    End: {end_ts} = {end_dt}')
                    
                    # Verificar se está na faixa problemática (só como debug)
                    if start_ts == 1754017200:
                        self.stdout.write(
                            self.style.WARNING('    AVISO: Este e o timestamp mencionado no bug!')
                        )
                    
                    # Tentar fazer requisição real (apenas teste pequeno)
                    self.stdout.write('    Testando requisição à API...')
                    usage_data = service.get_usage_data(start_date, end_date, limit=1)
                    
                    bucket_count = len(usage_data.get('data', []))
                    self.stdout.write(
                        self.style.SUCCESS(f'    OK: Sucesso: {bucket_count} buckets retornados')
                    )
                    
                except Exception as e:
                    error_msg = str(e)
                    self.stdout.write(
                        self.style.ERROR(f'    ERRO: {error_msg}')
                    )
                    
                    # Análise específica do erro
                    if 'Bad Request' in error_msg and '400' in error_msg:
                        self.stdout.write('    Possíveis causas do erro 400:')
                        self.stdout.write('    - Timestamps fora do range válido')
                        self.stdout.write('    - Parâmetros inválidos')
                        self.stdout.write('    - Período muito extenso')
                    elif '401' in error_msg:
                        self.stdout.write('    Erro 401: API key inválida')
                    elif '403' in error_msg:
                        self.stdout.write('    Erro 403: Sem permissões adequadas')

        # Resumo final
        self.stdout.write('\n' + '='*50)
        self.stdout.write(self.style.SUCCESS('DIAGNOSTICO COMPLETO:'))
        
        if validation.get('valid') and validation.get('has_admin_permissions'):
            self.stdout.write(self.style.SUCCESS('OK: Configuracao OpenAI esta correta'))
            self.stdout.write('Se ainda ha erros, pode ser:')
            self.stdout.write('- Problema temporario na API OpenAI')
            self.stdout.write('- Limites de rate limiting')
            self.stdout.write('- Parametros especificos em requests do frontend')
        else:
            self.stdout.write(self.style.ERROR('ERRO: Configuracao OpenAI precisa ser corrigida'))
            self.stdout.write('Siga os passos mostrados acima')

        self.stdout.write('\nPara testar timestamps especificamente, use:')
        self.stdout.write('python manage.py test_openai_config --fix-timestamps')