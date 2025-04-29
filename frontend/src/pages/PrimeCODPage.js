// frontend/src/pages/PrimeCODPage.js
import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { 
  Container, 
  Title, 
  Paper, 
  Table, 
  Text, 
  Badge, 
  Group, 
  Select,
  Box,
  Flex,
  Loader,
  Alert,
  DateInput,
  ActionIcon,
  LoadingOverlay,
  Button
} from '@mantine/core';
import { IconRefresh, IconSearch, IconAlertCircle } from '@tabler/icons-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

// Componente para o status da efetividade com cor baseada no valor
const EffectivenessStatus = ({ value }) => {
  let color = 'red';
  let label = 'Crítico';
  
  if (value >= 55) {
    color = 'green';
    label = 'Ideal';
  } else if (value >= 50) {
    color = 'teal';
    label = 'Regular';
  } else if (value >= 45) {
    color = 'yellow';
    label = 'Atenção';
  }
  
  return (
    <Group gap={5}>
      <Text>{value.toFixed(2)}%</Text>
      <Badge color={color} size="sm">{label}</Badge>
    </Group>
  );
};

const PrimeCODPage = () => {
  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [countries, setCountries] = useState(['es', 'fr', 'it', 'pt', 'de']);
  const [selectedCountry, setSelectedCountry] = useState('es');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  
  // Função para carregar os dados
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Preparar parâmetros de query
      const params = { country: selectedCountry };
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');
      
      const response = await axios.get('/prime-cod/metrics/', { params });
      setMetrics(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados do Prime COD:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dados. Tente novamente.');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [selectedCountry]); // Recarregar quando o país selecionado mudar
  
  // Função para sincronizar dados com a API
  const handleSyncData = async () => {
    try {
      setRefreshing(true);
      await axios.get('/prime-cod/sync_data/');
      await loadData(); // Recarregar dados após sincronização
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
      setError('Erro ao sincronizar dados com a API Prime COD.');
      setRefreshing(false);
    }
  };
  
  // Função para aplicar filtros de data
  const handleApplyFilters = () => {
    loadData();
  };
  
  // Dados para o gráfico
  const chartData = metrics
    .filter(item => item.product !== 'TOTAL')
    .map(item => ({
      name: item.product,
      efetividade: item.efetividade,
      pedidos: item.pedidos,
      entregues: item.pedidos_entregues,
      receita: parseFloat(item.receita_liquida)
    }));
  
  return (
    <Container fluid>
      <LoadingOverlay visible={refreshing} />
      
      <Box p="lg">
        <Flex justify="space-between" align="center" mb="md">
          <Title order={2}>Métricas-Chave Prime COD - {selectedCountry.toUpperCase()}</Title>
          <Button 
            leftSection={<IconRefresh size={16} />}
            onClick={handleSyncData} 
            loading={refreshing}
            variant="light"
          >
            Sincronizar Dados
          </Button>
        </Flex>
        
        <Paper shadow="sm" radius="md" p="md" mb="xl">
          <Flex gap="md" mb="md">
            <Select
              label="País"
              value={selectedCountry}
              onChange={setSelectedCountry}
              data={countries.map(c => ({ value: c, label: c.toUpperCase() }))}
              w={100}
            />
            <DateInput
              label="Data Inicial"
              value={startDate}
              onChange={setStartDate}
              locale={pt}
              w={180}
            />
            <DateInput
              label="Data Final"
              value={endDate}
              onChange={setEndDate}
              locale={pt}
              w={180}
            />
            <ActionIcon 
              size={36} 
              mt={25}
              variant="filled" 
              color="blue" 
              onClick={handleApplyFilters}
            >
              <IconSearch size={16} />
            </ActionIcon>
          </Flex>
          
          {error && (
            <Alert icon={<IconAlertCircle size={16} />} title="Erro" color="red" mb="md">
              {error}
            </Alert>
          )}
          
          {loading ? (
            <Box style={{ display: 'flex', justifyContent: 'center', padding: '50px 0' }}>
              <Loader size="lg" />
            </Box>
          ) : (
            <>
              <Title order={4} mb="md">Tabela de Métricas por Produto</Title>
              <Table striped highlightOnHover withTableBorder mb="xl">
                <Table.Thead>
                  <Table.Tr>
                    <Table.Th>Produto</Table.Th>
                    <Table.Th>Pedidos</Table.Th>
                    <Table.Th>Pedidos Enviados</Table.Th>
                    <Table.Th>Pedidos Entregues</Table.Th>
                    <Table.Th>Efetividade</Table.Th>
                    <Table.Th>Em Trânsito</Table.Th>
                    <Table.Th>Recusados</Table.Th>
                    <Table.Th>Devolvidos</Table.Th>
                    <Table.Th>Outros Status</Table.Th>
                    <Table.Th>Receita Líquida</Table.Th>
                  </Table.Tr>
                </Table.Thead>
                <Table.Tbody>
                  {metrics.map((item, index) => (
                    <Table.Tr key={index} bg={item.product === 'TOTAL' ? 'var(--mantine-color-gray-0)' : undefined}>
                      <Table.Td fw={item.product === 'TOTAL' ? 700 : undefined}>
                        {item.product}
                      </Table.Td>
                      <Table.Td>{item.pedidos}</Table.Td>
                      <Table.Td>{item.pedidos_enviados}</Table.Td>
                      <Table.Td>{item.pedidos_entregues}</Table.Td>
                      <Table.Td>
                        <EffectivenessStatus value={item.efetividade} />
                      </Table.Td>
                      <Table.Td>{item.em_transito}</Table.Td>
                      <Table.Td>{item.recusados}</Table.Td>
                      <Table.Td>{item.devolvidos}</Table.Td>
                      <Table.Td>{item.outros_status}</Table.Td>
                      <Table.Td>€{parseFloat(item.receita_liquida).toFixed(2)}</Table.Td>
                    </Table.Tr>
                  ))}
                </Table.Tbody>
              </Table>
              
              <Title order={4} mb="md">Visualização de Efetividade</Title>
              <Paper p="md" mb="xl">
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" />
                    <YAxis yAxisId="right" orientation="right" />
                    <Tooltip />
                    <Legend />
                    <Line 
                      yAxisId="left"
                      type="monotone" 
                      dataKey="efetividade" 
                      stroke="#8884d8" 
                      name="Efetividade (%)" 
                    />
                    <Line 
                      yAxisId="right"
                      type="monotone" 
                      dataKey="receita" 
                      stroke="#82ca9d" 
                      name="Receita (€)" 
                    />
                  </LineChart>
                </ResponsiveContainer>
              </Paper>
              
              <Title order={4} mb="md">Análise Financeira</Title>
              <Paper p="md">
                <Table striped highlightOnHover withTableBorder>
                  <Table.Thead>
                    <Table.Tr>
                      <Table.Th>Produto</Table.Th>
                      <Table.Th>Receita Bruta</Table.Th>
                      <Table.Th>Custo de Envio</Table.Th>
                      <Table.Th>Devoluções</Table.Th>
                      <Table.Th>Receita Líquida</Table.Th>
                      <Table.Th>Margem (%)</Table.Th>
                    </Table.Tr>
                  </Table.Thead>
                  <Table.Tbody>
                    {metrics
                      .filter(item => item.product !== 'TOTAL')
                      .map((item, index) => {
                        // Simulamos os dados financeiros com base na receita disponível
                        const receitaBruta = parseFloat(item.receita_liquida) * 1.2;
                        const custoEnvio = item.pedidos_enviados * 5; // Exemplo: €5 por envio
                        const devolucoes = item.devolvidos * 15; // Exemplo: €15 por devolução
                        const receitaLiquida = parseFloat(item.receita_liquida);
                        const margem = (receitaLiquida / receitaBruta * 100).toFixed(2);
                        
                        return (
                          <Table.Tr key={index}>
                            <Table.Td>{item.product}</Table.Td>
                            <Table.Td>€{receitaBruta.toFixed(2)}</Table.Td>
                            <Table.Td>€{custoEnvio.toFixed(2)}</Table.Td>
                            <Table.Td>€{devolucoes.toFixed(2)}</Table.Td>
                            <Table.Td>€{receitaLiquida.toFixed(2)}</Table.Td>
                            <Table.Td>{margem}%</Table.Td>
                          </Table.Tr>
                        );
                      })}
                  </Table.Tbody>
                </Table>
              </Paper>
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PrimeCODPage;