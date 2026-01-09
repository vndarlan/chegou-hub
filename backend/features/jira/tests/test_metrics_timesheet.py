# backend/features/jira/tests/test_metrics_timesheet.py
"""
Testes unitários para validar cálculo de períodos no Timesheet
Garante que o filtro de worklogs usa o mesmo período que o JQL
"""

import pytest
from datetime import datetime, timedelta
from backend.features.jira.services.metrics_service import JiraMetricsService


class TestTimesheetDateCalculation:
    """
    Testes para garantir que períodos são calculados corretamente
    e sincronizados com a lógica do _build_period_jql
    """

    def test_current_week_calculation(self):
        """
        Testa cálculo de 'semana atual' (segunda a domingo desta semana)
        """
        start, end = JiraMetricsService._calculate_date_range('current_week')

        # Verificar que é segunda-feira
        assert start.weekday() == 0, "Início da semana deve ser segunda-feira"

        # Verificar que é domingo
        assert end.weekday() == 6, "Fim da semana deve ser domingo"

        # Verificar que é exatamente 6 dias de diferença
        assert (end.date() - start.date()).days == 6, "Semana deve ter 7 dias (6 dias de diferença)"

        # Verificar que a semana atual está dentro do range
        today = datetime.now().date()
        assert start.date() <= today <= end.date(), "Hoje deve estar dentro da semana atual"

    def test_last_week_calculation(self):
        """
        Testa cálculo de 'semana passada' (segunda a domingo da semana passada)
        """
        start, end = JiraMetricsService._calculate_date_range('last_week')

        # Verificar que é segunda-feira
        assert start.weekday() == 0, "Início da semana deve ser segunda-feira"

        # Verificar que é domingo
        assert end.weekday() == 6, "Fim da semana deve ser domingo"

        # Verificar que é exatamente 6 dias de diferença
        assert (end.date() - start.date()).days == 6, "Semana deve ter 7 dias"

        # Verificar que é da semana passada (anterior à semana atual)
        today = datetime.now().date()
        assert end.date() < today, "Semana passada deve terminar antes de hoje"

        # Verificar que termina antes da semana atual começar
        current_week_start, _ = JiraMetricsService._calculate_date_range('current_week')
        assert end.date() < current_week_start.date(), "Semana passada deve terminar antes da semana atual"

    def test_2_weeks_ago_calculation(self):
        """
        Testa cálculo de 'semana retrasada' (segunda a domingo de 2 semanas atrás)
        """
        start, end = JiraMetricsService._calculate_date_range('2_weeks_ago')

        # Verificar que é segunda-feira
        assert start.weekday() == 0, "Início da semana deve ser segunda-feira"

        # Verificar que é domingo
        assert end.weekday() == 6, "Fim da semana deve ser domingo"

        # Verificar que é exatamente 6 dias de diferença
        assert (end.date() - start.date()).days == 6, "Semana deve ter 7 dias"

        # Verificar que é de 2 semanas atrás
        last_week_start, _ = JiraMetricsService._calculate_date_range('last_week')
        expected_diff = 7  # 1 semana = 7 dias
        actual_diff = (last_week_start.date() - start.date()).days
        assert actual_diff == expected_diff, "Deve ser exatamente 1 semana antes da semana passada"

    def test_15d_calculation(self):
        """
        Testa cálculo de '15d' (últimos 15 dias)
        """
        start, end = JiraMetricsService._calculate_date_range('15d')

        # Verificar que o range é de aproximadamente 15 dias
        diff_days = (end - start).days
        assert 14 <= diff_days <= 15, f"Período de 15d deve ter ~15 dias, tem {diff_days}"

        # Verificar que termina hoje ou muito próximo
        today = datetime.now()
        assert abs((end - today).total_seconds()) < 60, "Fim deve ser aproximadamente agora"

    def test_30d_calculation(self):
        """
        Testa cálculo de '30d' (últimos 30 dias)
        """
        start, end = JiraMetricsService._calculate_date_range('30d')

        # Verificar que o range é de aproximadamente 30 dias
        diff_days = (end - start).days
        assert 29 <= diff_days <= 30, f"Período de 30d deve ter ~30 dias, tem {diff_days}"

        # Verificar que termina hoje ou muito próximo
        today = datetime.now()
        assert abs((end - today).total_seconds()) < 60, "Fim deve ser aproximadamente agora"

    def test_45d_calculation(self):
        """
        Testa cálculo de '45d' (últimos 45 dias)
        """
        start, end = JiraMetricsService._calculate_date_range('45d')

        # Verificar que o range é de aproximadamente 45 dias
        diff_days = (end - start).days
        assert 44 <= diff_days <= 45, f"Período de 45d deve ter ~45 dias, tem {diff_days}"

    def test_3m_calculation(self):
        """
        Testa cálculo de '3m' (últimos 3 meses = 90 dias)
        """
        start, end = JiraMetricsService._calculate_date_range('3m')

        # Verificar que o range é de aproximadamente 90 dias
        diff_days = (end - start).days
        assert 89 <= diff_days <= 90, f"Período de 3m deve ter ~90 dias, tem {diff_days}"

    def test_6m_calculation(self):
        """
        Testa cálculo de '6m' (últimos 6 meses = 180 dias)
        """
        start, end = JiraMetricsService._calculate_date_range('6m')

        # Verificar que o range é de aproximadamente 180 dias
        diff_days = (end - start).days
        assert 179 <= diff_days <= 180, f"Período de 6m deve ter ~180 dias, tem {diff_days}"

    def test_custom_period(self):
        """
        Testa período customizado com datas específicas
        """
        start, end = JiraMetricsService._calculate_date_range(
            'custom',
            '2026-01-01',
            '2026-01-07'
        )

        assert start.date() == datetime(2026, 1, 1).date(), "Início deve ser 01/jan/2026"
        assert end.date() == datetime(2026, 1, 7).date(), "Fim deve ser 07/jan/2026"
        assert (end - start).days == 6, "Diferença deve ser 6 dias"

    def test_custom_without_dates_raises_error(self):
        """
        Testa que período custom sem datas levanta ValueError
        """
        with pytest.raises(ValueError, match="Período 'custom' requer start_date e end_date"):
            JiraMetricsService._calculate_date_range('custom')

    def test_invalid_period_raises_error(self):
        """
        Testa que período inválido levanta ValueError
        """
        with pytest.raises(ValueError, match="Período inválido"):
            JiraMetricsService._calculate_date_range('invalid_period')

    def test_all_periods_return_datetime(self):
        """
        Testa que todos os períodos retornam objetos datetime
        """
        periods = ['current_week', 'last_week', '2_weeks_ago', '15d', '30d', '45d', '3m', '6m']

        for period in periods:
            start, end = JiraMetricsService._calculate_date_range(period)

            assert isinstance(start, datetime), f"{period}: start deve ser datetime"
            assert isinstance(end, datetime), f"{period}: end deve ser datetime"
            assert start < end, f"{period}: start deve ser anterior a end"

    def test_consistency_between_periods(self):
        """
        Testa consistência entre períodos de semanas
        Garante que as semanas não se sobrepõem
        """
        current_week_start, current_week_end = JiraMetricsService._calculate_date_range('current_week')
        last_week_start, last_week_end = JiraMetricsService._calculate_date_range('last_week')
        two_weeks_ago_start, two_weeks_ago_end = JiraMetricsService._calculate_date_range('2_weeks_ago')

        # Semana passada deve terminar antes da semana atual começar
        assert last_week_end < current_week_start, "Semana passada não deve sobrepor semana atual"

        # Semana retrasada deve terminar antes da semana passada começar
        assert two_weeks_ago_end < last_week_start, "Semana retrasada não deve sobrepor semana passada"

        # Verificar que são semanas consecutivas (com 1 dia de gap se for domingo->segunda)
        days_between_last_and_current = (current_week_start.date() - last_week_end.date()).days
        assert days_between_last_and_current == 1, "Deve haver exatamente 1 dia entre domingo e segunda"

    def test_week_periods_cover_full_week(self):
        """
        Testa que períodos semanais cobrem uma semana completa (7 dias)
        """
        periods = ['current_week', 'last_week', '2_weeks_ago']

        for period in periods:
            start, end = JiraMetricsService._calculate_date_range(period)

            # Calcular dias completos (incluindo o último dia)
            # De segunda 00:00 a domingo 23:59 = 7 dias
            total_days = (end.date() - start.date()).days + 1

            assert total_days == 7, f"{period} deve cobrir exatamente 7 dias, cobre {total_days}"
