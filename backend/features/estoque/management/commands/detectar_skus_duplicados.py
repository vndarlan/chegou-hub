# backend/features/estoque/management/commands/detectar_skus_duplicados.py
from django.core.management.base import BaseCommand
from django.db.models import Count
from features.estoque.models import ProdutoSKU, ProdutoEstoque
from features.processamento.models import ShopifyConfig


class Command(BaseCommand):
    help = 'Detecta SKUs duplicados no sistema de estoque'

    def add_arguments(self, parser):
        parser.add_argument(
            '--sku',
            type=str,
            help='Verificar um SKU específico',
        )
        parser.add_argument(
            '--loja',
            type=str,
            help='Verificar apenas uma loja específica (nome da loja)',
        )
        parser.add_argument(
            '--resolver',
            action='store_true',
            help='Aplicar estratégia de resolução automática (cuidado!)',
        )

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('=== DETECTAR SKUs DUPLICADOS ==='))
        self.stdout.write('')

        # Filtrar por loja se especificado
        loja_filtro = None
        if options['loja']:
            try:
                loja_filtro = ShopifyConfig.objects.get(nome_loja=options['loja'])
                self.stdout.write(f'Filtrando por loja: {loja_filtro.nome_loja}')
            except ShopifyConfig.DoesNotExist:
                self.stdout.write(self.style.ERROR(f'Loja não encontrada: {options["loja"]}'))
                return

        # Verificar SKU específico
        if options['sku']:
            self._verificar_sku_especifico(options['sku'], loja_filtro, options['resolver'])
        else:
            self._verificar_todos_duplicados(loja_filtro, options['resolver'])

    def _verificar_sku_especifico(self, sku, loja_filtro, resolver):
        self.stdout.write(f'Verificando SKU específico: {sku}')
        self.stdout.write('')

        # Verificar em ProdutoSKU (produtos compartilhados)
        self.stdout.write('1. PRODUTOS COMPARTILHADOS (ProdutoSKU):')
        skus_compartilhados = ProdutoSKU.objects.filter(sku=sku, ativo=True).select_related('produto')

        if loja_filtro:
            skus_compartilhados = skus_compartilhados.filter(produto__lojas=loja_filtro)

        if skus_compartilhados.exists():
            self.stdout.write(f'   Encontrados: {skus_compartilhados.count()} registros')
            for idx, sku_obj in enumerate(skus_compartilhados, 1):
                produto = sku_obj.produto
                self.stdout.write(f'   {idx}. Produto ID: {produto.id}')
                self.stdout.write(f'      Nome: {produto.nome}')
                self.stdout.write(f'      Fornecedor: {produto.fornecedor}')
                self.stdout.write(f'      Estoque: {produto.estoque_compartilhado}')
                self.stdout.write(f'      Data criação: {produto.data_criacao}')

                # Mostrar lojas vinculadas
                lojas = produto.lojas.all()
                self.stdout.write(f'      Lojas: {", ".join([l.nome_loja for l in lojas])}')
                self.stdout.write('')
        else:
            self.stdout.write('   Nenhum registro encontrado')

        self.stdout.write('')

        # Verificar em ProdutoEstoque (produtos individuais)
        self.stdout.write('2. PRODUTOS INDIVIDUAIS (ProdutoEstoque):')
        produtos_individuais = ProdutoEstoque.objects.filter(sku=sku, ativo=True)

        if loja_filtro:
            produtos_individuais = produtos_individuais.filter(loja_config=loja_filtro)

        if produtos_individuais.exists():
            self.stdout.write(f'   Encontrados: {produtos_individuais.count()} registros')
            for idx, produto in enumerate(produtos_individuais, 1):
                self.stdout.write(f'   {idx}. Produto ID: {produto.id}')
                self.stdout.write(f'      Nome: {produto.nome}')
                self.stdout.write(f'      Fornecedor: {produto.fornecedor}')
                self.stdout.write(f'      Estoque: {produto.estoque_atual}')
                self.stdout.write(f'      Loja: {produto.loja_config.nome_loja}')
                self.stdout.write(f'      Data criação: {produto.data_criacao}')
                self.stdout.write('')
        else:
            self.stdout.write('   Nenhum registro encontrado')

        # Verificar se há conflito entre modelos
        total_registros = skus_compartilhados.count() + produtos_individuais.count()
        if total_registros > 1:
            self.stdout.write(self.style.WARNING(f'CONFLITO DETECTADO: {total_registros} produtos com o mesmo SKU!'))
            if resolver:
                self._aplicar_resolucao_sku(sku, skus_compartilhados, produtos_individuais, loja_filtro)
        elif total_registros == 1:
            self.stdout.write(self.style.SUCCESS('SKU único - sem conflitos'))
        else:
            self.stdout.write(self.style.WARNING('SKU não encontrado no sistema'))

    def _verificar_todos_duplicados(self, loja_filtro, resolver):
        self.stdout.write('Verificando todos os SKUs duplicados...')
        self.stdout.write('')

        # Encontrar SKUs duplicados em ProdutoSKU
        self.stdout.write('1. DUPLICATAS EM PRODUTOS COMPARTILHADOS:')
        query = ProdutoSKU.objects.filter(ativo=True)
        if loja_filtro:
            query = query.filter(produto__lojas=loja_filtro)

        duplicados_compartilhados = (
            query.values('sku')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .order_by('-count')
        )

        if duplicados_compartilhados:
            for dup in duplicados_compartilhados:
                sku = dup['sku']
                count = dup['count']
                self.stdout.write(f'   SKU: {sku} ({count} registros)')

                # Mostrar detalhes
                skus_obj = ProdutoSKU.objects.filter(sku=sku, ativo=True).select_related('produto')
                if loja_filtro:
                    skus_obj = skus_obj.filter(produto__lojas=loja_filtro)

                for idx, sku_obj in enumerate(skus_obj, 1):
                    produto = sku_obj.produto
                    self.stdout.write(f'     {idx}. {produto.nome} (Fornecedor: {produto.fornecedor}, Estoque: {produto.estoque_compartilhado})')
                self.stdout.write('')
        else:
            self.stdout.write('   Nenhuma duplicata encontrada')

        self.stdout.write('')

        # Encontrar SKUs duplicados em ProdutoEstoque
        self.stdout.write('2. DUPLICATAS EM PRODUTOS INDIVIDUAIS:')
        query = ProdutoEstoque.objects.filter(ativo=True)
        if loja_filtro:
            query = query.filter(loja_config=loja_filtro)

        duplicados_individuais = (
            query.values('sku')
            .annotate(count=Count('id'))
            .filter(count__gt=1)
            .order_by('-count')
        )

        if duplicados_individuais:
            for dup in duplicados_individuais:
                sku = dup['sku']
                count = dup['count']
                self.stdout.write(f'   SKU: {sku} ({count} registros)')

                # Mostrar detalhes
                produtos_obj = ProdutoEstoque.objects.filter(sku=sku, ativo=True)
                if loja_filtro:
                    produtos_obj = produtos_obj.filter(loja_config=loja_filtro)

                for idx, produto in enumerate(produtos_obj, 1):
                    self.stdout.write(f'     {idx}. {produto.nome} (Loja: {produto.loja_config.nome_loja}, Estoque: {produto.estoque_atual})')
                self.stdout.write('')
        else:
            self.stdout.write('   Nenhuma duplicata encontrada')

    def _aplicar_resolucao_sku(self, sku, skus_compartilhados, produtos_individuais, loja_filtro):
        self.stdout.write('')
        self.stdout.write(self.style.WARNING('APLICANDO RESOLUÇÃO AUTOMÁTICA...'))
        self.stdout.write('CUIDADO: Esta operação irá modificar dados!')
        self.stdout.write('')

        # Estratégia: Manter apenas um produto por SKU, priorizando:
        # 1. Produtos compartilhados com maior estoque
        # 2. Produtos mais recentes
        # 3. Desativar os outros (não deletar para preservar histórico)

        todos_produtos = []

        # Adicionar produtos compartilhados
        for sku_obj in skus_compartilhados:
            todos_produtos.append({
                'tipo': 'compartilhado',
                'objeto': sku_obj,
                'produto': sku_obj.produto,
                'estoque': sku_obj.produto.estoque_compartilhado,
                'data': sku_obj.produto.data_criacao
            })

        # Adicionar produtos individuais
        for produto in produtos_individuais:
            todos_produtos.append({
                'tipo': 'individual',
                'objeto': produto,
                'produto': produto,
                'estoque': produto.estoque_atual,
                'data': produto.data_criacao
            })

        if len(todos_produtos) <= 1:
            self.stdout.write('Não há duplicatas para resolver')
            return

        # Ordenar: primeiro por estoque (desc), depois por data (desc)
        todos_produtos.sort(key=lambda x: (-x['estoque'], -x['data'].timestamp()))

        # Manter o primeiro (melhor candidato)
        melhor_candidato = todos_produtos[0]
        self.stdout.write(f'MANTENDO: {melhor_candidato["produto"].nome} (Estoque: {melhor_candidato["estoque"]})')

        # Desativar os outros
        for produto_info in todos_produtos[1:]:
            if produto_info['tipo'] == 'compartilhado':
                produto_info['objeto'].ativo = False
                produto_info['objeto'].save()
                self.stdout.write(f'DESATIVADO (SKU): {produto_info["produto"].nome}')
            else:
                produto_info['objeto'].ativo = False
                produto_info['objeto'].save()
                self.stdout.write(f'DESATIVADO (Produto): {produto_info["produto"].nome}')

        self.stdout.write(self.style.SUCCESS('Resolução aplicada com sucesso!'))