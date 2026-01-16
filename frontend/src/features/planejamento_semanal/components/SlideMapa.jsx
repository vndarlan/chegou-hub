// frontend/src/features/planejamento_semanal/components/SlideMapa.jsx
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Loader2, AlertCircle } from 'lucide-react';
import apiClient from '../../../utils/axios';

import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Alert, AlertDescription } from '../../../components/ui/alert';

// URL do GeoJSON
const FULL_GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

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
  }, []);

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
        <CardTitle className="text-sm">Legenda</CardTitle>
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
    <div className="h-full w-full bg-background p-4 flex flex-col">
      {/* Mapa + Legenda */}
      <div className="flex gap-4 flex-1 min-h-0">
        {/* Mapa */}
        <Card className="flex-1 overflow-hidden">
          <div className="h-full w-full relative z-10">
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
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4 mt-4">
        <CountryLists />
      </div>
    </div>
  );
}

export default SlideMapa;
