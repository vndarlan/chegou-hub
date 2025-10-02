# backend/core/admin_dashboard.py
"""
Dashboard customizado para o Django Admin com widgets organizados
"""
from django.contrib.admin.views.decorators import staff_member_required
from django.shortcuts import render
from django.contrib.auth.models import User
from django.db.models import Count, Q
from datetime import timedelta
from django.utils import timezone


@staff_member_required
def admin_dashboard(request):
    """
    View customizada para o dashboard do admin
    Mostra widgets organizados com estatísticas importantes
    """

    # Estatísticas de Usuários
    total_usuarios = User.objects.count()
    usuarios_ativos = User.objects.filter(is_active=True).count()
    usuarios_staff = User.objects.filter(is_staff=True).count()

    # Estatísticas de Estoque (se app estiver instalado)
    try:
        from features.estoque.models import ProdutoEstoque, AlertaEstoque
        from django.db.models import F
        total_produtos = ProdutoEstoque.objects.filter(ativo=True).count()
        produtos_estoque_baixo = ProdutoEstoque.objects.filter(
            ativo=True,
            estoque_atual__lte=F('estoque_minimo')
        ).count()
        alertas_pendentes_estoque = AlertaEstoque.objects.filter(
            status__in=['ativo', 'lido']
        ).count()
    except (ImportError, Exception):
        total_produtos = 0
        produtos_estoque_baixo = 0
        alertas_pendentes_estoque = 0

    # Estatísticas de Feedback (se app estiver instalado)
    try:
        from features.feedback.models import Feedback
        feedbacks_pendentes = Feedback.objects.filter(
            status__in=['pendente', 'em_analise']
        ).count()
        feedbacks_total = Feedback.objects.count()
    except ImportError:
        feedbacks_pendentes = 0
        feedbacks_total = 0

    # Estatísticas de Processamento (se app estiver instalado)
    try:
        from features.processamento.models import ProcessamentoLog
        ultimas_24h = timezone.now() - timedelta(hours=24)
        processamentos_recentes = ProcessamentoLog.objects.filter(
            data_execucao__gte=ultimas_24h
        ).count()
        processamentos_sucesso = ProcessamentoLog.objects.filter(
            data_execucao__gte=ultimas_24h,
            status='sucesso'
        ).count()
    except ImportError:
        processamentos_recentes = 0
        processamentos_sucesso = 0

    # Estatísticas de WhatsApp (se app estiver instalado)
    try:
        from features.ia.models import WhatsAppPhoneNumber, QualityAlert
        numeros_whatsapp_ativos = WhatsAppPhoneNumber.objects.filter(
            monitoramento_ativo=True
        ).count()
        alertas_quality_pendentes = QualityAlert.objects.filter(
            resolvido=False
        ).count()
        numeros_qualidade_vermelha = WhatsAppPhoneNumber.objects.filter(
            quality_rating='RED',
            monitoramento_ativo=True
        ).count()
    except ImportError:
        numeros_whatsapp_ativos = 0
        alertas_quality_pendentes = 0
        numeros_qualidade_vermelha = 0

    context = {
        # Usuários
        'total_usuarios': total_usuarios,
        'usuarios_ativos': usuarios_ativos,
        'usuarios_staff': usuarios_staff,

        # Estoque
        'total_produtos': total_produtos,
        'produtos_estoque_baixo': produtos_estoque_baixo,
        'alertas_pendentes_estoque': alertas_pendentes_estoque,

        # Feedback
        'feedbacks_pendentes': feedbacks_pendentes,
        'feedbacks_total': feedbacks_total,

        # Processamento
        'processamentos_recentes': processamentos_recentes,
        'processamentos_sucesso': processamentos_sucesso,

        # WhatsApp
        'numeros_whatsapp_ativos': numeros_whatsapp_ativos,
        'alertas_quality_pendentes': alertas_quality_pendentes,
        'numeros_qualidade_vermelha': numeros_qualidade_vermelha,

        # Metadados
        'site_header': 'Chegou Hub',
        'title': 'Dashboard',
    }

    return render(request, 'admin/dashboard.html', context)
