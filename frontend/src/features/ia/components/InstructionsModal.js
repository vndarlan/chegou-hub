import React, { useState } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger 
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../../../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../../components/ui/tabs';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { 
  Info,
  ExternalLink,
  CheckCircle,
  AlertTriangle,
  FileText,
  Settings,
  HelpCircle,
  ChevronRight,
  Copy,
  Shield,
  Key,
  Building2
} from 'lucide-react';

const InstructionsModal = ({ 
  trigger = null,
  open,
  onOpenChange 
}) => {
  const [activeTab, setActiveTab] = useState('prerequisites');

  const copyToClipboard = (text) => {
    navigator.clipboard.writeText(text);
  };

  const defaultTrigger = (
    <Button variant="ghost" size="sm" className="p-2">
      <Info className="h-4 w-4" />
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl">
            <Building2 className="h-6 w-6 text-blue-600" />
            Como Conectar Business Manager - Guia Completo
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="prerequisites" className="text-xs">
              <Shield className="h-4 w-4 mr-1" />
              Pré-requisitos
            </TabsTrigger>
            <TabsTrigger value="business-id" className="text-xs">
              <Building2 className="h-4 w-4 mr-1" />
              BM ID
            </TabsTrigger>
            <TabsTrigger value="access-token" className="text-xs">
              <Key className="h-4 w-4 mr-1" />
              Token
            </TabsTrigger>
            <TabsTrigger value="setup" className="text-xs">
              <Settings className="h-4 w-4 mr-1" />
              Configuração
            </TabsTrigger>
            <TabsTrigger value="troubleshooting" className="text-xs">
              <HelpCircle className="h-4 w-4 mr-1" />
              Ajuda
            </TabsTrigger>
          </TabsList>

          {/* Pré-requisitos */}
          <TabsContent value="prerequisites" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5 text-blue-600" />
                  📋 Pré-requisitos Necessários
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Conta Meta Business Verificada</h4>
                      <p className="text-sm text-muted-foreground">
                        Sua empresa deve ter uma conta verificada no Meta Business Manager
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">WhatsApp Business API Configurado</h4>
                      <p className="text-sm text-muted-foreground">
                        Números WhatsApp Business já configurados no seu Business Manager
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Permissões Adequadas</h4>
                      <p className="text-sm text-muted-foreground">
                        Ser administrador do Business Manager ou ter permissões para WhatsApp Business
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                    <div>
                      <h4 className="font-medium">Aplicativo Meta for Developers</h4>
                      <p className="text-sm text-muted-foreground">
                        Ter acesso ao painel de desenvolvedores para gerar tokens
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Importante:</strong> Sem estes pré-requisitos, não será possível 
                    conectar seu Business Manager ao sistema. Certifique-se de que tudo está 
                    configurado antes de prosseguir.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Business Manager ID */}
          <TabsContent value="business-id" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-blue-600" />
                  🔍 Como Obter o Business Manager ID
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Acesse o Meta Business Manager
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Vá para business.facebook.com e faça login com sua conta
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://business.facebook.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Business Manager
                    </Button>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Encontre o ID na URL
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Após fazer login, observe a URL do navegador:
                    </p>
                    <div className="bg-gray-100 p-2 rounded font-mono text-sm flex items-center justify-between">
                      <span>business.facebook.com/settings/?business_id=<strong>123456789012345</strong></span>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => copyToClipboard('business.facebook.com/settings/?business_id=123456789012345')}
                      >
                        <Copy className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                      Alternativa: Configurações do Business
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Vá em <strong>Configurações do Business</strong> → <strong>Informações da Empresa</strong>. 
                      O ID aparecerá no topo da página.
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Formato:</strong> O Business Manager ID é um número de 15-20 dígitos. 
                    Exemplo: <code>123456789012345</code>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Access Token */}
          <TabsContent value="access-token" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5 text-blue-600" />
                  🔐 Como Gerar o Access Token
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Acesse Meta for Developers
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Vá para developers.facebook.com e acesse suas aplicações
                    </p>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => window.open('https://developers.facebook.com', '_blank')}
                    >
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Abrir Meta for Developers
                    </Button>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Selecione sua Aplicação
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Escolha a aplicação que tem acesso ao WhatsApp Business API
                    </p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                      Gerar Token de Sistema
                    </h4>
                    <p className="text-sm text-muted-foreground mb-2">
                      Vá em <strong>Ferramentas e Suporte</strong> → <strong>Tokens de Acesso</strong>
                    </p>
                    <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                      <li>Selecione "Tokens de Sistema"</li>
                      <li>Escolha seu Business Manager</li>
                      <li>Marque as permissões necessárias</li>
                      <li>Gere o token</li>
                    </ul>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                      Permissões Necessárias
                    </h4>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>whatsapp_business_management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>whatsapp_business_messaging</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>business_management</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span>pages_read_engagement</span>
                      </div>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Shield className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Segurança:</strong> Mantenha seu Access Token em segurança. 
                    Nunca compartilhe com terceiros ou publique em repositórios públicos.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Configuração */}
          <TabsContent value="setup" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Settings className="h-5 w-5 text-blue-600" />
                  ⚙️ Processo de Configuração
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-blue-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">1</span>
                      Preencher o Formulário
                    </h4>
                    <ul className="text-sm text-muted-foreground list-disc pl-4 space-y-1">
                      <li><strong>Nome:</strong> Um nome descritivo para identificar o BM</li>
                      <li><strong>ID:</strong> O número de 15-20 dígitos do seu Business Manager</li>
                      <li><strong>Token:</strong> O Access Token gerado no Meta for Developers</li>
                      <li><strong>Descrição:</strong> (Opcional) Informações adicionais</li>
                    </ul>
                  </div>

                  <div className="bg-green-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-green-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">2</span>
                      Validação Automática
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema irá automaticamente validar as credenciais e buscar 
                      os números WhatsApp associados ao seu Business Manager.
                    </p>
                  </div>

                  <div className="bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-orange-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">3</span>
                      Sincronização Inicial
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      Após adicionar com sucesso, o sistema fará uma sincronização 
                      inicial para importar todos os dados dos seus números WhatsApp.
                    </p>
                  </div>

                  <div className="bg-purple-50 p-4 rounded-lg">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      <span className="bg-purple-600 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm">4</span>
                      Monitoramento Contínuo
                    </h4>
                    <p className="text-sm text-muted-foreground">
                      O sistema começará a monitorar automaticamente a qualidade 
                      e status dos seus números WhatsApp Business.
                    </p>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertDescription>
                    <strong>Dica:</strong> Você pode adicionar múltiplos Business Managers 
                    para centralizar o monitoramento de todos os seus números WhatsApp.
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Troubleshooting */}
          <TabsContent value="troubleshooting" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <HelpCircle className="h-5 w-5 text-blue-600" />
                  ⚠️ Troubleshooting - Problemas Comuns
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-4">
                  <div className="border border-red-200 bg-red-50 p-4 rounded-lg">
                    <h4 className="font-medium text-red-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      "Token inválido ou expirado"
                    </h4>
                    <div className="text-sm text-red-700 space-y-2">
                      <p><strong>Possíveis causas:</strong></p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Token copiado incorretamente (faltando partes)</li>
                        <li>Token expirado (tokens têm prazo de validade)</li>
                        <li>Permissões insuficientes no token</li>
                        <li>Aplicação Meta desativada</li>
                      </ul>
                      <p><strong>Solução:</strong> Gere um novo token com todas as permissões necessárias.</p>
                    </div>
                  </div>

                  <div className="border border-orange-200 bg-orange-50 p-4 rounded-lg">
                    <h4 className="font-medium text-orange-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      "Business Manager ID não encontrado"
                    </h4>
                    <div className="text-sm text-orange-700 space-y-2">
                      <p><strong>Possíveis causas:</strong></p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>ID digitado incorretamente</li>
                        <li>Não tem acesso a este Business Manager</li>
                        <li>Business Manager suspenso ou desativado</li>
                      </ul>
                      <p><strong>Solução:</strong> Verifique o ID na URL do Business Manager ou nas configurações.</p>
                    </div>
                  </div>

                  <div className="border border-yellow-200 bg-yellow-50 p-4 rounded-lg">
                    <h4 className="font-medium text-yellow-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4" />
                      "Nenhum número WhatsApp encontrado"
                    </h4>
                    <div className="text-sm text-yellow-700 space-y-2">
                      <p><strong>Possíveis causas:</strong></p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Nenhum número configurado no Business Manager</li>
                        <li>Números não aprovados pela Meta</li>
                        <li>Permissões insuficientes para acessar WhatsApp Business</li>
                      </ul>
                      <p><strong>Solução:</strong> Configure números WhatsApp Business no Meta Business Manager primeiro.</p>
                    </div>
                  </div>

                  <div className="border border-blue-200 bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-medium text-blue-800 mb-2 flex items-center gap-2">
                      <Info className="h-4 w-4" />
                      Precisa de Ajuda Adicional?
                    </h4>
                    <div className="text-sm text-blue-700 space-y-2">
                      <p>Se os problemas persistirem, você pode:</p>
                      <ul className="list-disc pl-4 space-y-1">
                        <li>Verificar o status da API do Meta</li>
                        <li>Consultar os logs de erro detalhados</li>
                        <li>Entrar em contato com o suporte técnico</li>
                      </ul>
                      <div className="flex gap-2 mt-3">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://developers.facebook.com/docs/whatsapp', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Documentação Meta
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => window.open('https://status.facebook.com/', '_blank')}
                        >
                          <ExternalLink className="h-4 w-4 mr-2" />
                          Status Meta
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        <div className="flex justify-between items-center mt-6 pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            Use as abas acima para navegar pelo guia completo
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => window.open('https://business.facebook.com/help', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Ajuda Meta Business
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InstructionsModal;