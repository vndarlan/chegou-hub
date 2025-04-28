// frontend/src/components/NavbarNested/UserButton.js
import React from 'react';
import { UnstyledButton, Group, Avatar, Text, rem, Menu } from '@mantine/core';
import { IconLogout, IconChevronDown, IconMoonStars, IconSun } from '@tabler/icons-react';
import classes from './UserButton.module.css';

export function UserButton({ 
    userName = "Usuário", 
    userEmail = "email@exemplo.com", 
    collapsed, 
    onLogout, 
    toggleColorScheme, 
    colorScheme 
}) {
  return (
    <Menu shadow="md" width={200} position="top-end" withArrow>
      <Menu.Target>
        <UnstyledButton className={`${classes.user} ${collapsed ? classes.userCollapsed : ''}`}>
          <Group wrap="nowrap">
            <Avatar radius="xl" color="orange">
              {userName?.trim().charAt(0).toUpperCase() || 'U'}
            </Avatar>

            {!collapsed && (
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <Text size="sm" fw={500} truncate="end">
                  {userName}
                </Text>
                <Text c="dimmed" size="xs" truncate="end">
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
          leftSection={
            colorScheme === 'dark' 
              ? <IconSun style={{ width: rem(14), height: rem(14) }} />
              : <IconMoonStars style={{ width: rem(14), height: rem(14) }} />
          }
          onClick={() => {
            console.log("Botão de tema clicado!");
            console.log("Tema atual:", colorScheme);
            if (toggleColorScheme) {
              toggleColorScheme();
            } else {
              console.error("toggleColorScheme não está definido!");
            }
          }}
        >
          {colorScheme === 'dark' ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
        </Menu.Item>
        <Menu.Divider />
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