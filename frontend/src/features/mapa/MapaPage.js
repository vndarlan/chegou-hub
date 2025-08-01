// frontend/src/features/mapa/MapaPage.js - MIGRATED TO SHADCN/UI
import React, { useState, useEffect, useMemo } from 'react';
import { MapContainer, TileLayer, GeoJSON, Marker, Tooltip } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';
import { 
    AlertCircle, Settings, Plus, Check, X, Loader2
} from 'lucide-react';
import axios from 'axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Badge } from '../../components/ui/badge';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../components/ui/select';
import { Label } from '../../components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogOverlay } from '../../components/ui/dialog';

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
        <Card>
            <CardHeader>
                <div className="flex items-center justify-between">
                    <CardTitle className="text-lg">Legenda</CardTitle>
                    {canManage && (
                        <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => setAddModalOpen(true)}
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Adicionar
                        </Button>
                    )}
                </div>
            </CardHeader>
            <CardContent className="space-y-3">
                {Object.entries(statusColors).map(([status, info]) => (
                    <div key={status} className="flex items-center gap-3">
                        <div 
                            className="w-4 h-4 border border-gray-300 flex-shrink-0"
                            style={{ backgroundColor: info.color }}
                        />
                        <span className="text-sm">{info.description}</span>
                    </div>
                ))}
                <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-muted border border-border flex-shrink-0" />
                    <span className="text-sm text-foreground">Outros Países</span>
                </div>
            </CardContent>
        </Card>
    );

    // Listas de países
    const CountryLists = () => (
        <div className="space-y-6">
            {Object.entries(paisesPorStatus).map(([status, paises]) => {
                const statusInfo = statusColors[status];
                return (
                    <Card key={status}>
                        <CardHeader className="pb-3">
                            <CardTitle 
                                className="text-base flex items-center gap-2 text-foreground"
                                style={{ color: statusInfo?.color || 'hsl(var(--foreground))' }}
                            >
                                <div 
                                    className="w-3 h-3 rounded-full"
                                    style={{ backgroundColor: statusInfo?.color || 'hsl(var(--muted-foreground))' }}
                                />
                                {statusInfo?.description || status} ({paises.length})
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="pt-0">
                            {paises.length > 0 ? (
                                <ul className="space-y-1 text-sm text-foreground">
                                    {paises.map((pais, index) => (
                                        <li key={`${status}-${pais}-${index}`} className="flex items-center gap-2">
                                            <div className="w-1 h-1 bg-muted-foreground rounded-full" />
                                            {pais}
                                        </li>
                                    ))}
                                </ul>
                            ) : (
                                <p className="text-sm text-muted-foreground">Nenhum país</p>
                            )}
                        </CardContent>
                    </Card>
                );
            })}
        </div>
    );

    return (
        <div className="flex-1 space-y-6 p-4 md:p-8 pt-6">

            {notification && (
                <Alert variant={notification.type === 'error' ? 'destructive' : 'default'}>
                    {notification.type === 'success' ? (
                        <Check className="h-4 w-4" />
                    ) : (
                        <X className="h-4 w-4" />
                    )}
                    <AlertDescription>{notification.message}</AlertDescription>
                </Alert>
            )}

            {loading && (
                <div className="flex h-32 items-center justify-center">
                    <div className="flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm text-muted-foreground">Carregando mapa...</span>
                    </div>
                </div>
            )}

            {error && !loading && (
                <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                </Alert>
            )}

            {!loading && !error && geoJsonData && (
                <div className="space-y-6">
                    <Card className="overflow-hidden">
                        <div className="h-[650px] w-full">
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
                        </div>
                    </Card>

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        <Legend />
                        <CountryLists />
                    </div>
                </div>
            )}

            {showAdmin && (
                <Card className="border-dashed">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Settings className="h-5 w-5" />
                            ⚙️ Administração
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <p className="text-sm text-muted-foreground">
                            Para configurações avançadas, acesse: 
                            <a 
                                href="/admin/mapa/" 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-primary underline ml-1"
                            >
                                Painel Admin
                            </a>
                        </p>
                    </CardContent>
                </Card>
            )}

            {/* Modal para adicionar país */}
            <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-background border-border" style={{ zIndex: 10000 }}>
                    <DialogHeader>
                        <DialogTitle className="text-foreground">Adicionar País</DialogTitle>
                        <DialogDescription className="text-muted-foreground">
                            Selecione um país e seu status para adicionar ao mapa
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="country-select" className="text-foreground">País</Label>
                            <Select 
                                value={selectedCountry ? JSON.stringify(selectedCountry) : ""} 
                                onValueChange={(value) => setSelectedCountry(value ? JSON.parse(value) : null)}
                            >
                                <SelectTrigger id="country-select" className="bg-background border-border text-foreground">
                                    <SelectValue placeholder="Selecione um país" className="text-muted-foreground" />
                                </SelectTrigger>
                                <SelectContent className="bg-background border-border">
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
                                <SelectContent className="bg-background border-border">
                                    {statusList.map(s => (
                                        <SelectItem key={s.id} value={s.id.toString()} className="text-foreground hover:bg-accent hover:text-accent-foreground">
                                            {s.descricao}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setAddModalOpen(false)} className="border-border text-foreground hover:bg-accent hover:text-accent-foreground">
                            Cancelar
                        </Button>
                        <Button 
                            onClick={handleAddCountry} 
                            disabled={!selectedCountry || !selectedStatus || addLoading}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                            {addLoading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                            Adicionar País
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

export default MapaPage;