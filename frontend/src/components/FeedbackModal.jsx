import React, { useState } from 'react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Card, CardContent } from './ui/card';
import { Alert, AlertDescription } from './ui/alert';
import { Upload, X, CheckCircle, AlertCircle } from 'lucide-react';
import apiClient from '../utils/axios';
import { getCSRFToken } from '../utils/csrf';

const FeedbackModal = ({ onClose }) => {
  const [formData, setFormData] = useState({
    titulo: '',
    descricao: '',
    categoria: '',
    prioridade: 'media',
    imagem: null
  });
  
  const [imagePreview, setImagePreview] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState({ type: '', message: '' });

  const categorias = [
    { value: 'bug', label: 'Bug/Erro' },
    { value: 'melhoria', label: 'Sugestão de melhoria' },
    { value: 'outro', label: 'Outro' }
  ];

  const prioridades = [
    { value: 'baixa', label: 'Baixa' },
    { value: 'media', label: 'Média' },
    { value: 'alta', label: 'Alta' }
  ];

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        setSubmitStatus({
          type: 'error',
          message: 'A imagem deve ter no máximo 5MB'
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, imagem: file }));
      
      const reader = new FileReader();
      reader.onload = (e) => setImagePreview(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const removeImage = () => {
    setFormData(prev => ({ ...prev, imagem: null }));
    setImagePreview(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.titulo || !formData.descricao || !formData.categoria) {
      setSubmitStatus({
        type: 'error',
        message: 'Por favor, preencha todos os campos obrigatórios'
      });
      return;
    }

    setIsSubmitting(true);
    setSubmitStatus({ type: '', message: '' });

    try {
      const submitData = new FormData();
      submitData.append('titulo', formData.titulo);
      submitData.append('descricao', formData.descricao);
      submitData.append('categoria', formData.categoria);
      submitData.append('prioridade', formData.prioridade);
      submitData.append('url_pagina', window.location.href);
      
      if (formData.imagem) {
        submitData.append('imagem', formData.imagem);
      }

      const response = await apiClient.post('/feedback/create/', submitData, {
        headers: {
          'X-CSRFToken': getCSRFToken(),
        }
      });

      setSubmitStatus({
        type: 'success',
        message: 'Feedback enviado com sucesso! Obrigado pela sua contribuição.'
      });

      // Reset form
      setFormData({
        titulo: '',
        descricao: '',
        categoria: '',
        prioridade: 'media',
        imagem: null
      });
      setImagePreview(null);

      // Close modal after 2 seconds
      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      console.error('Erro ao enviar feedback:', error);
      
      let errorMessage = 'Erro ao enviar feedback. Tente novamente.';
      
      if (error.response?.data) {
        if (typeof error.response.data === 'string') {
          errorMessage = error.response.data;
        } else if (error.response.data.message) {
          errorMessage = error.response.data.message;
        } else if (error.response.data.imagem) {
          errorMessage = `Erro na imagem: ${error.response.data.imagem[0]}`;
        } else {
          errorMessage = JSON.stringify(error.response.data);
        }
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      setSubmitStatus({
        type: 'error',
        message: errorMessage
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {submitStatus.message && (
        <Alert className={submitStatus.type === 'error' ? 'border-destructive' : 'border-green-500'}>
          {submitStatus.type === 'error' ? 
            <AlertCircle className="h-4 w-4" /> : 
            <CheckCircle className="h-4 w-4" />
          }
          <AlertDescription className={submitStatus.type === 'error' ? 'text-destructive' : 'text-green-700'}>
            {submitStatus.message}
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-2">
        <Label htmlFor="titulo">Título *</Label>
        <Input
          id="titulo"
          value={formData.titulo}
          onChange={(e) => handleInputChange('titulo', e.target.value)}
          placeholder="Descreva brevemente o problema ou sugestão"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="categoria">Categoria *</Label>
          <Select value={formData.categoria} onValueChange={(value) => handleInputChange('categoria', value)}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione uma categoria" />
            </SelectTrigger>
            <SelectContent>
              {categorias.map((cat) => (
                <SelectItem key={cat.value} value={cat.value}>
                  {cat.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="prioridade">Prioridade</Label>
          <Select value={formData.prioridade} onValueChange={(value) => handleInputChange('prioridade', value)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {prioridades.map((pri) => (
                <SelectItem key={pri.value} value={pri.value}>
                  {pri.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="descricao">Descrição *</Label>
        <Textarea
          id="descricao"
          value={formData.descricao}
          onChange={(e) => handleInputChange('descricao', e.target.value)}
          placeholder="Descreva detalhadamente o problema, erro ou sugestão..."
          rows={4}
          required
        />
      </div>

      <div className="space-y-2">
        <Label>Anexar Imagem (opcional)</Label>
        {!imagePreview ? (
          <div className="border-2 border-dashed border-muted-foreground/25 rounded-lg p-6 text-center">
            <input
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              className="hidden"
              id="image-upload"
            />
            <Label
              htmlFor="image-upload"
              className="cursor-pointer flex flex-col items-center space-y-2 text-muted-foreground hover:text-foreground"
            >
              <Upload className="h-8 w-8" />
              <span>Clique para selecionar uma imagem</span>
              <span className="text-xs">PNG, JPG até 5MB</span>
            </Label>
          </div>
        ) : (
          <Card>
            <CardContent className="p-4">
              <div className="relative">
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="max-h-48 w-full object-contain rounded"
                />
                <Button
                  type="button"
                  variant="destructive"
                  size="sm"
                  className="absolute top-2 right-2"
                  onClick={removeImage}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      <div className="flex space-x-3 pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
          disabled={isSubmitting}
          className="flex-1"
        >
          Cancelar
        </Button>
        <Button
          type="submit"
          disabled={isSubmitting}
          className="flex-1"
        >
          {isSubmitting ? 'Enviando...' : 'Enviar Feedback'}
        </Button>
      </div>
    </form>
  );
};

export default FeedbackModal;