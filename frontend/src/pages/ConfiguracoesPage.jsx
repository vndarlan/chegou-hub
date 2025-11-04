import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Alert } from '../components/ui/alert';
import { AlertCircle, Check, User, Lock, Palette, Moon, Sun } from 'lucide-react';
import { useTheme } from '../components/theme-provider';

const ConfiguracoesPage = () => {
  // Estados para Informações Pessoais
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMessage, setProfileMessage] = useState({ type: '', text: '' });

  // Estados para Alteração de Senha
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState({ type: '', text: '' });

  // Tema
  const { theme, setTheme } = useTheme();

  // Buscar dados atuais do usuário ao carregar a página
  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const response = await axios.get('/user/profile/', { withCredentials: true });
      if (response.data) {
        setFirstName(response.data.first_name || '');
        setLastName(response.data.last_name || '');
        setEmail(response.data.email || '');
      }
    } catch (error) {
      console.error('Erro ao buscar dados do perfil:', error);
      setProfileMessage({
        type: 'error',
        text: 'Erro ao carregar dados do perfil.'
      });
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMessage({ type: '', text: '' });

    try {
      const response = await axios.put('/user/profile/', {
        first_name: firstName,
        last_name: lastName,
        email: email
      }, { withCredentials: true });

      if (response.data.message) {
        setProfileMessage({
          type: 'success',
          text: response.data.message
        });
      }

      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        setProfileMessage({ type: '', text: '' });
      }, 5000);

    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      setProfileMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erro ao atualizar perfil.'
      });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();

    // Validação básica
    if (newPassword !== confirmPassword) {
      setPasswordMessage({
        type: 'error',
        text: 'As novas senhas não coincidem.'
      });
      return;
    }

    if (newPassword.length < 8) {
      setPasswordMessage({
        type: 'error',
        text: 'A nova senha deve ter no mínimo 8 caracteres.'
      });
      return;
    }

    setPasswordLoading(true);
    setPasswordMessage({ type: '', text: '' });

    try {
      const response = await axios.post('/user/change-password/', {
        current_password: currentPassword,
        new_password: newPassword,
        confirm_password: confirmPassword
      }, { withCredentials: true });

      if (response.data.message) {
        setPasswordMessage({
          type: 'success',
          text: response.data.message
        });

        // Limpar campos de senha
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }

      // Limpar mensagem após 5 segundos
      setTimeout(() => {
        setPasswordMessage({ type: '', text: '' });
      }, 5000);

    } catch (error) {
      console.error('Erro ao alterar senha:', error);
      setPasswordMessage({
        type: 'error',
        text: error.response?.data?.error || 'Erro ao alterar senha.'
      });
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-6">Configurações</h1>

      {/* Informações Pessoais */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Informações Pessoais
          </CardTitle>
          <CardDescription>
            Atualize suas informações de perfil
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateProfile} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="firstName">Nome</Label>
                <Input
                  id="firstName"
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Seu nome"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lastName">Sobrenome</Label>
                <Input
                  id="lastName"
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Seu sobrenome"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
              />
            </div>

            {profileMessage.text && (
              <Alert className={profileMessage.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                {profileMessage.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-2">{profileMessage.text}</span>
              </Alert>
            )}

            <Button type="submit" disabled={profileLoading}>
              {profileLoading ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Segurança */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lock className="h-5 w-5" />
            Segurança
          </CardTitle>
          <CardDescription>
            Altere sua senha de acesso
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Senha Atual</Label>
              <Input
                id="currentPassword"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Digite sua senha atual"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">Nova Senha</Label>
              <Input
                id="newPassword"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Digite a nova senha (mínimo 8 caracteres)"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirmar Nova Senha</Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Digite a nova senha novamente"
                required
              />
            </div>

            {passwordMessage.text && (
              <Alert className={passwordMessage.type === 'error' ? 'border-red-500' : 'border-green-500'}>
                {passwordMessage.type === 'error' ? (
                  <AlertCircle className="h-4 w-4" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                <span className="ml-2">{passwordMessage.text}</span>
              </Alert>
            )}

            <Button type="submit" disabled={passwordLoading}>
              {passwordLoading ? 'Alterando...' : 'Alterar Senha'}
            </Button>
          </form>
        </CardContent>
      </Card>

      {/* Aparência */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Palette className="h-5 w-5" />
            Aparência
          </CardTitle>
          <CardDescription>
            Personalize a aparência da aplicação
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <Label className="text-base">Tema da Aplicação</Label>
              <p className="text-sm text-muted-foreground">
                Escolha entre tema claro e escuro
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
              className="flex items-center gap-2"
            >
              {theme === 'dark' ? (
                <>
                  <Sun className="h-4 w-4" />
                  Modo Claro
                </>
              ) : (
                <>
                  <Moon className="h-4 w-4" />
                  Modo Escuro
                </>
              )}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfiguracoesPage;