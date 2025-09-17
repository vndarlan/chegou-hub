# backend/features/metricas_n1italia/management/commands/test_n1italia.py
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.metricas_n1italia.services import n1_italia_processor
from features.metricas_n1italia.models import AnaliseN1Italia
import json


class Command(BaseCommand):
    help = 'Testa funcionalidade N1 Itália com dados simulados'

    def add_arguments(self, parser):
        parser.add_argument(
            '--criar-dados-teste',
            action='store_true',
            help='Criar dados de teste simulados',
        )

        parser.add_argument(
            '--usuario',
            type=str,
            default='admin',
            help='Username do usuário para criar a análise (padrão: admin)',
        )

    def handle(self, *args, **options):
        self.stdout.write(
            self.style.SUCCESS('Testando funcionalidade N1 Italia...\n')
        )

        if options['criar_dados_teste']:
            self.criar_dados_teste(options['usuario'])
        else:
            self.testar_processamento()

    def testar_processamento(self):
        """Testa o processamento com dados simulados"""
        self.stdout.write('Testando processamento de dados simulados...')

        # Dados simulados de exemplo
        dados_simulados = [
            {
                'order_number': 'ORD001',
                'product_name': 'Produto A',
                'status': 'Delivered',
                'customer_name': 'Cliente 1'
            },
            {
                'order_number': 'ORD002',
                'product_name': 'Produto B',
                'status': 'Shipped',
                'customer_name': 'Cliente 2'
            },
            {
                'order_number': 'ORD003',
                'product_name': 'Kit Especial',
                'status': 'Return',
                'customer_name': 'Cliente 3'
            },
            # Kit - mesmo order_number
            {
                'order_number': 'ORD004',
                'product_name': 'Produto C',
                'status': 'Delivered',
                'customer_name': 'Cliente 4'
            },
            {
                'order_number': 'ORD004',
                'product_name': 'Produto D',
                'status': 'Delivered',
                'customer_name': 'Cliente 4'
            },
            # Mais produtos
            {
                'order_number': 'ORD005',
                'product_name': 'Produto E',
                'status': 'Invalid',
                'customer_name': 'Cliente 5'
            },
            {
                'order_number': 'ORD006',
                'product_name': 'Produto F',
                'status': 'Out of stock',
                'customer_name': 'Cliente 6'
            }
        ]

        try:
            # Processar dados
            resultado = n1_italia_processor.processar_excel(dados_simulados)

            self.stdout.write(self.style.SUCCESS('Processamento concluido!'))

            # Exibir resultados
            self.exibir_resultado(resultado)

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erro no processamento: {e}')
            )

    def criar_dados_teste(self, username):
        """Cria análise de teste no banco de dados"""
        self.stdout.write(f'Criando analise de teste para usuario: {username}')

        try:
            # Buscar usuário
            try:
                usuario = User.objects.get(username=username)
            except User.DoesNotExist:
                self.stdout.write(
                    self.style.ERROR(f'Usuario "{username}" nao encontrado')
                )
                return

            # Dados simulados maiores
            dados_simulados = self.gerar_dados_simulados_completos()

            # Processar dados
            resultado = n1_italia_processor.processar_excel(dados_simulados)

            # Criar análise
            analise = AnaliseN1Italia.objects.create(
                nome='Teste N1 Itália - Dados Simulados',
                descricao='Análise de teste criada automaticamente para validar funcionalidade',
                dados_processados=resultado,
                criado_por=usuario
            )

            self.stdout.write(
                self.style.SUCCESS(f'Analise criada com sucesso! ID: {analise.id}')
            )

            # Exibir estatísticas
            self.stdout.write('\nEstatisticas da analise criada:')
            self.stdout.write(f'   Total pedidos: {analise.total_pedidos}')
            self.stdout.write(f'   Efetividade parcial: {analise.efetividade_parcial}%')
            self.stdout.write(f'   Efetividade total: {analise.efetividade_total}%')

        except Exception as e:
            self.stdout.write(
                self.style.ERROR(f'Erro criando dados de teste: {e}')
            )

    def gerar_dados_simulados_completos(self):
        """Gera conjunto mais completo de dados simulados"""
        dados = []

        # Produtos individuais com diferentes status
        produtos_individuais = [
            ('Smartphone Pro', 'Delivered'),
            ('Fones Bluetooth', 'Shipped'),
            ('Capa Protetora', 'Return'),
            ('Carregador Wireless', 'Invalid'),
            ('Película 3D', 'Out of stock'),
            ('Suporte Veicular', 'Delivered'),
            ('Power Bank', 'To prepare'),
            ('Cabo USB-C', 'Waiting for carrier'),
            ('Mouse Gamer', 'Delivered'),
            ('Teclado Mecânico', 'Assigned to carrier'),
        ]

        for i, (produto, status) in enumerate(produtos_individuais, 1):
            dados.append({
                'order_number': f'ORD{i:03d}',
                'product_name': produto,
                'status': status,
                'customer_name': f'Cliente {i}',
                'customer_email': f'cliente{i}@email.com'
            })

        # Alguns kits
        kits = [
            (['Kit Gaming Mouse', 'Kit Gaming Mousepad'], 'Delivered'),
            (['Kit Escritório Teclado', 'Kit Escritório Mouse'], 'Shipped'),
            (['Kit Proteção Capa', 'Kit Proteção Película'], 'Return'),
        ]

        order_num = len(produtos_individuais) + 1
        for produtos_kit, status in kits:
            order_str = f'ORD{order_num:03d}'
            for produto in produtos_kit:
                dados.append({
                    'order_number': order_str,
                    'product_name': produto,
                    'status': status,
                    'customer_name': f'Cliente Kit {order_num}',
                    'customer_email': f'clientekit{order_num}@email.com'
                })
            order_num += 1

        return dados

    def exibir_resultado(self, resultado):
        """Exibe resultado do processamento de forma organizada"""
        self.stdout.write('\nRESULTADO DO PROCESSAMENTO:\n')

        # Metadados
        if 'metadados' in resultado:
            meta = resultado['metadados']
            self.stdout.write('METADADOS:')
            self.stdout.write(f'   Total registros: {meta.get("total_registros", 0)}')
            self.stdout.write(f'   Total produtos: {meta.get("total_produtos", 0)}')
            self.stdout.write(f'   Kits detectados: {meta.get("kits_detectados", 0)}')

        # Estatísticas totais
        if 'stats_total' in resultado:
            stats = resultado['stats_total']
            self.stdout.write('\nESTATISTICAS TOTAIS:')
            for key, value in stats.items():
                if isinstance(value, (int, float)):
                    if 'pct' in key.lower() or '%' in key or 'efetividade' in key.lower():
                        self.stdout.write(f'   {key}: {value}%')
                    else:
                        self.stdout.write(f'   {key}: {value:,}')

        # Primeiros produtos
        if 'visualizacao_total' in resultado:
            produtos = resultado['visualizacao_total'][:5]
            self.stdout.write(f'\nPRODUTOS (primeiros 5 de {len(resultado["visualizacao_total"])}):')
            for produto in produtos:
                nome = produto.get('Produto', 'N/A')
                total = produto.get('Total', 0)
                entregues = produto.get('Entregues', 0)
                efet_total = produto.get('Efetividade Total (%)', 0)
                self.stdout.write(
                    f'   - {nome}: {total} pedidos, {entregues} entregues ({efet_total}%)'
                )