import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, Building2, AlertCircle } from 'lucide-react';

const AddBusinessManagerModal = ({ 
  onAdd, 
  isLoading = false, 
  trigger = null 
}) => {
  const [open, setOpen] = useState(false);
  const [formData, setFormData] = useState({
    nome: '',
    business_manager_id: '',
    access_token: '',
    descricao: ''
  });
  const [errors, setErrors] = useState({});

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Limpar erro do campo quando usuário começar a digitar
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: null }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    // Validar nome
    if (!formData.nome.trim()) {
      newErrors.nome = 'Nome é obrigatório';
    } else if (formData.nome.trim().length < 3) {
      newErrors.nome = 'Nome deve ter pelo menos 3 caracteres';
    }
    
    // Validar Business Manager ID
    if (!formData.business_manager_id.trim()) {
      newErrors.business_manager_id = 'ID do Business Manager é obrigatório';
    } else {
      const bmId = formData.business_manager_id.trim();
      // Deve conter apenas números e ter entre 15-20 dígitos
      if (!/^\d{15,20}$/.test(bmId)) {
        newErrors.business_manager_id = 'ID deve conter apenas números e ter entre 15-20 dígitos';
      }
    }
    
    // Validar Access Token
    if (!formData.access_token.trim()) {
      newErrors.access_token = 'Access Token é obrigatório';
    } else {
      const token = formData.access_token.trim();
      
      // Verificar tamanho mínimo
      if (token.length < 50) {
        newErrors.access_token = 'Token muito curto - verifique se está completo';
      }
      
      // Verificar tamanho máximo (tokens Meta normalmente < 500 chars)
      if (token.length > 1000) {
        newErrors.access_token = 'Token muito longo - verifique se está correto';
      }
      
      // Verificar caracteres válidos
      if (!/^[A-Za-z0-9_\-|.]+$/.test(token)) {
        newErrors.access_token = 'Token contém caracteres inválidos';
      }
      
      // Detectar padrões suspeitos
      const suspiciousPatterns = ['test', 'fake', 'dummy', 'example', 'sample', '123456', 'abcdef'];
      if (suspiciousPatterns.some(pattern => token.toLowerCase().includes(pattern))) {
        newErrors.access_token = 'Token parece ser de teste ou inválido';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      await onAdd(formData);
      // Resetar form e fechar modal em caso de sucesso
      setFormData({
        nome: '',
        business_manager_id: '',
        access_token: '',
        descricao: ''
      });
      setErrors({});
      setOpen(false);
    } catch (error) {
      // Erros serão tratados pelo componente pai
      console.error('Erro ao adicionar Business Manager:', error);
    }
  };

  const handleClose = () => {
    setOpen(false);
    setErrors({});
    setFormData({
      nome: '',
      business_manager_id: '',
      access_token: '',
      descricao: ''
    });
  };

  const defaultTrigger = (
    <Button>
      <Plus className="h-4 w-4 mr-2" />
      Adicionar Business Manager
    </Button>
  );

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Adicionar Business Manager
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Nome */}
          <div className="space-y-2">
            <Label htmlFor="nome">Nome do Business Manager *</Label>
            <Input
              id="nome"
              placeholder="Ex: BM Principal"
              value={formData.nome}
              onChange={(e) => handleInputChange('nome', e.target.value)}
              className={errors.nome ? 'border-red-300' : ''}
            />
            {errors.nome && (
              <p className="text-sm text-red-600">{errors.nome}</p>
            )}
          </div>

          {/* Business Manager ID */}
          <div className="space-y-2">
            <Label htmlFor="business_manager_id">ID do Business Manager *</Label>
            <Input
              id="business_manager_id"
              placeholder="Ex: 123456789012345"
              value={formData.business_manager_id}
              onChange={(e) => handleInputChange('business_manager_id', e.target.value)}
              className={errors.business_manager_id ? 'border-red-300' : ''}
            />
            {errors.business_manager_id && (
              <p className="text-sm text-red-600">{errors.business_manager_id}</p>
            )}
          </div>

          {/* Access Token */}
          <div className="space-y-2">
            <Label htmlFor="access_token">Access Token *</Label>
            <Textarea
              id="access_token"
              placeholder="Cole aqui o Access Token do Facebook"
              value={formData.access_token}
              onChange={(e) => handleInputChange('access_token', e.target.value)}
              className={errors.access_token ? 'border-red-300' : ''}
              rows={3}
            />
            {errors.access_token && (
              <p className="text-sm text-red-600">{errors.access_token}</p>
            )}
          </div>

          {/* Descrição (opcional) */}
          <div className="space-y-2">
            <Label htmlFor="descricao">Descrição (opcional)</Label>
            <Textarea
              id="descricao"
              placeholder="Descrição ou observações sobre este Business Manager"
              value={formData.descricao}
              onChange={(e) => handleInputChange('descricao', e.target.value)}
              rows={2}
            />
          </div>

          {/* Alerta informativo */}
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription className="text-sm">
              O Access Token deve ter as permissões necessárias para acessar 
              WhatsApp Business APIs e informações do Business Manager.
            </AlertDescription>
          </Alert>

          {/* Botões */}
          <div className="flex justify-end gap-3 pt-4">
            <Button 
              type="button" 
              variant="outline" 
              onClick={handleClose}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button 
              type="submit" 
              disabled={isLoading}
            >
              {isLoading ? 'Adicionando...' : 'Adicionar'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AddBusinessManagerModal;