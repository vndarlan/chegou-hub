// frontend/src/features/mapa/MapaPage.js
import React, { useState, useEffect } from 'react';
import { Container, Title, Paper, Box, Stack, Select, Text } from '@mantine/core';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { IconMap } from '@tabler/icons-react';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix para ícones do Leaflet
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
    iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
    iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

const locations = [
    { 
        id: 1, 
        name: 'São Paulo - Matriz', 
        lat: -23.5505, 
        lng: -46.6333,
        city: 'São Paulo',
        type: 'Escritório Principal'
    },
    { 
        id: 2, 
        name: 'Rio de Janeiro - Filial', 
        lat: -22.9068, 
        lng: -43.1729,
        city: 'Rio de Janeiro',
        type: 'Filial'
    },
    { 
        id: 3, 
        name: 'Belo Horizonte - Filial', 
        lat: -19.9208, 
        lng: -43.9378,
        city: 'Belo Horizonte',
        type: 'Filial'
    }
];

function MapaPage() {
    const [selectedCity, setSelectedCity] = useState('all');
    const [filteredLocations, setFilteredLocations] = useState(locations);

    useEffect(() => {
        if (selectedCity === 'all') {
            setFilteredLocations(locations);
        } else {
            setFilteredLocations(locations.filter(loc => loc.city === selectedCity));
        }
    }, [selectedCity]);

    const cityOptions = [
        { value: 'all', label: 'Todas as Cidades' },
        { value: 'São Paulo', label: 'São Paulo' },
        { value: 'Rio de Janeiro', label: 'Rio de Janeiro' },
        { value: 'Belo Horizonte', label: 'Belo Horizonte' }
    ];

    return (
        <Container size="xl" py="xl">
            <Stack gap="lg">
                <Title order={2}>
                    <IconMap style={{ marginRight: 8 }} />
                    Mapa - Localizações
                </Title>

                <Paper withBorder p="md">
                    <Stack gap="md">
                        <Select
                            label="Filtrar por Cidade"
                            data={cityOptions}
                            value={selectedCity}
                            onChange={setSelectedCity}
                            style={{ maxWidth: 300 }}
                        />

                        <Box style={{ height: '500px', borderRadius: '8px', overflow: 'hidden' }}>
                            <MapContainer
                                center={[-23.5505, -46.6333]}
                                zoom={6}
                                style={{ height: '100%', width: '100%' }}
                            >
                                <TileLayer
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                />
                                
                                {filteredLocations.map((location) => (
                                    <Marker key={location.id} position={[location.lat, location.lng]}>
                                        <Popup>
                                            <div>
                                                <Text fw={500}>{location.name}</Text>
                                                <Text size="sm" c="dimmed">{location.type}</Text>
                                                <Text size="sm">{location.city}</Text>
                                            </div>
                                        </Popup>
                                    </Marker>
                                ))}
                            </MapContainer>
                        </Box>
                    </Stack>
                </Paper>
            </Stack>
        </Container>
    );
}

export default MapaPage;