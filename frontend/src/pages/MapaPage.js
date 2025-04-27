// src/pages/MapaPage.js
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Importar componentes do Mantine
import { Box, Grid, Title, Text, List, LoadingOverlay, Alert, Stack, Group } from '@mantine/core'; // Stack já estava aqui
import { IconAlertCircle } from '@tabler/icons-react';

// --- Dados Atualizados ---
const COUNTRY_DATA = {
    active: ["Chile", "Mexico", "Colombia", "Polônia", "Itália", "Romênia", "Espanha"], // <- ATUALIZADO
    past: ["Brazil", "Panama", "Ecuador", "Portugal", "Grécia"],      // <- ATUALIZADO
    expanding: ["Inglaterra"]                                         // <- ATUALIZADO
};

// Mapping para nomes GeoJSON (Inglês) e adicionando novos
const NAME_MAP = {
    "México": "Mexico", "Colombia": "Colombia", "Chile": "Chile",
    "Brasil": "Brazil", "Panamá": "Panama", "Equador": "Ecuador",
    "Itália": "Italy", "Espanha": "Spain",
    "Polônia": "Poland", // <- NOVO
    "Romênia": "Romania", // <- NOVO
    "Portugal": "Portugal", // <- NOVO
    "Grécia": "Greece", // <- NOVO
    "Inglaterra": "United Kingdom" // <- NOVO (Mapeado para UK no GeoJSON)
};
// Mapa reverso para exibição
const NAME_MAP_REVERSE = Object.fromEntries(Object.entries(NAME_MAP).map(([k, v]) => [v, k]));

// Coordenadas aproximadas, incluindo novos países
const COUNTRY_COORDINATES = {
    "Chile": [-31.7, -71.0], "Mexico": [23.6, -102.5], "Colombia": [4.6, -74.0],
    "Brazil": [-14.2, -51.9], "Panama": [8.5, -80.7], "Ecuador": [-1.8, -78.1],
    "Italy": [41.9, 12.5], "Spain": [40.4, -3.7],
    "Poland": [51.9, 19.1], // <- NOVO
    "Romania": [45.9, 24.9], // <- NOVO
    "Portugal": [39.4, -8.2], // <- NOVO
    "Greece": [39.1, 21.8], // <- NOVO
    "United Kingdom": [55.3, -3.4], // <- NOVO (Coordenada UK)
};

// Cores dos Status (sem alteração)
const STATUS_COLORS_HEX = {
    "active": "#4CAF50",    // Green
    "past": "#FF0000",      // Red
    "expanding": "#FFA500", // Orange
    "default": "#D3D3D3",   // Light Gray
    "border": "#333333"     // Cor da borda
};

// Descrições dos Status (sem alteração)
const STATUS_DESCRIPTIONS = {
    "active": "Atuando Atualmente",
    "past": "Já Atuamos (Não Ativo)",
    "expanding": "Em Expansão / Validação"
};

// URL do GeoJSON (sem alteração)
const FULL_GEOJSON_URL = "https://chegou-hubb-production.up.railway.app/static/data/world-countries.json";

// Correção do Ícone Padrão (sem alteração)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});


function MapaPage() {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mapa normalizado -> status (sem alteração)
    const countryStatusMap = useMemo(() => {
        const map = new Map();
        for (const status in COUNTRY_DATA) {
            COUNTRY_DATA[status].forEach(countryOrig => {
                const normalizedName = NAME_MAP[countryOrig] || countryOrig;
                map.set(normalizedName, status);
            });
        }
        return map;
    }, []); // Dependências não mudam dinamicamente aqui

    // Efeito para buscar os dados GeoJSON (sem alteração na lógica fetch)
    useEffect(() => {
        setLoading(true);
        setError(null);
        console.log(`Tentando buscar GeoJSON de: ${FULL_GEOJSON_URL}`);
        fetch(FULL_GEOJSON_URL)
            .then(response => {
                console.log(`Resposta recebida: Status ${response.status}`);
                if (!response.ok) {
                    throw new Error(`Erro HTTP! Status: ${response.status}, ao buscar ${FULL_GEOJSON_URL}`);
                }
                return response.json();
            })
            .then(data => {
                console.log("GeoJSON recebido e parseado com sucesso.");
                setGeoJsonData(data);
                setLoading(false);
            })
            .catch(err => {
                console.error("Erro ao buscar GeoJSON:", err);
                setError(`Não foi possível carregar os dados do mapa. ${err.message}`);
                setLoading(false);
            });
    }, []);

    // Função styleGeoJson (sem alteração)
    const styleGeoJson = (feature) => {
        const countryName = feature?.properties?.name;
        const status = countryStatusMap.get(countryName);
        const fillColor = status ? STATUS_COLORS_HEX[status] : STATUS_COLORS_HEX.default;
        const fillOpacity = status ? 0.65 : 0.2;

        return {
            fillColor: fillColor,
            weight: 0.5,
            opacity: 1,
            color: STATUS_COLORS_HEX.border,
            fillOpacity: fillOpacity
        };
    };

    // Função onEachFeature (sem alteração)
    const onEachFeature = (feature, layer) => {
        if (feature?.properties?.name) {
            const countryName = feature.properties.name;
            const displayName = NAME_MAP_REVERSE[countryName] || countryName;
            layer.bindTooltip(displayName, { sticky: false });
        }
    };

    // Cria os marcadores (sem alteração na lógica, mas usará novos dados)
    const markers = useMemo(() => {
        const markerList = [];
        for (const status in COUNTRY_DATA) {
            const statusDesc = STATUS_DESCRIPTIONS[status] || status;
            COUNTRY_DATA[status].forEach(countryOrig => {
                // Use o nome original para buscar no NAME_MAP, depois nas coordenadas
                const normalizedName = NAME_MAP[countryOrig] || countryOrig;
                if (COUNTRY_COORDINATES[normalizedName]) {
                    const coords = COUNTRY_COORDINATES[normalizedName];
                    // Use o nome original para exibição no tooltip
                    const displayName = countryOrig; // Exibe "Polônia", "Inglaterra", etc.
                    markerList.push(
                        <Marker position={coords} key={`${normalizedName}-marker`}>
                            <Tooltip>
                                {`${displayName} - ${statusDesc}`}
                            </Tooltip>
                        </Marker>
                    );
                } else {
                    console.warn(`Coordenadas não encontradas para ${countryOrig} (Normalizado: ${normalizedName})`);
                }
            });
        }
        return markerList;
    }, []); // Dependências não mudam


    // --- Componentes Internos para Layout ---

    const Legend = () => (
        <Stack gap="xs">
            <Title order={5} mb="xs">Legenda</Title>
            {Object.entries(STATUS_DESCRIPTIONS).map(([status, description]) => (
                 <Group key={status} gap="xs" wrap="nowrap">
                    <Box w={16} h={16} bg={STATUS_COLORS_HEX[status]} style={{ border: `1px solid ${STATUS_COLORS_HEX.border}` }}/>
                    <Text size="sm">{description}</Text>
                </Group>
            ))}
             <Group key="default" gap="xs" wrap="nowrap">
                 <Box w={16} h={16} bg={STATUS_COLORS_HEX.default} style={{ border: `1px solid ${STATUS_COLORS_HEX.border}` }}/>
                 <Text size="sm">Outros Países</Text>
            </Group>
            {/* ÍCONE DO MARCADOR REMOVIDO DAQUI */}
        </Stack>
    );

    // Renderização das Listas (sem alteração interna)
    const CountryLists = () => (
         // Removido Grid e mt="xl" daqui, pois será posicionado dentro do Stack
         // Usaremos Stack para espaçamento vertical entre as listas
        <Stack gap="md" mt="xl"> {/* Adicionado espaçamento superior */}
            {Object.entries(STATUS_DESCRIPTIONS).map(([status, description]) => (
                <Box key={status}>
                    <Title order={5} style={{ color: STATUS_COLORS_HEX[status] }}>
                        {description.split('(')[0].trim()}
                    </Title>
                    <List size="sm" mt="xs" pl={5}> {/* Adicionado padding leve */}
                        {COUNTRY_DATA[status]?.length > 0 ? (
                             COUNTRY_DATA[status].map(country => (
                                <List.Item key={`${status}-${country}`}>{country}</List.Item>
                             ))
                        ) : (
                            <Text size="sm" c="dimmed">Nenhum</Text>
                        )}
                    </List>
                </Box>
            ))}
        </Stack>
    );


    // --- Renderização Principal do Componente ---
    return (
        <Box p="md">
            <Title order={2} mb="md">🗺️ Mapa de Atuação</Title>
            <Text mb="xl">Visualize os países onde o Grupo Chegou opera, operou ou está expandindo.</Text>

            {/* Indicador de Carregamento */}
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Mensagem de Erro */}
            {error && !loading && (
                <Alert icon={<IconAlertCircle size="1rem" />} title="Erro ao Carregar Mapa" color="red" radius="md" mb="md">
                    {error}
                </Alert>
            )}

            {/* Conteúdo Principal (Mapa e Barra Lateral) */}
            {!loading && !error && geoJsonData && (
                <Grid> {/* Mantém o Grid principal */}
                    {/* Coluna do Mapa */}
                    <Grid.Col span={{ base: 12, md: 9 }}>
                        <Box style={{ height: '650px', width: '100%', border: '1px solid #ccc', borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' }}>
                            <MapContainer
                                center={[20, -30]}
                                zoom={2.5}
                                style={{ height: "100%", width: "100%" }}
                                scrollWheelZoom={true}
                                worldCopyJump={true}
                            >
                                <TileLayer
                                    attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
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

                    {/* Coluna da Barra Lateral (Legenda + Listas) */}
                    <Grid.Col span={{ base: 12, md: 3 }}>
                        {/* *** MUDANÇA DE LAYOUT *** */}
                        {/* Usando Stack para organizar Legenda e Listas verticalmente */}
                        <Stack gap="lg"> {/* Adicionado gap entre legenda e listas */}
                            <Legend />
                            <CountryLists /> {/* Listas agora estão aqui */}
                        </Stack>
                    </Grid.Col>
                </Grid>
            )}

            {/* A chamada <CountryLists /> foi removida daqui de baixo */}
        </Box>
    );
}

export default MapaPage;