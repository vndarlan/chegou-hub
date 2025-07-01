// frontend/src/components/NavbarNested/UserButton.js
import React from 'react';
import { 
  UnstyledButton, 
  Group, 
  Avatar, 
  Text, 
  rem, 
  Menu 
} from '@mantine/core';
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
    <Menu shadow="md" width={200} position="top-end" withArrow>
      <Menu.Target>
        <UnstyledButton className={`${classes.user} ${collapsed ? classes.userCollapsed : ''}`}>
          <Group gap="sm" wrap="nowrap">
            <Avatar 
              radius="xl" 
              color="orange" 
              size={collapsed ? 32 : 40}
            >
              {getInitials(userName)}
            </Avatar>

            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Text size="sm" fw={500} truncate>
                  {userName}
                </Text>
                <Text c="dimmed" size="xs" truncate>
                  {userEmail}
                </Text>
              </div>
            )}

            {!collapsed && (
              <IconChevronRight 
                style={{ width: rem(14), height: rem(14) }} 
                stroke={1.5} 
              />
            )}
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Configurações</Menu.Label>
        
        {toggleColorScheme && (
          <Menu.Item
            leftSection={
              colorScheme === 'dark' 
                ? <IconSun style={{ width: rem(16), height: rem(16) }} />
                : <IconMoon style={{ width: rem(16), height: rem(16) }} />
            }
            onClick={toggleColorScheme}
          >
            {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
          </Menu.Item>
        )}

        <Menu.Divider />

        <Menu.Item
          color="red"
          leftSection={<IconLogout style={{ width: rem(16), height: rem(16) }} />}
          onClick={onLogout}
        >
          Sair
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}