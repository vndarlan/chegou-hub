// frontend/src/components/NavbarNested/UserButton.js
import React from 'react';
import { UnstyledButton, Group, Avatar, Text, rem, Menu } from '@mantine/core';
import { IconLogout, IconChevronDown } from '@tabler/icons-react';
import classes from './UserButton.module.css';

// Recebe userName e userEmail agora
export function UserButton({ userName = "Usuário", userEmail = "email@exemplo.com", collapsed, onLogout }) {
  return (
    <Menu shadow="md" width={200} position="top-end" withArrow>
      <Menu.Target>
        <UnstyledButton className={`${classes.user} ${collapsed ? classes.userCollapsed : ''}`}>
          <Group wrap="nowrap">
            <Avatar radius="xl" color="orange">
              {/* Pega a primeira letra do NOME do usuário ou 'U' */}
              {userName?.trim().charAt(0).toUpperCase() || 'U'}
            </Avatar>

            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' /* Evita que texto longo quebre layout */ }}>
                <Text size="sm" fw={500} truncate="end"> {/* Usa truncate para nomes longos */}
                  {userName}
                </Text>
                <Text c="dimmed" size="xs" truncate="end"> {/* Usa truncate para emails longos */}
                  {userEmail}
                </Text>
              </div>
            )}

            {!collapsed && <IconChevronDown style={{ width: rem(14), height: rem(14) }} stroke={1.5} />}
          </Group>
        </UnstyledButton>
      </Menu.Target>

      <Menu.Dropdown>
        <Menu.Label>Conta</Menu.Label>
        <Menu.Item
          color="red"
          leftSection={<IconLogout style={{ width: rem(14), height: rem(14) }} />}
          onClick={onLogout}
        >
          Logout
        </Menu.Item>
      </Menu.Dropdown>
    </Menu>
  );
}