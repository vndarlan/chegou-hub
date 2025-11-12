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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Button } from '../ui/button';
import { Alert, AlertDescription } from '../ui/alert';
import { useToast } from '../ui/use-toast';
import { Loader2, Building2 } from 'lucide-react';
import apiClient from '../../utils/axios';

const CriarOrganizacaoModal = ({ open, onClose, onSuccess }) => {
  const [nome, setNome] = useState('');
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

      // Criar organização (ficará com status='pending')
      const response = await apiClient.post('/organizations/', {
        nome: nome.trim(),
        plano,
      });

      console.log('✅ [CriarOrganizacao] Organização criada com status pendente:', response.data);

      // Mensagem informando sobre aprovação
      toast({
        title: "Solicitação enviada!",
        description: `A organização "${nome}" foi criada e está aguardando aprovação do administrador. Você será notificado assim que for aprovada.`,
        duration: 6000,
      });

      // Callback de sucesso (recarrega lista, mas não vai mostrar ainda)
      if (onSuccess) {
        console.log('🔄 [CriarOrganizacao] Recarregando lista de organizações...');
        await onSuccess();
      }

      // Fechar modal
      handleClose();

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
            Crie uma solicitação de nova organização. Após a aprovação do administrador, você será o proprietário e poderá convidar membros.
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
