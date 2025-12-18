import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ChartContainer } from '../../../components/ui/chart';
import { Loader2 } from 'lucide-react';

export function CriadoVsResolvidoChart({ data, loading }) {
  const chartData = Array.isArray(data) ? data : [];

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Criado vs Resolvido</CardTitle>
          <CardDescription>Evolução de issues criados e resolvidos ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (chartData.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Criado vs Resolvido</CardTitle>
          <CardDescription>Evolução de issues criados e resolvidos ao longo do tempo</CardDescription>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-64 text-muted-foreground">
          Nenhum dado disponível para o período
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Criado vs Resolvido</CardTitle>
        <CardDescription>Evolução de issues criados e resolvidos ao longo do tempo</CardDescription>
      </CardHeader>
      <CardContent>
        <ChartContainer
          config={{
            created: {
              label: "Criado",
              color: "#3b82f6",
            },
            resolved: {
              label: "Resolvido",
              color: "#10b981",
            },
          }}
          className="h-[450px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 5, right: 30, left: 20, bottom: 70 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                dataKey="period"
                angle={-45}
                textAnchor="end"
                height={60}
                interval={0}
                tick={{ fontSize: 12 }}
              />
              <YAxis />
              <Tooltip />
              <Legend />
              <Line
                type="monotone"
                dataKey="created"
                stroke="#3b82f6"
                strokeWidth={2}
                name="Criado"
                dot={{ fill: '#3b82f6', r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="resolved"
                stroke="#10b981"
                strokeWidth={2}
                name="Resolvido"
                dot={{ fill: '#10b981', r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  );
}
