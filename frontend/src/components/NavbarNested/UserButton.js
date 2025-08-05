// frontend/src/components/NavbarNested/UserButton.js
import React from 'react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '../ui/dropdown-menu';
import { 
  IconLogout, 
  IconChevronRight, 
  IconSun, 
  IconMoon 
} from '@tabler/icons-react';
import classes from './UserButton.module.css';

export function UserButton({ 
  userName = "Usuário", 
  userEmail = "email@exemplo.com", 
  collapsed, 
  onLogout, 
  toggleColorScheme, 
  colorScheme 
}) {
  const getInitials = (name) => {
    if (!name) return 'U';
    return name
      .split(' ')
      .map(word => word[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          className={`${classes.user} ${collapsed ? classes.userCollapsed : ''} w-full justify-start p-2`}
        >
          <div className="flex items-center gap-2 w-full">
            <Avatar className={collapsed ? 'w-8 h-8' : 'w-10 h-10'}>
              <AvatarFallback className="bg-primary text-primary-foreground">
                {getInitials(userName)}
              </AvatarFallback>
            </Avatar>

            {!collapsed && (
              <div className="flex-1 overflow-hidden text-left">
                <p className="text-sm font-medium truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">
                  {userEmail}
                </p>
              </div>
            )}

            {!collapsed && (
              <IconChevronRight 
                size={14}
                stroke={1.5} 
                className="ml-auto"
              />
            )}
          </div>
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-48">
        <DropdownMenuLabel>Configurações</DropdownMenuLabel>
        
        {toggleColorScheme && (
          <DropdownMenuItem onClick={toggleColorScheme}>
            {colorScheme === 'dark' 
              ? <IconSun size={16} className="mr-2" />
              : <IconMoon size={16} className="mr-2" />
            }
            {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        <DropdownMenuItem onClick={onLogout} className="text-destructive focus:text-destructive">
          <IconLogout size={16} className="mr-2" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}