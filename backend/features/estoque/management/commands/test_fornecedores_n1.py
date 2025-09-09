from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from features.estoque.models import ProdutoEstoque
from features.processamento.models import ShopifyConfig
import traceback


class Command(BaseCommand):
    help = 'Testa criação de produtos com fornecedores N1 em produção'

    def handle(self, *args, **options):
        self.stdout.write("=== TESTE DE FORNECEDORES N1 ===")
        
        try:
            # Verificar usuário
            user = User.objects.first()
            if not user:
                self.stdout.write(self.style.ERROR('ERRO: Nenhum usuário encontrado'))
                return
                
            self.stdout.write(f'Usuário encontrado: {user.username}')
            
            # Verificar loja
            loja = ShopifyConfig.objects.filter(user=user).first()
            if not loja:
                self.stdout.write(self.style.ERROR('ERRO: Nenhuma loja encontrada'))
                return
                
            self.stdout.write(f'Loja encontrada: {loja.nome_loja}')
            
            # Testar cada fornecedor N1
            fornecedores_test = ['N1 Itália', 'N1 Romênia', 'N1 Polônia']
            
            for fornecedor in fornecedores_test:
                self.stdout.write(f'\n--- TESTANDO: {fornecedor} ---')
                
                try:
                    # Criar produto de teste
                    produto = ProdutoEstoque.objects.create(
                        user=user,
                        loja_config=loja,
                        sku=f'TESTE-{fornecedor.replace(" ", "-").upper()}-PROD',
                        nome=f'Produto Teste {fornecedor}',
                        fornecedor=fornecedor,
                        estoque_inicial=10,
                        estoque_minimo=5
                    )
                    
                    self.stdout.write(
                        self.style.SUCCESS(f'SUCESSO - {fornecedor}: Produto criado (ID: {produto.id})')
                    )
                    self.stdout.write(f'   - SKU: {produto.sku}')
                    self.stdout.write(f'   - Fornecedor: "{produto.fornecedor}"')
                    self.stdout.write(f'   - Estoque: {produto.estoque_atual}')
                    
                    # Deletar produto de teste
                    produto.delete()
                    self.stdout.write(f'   - Produto de teste deletado')
                    
                except Exception as e:
                    self.stdout.write(
                        self.style.ERROR(f'ERRO - {fornecedor}: {str(e)}')
                    )
                    self.stdout.write(f'   - Tipo: {type(e).__name__}')
                    self.stdout.write(f'   - Traceback:')
                    traceback.print_exc()
            
            # Verificar choices disponíveis no modelo
            self.stdout.write('\n--- CHOICES DISPONÍVEIS NO MODELO ---')
            for choice_value, choice_label in ProdutoEstoque.FORNECEDOR_CHOICES:
                self.stdout.write(f'  "{choice_value}" -> {choice_label}')
            
            self.stdout.write('\n=== TESTE FINALIZADO ===')
            
        except Exception as e:
            self.stdout.write(self.style.ERROR(f'ERRO GERAL: {str(e)}'))
            traceback.print_exc()