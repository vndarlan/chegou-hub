import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../components/ui/card';
import { ChartContainer } from '../../../components/ui/chart';
import { Loader2 } from 'lucide-react';

export function CriadoVsResolvidoChart({ data, loading }) {
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
          className="h-[400px]"
        >
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="period" />
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
