import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { 
  Phone, 
  Building2, 
  AlertTriangle, 
  TrendingUp,
  RefreshCw,
  Plus,
  BarChart3
} from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../utils/csrf';

// Importar componentes criados
import BusinessManagerCard from './components/BusinessManagerCard';
import PhoneNumberTable from './components/PhoneNumberTable';
import QualityBadge from './components/QualityBadge';
import AlertPanel from './components/AlertPanel';
import QualityChart from './components/QualityChart';
import AddBusinessManagerModal from './components/AddBusinessManagerModal';

const NicochatPage = () => {
  // Estados principais
  const [dashboardStats, setDashboardStats] = useState({});
  const [businessManagers, setBusinessManagers] = useState([]);
  const [phoneNumbers, setPhoneNumbers] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [chartData, setChartData] = useState([]);

  // Estados de loading
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [error, setError] = useState(null);

  // Função para buscar dados do dashboard
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const [statsRes, bmRes, numbersRes, alertsRes] = await Promise.all([
        axios.get('/api/ia/dashboard-whatsapp-stats/'),
        axios.get('/api/ia/business-managers/'),
        axios.get('/api/ia/whatsapp-numeros/'),
        axios.get('/api/ia/quality-alerts/')
      ]);

      setDashboardStats(statsRes.data);
      setBusinessManagers(bmRes.data.results || bmRes.data);
      setPhoneNumbers(numbersRes.data.results || numbersRes.data);
      setAlerts(alertsRes.data.results || alertsRes.data);

    } catch (err) {
      console.error('Erro ao carregar dados do dashboard:', err);
      setError('Erro ao carregar dados. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  // Carregar dados na inicialização
  useEffect(() => {
    fetchDashboardData();
  }, []);

  // Sincronizar com Meta API
  const handleSyncMetaAPI = async () => {
    try {
      setIsSyncing(true);
      await axios.post('/api/ia/sincronizar-meta-api/', {}, {
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Content-Type': 'application/json'
        }
      });
      
      // Recarregar dados após sincronização
      await fetchDashboardData();
      
    } catch (err) {
      console.error('Erro ao sincronizar:', err);
      setError('Erro ao sincronizar com Meta API. Verifique as configurações.');
    } finally {
      setIsSyncing(false);
    }
  };

  // Adicionar Business Manager
  const handleAddBusinessManager = async (formData) => {
    try {
      await axios.post('/api/ia/business-managers/', formData, {
        headers: {
          'X-CSRFToken': getCSRFToken(),
          'Content-Type': 'application/json'
        }
      });
      
      // Recarregar dados
      await fetchDashboardData();
      
    } catch (err) {
      console.error('Erro ao adicionar Business Manager:', err);
      throw new Error('Erro ao adicionar Business Manager');
    }
  };

  // Sincronizar Business Manager específico
  const handleSyncBusinessManager = async (bmId) => {
    try {
      setIsSyncing(true);
      await axios.post(`/api/ia/business-managers/${bmId}/sincronizar/`, {}, {
        headers: {
          'X-CSRFToken': getCSRFToken()
        }
      });
      
      await fetchDashboardData();
      
    } catch (err) {
      console.error('Erro ao sincronizar BM:', err);
      setError('Erro ao sincronizar Business Manager');
    } finally {
      setIsSyncing(false);
    }
  };

  // Deletar Business Manager
  const handleDeleteBusinessManager = async (bmId) => {
    if (!window.confirm('Tem certeza que deseja excluir este Business Manager?')) {
      return;
    }
    
    try {
      await axios.delete(`/api/ia/business-managers/${bmId}/`, {
        headers: {
          'X-CSRFToken': getCSRFToken()
        }
      });
      
      await fetchDashboardData();
      
    } catch (err) {
      console.error('Erro ao deletar BM:', err);
      setError('Erro ao excluir Business Manager');
    }
  };

  // Dismiss alert
  const handleDismissAlert = async (alertId) => {
    try {
      await axios.patch(`/api/ia/quality-alerts/${alertId}/`, 
        { status: 'dismissed' },
        {
          headers: {
            'X-CSRFToken': getCSRFToken(),
            'Content-Type': 'application/json'
          }
        }
      );
      
      setAlerts(prev => prev.filter(alert => alert.id !== alertId));
      
    } catch (err) {
      console.error('Erro ao dismissar alerta:', err);
    }
  };

  // Loading inicial
  if (isLoading) {
    return (
      <div className="p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-6 w-6 animate-spin" />
              <span>Carregando dashboard...</span>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Dashboard WhatsApp Business</h1>
            <p className="text-muted-foreground">
              Monitoramento de qualidade dos números WhatsApp Business
            </p>
          </div>
          <div className="flex items-center gap-3">
            <AddBusinessManagerModal 
              onAdd={handleAddBusinessManager}
              isLoading={isSyncing}
            />
            <Button
              onClick={handleSyncMetaAPI}
              disabled={isSyncing}
              variant="outline"
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
              {isSyncing ? 'Sincronizando...' : 'Sincronizar Tudo'}
            </Button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setError(null)}
              className="ml-auto"
            >
              Fechar
            </Button>
          </Alert>
        )}

        {/* Métricas principais */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total de Números
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Phone className="h-5 w-5 text-blue-600" />
                <span className="text-2xl font-bold">
                  {dashboardStats.total_numeros || phoneNumbers.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Business Managers
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-green-600" />
                <span className="text-2xl font-bold">
                  {dashboardStats.total_business_managers || businessManagers.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Alertas Ativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-red-600" />
                <span className="text-2xl font-bold">
                  {dashboardStats.total_alertas || alerts.length}
                </span>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Qualidade Média
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-green-600" />
                <QualityBadge quality={dashboardStats.qualidade_predominante || 'green'} />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Business Managers Grid */}
        <div>
          <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Business Managers ({businessManagers.length})
          </h2>
          
          {businessManagers.length === 0 ? (
            <Card>
              <CardContent className="p-12 text-center">
                <Building2 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p className="text-lg font-medium mb-2">Nenhum Business Manager cadastrado</p>
                <p className="text-muted-foreground mb-4">
                  Adicione um Business Manager para começar a monitorar seus números WhatsApp
                </p>
                <AddBusinessManagerModal 
                  onAdd={handleAddBusinessManager}
                  isLoading={isSyncing}
                  trigger={
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Adicionar Primeiro Business Manager
                    </Button>
                  }
                />
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
              {businessManagers.map((bm) => (
                <BusinessManagerCard
                  key={bm.id}
                  businessManager={bm}
                  onSync={handleSyncBusinessManager}
                  onDelete={handleDeleteBusinessManager}
                  isLoading={isSyncing}
                />
              ))}
            </div>
          )}
        </div>

        {/* Grid: Tabela de Números e Alertas */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          <div className="xl:col-span-2">
            <PhoneNumberTable
              phoneNumbers={phoneNumbers}
              onRefresh={fetchDashboardData}
              isLoading={isLoading}
            />
          </div>
          
          <div>
            <AlertPanel
              alerts={alerts}
              onRefresh={fetchDashboardData}
              onDismiss={handleDismissAlert}
              isLoading={isLoading}
            />
          </div>
        </div>

        {/* Gráfico de Qualidade */}
        <QualityChart
          data={chartData}
          title="Evolução da Qualidade (Últimos 7 dias)"
        />

      </div>
    </div>
  );
};

export default NicochatPage;