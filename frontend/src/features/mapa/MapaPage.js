// frontend/src/features/mapa/MapaPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { Box, Grid, Title, Text, List, LoadingOverlay, Alert, Stack, Group, Button } from '@mantine/core';
import { IconAlertCircle, IconSettings } from '@tabler/icons-react';
import axios from 'axios';

// URL do GeoJSON - atualizada
const FULL_GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Correção do ícone do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});

function MapaPage() {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [paisesData, setPaisesData] = useState([]);
    const [statusColors, setStatusColors] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAdmin, setShowAdmin] = useState(false);

    // Buscar dados do mapa da API
    useEffect(() => {
        const fetchMapaData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Usar axios configurado globalmente em vez de fetch
                const response = await axios.get('/mapa-data/');
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

    // Mapa de países por status
    const countryStatusMap = useMemo(() => {
        const map = new Map();
        paisesData.forEach(pais => {
            map.set(pais.nome_geojson, pais.status);
        });
        return map;
    }, [paisesData]);

    // Países agrupados por status
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

    // Componente da Legenda
    const Legend = () => (
        <Stack gap="xs">
            <Group justify="space-between">
                <Title order={5}>Legenda</Title>
                <Button 
                    size="xs" 
                    variant="light"
                    leftSection={<IconSettings size={14} />}
                    onClick={() => setShowAdmin(!showAdmin)}
                >
                    Config
                </Button>
            </Group>
            {Object.entries(statusColors).map(([status, info]) => (
                <Group key={status} gap="xs" wrap="nowrap">
                    <Box 
                        w={16} 
                        h={16} 
                        bg={info.color} 
                        style={{ border: '1px solid #333' }}
                    />
                    <Text size="sm">{info.description}</Text>
                </Group>
            ))}
            <Group gap="xs" wrap="nowrap">
                <Box 
                    w={16} 
                    h={16} 
                    bg="#D3D3D3" 
                    style={{ border: '1px solid #333' }}
                />
                <Text size="sm">Outros Países</Text>
            </Group>
        </Stack>
    );

    // Listas de países
    const CountryLists = () => (
        <Stack gap="md" mt="xl">
            {Object.entries(paisesPorStatus).map(([status, paises]) => {
                const statusInfo = statusColors[status];
                return (
                    <Box key={status}>
                        <Title 
                            order={5} 
                            style={{ color: statusInfo?.color || '#000' }}
                        >
                            {statusInfo?.description || status}
                        </Title>
                        <List size="sm" mt="xs" pl={5}>
                            {paises.length > 0 ? (
                                paises.map((pais, index) => (
                                    <List.Item key={`${status}-${pais}-${index}`}>
                                        {pais}
                                    </List.Item>
                                ))
                            ) : (
                                <Text size="sm" c="dimmed">Nenhum</Text>
                            )}
                        </List>
                    </Box>
                );
            })}
        </Stack>
    );

    return (
        <Box p="md">
            <Title order={2} mb="md">🗺️ Mapa de Atuação</Title>
            <Text mb="xl">
                Visualize os países onde o Grupo Chegou opera, operou ou está expandindo.
            </Text>

            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {error && !loading && (
                <Alert 
                    icon={<IconAlertCircle size="1rem" />} 
                    title="Erro ao Carregar Mapa" 
                    color="red" 
                    radius="md" 
                    mb="md"
                >
                    {error}
                </Alert>
            )}

            {!loading && !error && geoJsonData && (
                <Grid>
                    <Grid.Col span={{ base: 12, md: 9 }}>
                        <Box style={{ 
                            height: '650px', 
                            width: '100%', 
                            border: '1px solid #ccc', 
                            borderRadius: 'var(--mantine-radius-md)', 
                            overflow: 'hidden' 
                        }}>
                            <MapContainer
                                center={[20, -30]}
                                zoom={2.5}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={true}
                                worldCopyJump={true}
                            >
                                <TileLayer
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
                                />
                                <GeoJSON
                                    key={JSON.stringify(geoJsonData)}
                                    data={geoJsonData}
                                    style={styleGeoJson}
                                    onEachFeature={onEachFeature}
                                />
                                {markers}
                            </MapContainer>
                        </Box>
                    </Grid.Col>

                    <Grid.Col span={{ base: 12, md: 3 }}>
                        <Stack gap="lg">
                            <Legend />
                            <CountryLists />
                        </Stack>
                    </Grid.Col>
                </Grid>
            )}

            {showAdmin && (
                <Box mt="xl" p="md" style={{ border: '1px solid #ddd', borderRadius: '8px' }}>
                    <Title order={4} mb="md">⚙️ Administração</Title>
                    <Text size="sm" c="dimmed">
                        Para adicionar/editar países, acesse: 
                        <Text 
                            component="a" 
                            href="/admin/mapa/" 
                            target="_blank" 
                            c="blue" 
                            style={{ textDecoration: 'underline', marginLeft: '4px' }}
                        >
                            Painel Admin
                        </Text>
                    </Text>
                </Box>
            )}
        </Box>
    );
}

export default MapaPage;