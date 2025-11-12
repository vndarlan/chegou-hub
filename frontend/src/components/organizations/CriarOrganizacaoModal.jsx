import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { Loader2, Building2 } from 'lucide-react';
import apiClient from '../../utils/axios';

const CriarOrganizacaoModal = ({ open, onClose, onSuccess }) => {
  const [nome, setNome] = useState('');
  const [descricao, setDescricao] = useState('');
  const [plano, setPlano] = useState('free');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const { toast } = useToast();

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Validações
    if (nome.trim().length < 3) {
      setError('Nome deve ter no mínimo 3 caracteres');
      return;
    }

    try {
      setLoading(true);
      setError('');

      console.log('📤 [CriarOrganizacao] Enviando requisição...');

      // Criar organização
      const response = await apiClient.post('/organizations/', {
        nome: nome.trim(),
        descricao: descricao.trim() || undefined,
        plano,
      });

      console.log('✅ [CriarOrganizacao] Organização criada:', response.data);

      // Selecionar nova organização
      await apiClient.post('/organizations/selecionar_organizacao/', {
        organization_id: response.data.id
      });

      console.log('✅ [CriarOrganizacao] Organização selecionada');

      toast({
        title: "Organização criada!",
        description: `${nome} foi criada com sucesso. Você é o proprietário.`,
      });

      // Callback de sucesso (recarrega lista)
      if (onSuccess) {
        console.log('🔄 [CriarOrganizacao] Recarregando lista de organizações...');
        await onSuccess();
      }

      // Fechar modal
      handleClose();

      // Navegar para workspace
      console.log('✅ [CriarOrganizacao] Organização criada com sucesso! Navegando...');
      window.location.href = '/workspace';

    } catch (err) {
      console.error('❌ [CriarOrganizacao] Erro ao criar organização:', err);
      const errorMsg = err.response?.data?.nome?.[0] ||
                       err.response?.data?.error ||
                       'Erro ao criar organização. Tente novamente.';
      setError(errorMsg);

      toast({
        title: "Erro ao criar organização",
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    if (!loading) {
      setNome('');
      setDescricao('');
      setPlano('free');
      setError('');
      onClose();
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Criar Nova Organização
          </DialogTitle>
          <DialogDescription>
            Crie uma nova workspace para sua empresa ou projeto. Você será o proprietário.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit}>
          <div className="grid gap-4 py-4">
            {/* Nome */}
            <div className="grid gap-2">
              <Label htmlFor="nome">Nome da Organização *</Label>
              <Input
                id="nome"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex: Minha Empresa Ltda"
                maxLength={100}
                disabled={loading}
                required
              />
              <p className="text-xs text-muted-foreground">
                Mínimo 3 caracteres
              </p>
            </div>

            {/* Descrição */}
            <div className="grid gap-2">
              <Label htmlFor="descricao">Descrição (opcional)</Label>
              <Textarea
                id="descricao"
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva o propósito desta organização..."
                rows={3}
                maxLength={500}
                disabled={loading}
              />
              <p className="text-xs text-muted-foreground">
                Máximo 500 caracteres
              </p>
            </div>

            {/* Plano */}
            <div className="grid gap-2">
              <Label htmlFor="plano">Plano</Label>
              <Select
                value={plano}
                onValueChange={setPlano}
                disabled={loading}
              >
                <SelectTrigger id="plano">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Free - Gratuito</SelectItem>
                  <SelectItem value="starter">Starter - Básico</SelectItem>
                  <SelectItem value="business">Business - Empresarial</SelectItem>
                  <SelectItem value="enterprise">Enterprise - Corporativo</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                Você pode alterar o plano depois
              </p>
            </div>

            {/* Erro */}
            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Criar Organização
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default CriarOrganizacaoModal;
