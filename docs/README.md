# 📚 Documentação Contextual - Chegou Hub

## Nova Estrutura de Documentação

A documentação do Chegou Hub foi completamente reestruturada para fornecer **contexto estratégico** ao invés de detalhes técnicos de implementação. Ideal para briefings de IA e entendimento de alto nível do sistema.

## 📋 Navegação Principal

### 🎯 **Documentação Contextual (NOVA)**
- [🛠️ Stack Tecnológico](stack-tecnologico.md) - Tecnologias, bibliotecas e arquitetura
- [⚙️ Configurações de Ambiente](configuracoes-ambiente.md) - Variáveis, segurança e Railway
- [🚀 Railway & Produção](railway-producao.md) - Deploy, infraestrutura e monitoramento
- [📊 Features Principais](features-principais.md) - Visão estratégica das funcionalidades
- [🔗 Integrações Externas](integracoes-externas.md) - APIs, web scraping e serviços
- [📈 Monitoramento & Logs](monitoramento-logs.md) - Observabilidade e troubleshooting

### 📖 **Guias do Usuário (Mantidos)**
- [📁 User Guides](user-guides/) - Tutoriais passo a passo para usuários finais
- Mantidos pelo **User Guide Agent** - foco na experiência prática


## 🎯 O que Mudou

### ❌ **ANTES (Documentação Técnica)**
```
📁 docs/backend/features/
├── chatbot-ia.md      # 400+ linhas de código Python
├── ia.md              # Endpoints, modelos, queries SQL  
├── feedback.md        # Implementação detalhada Django
└── [12+ arquivos técnicos similares]
```
**Problemas**: Muito código, difícil extrair contexto, foco em "como implementar"

### ✅ **DEPOIS (Documentação Contextual)**
```
📁 docs/
├── stack-tecnologico.md      # QUE tecnologias e POR QUE
├── configuracoes-ambiente.md # QUAIS variáveis e PARA QUE
├── railway-producao.md       # COMO está no Railway
├── features-principais.md    # O QUE fazem as features
├── integracoes-externas.md   # COM QUE se integra
└── monitoramento-logs.md     # COMO monitorar
```
**Vantagens**: Contexto estratégico, fácil para briefing de IA, visão de negócio

## 🤖 Ideal para Briefing de IA

### Antes de Briefar uma IA, leia:
1. **[Stack Tecnológico](stack-tecnologico.md)** - "Usamos React + Django porque..."
2. **[Features Principais](features-principais.md)** - "O sistema tem Dashboard IA que calcula ROI..."
3. **[Integrações](integracoes-externas.md)** - "Integramos com OpenAI, PRIMECOD, ECOMHUB via..."
4. **[Railway](railway-producao.md)** - "Deploy automático, PostgreSQL provisionado..."

### Exemplo de Brief Contextual:
> "O Chegou Hub é um sistema Django+React no Railway com dashboard de IA que monitora ROI de projetos, integra com APIs OpenAI/PRIMECOD/ECOMHUB via web scraping, usa background jobs Django-RQ, e tem chatbot Claude interno. Stack: PostgreSQL, Redis, Selenium Grid para scraping."

## 📊 Features do Sistema

### 🤖 **Inteligência Artificial**
- **Dashboard IA**: Gestão de ROI de projetos de automação
- **OpenAI Analytics**: Monitoramento de custos de APIs de IA  
- **Chatbot Claude**: Assistente interno com documentação

### 📈 **Métricas & Análises**
- **PRIMECOD**: API direta para métricas de tráfego
- **ECOMHUB**: Web scraping via Selenium Grid
- **DROPI MX**: Sistema de tokens para dropshipping
- **Mapa Geográfico**: Visualização de cobertura regional

### 🛠️ **Operacional**
- **Sistema Feedback**: Canal usuário-desenvolvedor
- **Agenda Corporativa**: Sync com Google Calendar
- **Background Jobs**: Django-RQ para tarefas pesadas
- **Monitoramento**: Logs estruturados + métricas Railway

## 🔧 Stack Resumido

```
Frontend:  React 19.1 + shadcn/ui + Tailwind
Backend:   Django 5.2 + DRF + PostgreSQL + Redis
Deploy:    Railway (auto-deploy via Git)
IA APIs:   OpenAI GPT-4 + Anthropic Claude
Scraping:  Selenium Grid distribuído
Cache:     Redis + Django cache framework
```

## 🚀 Como Usar Esta Documentação

### **Para Entendimento Geral**
Leia na ordem: Stack → Features → Integrações → Railway

### **Para Troubleshooting**
Vá direto para: [Monitoramento & Logs](monitoramento-logs.md)

### **Para Deploy/Infraestrutura**  
Consulte: [Railway & Produção](railway-producao.md)

### **Para Briefing de IA**
Leia todos os 6 arquivos principais - são contextuais e rápidos

### **Para Tutorial de Uso**
Use: [📁 User Guides](user-guides/) (mantido pelo User Guide Agent)

## 🎯 Filosofia da Nova Documentação

### **Contextual, não Implementacional**
- ✅ "Usa OpenAI para calcular ROI automaticamente"
- ❌ "def calcular_roi(self, projeto): return (economia - custo) / custo * 100"

### **Business-Friendly**
- ✅ "Dashboard IA monitora 25+ projetos com ROI médio de 285%"
- ❌ "class ProjetoIA(models.Model): roi = models.DecimalField(...)"

### **Estratégica**
- ✅ "Railway escolhido por deploy automático e PostgreSQL incluído"
- ❌ "DATABASES = {'default': dj_database_url.parse(DATABASE_URL)}"

---

**📍 Documentação contextual otimizada para briefings de IA e entendimento estratégico do sistema**

*🤖 Reestruturada pela equipe de Agentes de Documentação*