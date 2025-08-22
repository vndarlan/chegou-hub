#!/usr/bin/env python3
"""
Script de teste para verificar se a correção do erro 500 está funcionando.
Testa especificamente os campos que causavam problema nas abas Detalhes/Financeiro.
"""

import os
import sys
import django

# Configurar Django
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.dirname(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
django.setup()

from features.ia.models import ProjetoIA
from features.ia.serializers import ProjetoIACreateSerializer, ProjetoIADetailSerializer
from django.contrib.auth.models import User

def test_problematic_data():
    """Testa os dados que anteriormente causavam erro 500"""
    print("TESTANDO CORRECAO DO ERRO 500...")
    
    # Buscar ou criar usuário para teste
    user, created = User.objects.get_or_create(
        username='test_500_fix',
        defaults={'email': 'test@test.com'}
    )
    if created:
        user.set_password('password')
        user.save()
        print(f"Usuario de teste criado: {user.username}")
    
    # === CASOS DE TESTE ===
    
    test_cases = [
        {
            "name": "Teste 1: Strings vazias em arrays",
            "data": {
                'nome': 'Projeto Teste 1',
                'descricao': 'Teste com strings vazias',
                'tipo_projeto': 'automacao',
                'departamentos_atendidos': ['ia_automacoes'],
                'ferramentas_tecnologias': ['Python', '', 'Django', '   ', 'FastAPI'],  # Strings vazias
                'lista_ferramentas': [],
                'custo_apis_mensal': 0,
            }
        },
        {
            "name": "Teste 2: Objetos vazios em lista_ferramentas",
            "data": {
                'nome': 'Projeto Teste 2',
                'descricao': 'Teste com objetos vazios',
                'tipo_projeto': 'chatbot',
                'departamentos_atendidos': ['suporte'],
                'ferramentas_tecnologias': ['OpenAI'],
                'lista_ferramentas': [
                    {'nome': 'ChatGPT', 'valor': 50.0},
                    {'nome': '', 'valor': 10},  # Nome vazio - deve ser removido
                    {'nome': '   ', 'valor': 0},  # Nome apenas espaços - deve ser removido
                    {'nome': 'Claude', 'valor': '30.5'},  # Valor como string - deve ser convertido
                    {'nome': 'Gemini', 'valor': None}  # Valor None - deve virar 0
                ],
                'custo_apis_mensal': '100.50',  # String numérica
            }
        },
        {
            "name": "Teste 3: Campos numéricos como strings",
            "data": {
                'nome': 'Projeto Teste 3',
                'descricao': 'Teste campos numéricos',
                'tipo_projeto': 'analise_preditiva',
                'departamentos_atendidos': ['diretoria'],
                'ferramentas_tecnologias': ['TensorFlow'],
                'custo_apis_mensal': '250.75',
                'horas_desenvolvimento': '40.5',
                'horas_testes': '10',
                'custo_hora_empresa': '80.00',
                'horas_economizadas_mes': '20.25',
                'lista_ferramentas': [
                    {'nome': 'AWS', 'valor': '120.30'}
                ]
            }
        },
        {
            "name": "Teste 4: Campo data com valores problemáticos",
            "data": {
                'nome': 'Projeto Teste 4',
                'descricao': 'Teste campo data',
                'tipo_projeto': 'visao_computacional',
                'departamentos_atendidos': ['operacional'],
                'ferramentas_tecnologias': ['OpenCV'],
                'data_revisao': '',  # String vazia - deve virar None
                'custo_apis_mensal': 0,
                'licoes_aprendidas': 'Teste com caracteres especiais: áéíóú ção',
                'proximos_passos': 'Próximos passos com acentuação'
            }
        }
    ]
    
    # === EXECUTAR TESTES ===
    
    context = {'request': type('Request', (), {'user': user})()}
    results = []
    
    for test_case in test_cases:
        print(f"\n{test_case['name']}")
        
        try:
            # Testar serializer de criação
            serializer = ProjetoIACreateSerializer(data=test_case['data'], context=context)
            
            if serializer.is_valid():
                projeto = serializer.save()
                
                # Verificar se os dados foram sanitizados corretamente
                print(f"  SUCESSO - Projeto {projeto.id} criado")
                print(f"     - Ferramentas: {projeto.ferramentas_tecnologias}")
                print(f"     - Lista ferramentas: {projeto.lista_ferramentas}")
                print(f"     - Custo APIs: {projeto.custo_apis_mensal}")
                print(f"     - Data revisao: {projeto.data_revisao}")
                
                results.append({
                    'test': test_case['name'],
                    'status': 'PASS',
                    'projeto_id': projeto.id
                })
                
            else:
                print(f"  ERRO na validacao:")
                for field, errors in serializer.errors.items():
                    print(f"     - {field}: {errors}")
                
                results.append({
                    'test': test_case['name'],
                    'status': 'FAIL',
                    'errors': serializer.errors
                })
                
        except Exception as e:
            print(f"  EXCECAO: {e}")
            results.append({
                'test': test_case['name'],
                'status': 'ERROR',
                'exception': str(e)
            })
    
    # === RELATORIO FINAL ===
    
    print("\n" + "="*50)
    print("RELATORIO FINAL")
    print("="*50)
    
    passed = len([r for r in results if r['status'] == 'PASS'])
    total = len(results)
    
    print(f"Testes aprovados: {passed}/{total}")
    
    if passed == total:
        print("TODAS AS CORRECOES FUNCIONANDO!")
        print("Usuarios podem agora usar as abas Detalhes/Financeiro sem erro 500")
    else:
        print("Alguns testes falharam. Revisar implementacao.")
        for result in results:
            if result['status'] != 'PASS':
                print(f"   - {result['test']}: {result['status']}")
    
    return passed == total

if __name__ == '__main__':
    success = test_problematic_data()
    sys.exit(0 if success else 1)