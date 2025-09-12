import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../../../components/ui/dialog';
import { Button } from '../../../components/ui/button';
import { Input } from '../../../components/ui/input';
import { Label } from '../../../components/ui/label';
import { Textarea } from '../../../components/ui/textarea';
import { Alert, AlertDescription } from '../../../components/ui/alert';
import { CalendarDays, Phone, Save, AlertTriangle, X } from 'lucide-react';
import axios from 'axios';
import { getCSRFToken } from '../../../utils/csrf';
import { toast } from 'sonner';

const AddPhoneNumberModal = ({ isOpen, onClose, onSuccess }) => {
  
  // Estados do formulário
  const [formData, setFormData] = useState({
    phone_number_id: '',
    display_phone_number: '',
    access_token: '',
    bm_nome_customizado: '',
    pais_nome_customizado: '',
    perfil: '',
    token_expira_em: '',
    verified_name: '',
    messaging_limit: ''
  });

  // Estados de controle
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [generalError, setGeneralError] = useState('');

  // Validação dos campos
  const validateForm = () => {
    const newErrors = {};

    // Campos obrigatórios
    if (!formData.phone_number_id.trim()) {
      newErrors.phone_number_id = 'Phone Number ID é obrigatório';
    }
    if (!formData.display_phone_number.trim()) {
      newErrors.display_phone_number = 'Número formatado é obrigatório';
    }
    if (!formData.access_token.trim()) {
      newErrors.access_token = 'Token de acesso é obrigatório';
    }

    // Validação do número de telefone (formato básico)
    if (formData.display_phone_number && !/^\+[\d\s\-()]+$/.test(formData.display_phone_number)) {
      newErrors.display_phone_number = 'Formato de número inválido. Use +55 (11) 99999-9999';
    }

    // Validação da data (se preenchida)
    if (formData.token_expira_em && isNaN(Date.parse(formData.token_expira_em))) {
      newErrors.token_expira_em = 'Data inválida';
    }

    // Validação do limite de mensagens (se preenchido)
    if (formData.messaging_limit && (isNaN(formData.messaging_limit) || parseInt(formData.messaging_limit) < 0)) {
      newErrors.messaging_limit = 'Limite deve ser um número positivo';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Manipulador de mudança dos campos
  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Limpar erro do campo quando o usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Formatação automática do número de telefone
  const handlePhoneNumberChange = (value) => {
    // Remove tudo que não é dígito
    let cleaned = value.replace(/\D/g, '');
    
    // Aplica formatação se começar com código do país
    if (cleaned.length >= 2) {
      if (cleaned.startsWith('55') && cleaned.length === 13) {
        // Formato brasileiro: +55 (11) 99999-9999
        cleaned = cleaned.replace(/(\d{2})(\d{2})(\d{5})(\d{4})/, '+$1 ($2) $3-$4');
      } else if (cleaned.length >= 10) {
        // Formato genérico: +XX XXXXXXXXX
        cleaned = cleaned.replace(/(\d{1,3})(\d+)/, '+$1 $2');
      }
    }
    
    handleInputChange('display_phone_number', cleaned);
  };

  // Submissão do formulário
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      const submitData = {
        ...formData,
        messaging_limit: formData.messaging_limit ? parseInt(formData.messaging_limit) : null,
        token_expira_em: formData.token_expira_em || null
      };

      const response = await axios.post('/ia/whatsapp-numeros/', submitData, {
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': getCSRFToken()
        },
        withCredentials: true
      });

      // Sucesso
      toast.success(`Número ${formData.display_phone_number} foi adicionado com sucesso!`);

      // Resetar formulário
      setFormData({
        phone_number_id: '',
        display_phone_number: '',
        access_token: '',
        bm_nome_customizado: '',
        pais_nome_customizado: '',
        perfil: '',
        token_expira_em: '',
        verified_name: '',
        messaging_limit: ''
      });

      // Chamar callback de sucesso e fechar modal
      if (onSuccess) onSuccess(response.data);
      onClose();

    } catch (error) {
      console.error('Erro ao adicionar número:', error);
      
      if (error.response?.data) {
        // Erros específicos do backend
        const backendErrors = error.response.data;
        
        if (typeof backendErrors === 'object' && !backendErrors.detail) {
          // Erros de campo específicos
          setErrors(backendErrors);
        } else {
          // Erro geral
          setGeneralError(backendErrors.detail || backendErrors.message || 'Erro ao adicionar número');
        }
      } else if (error.response?.status === 400) {
        setGeneralError('Dados inválidos. Verifique os campos e tente novamente.');
      } else if (error.response?.status === 403) {
        setGeneralError('Acesso negado. Verifique suas permissões.');
      } else if (error.response?.status === 500) {
        setGeneralError('Erro interno do servidor. Tente novamente mais tarde.');
      } else {
        setGeneralError('Erro de conexão. Verifique sua internet e tente novamente.');
      }

      toast.error("Não foi possível adicionar o número. Verifique os dados e tente novamente.");
    } finally {
      setIsLoading(false);
    }
  };

  // Reset quando modal fecha
  const handleClose = () => {
    if (!isLoading) {
      setFormData({
        phone_number_id: '',
        display_phone_number: '',
        access_token: '',
        bm_nome_customizado: '',
        pais_nome_customizado: '',
        perfil: '',
        token_expira_em: '',
        verified_name: '',
        messaging_limit: ''
      });
      setErrors({});
      setGeneralError('');
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Phone className="h-5 w-5" />
            Adicionar Número WhatsApp Business
          </DialogTitle>
          <DialogDescription>
            Preencha as informações do número WhatsApp Business para adicionar à plataforma.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Erro Geral */}
          {generalError && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>{generalError}</AlertDescription>
            </Alert>
          )}

          {/* Seção: Informações Técnicas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Informações Técnicas (Obrigatórias)
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="phone_number_id">Phone Number ID *</Label>
                <Input
                  id="phone_number_id"
                  value={formData.phone_number_id}
                  onChange={(e) => handleInputChange('phone_number_id', e.target.value)}
                  placeholder="123456789012345"
                  className={errors.phone_number_id ? 'border-destructive' : ''}
                />
                {errors.phone_number_id && (
                  <p className="text-sm text-destructive mt-1">{errors.phone_number_id}</p>
                )}
              </div>

              <div>
                <Label htmlFor="display_phone_number">Número Formatado *</Label>
                <Input
                  id="display_phone_number"
                  value={formData.display_phone_number}
                  onChange={(e) => handlePhoneNumberChange(e.target.value)}
                  placeholder="+55 (11) 99999-9999"
                  className={errors.display_phone_number ? 'border-destructive' : ''}
                />
                {errors.display_phone_number && (
                  <p className="text-sm text-destructive mt-1">{errors.display_phone_number}</p>
                )}
              </div>
            </div>

            <div>
              <Label htmlFor="access_token">Token de Acesso *</Label>
              <Input
                id="access_token"
                type="password"
                value={formData.access_token}
                onChange={(e) => handleInputChange('access_token', e.target.value)}
                placeholder="EAAxxxxxxxxxxxxxx..."
                className={errors.access_token ? 'border-destructive' : ''}
              />
              {errors.access_token && (
                <p className="text-sm text-destructive mt-1">{errors.access_token}</p>
              )}
            </div>
          </div>

          {/* Seção: Informações Personalizadas */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Informações Personalizadas
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="bm_nome_customizado">Nome da BM</Label>
                <Input
                  id="bm_nome_customizado"
                  value={formData.bm_nome_customizado}
                  onChange={(e) => handleInputChange('bm_nome_customizado', e.target.value)}
                  placeholder="Nome personalizado do Business Manager"
                />
              </div>

              <div>
                <Label htmlFor="pais_nome_customizado">Nome do País</Label>
                <Input
                  id="pais_nome_customizado"
                  value={formData.pais_nome_customizado}
                  onChange={(e) => handleInputChange('pais_nome_customizado', e.target.value)}
                  placeholder="Nome personalizado do país"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="perfil">Perfil</Label>
              <Textarea
                id="perfil"
                value={formData.perfil}
                onChange={(e) => handleInputChange('perfil', e.target.value)}
                placeholder="Descrição do perfil ou uso deste número..."
                rows={3}
              />
            </div>

            <div>
              <Label htmlFor="token_expira_em" className="flex items-center gap-2">
                <CalendarDays className="h-4 w-4" />
                Data de Expiração do Token
              </Label>
              <Input
                id="token_expira_em"
                type="datetime-local"
                value={formData.token_expira_em}
                onChange={(e) => handleInputChange('token_expira_em', e.target.value)}
                className={errors.token_expira_em ? 'border-destructive' : ''}
              />
              {errors.token_expira_em && (
                <p className="text-sm text-destructive mt-1">{errors.token_expira_em}</p>
              )}
            </div>
          </div>

          {/* Seção: Informações Opcionais */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-muted-foreground border-b pb-2">
              Informações Opcionais
            </h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="verified_name">Nome Verificado</Label>
                <Input
                  id="verified_name"
                  value={formData.verified_name}
                  onChange={(e) => handleInputChange('verified_name', e.target.value)}
                  placeholder="Nome verificado pelo WhatsApp"
                />
              </div>

              <div>
                <Label htmlFor="messaging_limit">Limite de Mensagens</Label>
                <Input
                  id="messaging_limit"
                  type="number"
                  min="0"
                  value={formData.messaging_limit}
                  onChange={(e) => handleInputChange('messaging_limit', e.target.value)}
                  placeholder="1000"
                  className={errors.messaging_limit ? 'border-destructive' : ''}
                />
                {errors.messaging_limit && (
                  <p className="text-sm text-destructive mt-1">{errors.messaging_limit}</p>
                )}
              </div>
            </div>
          </div>
        </form>

        <DialogFooter className="gap-2">
          <Button 
            type="button" 
            variant="outline" 
            onClick={handleClose}
            disabled={isLoading}
          >
            <X className="h-4 w-4 mr-2" />
            Cancelar
          </Button>
          <Button 
            type="submit"
            onClick={handleSubmit}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-b-transparent" />
                Adicionando...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Adicionar Número
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default AddPhoneNumberModal;