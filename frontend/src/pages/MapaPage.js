// src/pages/MapaPage.js
import React, { useState, useEffect, useMemo } from 'react'; // Adicionado useMemo
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css'; // Estilos essenciais do Leaflet
import L from 'leaflet'; // Importa a biblioteca Leaflet para ícones customizados

// Importar componentes do Mantine para layout e texto
import { Box, Grid, Title, Text, List, LoadingOverlay, Alert, Stack, Group } from '@mantine/core';
import { IconAlertCircle } from '@tabler/icons-react';

// --- Configuration (Adaptado do Python) ---
const COUNTRY_DATA = {
    active: ["Chile", "Mexico", "Colombia"],
    past: ["Brazil", "Panama", "Ecuador"],      // Will be RED
    expanding: ["Italy", "Spain"]              // Will be ORANGE
};

// Mapping for name variations (Original in COUNTRY_DATA -> English for GeoJSON matching)
const NAME_MAP = {
    "México": "Mexico", "Colombia": "Colombia", "Chile": "Chile",
    "Brasil": "Brazil", "Panamá": "Panama", "Equador": "Ecuador",
    "Itália": "Italy", "Espanha": "Spain"
};
// Reverse map for display names
const NAME_MAP_REVERSE = Object.fromEntries(Object.entries(NAME_MAP).map(([k, v]) => [v, k]));

// Approximate coordinates for marker placement [latitude, longitude]
const COUNTRY_COORDINATES = {
    "Chile": [-31.7, -71.0], "Mexico": [23.6, -102.5], "Colombia": [4.6, -74.0],
    "Brazil": [-14.2, -51.9], "Panama": [8.5, -80.7], "Ecuador": [-1.8, -78.1],
    "Italy": [41.9, 12.5], "Spain": [40.4, -3.7],
};

// Define colors for each status (Hex codes for map fill and legend)
const STATUS_COLORS_HEX = {
    "active": "#4CAF50",    // Green
    "past": "#FF0000",      // Red
    "expanding": "#FFA500", // Orange
    "default": "#D3D3D3",   // Light Gray
    "border": "#333333"     // Cor da borda dos países
};

// Status descriptions for tooltips
const STATUS_DESCRIPTIONS = {
    "active": "Atuando Atualmente",
    "past": "Já Atuamos (Não Ativo)",
    "expanding": "Em Expansão / Validação"
};

// --- URL do GeoJSON servido pelo Backend ---
// Usando a URL completa para evitar problemas com baseURL do Axios
const FULL_GEOJSON_URL = "https://chegou-hubb-production.up.railway.app/static/data/world-countries.json";

// --- Configuração do Ícone Padrão do Leaflet (Correção para Webpack) ---
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.7.1/dist/images/marker-shadow.png',
});
// --- Fim da Correção de Ícone ---


function MapaPage() {
    const [geoJsonData, setGeoJsonData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    // Mapa normalizado -> status (usando useMemo para evitar recálculo desnecessário)
    const countryStatusMap = useMemo(() => {
        const map = new Map();
        for (const status in COUNTRY_DATA) {
            COUNTRY_DATA[status].forEach(countryOrig => {
                const normalizedName = NAME_MAP[countryOrig] || countryOrig;
                map.set(normalizedName, status);
            });
        }
        return map;
    }, []); // Recalcula apenas se COUNTRY_DATA ou NAME_MAP mudarem (o que não acontece aqui)

    // --- Efeito para buscar os dados GeoJSON ---
    useEffect(() => {
        setLoading(true);
        setError(null);
        console.log(`Tentando buscar GeoJSON de: ${FULL_GEOJSON_URL}`);

        // ***** MUDANÇA PRINCIPAL: Usando fetch em vez de axios *****
        // fetch não envia credenciais por padrão, evitando o erro CORS específico
        fetch(FULL_GEOJSON_URL)
            .then(response => {
                console.log(`Resposta recebida: Status ${response.status}`);
                // Verifica se a resposta da rede foi ok (status 200-299)
                if (!response.ok) {
                    // Se a resposta não foi ok, lança um erro que será pego pelo .catch()
                    throw new Error(`Erro HTTP! Status: ${response.status}, ao buscar ${FULL_GEOJSON_URL}`);
                }
                // Se a resposta foi ok, tenta converter o corpo para JSON
                return response.json();
            })
            .then(data => {
                // Se a conversão para JSON foi bem-sucedida
                console.log("GeoJSON recebido e parseado com sucesso.");
                setGeoJsonData(data); // Atualiza o estado com os dados
                setLoading(false);    // Marca o carregamento como concluído
            })
            .catch(err => {
                // Se ocorreu qualquer erro na rede ou na conversão para JSON
                console.error("Erro ao buscar GeoJSON:", err);
                setError(`Não foi possível carregar os dados do mapa. ${err.message}`); // Define a mensagem de erro
                setLoading(false); // Marca o carregamento como concluído (mesmo com erro)
            });

    }, []); // O array vazio [] garante que isso rode apenas uma vez ao montar

    // Função para definir o estilo de cada país no GeoJSON
    const styleGeoJson = (feature) => {
        const countryName = feature?.properties?.name;
        const status = countryStatusMap.get(countryName);
        const fillColor = status ? STATUS_COLORS_HEX[status] : STATUS_COLORS_HEX.default;
        const fillOpacity = status ? 0.65 : 0.2;

        return {
            fillColor: fillColor,
            weight: 0.5,
            opacity: 1,
            color: STATUS_COLORS_HEX.border, // Cor da borda
            fillOpacity: fillOpacity
        };
    };

    // Função para adicionar tooltips a cada país
    const onEachFeature = (feature, layer) => {
        if (feature?.properties?.name) {
            const countryName = feature.properties.name;
            // Tenta obter o nome original (ex: com acento) para exibição
            const displayName = NAME_MAP_REVERSE[countryName] || countryName;
            layer.bindTooltip(displayName, { sticky: false }); // Tooltip simples com nome
        }
    };

    // Cria os marcadores (usando useMemo para otimizar, recalcula só se as dependências mudarem)
    const markers = useMemo(() => {
        const markerList = [];
        for (const status in COUNTRY_DATA) {
            const statusDesc = STATUS_DESCRIPTIONS[status] || status;
            COUNTRY_DATA[status].forEach(countryOrig => {
                const normalizedName = NAME_MAP[countryOrig] || countryOrig;
                if (COUNTRY_COORDINATES[normalizedName]) {
                    const coords = COUNTRY_COORDINATES[normalizedName];
                    const displayName = NAME_MAP_REVERSE[normalizedName] || normalizedName;
                    markerList.push(
                        <Marker position={coords} key={`${normalizedName}-marker`}>
                            <Tooltip>
                                {`${displayName} - ${statusDesc}`}
                            </Tooltip>
                        </Marker>
                    );
                } else {
                    console.warn(`Coordenadas não encontradas para ${countryOrig}`);
                }
            });
        }
        return markerList;
    }, []); // Recalcula apenas se COUNTRY_DATA, NAME_MAP, etc. mudarem (o que não acontece)


    // Renderização da Legenda (Componente separado para clareza)
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
            <Group key="marker" gap="xs" wrap="nowrap" mt="xs">
                {/* Use a URL do ícone padrão que corrigimos anteriormente */}
                <img src={L.Icon.Default.prototype.options.iconUrl} alt="Ícone de Marcador" style={{height: '20px'}} />
                 <Text size="sm">Ícone de Presença</Text>
            </Group>
        </Stack>
    );

    // Renderização das Listas (Componente separado)
    const CountryLists = () => (
         <Grid mt="xl">
            {Object.entries(STATUS_DESCRIPTIONS).map(([status, description]) => (
                <Grid.Col span={{ base: 12, sm: 4 }} key={status}>
                    <Title order={5} style={{ color: STATUS_COLORS_HEX[status] }}>
                        {description.split('(')[0].trim()} {/* Pega só a parte principal do título */}
                    </Title>
                    <List size="sm" mt="xs">
                        {COUNTRY_DATA[status]?.length > 0 ? (
                             COUNTRY_DATA[status].map(country => (
                                <List.Item key={`${status}-${country}`}>{country}</List.Item>
                             ))
                        ) : (
                            <Text size="sm" c="dimmed">Nenhum</Text>
                        )}
                    </List>
                </Grid.Col>
            ))}
        </Grid>
    );


    return (
        <Box p="md">
            <Title order={2} mb="md">🗺️ Mapa de Atuação</Title>
            <Text mb="xl">Visualize os países onde o Grupo Chegou opera, operou ou está expandindo.</Text>

            {/* Indicador de Carregamento */}
            <LoadingOverlay visible={loading} overlayProps={{ radius: "sm", blur: 2 }} />

            {/* Mensagem de Erro */}
            {error && !loading && ( // Mostra erro apenas se não estiver carregando mais
                <Alert icon={<IconAlertCircle size="1rem" />} title="Erro ao Carregar Mapa" color="red" radius="md" mb="md">
                    {error}
                </Alert>
            )}

            {/* Conteúdo Principal (Mapa e Legenda) */}
            {/* Renderiza apenas se não estiver carregando, não houver erro E os dados existirem */}
            {!loading && !error && geoJsonData && (
                <>
                    <Grid>
                        <Grid.Col span={{ base: 12, md: 9 }}> {/* Coluna do Mapa */}
                             {/* Container do Mapa precisa ter altura definida */}
                            <Box style={{ height: '650px', width: '100%', border: '1px solid #ccc', borderRadius: 'var(--mantine-radius-md)', overflow: 'hidden' /* Evita problemas de borda */ }}>
                                <MapContainer
                                    center={[20, -30]} // Centro inicial
                                    zoom={2.5} // Zoom inicial
                                    style={{ height: "100%", width: "100%" }}
                                    scrollWheelZoom={true} // Habilita zoom com scroll
                                    worldCopyJump={true} // Evita cópias do mundo ao arrastar muito
                                >
                                    <TileLayer
                                        attribution='© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors © <a href="https://carto.com/attributions">CARTO</a>'
                                        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png" // Tile CartoDB Positron
                                    />
                                    {/* A chave aqui força o react-leaflet a recriar a camada se os dados mudarem */}
                                    <GeoJSON
                                        key={JSON.stringify(geoJsonData)}
                                        data={geoJsonData}
                                        style={styleGeoJson}
                                        onEachFeature={onEachFeature}
                                    />
                                    {/* Renderiza os marcadores criados */}
                                    {markers}
                                </MapContainer>
                            </Box>
                        </Grid.Col>
                        <Grid.Col span={{ base: 12, md: 3 }}> {/* Coluna da Legenda */}
                            <Legend />
                        </Grid.Col>
                    </Grid>

                    {/* Listas de Países Abaixo */}
                    <CountryLists />
                </>
            )}
        </Box>
    );
}

export default MapaPage;