# 🤖 Feature IA - Dashboard de Projetos e Logs

## O que faz

A feature IA é o coração do sistema de gestão de projetos de inteligência artificial e automações da empresa. Permite cadastrar projetos, acompanhar logs de ferramentas (Nicochat, N8N), calcular ROI e gerenciar versões dos projetos.

## Como funciona

O sistema é dividido em duas partes principais:
1. **Gestão de Projetos IA** - CRUD completo de projetos com métricas financeiras
2. **Sistema de Logs** - Monitoramento de erros e atividades das ferramentas de IA

## Modelos de Dados

### ProjetoIA - Modelo Principal
```python
class ProjetoIA(models.Model):
    # === CAMPOS BÁSICOS ===
    nome = models.CharField(max_length=200)
    descricao = models.TextField()
    data_criacao = models.DateField(default=date.today)
    status = models.CharField(choices=StatusProjeto.choices)
    link_projeto = models.URLField()
    versao_atual = models.CharField(default="1.0.0")
    
    # === CAMPOS ESTRATÉGICOS ===
    tipo_projeto = models.CharField(choices=TipoProjeto.choices)
    departamentos_atendidos = models.JSONField(default=list)  # Múltiplos departamentos
    prioridade = models.CharField(choices=PrioridadeChoices.choices)
    complexidade = models.CharField(choices=ComplexidadeChoices.choices)
    usuarios_impactados = models.PositiveIntegerField()
    frequencia_uso = models.CharField(choices=FrequenciaUsoChoices.choices)
    
    # === INVESTIMENTO DE TEMPO ===
    horas_totais = models.DecimalField(max_digits=8, decimal_places=2)
    horas_desenvolvimento = models.DecimalField(default=0)
    horas_testes = models.DecimalField(default=0)
    horas_documentacao = models.DecimalField(default=0)
    horas_deploy = models.DecimalField(default=0)
    
    # === CAMPOS FINANCEIROS NOVOS ===
    custo_hora_empresa = models.DecimalField(default=80.00)
    custo_apis_mensal = models.DecimalField(default=0)
    lista_ferramentas = models.JSONField(default=list)  # [{nome, valor}]
    custo_treinamentos = models.DecimalField(default=0)
    custo_setup_inicial = models.DecimalField(default=0)
    custo_consultoria = models.DecimalField(default=0)
    
    # === RETORNOS/ECONOMIAS ===
    horas_economizadas_mes = models.DecimalField(default=0)
    valor_monetario_economizado_mes = models.DecimalField(default=0)
    nivel_autonomia = models.CharField(choices=NivelAutonomiaChoices.choices)
    data_break_even = models.DateField(null=True, blank=True)
    
    # === RELACIONAMENTOS ===
    criadores = models.ManyToManyField(User, related_name='projetos_criados')
    dependencias = models.ManyToManyField('self', blank=True, symmetrical=False)
    criado_por = models.ForeignKey(User, on_delete=models.PROTECT)
```

**Campos Calculados (Properties):**
- `custo_desenvolvimento` - horas_totais × custo_hora_empresa
- `custos_recorrentes_mensais_novo` - APIs + ferramentas mensais
- `custos_unicos_totais_novo` - desenvolvimento + treinamentos + setup
- `economia_mensal_total_novo` - horas economizadas + valor monetário

### LogEntry - Logs das Ferramentas IA
```python
class LogEntry(models.Model):
    ferramenta = models.CharField(choices=TipoFerramenta.choices)  # Nicochat, N8N
    nivel = models.CharField(choices=NivelLog.choices)  # info, warning, error, critical
    mensagem = models.TextField()
    detalhes = models.JSONField(default=dict)
    
    # Campos específicos para Nicochat
    pais = models.CharField(choices=PaisNicochat.choices)
    usuario_conversa = models.CharField(max_length=100)
    id_conversa = models.CharField(max_length=100)
    
    # Campos de controle
    ip_origem = models.GenericIPAddressField()
    timestamp = models.DateTimeField(auto_now_add=True)
    resolvido = models.BooleanField(default=False)
    resolvido_por = models.ForeignKey(User, on_delete=models.SET_NULL)
    data_resolucao = models.DateTimeField(null=True)
```

### VersaoProjeto - Histórico de Versões
```python
class VersaoProjeto(models.Model):
    projeto = models.ForeignKey(ProjetoIA, related_name='versoes')
    versao = models.CharField(max_length=20)  # Ex: 1.2.0
    versao_anterior = models.CharField(max_length=20)
    motivo_mudanca = models.TextField()
    responsavel = models.ForeignKey(User, on_delete=models.PROTECT)
    data_lancamento = models.DateTimeField(auto_now_add=True)
```

## Endpoints da API

### Projetos IA

#### GET /api/ia/projetos/
**O que faz:** Lista todos os projetos ativos com paginação e filtros  
**Filtros disponíveis:**
- `status` - ativo, arquivado, manutencao
- `tipo_projeto` - automacao, chatbot, analise_preditiva, etc.
- `departamento` - diretoria, gestao, operacional, etc.
- `prioridade` - baixa, media, alta
- `complexidade` - baixa, media, alta
- `criadores` - IDs dos criadores
- `busca` - busca textual em nome/descrição
- `horas_min/max` - faixa de horas
- `data_criacao_inicio/fim` - período de criação

**Resposta:**
```json
{
  "count": 25,
  "next": "http://api/ia/projetos/?page=2",
  "results": [
    {
      "id": 1,
      "nome": "Chatbot Atendimento",
      "status": "ativo",
      "tipo_projeto": "chatbot",
      "departamentos_display": ["Operacional", "Suporte"],
      "prioridade": "alta",
      "horas_totais": "120.50",
      "criadores_nomes": ["João Silva", "Maria Santos"],
      "criado_em": "2024-01-15T10:30:00Z",
      "economia_mensal_estimada": 5000.00,
      "roi_estimado": 250.5
    }
  ]
}
```

#### GET /api/ia/projetos/{id}/
**O que faz:** Detalhes completos de um projeto específico  
**Resposta:**
```json
{
  "id": 1,
  "nome": "Chatbot Atendimento",
  "descricao": "Sistema de chatbot para automatizar atendimento inicial",
  "data_criacao": "2024-01-15",
  "status": "ativo",
  "tipo_projeto": "chatbot",
  "departamentos_atendidos": ["operacional", "suporte"],
  "prioridade": "alta",
  "complexidade": "media",
  "link_projeto": "https://sistema.example.com",
  "versao_atual": "1.2.0",
  
  // Investimento de tempo
  "horas_totais": "120.50",
  "horas_desenvolvimento": "80.00",
  "horas_testes": "20.00",
  "horas_documentacao": "15.00",
  "horas_deploy": "5.50",
  
  // Dados financeiros
  "custo_hora_empresa": "80.00",
  "custo_apis_mensal": "50.00",
  "lista_ferramentas": [
    {"nome": "OpenAI API", "valor": 50.00},
    {"nome": "MongoDB Atlas", "valor": 25.00}
  ],
  "custo_treinamentos": "500.00",
  
  // Economias
  "horas_economizadas_mes": "40.00",
  "valor_monetario_economizado_mes": "1000.00",
  "nivel_autonomia": "total",
  
  // Dados calculados
  "custo_desenvolvimento": 9640.00,
  "economia_mensal_total": 4200.00,
  "roi_estimado": 312.5,
  
  // Relacionamentos
  "criadores": [
    {"id": 1, "username": "joao", "nome_completo": "João Silva"}
  ],
  "dependencias": [
    {"id": 2, "nome": "API Base"}
  ],
  "versoes": [
    {
      "versao": "1.2.0",
      "motivo_mudanca": "Melhoria na precisão das respostas",
      "data_lancamento": "2024-02-15T10:00:00Z"
    }
  ]
}
```

#### POST /api/ia/projetos/
**O que faz:** Cria novo projeto IA  
**Parâmetros obrigatórios:**
```json
{
  "nome": "Nome do Projeto",
  "descricao": "Descrição detalhada",
  "tipo_projeto": "chatbot",
  "departamentos_atendidos": ["operacional"],
  "horas_totais": "100.00",
  "custo_hora_empresa": "80.00",
  "criadores_ids": [1, 2]
}
```

#### PUT/PATCH /api/ia/projetos/{id}/
**O que faz:** Atualiza projeto existente (requer permissão)  
**Permissões:** Criador do projeto, criadores associados, ou grupos Diretoria/Gestão

#### POST /api/ia/projetos/{id}/nova_versao/
**O que faz:** Registra nova versão do projeto  
**Parâmetros:**
```json
{
  "versao": "1.3.0",
  "motivo_mudanca": "Adicionada funcionalidade X"
}
```

#### POST /api/ia/projetos/{id}/arquivar/
**O que faz:** Arquiva ou desarquiva projeto  
**Resposta:**
```json
{
  "message": "Projeto arquivado",
  "novo_status": "arquivado"
}
```

#### POST /api/ia/projetos/{id}/duplicar/
**O que faz:** Duplica projeto como template  
**Resposta:**
```json
{
  "message": "Projeto duplicado com sucesso",
  "projeto_id": 25,
  "projeto_nome": "Chatbot Atendimento - Cópia"
}
```

#### GET /api/ia/projetos/{id}/metricas_detalhadas/
**O que faz:** Métricas financeiras detalhadas (requer permissão financeira)  
**Permissões:** Grupos Diretoria/Gestão ou superuser  
**Resposta:**
```json
{
  "projeto_id": 1,
  "projeto_nome": "Chatbot Atendimento",
  "metricas_atuais": {
    "custo_desenvolvimento": 9640.00,
    "custos_recorrentes_mensais": 75.00,
    "economia_mensal": 4200.00,
    "roi": 312.5,
    "payback_meses": 2.3,
    "meses_operacao": 6.2
  },
  "projecoes": {
    "1_mes": { "roi": 15.2, "economia_acumulada": 4200.00 },
    "6_meses": { "roi": 156.8, "economia_acumulada": 25200.00 },
    "12_meses": { "roi": 425.3, "economia_acumulada": 50400.00 }
  }
}
```

### Sistema de Logs

#### GET /api/ia/logs/
**O que faz:** Lista logs das ferramentas IA com paginação  
**Filtros:**
- `ferramenta` - Nicochat, N8N
- `nivel` - info, warning, error, critical (aceita múltiplos: `error,critical`)
- `pais` - colombia, chile, mexico, etc. (apenas Nicochat)
- `resolvido` - true/false
- `periodo` - 1h, 6h, 24h, 7d, 30d
- `busca` - busca em mensagem, usuário ou ID da conversa

**Resposta:**
```json
{
  "count": 150,
  "next": "http://api/ia/logs/?page=2",
  "results": [
    {
      "id": 1,
      "ferramenta": "Nicochat",
      "nivel": "error",
      "mensagem": "Falha ao conectar com OpenAI",
      "pais": "colombia",
      "usuario_conversa": "user_123",
      "timestamp": "2024-01-15T14:30:00Z",
      "resolvido": false,
      "detalhes": {
        "error_code": "connection_timeout",
        "response_time": 5000
      }
    }
  ]
}
```

#### POST /api/ia/logs/
**O que faz:** Cria novo log (uso interno)  
**Parâmetros:**
```json
{
  "ferramenta": "Nicochat",
  "nivel": "error",
  "mensagem": "Descrição do erro",
  "pais": "colombia",
  "usuario_conversa": "user_123",
  "detalhes": {"extra": "info"}
}
```

#### POST /api/ia/logs/publico/
**O que faz:** Endpoint público para Nicochat/N8N enviarem logs  
**Permissões:** AllowAny (sem autenticação)  
**Nota:** IP e User-Agent são capturados automaticamente

#### POST /api/ia/logs/{id}/marcar_resolvido/
**O que faz:** Marca/desmarca log como resolvido  
**Parâmetros:**
```json
{
  "resolvido": true,
  "observacoes": "Problema corrigido com reinicialização"
}
```

### Endpoints de Dashboard

#### GET /api/ia/dashboard-stats/
**O que faz:** Estatísticas gerais do dashboard (cache de 3 minutos)  
**Resposta:**
```json
{
  "total_projetos": 25,
  "projetos_ativos": 20,
  "projetos_arquivados": 5,
  "horas_totais_investidas": 2847.5,
  "projetos_por_tipo": {
    "chatbot": 8,
    "automacao": 12,
    "analise_preditiva": 5
  },
  "projetos_por_departamento": {
    "operacional": 10,
    "gestao": 8,
    "suporte": 7
  },
  "projetos_recentes": [
    {
      "id": 25,
      "nome": "Automação Relatórios",
      "status": "ativo",
      "criadores_nomes": ["João Silva"],
      "horas_totais": 45.0
    }
  ],
  // Dados financeiros (apenas para usuários autorizados)
  "economia_mensal_total": 15000.00,
  "roi_medio": 285.7,
  "economia_acumulada_total": 95000.00,
  "top_projetos_roi": [
    {
      "id": 1,
      "nome": "Chatbot Atendimento",
      "roi": 450.2,
      "economia_mensal": 5000.00
    }
  ]
}
```

#### GET /api/ia/dashboard-logs-stats/
**O que faz:** Estatísticas do dashboard de logs  
**Resposta:**
```json
{
  "resumo": {
    "total_logs_7d": 245,
    "logs_24h": 38,
    "logs_nao_resolvidos": 12,
    "logs_criticos_7d": 3
  },
  "por_ferramenta": [
    {
      "ferramenta": "Nicochat",
      "total": 28,
      "erros": 5,
      "nao_resolvidos": 3
    }
  ],
  "por_pais_nicochat": [
    {
      "pais": "colombia",
      "total": 15,
      "erros": 2
    }
  ]
}
```

#### GET /api/ia/opcoes-formulario/
**O que faz:** Opções para formulários (dropdowns)  
**Resposta:**
```json
{
  "status_choices": [
    {"value": "ativo", "label": "Ativo"},
    {"value": "arquivado", "label": "Arquivado"}
  ],
  "tipo_projeto_choices": [
    {"value": "chatbot", "label": "Chatbot"},
    {"value": "automacao", "label": "Automação"}
  ],
  "departamento_choices": [
    {"value": "diretoria", "label": "Diretoria"},
    {"value": "operacional", "label": "Operacional"}
  ],
  "usuarios_disponiveis": [
    {
      "id": 1,
      "username": "joao",
      "nome_completo": "João Silva"
    }
  ]
}
```

#### GET /api/ia/verificar-permissoes/
**O que faz:** Verifica permissões do usuário atual  
**Resposta:**
```json
{
  "pode_ver_financeiro": true,
  "pode_criar_projetos": true,
  "is_admin": false,
  "grupos": ["Gestão", "IA"]
}
```

## Escolhas de Campos (Enums)

### StatusProjeto
- `ativo` - Ativo
- `arquivado` - Arquivado  
- `manutencao` - Em Manutenção

### TipoProjeto
- `automacao` - Automação
- `chatbot` - Chatbot
- `analise_preditiva` - Análise Preditiva
- `visao_computacional` - Visão Computacional
- `processamento_nlp` - Processamento de Linguagem Natural
- `integracao_api` - Integração de APIs
- `dashboard_bi` - Dashboard BI
- `outros` - Outros

### DepartamentoChoices
- `diretoria` - Diretoria
- `gestao` - Gestão
- `operacional` - Operacional
- `ia_automacoes` - IA & Automações
- `suporte` - Suporte
- `trafego_pago` - Tráfego Pago

### PrioridadeChoices
- `baixa` - Baixa
- `media` - Média
- `alta` - Alta

### ComplexidadeChoices
- `baixa` - Baixa
- `media` - Média
- `alta` - Alta

### FrequenciaUsoChoices
- `diario` - Diário
- `semanal` - Semanal
- `mensal` - Mensal
- `trimestral` - Trimestral
- `eventual` - Eventual

### NivelAutonomiaChoices
- `total` - Totalmente Autônomo
- `parcial` - Requer Supervisão
- `manual` - Processo Manual

### TipoFerramenta (Logs)
- `Nicochat` - Nicochat
- `N8N` - N8N

### NivelLog
- `info` - Info
- `warning` - Warning
- `error` - Error
- `critical` - Critical

### PaisNicochat
- `colombia` - Colômbia
- `chile` - Chile
- `mexico` - México
- `polonia` - Polônia
- `romenia` - Romênia
- `espanha` - Espanha
- `italia` - Itália

## Cálculos Financeiros

### Fórmulas Utilizadas

#### Custo de Desenvolvimento
```
custo_desenvolvimento = horas_totais × custo_hora_empresa
```

#### Custos Recorrentes Mensais
```
custos_recorrentes_mensais = custo_apis_mensal + soma(lista_ferramentas[].valor)
```

#### Economia Mensal Total
```
economia_mensal = (horas_economizadas_mes × custo_hora_empresa) + valor_monetario_economizado_mes
```

#### ROI (Return on Investment)
```
roi = ((economia_acumulada - custo_total) / custo_total) × 100
```

#### Payback (Tempo de Retorno)
```
payback_meses = custos_unicos_totais / economia_mensal
```

### Exemplo de Cálculo

**Projeto:** Chatbot Atendimento
- Horas totais: 120h
- Custo/hora empresa: R$ 80
- API mensal: R$ 50
- Economia mensal: 40h × R$ 80 + R$ 1000 = R$ 4200

**Resultados:**
- Custo desenvolvimento: 120h × R$ 80 = R$ 9.600
- Payback: R$ 9.600 ÷ R$ 4.200 = 2.3 meses
- ROI (12 meses): ((R$ 50.400 - R$ 10.200) ÷ R$ 10.200) × 100 = 394%

## Permissões

### Dados Financeiros
**Quem pode ver:** Superusers + grupos "Diretoria" e "Gestão"  
**Endpoints afetados:**
- `/metricas_detalhadas/`
- Dashboard stats (campos financeiros)

### Edição de Projetos
**Quem pode editar:**
- Superusers
- Criador do projeto (`criado_por`)
- Usuários na lista de criadores (`criadores`)
- Usuários nos grupos "Diretoria" e "Gestão"

### Criação de Projetos
**Quem pode criar:** Todos os usuários autenticados

## Cache e Performance

### Cache Implementado
- **Dashboard Stats:** 3 minutos de cache por usuário
- **Opções de Formulário:** Sem cache (dados podem mudar)

### Otimizações de Query
- `select_related()` para `criado_por`
- `prefetch_related()` para `criadores`, `dependencias`, `versoes`
- Índices no banco para campos filtráveis

## Logs e Debug

### Logs Detalhados
O sistema registra logs detalhados para debugging:
```python
print(f"📊 RETRIEVE - projeto encontrado: {instance.id}")
print(f"💰 Calculando métricas para projeto {self.id}")
print(f"📋 UPDATE - dados recebidos: {list(request.data.keys())}")
```

### Estrutura de Logs
- **📊** - Operações de leitura
- **📝** - Operações de escrita
- **💰** - Cálculos financeiros
- **❌** - Erros
- **✅** - Sucessos
- **⚠️** - Avisos

## Problemas Comuns

### Erro: "Sem permissão para ver dados financeiros"
**Solução:** Verificar se usuário está nos grupos corretos:
```python
user.groups.filter(name__in=['Diretoria', 'Gestão']).exists()
```

### Erro: "Erro ao carregar projetos"
**Causa comum:** Problemas na query com departamentos_atendidos (JSONField)  
**Solução:** Verificar se o campo contém dados válidos

### Logs não aparecem
**Verificações:**
1. Endpoint público está acessível (`/api/ia/logs/publico/`)
2. IP da ferramenta não está bloqueado
3. Formato dos dados está correto

### Métricas financeiras incorretas
**Verificações:**
1. Campos novos vs legados estão preenchidos
2. `usar_novos_campos` está sendo usado corretamente
3. Valores decimais não são nulos

## Próximos Passos

1. 📱 Veja [IA Dashboard Frontend](../../frontend/pages/ia-dashboard.md) - Interface do usuário
2. 🔧 Explore [Outras Features](.) - Demais funcionalidades do sistema
3. 📖 Leia [Configurações](../configuracoes.md) - Settings do Django
4. 🚀 Entenda [Deploy](../../deployment/railway-deploy.md) - Processo de deploy

---

**Esta feature é essencial para o controle e ROI dos projetos de IA da empresa, fornecendo visibilidade completa sobre investimentos e retornos.**