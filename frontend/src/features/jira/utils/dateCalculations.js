import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Calcula o range de datas baseado no período selecionado
 * @param {string} period - Período selecionado (ex: '7d', '30d', 'current_week', 'custom')
 * @param {object} customDateRange - Range personalizado {from: Date, to: Date} quando period='custom'
 * @returns {object|null} - {from: Date, to: Date, label: string} ou null se inválido
 */
export function calculateDateRange(period, customDateRange = null) {
  const hoje = new Date();
  hoje.setHours(23, 59, 59, 999); // Final do dia atual

  let from, to;

  switch (period) {
    case 'current_week': {
      // Semana atual (domingo a sábado)
      const diaAtual = hoje.getDay();
      from = new Date(hoje);
      from.setDate(hoje.getDate() - diaAtual);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case 'last_week': {
      // Semana passada (domingo a sábado)
      const diaAtual = hoje.getDay();
      to = new Date(hoje);
      to.setDate(hoje.getDate() - diaAtual - 1);
      to.setHours(23, 59, 59, 999);
      from = new Date(to);
      from.setDate(to.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    }

    case '2_weeks_ago': {
      // Semana retrasada
      const diaAtual = hoje.getDay();
      to = new Date(hoje);
      to.setDate(hoje.getDate() - diaAtual - 8);
      to.setHours(23, 59, 59, 999);
      from = new Date(to);
      from.setDate(to.getDate() - 6);
      from.setHours(0, 0, 0, 0);
      break;
    }

    case '15d': {
      from = new Date(hoje);
      from.setDate(hoje.getDate() - 15);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case '30d': {
      from = new Date(hoje);
      from.setDate(hoje.getDate() - 30);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case '45d': {
      from = new Date(hoje);
      from.setDate(hoje.getDate() - 45);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case '3m': {
      from = new Date(hoje);
      from.setMonth(hoje.getMonth() - 3);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case '6m': {
      from = new Date(hoje);
      from.setMonth(hoje.getMonth() - 6);
      from.setHours(0, 0, 0, 0);
      to = new Date(hoje);
      break;
    }

    case 'custom': {
      if (!customDateRange?.from || !customDateRange?.to) {
        return null; // Datas incompletas
      }
      from = new Date(customDateRange.from);
      from.setHours(0, 0, 0, 0);
      to = new Date(customDateRange.to);
      to.setHours(23, 59, 59, 999);
      break;
    }

    default:
      return null;
  }

  const label = formatDateRangeLabel(from, to);

  return { from, to, label };
}

/**
 * Formata o range de datas em formato legível PT-BR
 * @param {Date} from - Data inicial
 * @param {Date} to - Data final
 * @returns {string} - Ex: "11/12/2024 até 18/12/2024"
 */
export function formatDateRangeLabel(from, to) {
  if (!from || !to) return '';

  try {
    const fromStr = format(from, 'dd/MM/yyyy', { locale: ptBR });
    const toStr = format(to, 'dd/MM/yyyy', { locale: ptBR });
    return `${fromStr} até ${toStr}`;
  } catch {
    return '';
  }
}
