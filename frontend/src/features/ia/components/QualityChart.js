import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';

const QualityChart = ({ data = [], title = "Evolução da Qualidade" }) => {
  // Dados mock para demonstração - em produção viriam da API
  const mockData = data.length > 0 ? data : [
    { date: '2024-01-01', green: 15, yellow: 3, red: 1 },
    { date: '2024-01-02', green: 16, yellow: 2, red: 1 },
    { date: '2024-01-03', green: 14, yellow: 4, red: 1 },
    { date: '2024-01-04', green: 17, yellow: 2, red: 0 },
    { date: '2024-01-05', green: 18, yellow: 1, red: 0 },
    { date: '2024-01-06', green: 16, yellow: 3, red: 0 },
    { date: '2024-01-07', green: 19, yellow: 0, red: 0 }
  ];

  const maxValue = Math.max(...mockData.map(d => d.green + d.yellow + d.red));
  const latestData = mockData[mockData.length - 1];
  const previousData = mockData[mockData.length - 2];
  
  const getTrend = () => {
    if (!previousData) return { icon: Minus, color: 'text-gray-500', text: 'Sem dados anteriores' };
    
    const currentGreen = latestData.green;
    const previousGreen = previousData.green;
    
    if (currentGreen > previousGreen) {
      return { icon: TrendingUp, color: 'text-green-600', text: 'Melhorando' };
    } else if (currentGreen < previousGreen) {
      return { icon: TrendingDown, color: 'text-red-600', text: 'Piorando' };
    } else {
      return { icon: Minus, color: 'text-gray-500', text: 'Estável' };
    }
  };

  const trend = getTrend();
  const TrendIcon = trend.icon;

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{title}</CardTitle>
          <div className="flex items-center gap-2 text-sm">
            <TrendIcon className={`h-4 w-4 ${trend.color}`} />
            <span className={trend.color}>{trend.text}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Legenda */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span>Excelente</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span>Atenção</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span>Crítico</span>
            </div>
          </div>

          {/* Gráfico de barras simples */}
          <div className="space-y-2">
            {mockData.slice(-7).map((item, index) => {
              const total = item.green + item.yellow + item.red;
              const greenPercent = (item.green / total) * 100;
              const yellowPercent = (item.yellow / total) * 100;
              const redPercent = (item.red / total) * 100;
              
              const date = new Date(item.date);
              const dayName = date.toLocaleDateString('pt-BR', { weekday: 'short' });

              return (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-12 text-xs text-muted-foreground">
                    {dayName}
                  </div>
                  <div className="flex-1">
                    <div className="flex h-6 rounded-full overflow-hidden border">
                      {item.green > 0 && (
                        <div 
                          className="bg-green-500 transition-all" 
                          style={{ width: `${greenPercent}%` }}
                          title={`${item.green} números - Excelente`}
                        />
                      )}
                      {item.yellow > 0 && (
                        <div 
                          className="bg-yellow-500 transition-all" 
                          style={{ width: `${yellowPercent}%` }}
                          title={`${item.yellow} números - Atenção`}
                        />
                      )}
                      {item.red > 0 && (
                        <div 
                          className="bg-red-500 transition-all" 
                          style={{ width: `${redPercent}%` }}
                          title={`${item.red} números - Crítico`}
                        />
                      )}
                    </div>
                  </div>
                  <div className="w-8 text-xs text-muted-foreground text-right">
                    {total}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Resumo */}
          <div className="grid grid-cols-3 gap-4 pt-4 border-t">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">{latestData.green}</div>
              <div className="text-xs text-muted-foreground">Excelente</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">{latestData.yellow}</div>
              <div className="text-xs text-muted-foreground">Atenção</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">{latestData.red}</div>
              <div className="text-xs text-muted-foreground">Crítico</div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default QualityChart;