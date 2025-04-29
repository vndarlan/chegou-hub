import React, { useState, useEffect, useCallback } from 'react';
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
  ActionIcon,
  LoadingOverlay,
  Button,
  Code
} from '@mantine/core';
import { IconRefresh, IconSearch, IconAlertCircle, IconInfoCircle } from '@tabler/icons-react';
import { format } from 'date-fns';
import { pt } from 'date-fns/locale';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { DateInput } from '@mantine/dates';

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
  // Função para obter datas padrão - últimos 30 dias
  const getDefaultDates = () => {
    const today = new Date();
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(today.getDate() - 30);
    return { start: thirtyDaysAgo, end: today };
  };

  const [metrics, setMetrics] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  // Atualizado para usar apenas os países suportados
  const [countries] = useState(['es', 'it', 'ro', 'pl']);
  const [selectedCountry, setSelectedCountry] = useState('es');
  const [startDate, setStartDate] = useState(getDefaultDates().start);
  const [endDate, setEndDate] = useState(getDefaultDates().end);
  const [refreshing, setRefreshing] = useState(false);
  const [showDebug, setShowDebug] = useState(false);
  
  // Função para carregar os dados com useCallback
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      setDebugInfo(null);
      
      // Preparar parâmetros de query
      const params = { country: selectedCountry };
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');
      
      console.log('Enviando requisição com parâmetros:', params);
      
      const response = await axios.get('/prime-cod/metrics/', { params });
      console.log('Dados recebidos da API:', response.data);
      
      // Verificar se os dados estão vazios ou com valores zerados
      const hasRealData = response.data && response.data.length > 0 && 
                        response.data.some(item => item.pedidos > 0);
      
      if (!hasRealData && response.data.length > 0) {
        console.warn('Dados recebidos contêm apenas valores zerados');
        setDebugInfo({
          message: 'Os dados recebidos contêm apenas valores zerados.',
          params: params,
          dataReceived: response.data
        });
      }
      
      setMetrics(response.data);
    } catch (err) {
      console.error('Erro ao carregar dados do Prime COD:', err);
      setError(err.response?.data?.error || 'Erro ao carregar dados. Tente novamente.');
      setDebugInfo({
        message: 'Erro na requisição',
        error: err.message,
        response: err.response?.data
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [selectedCountry, startDate, endDate]);

  // Carregar dados iniciais
  useEffect(() => {
    loadData();
  }, [loadData]);
  
  // Função para sincronizar dados com a API
  const handleSyncData = async () => {
    try {
      setRefreshing(true);
      setError(null);
      setDebugInfo(null);
      
      // Preparar parâmetros de query para sincronização
      const params = {};
      if (startDate) params.start_date = format(startDate, 'yyyy-MM-dd');
      if (endDate) params.end_date = format(endDate, 'yyyy-MM-dd');
      
      console.log('Iniciando sincronização com parâmetros:', params);
      
      const syncResponse = await axios.get('/prime-cod/sync_data/', { params });
      console.log('Resposta da sincronização:', syncResponse.data);
      
      // Mensagem de sucesso após sincronização
      setDebugInfo({
        message: 'Sincronização concluída com sucesso',
        response: syncResponse.data
      });
      
      // Pausa breve para permitir que o backend processe os dados
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // Recarregar dados após sincronização
      await loadData();
    } catch (err) {
      console.error('Erro ao sincronizar dados:', err);
      setError('Erro ao sincronizar dados com a API Prime COD.');
      setDebugInfo({
        message: 'Erro na sincronização',
        error: err.message,
        response: err.response?.data
      });
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
          <Group>
            <Title order={2}>Métricas-Chave Prime COD - {selectedCountry.toUpperCase()}</Title>
            <ActionIcon 
              onClick={() => setShowDebug(!showDebug)} 
              color="gray" 
              variant="subtle"
              title="Mostrar/ocultar informações de debug"
            >
              <IconInfoCircle size={20} />
            </ActionIcon>
          </Group>
          <Button 
            leftSection={<IconRefresh size={16} />}
            onClick={handleSyncData} 
            loading={refreshing}
            variant="light"
          >
            Sincronizar Dados
          </Button>
        </Flex>
        
        {showDebug && debugInfo && (
          <Alert 
            icon={<IconInfoCircle size={16} />} 
            title="Informações de Debug" 
            color="blue" 
            mb="md"
            withCloseButton
            onClose={() => setShowDebug(false)}
          >
            <Text mb="xs" fw={500}>{debugInfo.message}</Text>
            {debugInfo.error && <Text size="sm">Erro: {debugInfo.error}</Text>}
            {debugInfo.params && (
              <Text size="sm">Parâmetros enviados: 
                <Code block>{JSON.stringify(debugInfo.params, null, 2)}</Code>
              </Text>
            )}
            {debugInfo.dataReceived && (
              <Text size="sm">Primeiros dados recebidos:
                <Code block>{JSON.stringify(debugInfo.dataReceived.slice(0, 2), null, 2)}</Code>
              </Text>
            )}
          </Alert>
        )}
        
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
          ) : metrics.length === 0 ? (
            <Alert icon={<IconAlertCircle size={16} />} title="Sem dados" color="blue" mb="md">
              Não foram encontrados dados para os filtros selecionados. 
              Tente sincronizar ou mudar os filtros.
            </Alert>
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
              
              {chartData.length > 0 && chartData.some(item => item.pedidos > 0) ? (
                <>
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
              ) : (
                <Alert icon={<IconAlertCircle size={16} />} title="Sem dados para visualização" color="yellow" mb="md">
                  Não há pedidos suficientes para exibir gráficos e análises. Tente sincronizar os dados ou alterar os filtros.
                </Alert>
              )}
            </>
          )}
        </Paper>
      </Box>
    </Container>
  );
};

export default PrimeCODPage;