// frontend/src/features/planejamento_semanal/components/UserSelector.jsx
import { Avatar, AvatarImage, AvatarFallback } from '../../../components/ui/avatar';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../../../components/ui/select';
import { Label } from '../../../components/ui/label';

/**
 * Componente para selecionar um usuario do Jira
 * @param {Array} users - Lista de usuarios do Jira
 * @param {string} selectedUser - Account ID do usuario selecionado
 * @param {Function} onUserChange - Callback quando usuario muda
 */
export function UserSelector({ users = [], selectedUser, onUserChange }) {
  const getInitials = (name) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const selectedUserData = users.find(u => u.account_id === selectedUser);

  return (
    <div className="space-y-2">
      <Label htmlFor="user-selector">Selecionar Usuario</Label>
      <Select value={selectedUser || ''} onValueChange={onUserChange}>
        <SelectTrigger id="user-selector" className="w-full">
          <SelectValue placeholder="Selecione um usuario...">
            {selectedUserData && (
              <div className="flex items-center gap-2">
                <Avatar className="h-6 w-6">
                  <AvatarImage src={selectedUserData.avatar_url} alt={selectedUserData.display_name} />
                  <AvatarFallback className="text-xs">
                    {getInitials(selectedUserData.display_name)}
                  </AvatarFallback>
                </Avatar>
                <span>{selectedUserData.display_name}</span>
              </div>
            )}
          </SelectValue>
        </SelectTrigger>
        <SelectContent>
          {users.length === 0 ? (
            <div className="px-2 py-4 text-center text-sm text-muted-foreground">
              Nenhum usuario encontrado
            </div>
          ) : (
            users.map((user) => (
              <SelectItem key={user.account_id} value={user.account_id}>
                <div className="flex items-center gap-2">
                  <Avatar className="h-6 w-6">
                    <AvatarImage src={user.avatar_url} alt={user.display_name} />
                    <AvatarFallback className="text-xs">
                      {getInitials(user.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <span>{user.display_name}</span>
                </div>
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    </div>
  );
}

export default UserSelector;
