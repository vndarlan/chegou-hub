// frontend/src/features/mapa/MapaPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
    Box, Grid, Title, Text, List, LoadingOverlay, Alert, Stack, Group, Button,
    Modal, Select, Notification, ActionIcon, Badge, Paper, Tabs
} from '@mantine/core';
import { IconAlertCircle, IconSettings, IconPlus, IconCheck, IconX } from '@tabler/icons-react';
import axios from 'axios';

// URL do GeoJSON - atualizada
const FULL_GEOJSON_URL = "https://raw.githubusercontent.com/holtzy/D3-graph-gallery/master/DATA/world.geojson";

// Coordenadas dos países do mundo
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
    const [statusList, setStatusList] = useState([]);
    const [availableCountries, setAvailableCountries] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [showAdmin, setShowAdmin] = useState(false);
    const [canManage, setCanManage] = useState(false);
    
    // Estados para adição de país
    const [addModalOpen, setAddModalOpen] = useState(false);
    const [selectedCountry, setSelectedCountry] = useState(null);
    const [selectedStatus, setSelectedStatus] = useState(null);
    const [addLoading, setAddLoading] = useState(false);
    const [notification, setNotification] = useState(null);

    // Verificar permissões
    useEffect(() => {
        const checkPermissions = async () => {
            try {
                const response = await axios.get('/check-permissions/');
                setCanManage(response.data.can_manage);
            } catch (err) {
                console.log("Erro ao verificar permissões:", err);
                setCanManage(false);
            }
        };
        checkPermissions();
    }, []);

    // Buscar dados do mapa da API
    useEffect(() => {
        const fetchMapaData = async () => {
            try {
                setLoading(true);
                setError(null);
                
                // Buscar dados dos países
                const response = await axios.get('/mapa-data/');
                const data = response.data;
                
                setPaisesData(data.paises);
                setStatusColors(data.status_colors);
                
                // Buscar lista de status
                if (canManage) {
                    const statusResponse = await axios.get('/status/');
                    setStatusList(statusResponse.data);
                    
                    // Buscar países disponíveis
                    const countriesResponse = await axios.get('/available-countries/');
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

    // Adicionar país
    const handleAddCountry = async () => {
        if (!selectedCountry || !selectedStatus) {
            setNotification({ type: 'error', message: 'Selecione país e status.' });
            return;
        }

        setAddLoading(true);
        try {
            // Garantir que temos um token CSRF válido
            await axios.get('/current-state/');
            
            const coordinates = COUNTRY_COORDINATES[selectedCountry.nome_geojson] || [0, 0];
            
            await axios.post('/add-pais/', {
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
            console.error("Erro ao adicionar país:", err);
            setNotification({ 
                type: 'error', 
                message: err.response?.data?.detail || 'Erro ao adicionar país.' 
            });
        } finally {
            setAddLoading(false);
        }
    };

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
                <Group gap="xs">
                    {canManage && (
                        <Button 
                            size="xs" 
                            variant="light"
                            leftSection={<IconPlus size={14} />}
                            onClick={() => setAddModalOpen(true)}
                        >
                            Adicionar
                        </Button>
                    )}
                    <Button 
                        size="xs" 
                        variant="light"
                        leftSection={<IconSettings size={14} />}
                        onClick={() => setShowAdmin(!showAdmin)}
                    >
                        Config
                    </Button>
                </Group>
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
                            {statusInfo?.description || status} ({paises.length})
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
            <Group justify="space-between" mb="md">
                <Box>
                    <Title order={2} mb="xs">🗺️ Mapa de Atuação</Title>
                    <Text>
                        Visualize os países onde o Grupo Chegou atua ou já atuou.
                    </Text>
                </Box>
                {canManage && (
                    <Badge color="blue" variant="light">
                        Pode gerenciar
                    </Badge>
                )}
            </Group>

            {notification && (
                <Notification
                    icon={notification.type === 'success' ? <IconCheck size="1.1rem" /> : <IconX size="1.1rem" />}
                    color={notification.type === 'success' ? 'teal' : 'red'}
                    title={notification.type === 'success' ? 'Sucesso!' : 'Erro!'}
                    onClose={() => setNotification(null)}
                    mb="md"
                >
                    {notification.message}
                </Notification>
            )}

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
                        Para configurações avançadas, acesse: 
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

            {/* Modal para adicionar país */}
            <Modal 
                opened={addModalOpen} 
                onClose={() => setAddModalOpen(false)}
                title="Adicionar País"
                size="md"
                zIndex={2000}
            >
                <Stack gap="md">
                    <Select
                        label="País"
                        placeholder="Selecione um país"
                        data={availableCountries.map(c => ({ 
                            value: JSON.stringify(c), 
                            label: c.nome_display 
                        }))}
                        value={selectedCountry ? JSON.stringify(selectedCountry) : null}
                        onChange={(value) => setSelectedCountry(value ? JSON.parse(value) : null)}
                        searchable
                        required
                        comboboxProps={{ zIndex: 2001 }}
                    />
                    
                    <Select
                        label="Status"
                        placeholder="Selecione o status"
                        data={statusList.map(s => ({ 
                            value: s.id.toString(), 
                            label: s.descricao 
                        }))}
                        value={selectedStatus}
                        onChange={setSelectedStatus}
                        required
                        comboboxProps={{ zIndex: 2001 }}
                    />
                    
                    <Group justify="flex-end" mt="md">
                        <Button variant="outline" onClick={() => setAddModalOpen(false)}>
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleAddCountry} 
                            loading={addLoading}
                            disabled={!selectedCountry || !selectedStatus}
                        >
                            Adicionar País
                        </Button>
                    </Group>
                </Stack>
            </Modal>
        </Box>
    );
}

export default MapaPage;