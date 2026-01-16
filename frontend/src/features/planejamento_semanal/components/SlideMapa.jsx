// frontend/src/features/planejamento_semanal/components/SlideMapa.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, AlertCircle, Plus, X, Check } from 'lucide-react';
import apiClient from '../../../utils/axios';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { Button } from '../../../components/ui/button';
import { Label } from '../../../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../components/ui/select';

// URL do GeoJSON
const FULL_GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Coordenadas dos paises do mundo
const COUNTRY_COORDINATES = {
  'Afghanistan': [33.9391, 67.7100],
  'Albania': [41.1533, 20.1683],
  'Algeria': [28.0339, 1.6596],
  'Argentina': [-38.4161, -63.6167],
  'Armenia': [40.0691, 45.0382],
  'Australia': [-25.2744, 133.7751],
  'Austria': [47.5162, 14.5501],
  'Azerbaijan': [40.1431, 47.5769],
  'Bangladesh': [23.6850, 90.3563],
  'Belarus': [53.7098, 27.9534],
  'Belgium': [50.5039, 4.4699],
  'Bolivia': [-16.2902, -63.5887],
  'Brazil': [-15.7801, -47.9292],
  'Bulgaria': [42.7339, 25.4858],
  'Cambodia': [12.5657, 104.9910],
  'Cameroon': [7.3697, 12.3547],
  'Canada': [56.1304, -106.3468],
  'Chile': [-35.6751, -71.5430],
  'China': [35.8617, 104.1954],
  'Colombia': [4.5709, -74.2973],
  'Croatia': [45.1000, 15.2000],
  'Cuba': [21.5218, -77.7812],
  'Czech Republic': [49.8175, 15.4730],
  'Denmark': [56.2639, 9.5018],
  'Ecuador': [-1.8312, -78.1834],
  'Egypt': [26.0975, 31.2357],
  'Estonia': [58.5953, 25.0136],
  'Finland': [61.9241, 25.7482],
  'France': [46.6034, 1.8883],
  'Germany': [51.1657, 10.4515],
  'Ghana': [7.9465, -1.0232],
  'Greece': [39.0742, 21.8243],
  'Hungary': [47.1625, 19.5033],
  'Iceland': [64.9631, -19.0208],
  'India': [20.5937, 78.9629],
  'Indonesia': [-0.7893, 113.9213],
  'Iran': [32.4279, 53.6880],
  'Iraq': [33.2232, 43.6793],
  'Ireland': [53.4129, -8.2439],
  'Israel': [31.0461, 34.8516],
  'Italy': [41.8719, 12.5674],
  'Japan': [36.2048, 138.2529],
  'Kazakhstan': [48.0196, 66.9237],
  'Kenya': [-0.0236, 37.9062],
  'Latvia': [56.8796, 24.6032],
  'Lithuania': [55.1694, 23.8813],
  'Malaysia': [4.2105, 101.9758],
  'Mexico': [23.6345, -102.5528],
  'Morocco': [31.7917, -7.0926],
  'Netherlands': [52.1326, 5.2913],
  'New Zealand': [-40.9006, 174.8860],
  'Nigeria': [9.0820, 8.6753],
  'Norway': [60.4720, 8.4689],
  'Pakistan': [30.3753, 69.3451],
  'Paraguay': [-23.4425, -58.4438],
  'Peru': [-9.1900, -75.0152],
  'Philippines': [12.8797, 121.7740],
  'Poland': [51.9194, 19.1451],
  'Portugal': [39.3999, -8.2245],
  'Romania': [45.9432, 24.9668],
  'Russia': [61.5240, 105.3188],
  'Saudi Arabia': [23.8859, 45.0792],
  'South Africa': [-30.5595, 22.9375],
  'South Korea': [35.9078, 127.7669],
  'Spain': [40.4637, -3.7492],
  'Sweden': [60.1282, 18.6435],
  'Switzerland': [46.8182, 8.2275],
  'Thailand': [15.8700, 100.9925],
  'Turkey': [38.9637, 35.2433],
  'Ukraine': [48.3794, 31.1656],
  'United Arab Emirates': [23.4241, 53.8478],
  'United Kingdom': [55.3781, -3.4360],
  'United States of America': [39.8283, -98.5795],
  'Uruguay': [-32.5228, -55.7658],
  'Venezuela': [6.4238, -66.5897],
  'Vietnam': [14.0583, 108.2772],
};

// Correcao do icone do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

/**
 * Slide do Mapa de Atuacao para apresentacao
 * Versao somente leitura - sem botoes de adicao ou modals
 */
export function SlideMapa() {
  const [geoJsonData, setGeoJsonData] = useState(null);
  const [paisesData, setPaisesData] = useState([]);
  const [statusColors, setStatusColors] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Estados para gerenciamento de paises
  const [canManage, setCanManage] = useState(false);
  const [statusList, setStatusList] = useState([]);
  const [availableCountries, setAvailableCountries] = useState([]);
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState(null);
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [addLoading, setAddLoading] = useState(false);
  const [notification, setNotification] = useState(null);

  // Verificar permissoes
  useEffect(() => {
    const checkPermissions = async () => {
      try {
        const response = await apiClient.get('/check-permissions/');
        setCanManage(response.data.can_manage);
      } catch (err) {
        console.log("Erro ao verificar permissoes:", err);
        setCanManage(false);
      }
    };
    checkPermissions();
  }, []);

  // Buscar dados do mapa
  useEffect(() => {
    const fetchMapaData = async () => {
      try {
        setLoading(true);
        setError(null);

        // Buscar dados dos paises
        const response = await apiClient.get('/mapa-data/');
        const data = response.data;

        setPaisesData(data.paises);
        setStatusColors(data.status_colors);

        // Buscar lista de status e paises disponiveis se tiver permissao
        if (canManage) {
          const statusResponse = await apiClient.get('/status/');
          setStatusList(statusResponse.data);

          const countriesResponse = await apiClient.get('/available-countries/');
          setAvailableCountries(countriesResponse.data);
        }

        // Buscar GeoJSON
        const geoResponse = await fetch(FULL_GEOJSON_URL);
        if (!geoResponse.ok) {
          throw new Error(`Erro GeoJSON: ${geoResponse.status}`);
        }
        const geoData = await geoResponse.json();
        setGeoJsonData(geoData);

      } catch (err) {
        console.error("Erro ao carregar dados:", err);
        setError(`Erro ao carregar dados: ${err.message}`);
      } finally {
        setLoading(false);
      }
    };

    fetchMapaData();
  }, [canManage]);

  // Adicionar pais
  const handleAddCountry = async () => {
    if (!selectedCountry || !selectedStatus) {
      setNotification({ type: 'error', message: 'Selecione pais e status.' });
      return;
    }

    setAddLoading(true);
    try {
      // Garantir que temos um token CSRF valido
      await apiClient.get('/current-state/');

      const coordinates = COUNTRY_COORDINATES[selectedCountry.nome_geojson] || [0, 0];

      await apiClient.post('/add-pais/', {
        nome_display: selectedCountry.nome_display,
        nome_geojson: selectedCountry.nome_geojson,
        status: selectedStatus,
        latitude: coordinates[0],
        longitude: coordinates[1],
        ativo: true
      });

      setNotification({ type: 'success', message: `${selectedCountry.nome_display} adicionado com sucesso!` });
      setAddModalOpen(false);
      setSelectedCountry(null);
      setSelectedStatus(null);

      // Recarregar dados
      window.location.reload();

    } catch (err) {
      console.error("Erro ao adicionar pais:", err);
      setNotification({
        type: 'error',
        message: err.response?.data?.detail || 'Erro ao adicionar pais.'
      });
    } finally {
      setAddLoading(false);
    }
  };

  // Mapa de paises por status
  const countryStatusMap = useMemo(() => {
    const map = new Map();
    paisesData.forEach(pais => {
      map.set(pais.nome_geojson, pais.status);
    });
    return map;
  }, [paisesData]);

  // Paises agrupados por status
  const paisesPorStatus = useMemo(() => {
    const grupos = {};
    paisesData.forEach(pais => {
      if (!grupos[pais.status]) {
        grupos[pais.status] = [];
      }
      grupos[pais.status].push(pais.nome_display);
    });
    return grupos;
  }, [paisesData]);

  // Estilo do GeoJSON
  const styleGeoJson = (feature) => {
    const countryName = feature?.properties?.name;
    const status = countryStatusMap.get(countryName);
    const statusInfo = statusColors[status];

    const fillColor = statusInfo ? statusInfo.color : '#D3D3D3';
    const fillOpacity = statusInfo ? 0.65 : 0.2;

    return {
      fillColor: fillColor,
      weight: 0.5,
      opacity: 1,
      color: '#333333',
      fillOpacity: fillOpacity
    };
  };

  // Tooltip no hover
  const onEachFeature = (feature, layer) => {
    if (feature?.properties?.name) {
      const countryName = feature.properties.name;
      const pais = paisesData.find(p => p.nome_geojson === countryName);
      const displayName = pais ? pais.nome_display : countryName;
      layer.bindTooltip(displayName, { sticky: false });
    }
  };

  // Marcadores
  const markers = useMemo(() => {
    return paisesData.map((pais, index) => (
      <Marker
        position={pais.coordinates}
        key={`${pais.nome_geojson}-marker-${index}`}
      >
        <Tooltip>
          {`${pais.nome_display} - ${statusColors[pais.status]?.description || pais.status}`}
        </Tooltip>
      </Marker>
    ));
  }, [paisesData, statusColors]);

  // Legenda compacta
  const CompactLegend = () => (
    <Card className="w-56 h-fit shadow-lg">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">Legenda</CardTitle>
          {canManage && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => setAddModalOpen(true)}
              className="h-7 px-2 text-xs relative z-50"
            >
              <Plus className="h-3 w-3 mr-1" />
              Adicionar
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-1.5 pt-0">
        {Object.entries(statusColors).map(([status, info]) => (
          <div key={status} className="flex items-center gap-2">
            <div
              className="w-3 h-3 border border-gray-300 flex-shrink-0 rounded-sm"
              style={{ backgroundColor: info.color }}
            />
            <span className="text-xs">{info.description}</span>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <div className="w-3 h-3 bg-muted border border-border flex-shrink-0 rounded-sm" />
          <span className="text-xs text-foreground">Outros Paises</span>
        </div>
      </CardContent>
    </Card>
  );

  // Listas de paises por status
  const CountryLists = () => (
    <>
      {Object.entries(paisesPorStatus).map(([status, paises]) => {
        const statusInfo = statusColors[status];
        return (
          <Card key={status} className="shadow-md">
            <CardHeader className="pb-2">
              <CardTitle
                className="text-sm flex items-center gap-2"
                style={{ color: statusInfo?.color || 'hsl(var(--foreground))' }}
              >
                <div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: statusInfo?.color || 'hsl(var(--muted-foreground))' }}
                />
                {statusInfo?.description || status} ({paises.length})
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              {paises.length > 0 ? (
                <ul className="space-y-0.5 text-xs text-foreground">
                  {paises.map((pais, index) => (
                    <li key={`${status}-${pais}-${index}`} className="flex items-center gap-2">
                      <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                      {pais}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-xs text-muted-foreground">Nenhum pais</p>
              )}
            </CardContent>
          </Card>
        );
      })}
    </>
  );

  if (loading) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background">
        <div className="flex items-center gap-3">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="text-lg text-muted-foreground">Carregando mapa...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="h-full w-full flex items-center justify-center bg-background p-8">
        <Alert variant="destructive" className="max-w-md">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-background p-4 flex flex-col overflow-hidden">
      {/* Titulo */}
      <h1 className="text-3xl font-bold text-center text-foreground mb-4">
        Overview Operação
      </h1>

      {/* Notificacao */}
      {notification && (
        <div className="absolute top-4 left-1/2 -translate-x-1/2 z-[10000]">
          <Alert variant={notification.type === 'error' ? 'destructive' : 'default'} className="shadow-lg">
            {notification.type === 'success' ? (
              <Check className="h-4 w-4" />
            ) : (
              <X className="h-4 w-4" />
            )}
            <AlertDescription>{notification.message}</AlertDescription>
          </Alert>
        </div>
      )}

      {/* Mapa + Legenda */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Mapa */}
        <Card className="flex-1 overflow-hidden isolate">
          <div className="h-full w-full relative z-0">
            <MapContainer
              center={[20, -30]}
              zoom={2.5}
              style={{ height: "100%", width: "100%" }}
              scrollWheelZoom={true}
              worldCopyJump={true}
              zoomControl={true}
            >
              <TileLayer
                attribution='&copy; OpenStreetMap'
                url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
              />
              {geoJsonData && (
                <GeoJSON
                  key={JSON.stringify(geoJsonData)}
                  data={geoJsonData}
                  style={styleGeoJson}
                  onEachFeature={onEachFeature}
                />
              )}
              {markers}
            </MapContainer>
          </div>
        </Card>

        {/* Legenda */}
        <div className="flex-shrink-0">
          <CompactLegend />
        </div>
      </div>

      {/* Listas de paises em grid */}
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-4 relative z-10">
        <CountryLists />
      </div>

      {/* Modal para adicionar pais */}
      {addModalOpen && (
        <>
          {/* Overlay manual */}
          <div
            className="fixed inset-0 bg-black/80 z-[9999]"
            onClick={() => setAddModalOpen(false)}
          />

          {/* Modal */}
          <div className="fixed left-[50%] top-[50%] z-[10000] grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg duration-200 rounded-lg">
            <div className="flex flex-col space-y-1.5 text-center sm:text-left">
              <h3 className="text-lg font-semibold leading-none tracking-tight text-foreground">
                Adicionar Pais
              </h3>
              <p className="text-sm text-muted-foreground">
                Selecione um pais e seu status para adicionar ao mapa
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="country-select" className="text-foreground">Pais</Label>
                <Select
                  value={selectedCountry ? JSON.stringify(selectedCountry) : ""}
                  onValueChange={(value) => setSelectedCountry(value ? JSON.parse(value) : null)}
                >
                  <SelectTrigger id="country-select" className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione um pais" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[10001]">
                    {availableCountries.map(c => (
                      <SelectItem key={c.nome_geojson} value={JSON.stringify(c)} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                        {c.nome_display}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status-select" className="text-foreground">Status</Label>
                <Select value={selectedStatus || ""} onValueChange={setSelectedStatus}>
                  <SelectTrigger id="status-select" className="bg-background border-border text-foreground">
                    <SelectValue placeholder="Selecione o status" className="text-muted-foreground" />
                  </SelectTrigger>
                  <SelectContent className="bg-background border-border z-[10001]">
                    {statusList.map(s => (
                      <SelectItem key={s.id} value={s.id.toString()} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                        {s.descricao}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
              <Button
                variant="outline"
                onClick={() => setAddModalOpen(false)}
                className="border-border text-foreground hover:bg-accent hover:text-accent-foreground"
              >
                Cancelar
              </Button>
              <Button
                onClick={handleAddCountry}
                disabled={!selectedCountry || !selectedStatus || addLoading}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Adicionar Pais
              </Button>
            </div>

            {/* Botao X para fechar */}
            <button
              onClick={() => setAddModalOpen(false)}
              className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
            >
              <X className="h-4 w-4" />
              <span className="sr-only">Fechar</span>
            </button>
          </div>
        </>
      )}
    </div>
  );
}

export default SlideMapa;
