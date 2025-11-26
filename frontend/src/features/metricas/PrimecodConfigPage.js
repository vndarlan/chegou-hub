// frontend/src/features/metricas/PrimecodConfigPage.js - Configuração API PrimeCOD
import React, { useState, useEffect } from 'react';
import { Settings, Key, Check, X, Loader2, Eye, EyeOff, RefreshCw } from 'lucide-react';
import apiClient from '../../utils/axios';

// shadcn/ui components
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../components/ui/card';
import { Button } from '../../components/ui/button';
import { Alert, AlertDescription } from '../../components/ui/alert';
import { Input } from '../../components/ui/input';
import { Label } from '../../components/ui/label';
import { getCSRFToken } from '../../utils/csrf';

function PrimecodConfigPage() {
    // Estados
    const [apiToken, setApiToken] = useState('');
    const [tokenMascarado, setTokenMascarado] = useState(null);
    const [showToken, setShowToken] = useState(false);
    const [isConfigured, setIsConfigured] = useState(false);
    const [lastUpdated, setLastUpdated] = useState(null);
    const [updatedBy, setUpdatedBy] = useState(null);

    // Estados de loading e feedback
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [loadingTest, setLoadingTest] = useState(false);
    const [loadingSave, setLoadingSave] = useState(false);
    const [testResult, setTestResult] = useState(null); // { success: bool, message: string }
    const [saveResult, setSaveResult] = useState(null);

    // Carregar configuração atual ao montar
    useEffect(() => {
        carregarConfig();
    }, []);

    const carregarConfig = async () => {
        setLoadingConfig(true);
        try {
            const response = await apiClient.get('/metricas/primecod/config/', {
                headers: { 'X-CSRFToken': getCSRFToken() }
            });

            if (response.data.configured && response.data.config) {
                setIsConfigured(true);
                setTokenMascarado(response.data.config.token_mascarado);
                setLastUpdated(response.data.config.updated_at);
                setUpdatedBy(response.data.config.updated_by_nome);
            } else {
                setIsConfigured(false);
            }
        } catch (error) {
            console.error('Erro ao carregar config:', error);
        } finally {
            setLoadingConfig(false);
        }
    };

    const testarToken = async () => {
        if (!apiToken.trim()) {
            setTestResult({ success: false, message: 'Digite um token para testar' });
            return;
        }

        setLoadingTest(true);
        setTestResult(null);
        setSaveResult(null);

        try {
            const response = await apiClient.post('/metricas/primecod/config/testar/', {
                api_token: apiToken
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.valid) {
                setTestResult({
                    success: true,
                    message: response.data.message
                });
            } else {
                setTestResult({
                    success: false,
                    message: response.data.message
                });
            }
        } catch (error) {
            setTestResult({
                success: false,
                message: error.response?.data?.message || 'Erro ao testar token'
            });
        } finally {
            setLoadingTest(false);
        }
    };

    const salvarConfig = async () => {
        if (!testResult?.success) {
            setSaveResult({ success: false, message: 'Teste o token antes de salvar' });
            return;
        }

        setLoadingSave(true);
        setSaveResult(null);

        try {
            const response = await apiClient.post('/metricas/primecod/config/salvar/', {
                api_token: apiToken
            }, {
                headers: {
                    'X-CSRFToken': getCSRFToken(),
                    'Content-Type': 'application/json'
                }
            });

            if (response.data.status === 'success') {
                setSaveResult({
                    success: true,
                    message: response.data.message
                });
                // Recarregar config
                await carregarConfig();
                // Limpar campo
                setApiToken('');
                setTestResult(null);
            } else {
                setSaveResult({
                    success: false,
                    message: response.data.message
                });
            }
        } catch (error) {
            setSaveResult({
                success: false,
                message: error.response?.data?.message || 'Erro ao salvar configuração'
            });
        } finally {
            setLoadingSave(false);
        }
    };

    const formatDate = (dateString) => {
        if (!dateString) return '-';
        return new Date(dateString).toLocaleString('pt-BR');
    };

    if (loadingConfig) {
        return (
            <div className="flex items-center justify-center h-64">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6">
            {/* Header */}
            <div className="flex items-center gap-3">
                <Settings className="h-8 w-8 text-primary" />
                <div>
                    <h1 className="text-2xl font-bold">Configurações PrimeCOD</h1>
                    <p className="text-muted-foreground">Configure a integração com a API PrimeCOD</p>
                </div>
            </div>

            {/* Status atual */}
            {isConfigured && (
                <Card>
                    <CardHeader className="pb-3">
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Check className="h-5 w-5 text-green-500" />
                            API Configurada
                        </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-2">
                        <div className="flex items-center gap-2 text-sm">
                            <Key className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">Token:</span>
                            <code className="bg-muted px-2 py-1 rounded">{tokenMascarado}</code>
                        </div>
                        {lastUpdated && (
                            <p className="text-sm text-muted-foreground">
                                Atualizado em: {formatDate(lastUpdated)}
                                {updatedBy && ` por ${updatedBy}`}
                            </p>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Formulário */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg">
                        {isConfigured ? 'Atualizar Token' : 'Configurar Token da API'}
                    </CardTitle>
                    <CardDescription>
                        {isConfigured
                            ? 'Digite um novo token para substituir o atual'
                            : 'Insira o token de API da PrimeCOD para habilitar a integração'
                        }
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {/* Campo do token */}
                    <div className="space-y-2">
                        <Label htmlFor="api-token">Token da API</Label>
                        <div className="relative">
                            <Input
                                id="api-token"
                                type={showToken ? 'text' : 'password'}
                                placeholder="Cole seu token aqui..."
                                value={apiToken}
                                onChange={(e) => {
                                    setApiToken(e.target.value);
                                    setTestResult(null);
                                    setSaveResult(null);
                                }}
                                className="pr-10"
                            />
                            <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="absolute right-0 top-0 h-full px-3"
                                onClick={() => setShowToken(!showToken)}
                            >
                                {showToken ? (
                                    <EyeOff className="h-4 w-4" />
                                ) : (
                                    <Eye className="h-4 w-4" />
                                )}
                            </Button>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            Obtenha seu token em: primecod.app &gt; Seção API
                        </p>
                    </div>

                    {/* Feedback do teste */}
                    {testResult && (
                        <Alert variant={testResult.success ? 'default' : 'destructive'}>
                            {testResult.success ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                            <AlertDescription>{testResult.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Feedback do salvar */}
                    {saveResult && (
                        <Alert variant={saveResult.success ? 'default' : 'destructive'}>
                            {saveResult.success ? (
                                <Check className="h-4 w-4" />
                            ) : (
                                <X className="h-4 w-4" />
                            )}
                            <AlertDescription>{saveResult.message}</AlertDescription>
                        </Alert>
                    )}

                    {/* Botões */}
                    <div className="flex gap-3">
                        <Button
                            variant="outline"
                            onClick={testarToken}
                            disabled={loadingTest || !apiToken.trim()}
                        >
                            {loadingTest ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Testando...
                                </>
                            ) : (
                                <>
                                    <RefreshCw className="h-4 w-4 mr-2" />
                                    Testar Conexão
                                </>
                            )}
                        </Button>

                        <Button
                            onClick={salvarConfig}
                            disabled={loadingSave || !testResult?.success}
                        >
                            {loadingSave ? (
                                <>
                                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                    Salvando...
                                </>
                            ) : (
                                <>
                                    <Check className="h-4 w-4 mr-2" />
                                    Salvar Configuração
                                </>
                            )}
                        </Button>
                    </div>

                    {/* Dica */}
                    {!testResult?.success && apiToken && (
                        <p className="text-sm text-amber-600">
                            Teste o token antes de salvar para garantir que está funcionando.
                        </p>
                    )}
                </CardContent>
            </Card>

        </div>
    );
}

export default PrimecodConfigPage;
