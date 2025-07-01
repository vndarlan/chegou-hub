// frontend/src/components/DoubleNavbar.js
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Navbar,
    ScrollArea,
    Text,
    Group,
    Box,
    UnstyledButton,
    ThemeIcon,
    Tooltip,
    ActionIcon,
    Avatar,
    Menu,
    Divider,
    Badge,
    Stack,
    Paper
} from '@mantine/core';
import {
    // HOME
    IconHome2,
    IconCalendar,
    IconWorld,
    
    // IA & AUTOMAÇÕES
    IconRobot,
    IconActivity,
    IconWorkflow,
    IconBrain,
    
    // OPERACIONAL
    IconSettings,
    IconHeart,
    IconHeadphones,
    
    // SISTEMA
    IconLogout,
    IconSun,
    IconMoon,
    IconUser,
    IconChevronRight,
    IconDots
} from '@tabler/icons-react';

const navigationData = [
    {
        label: 'HOME',
        color: 'blue',
        items: [
            {
                icon: IconCalendar,
                label: 'Agenda da Empresa',
                to: '/workspace/agenda',
                description: 'Calendários e eventos da empresa',
                color: 'blue'
            },
            {
                icon: IconWorld,
                label: 'Mapa de Países',
                to: '/workspace/mapa',
                description: 'Status global de operações',
                color: 'green'
            }
        ]
    },
    {
        label: 'IA & Automações',
        color: 'orange',
        items: [
            {
                icon: IconActivity,
                label: 'Logs Gerais',
                to: '/workspace/logs',
                description: 'Todos os logs de IA e automações',
                color: 'purple'
            },
            {
                icon: IconRobot,
                label: 'Nicochat',
                to: '/workspace/nicochat',
                description: 'Monitoramento por país',
                color: 'blue'
            },
            {
                icon: IconWorkflow,
                label: 'N8N',
                to: '/workspace/n8n',
                description: 'Workflows e automações',
                color: 'grape'
            }
        ]
    },
    {
        label: 'OPERACIONAL',
        color: 'teal',
        items: [
            {
                icon: IconHeart,
                label: 'Engajamento',
                to: '/workspace/engajamento',
                description: 'Automação de likes e reações',
                color: 'red'
            },
            {
                icon: IconHeadphones,
                label: 'Suporte',
                to: '/workspace/suporte',
                description: 'Ferramentas de atendimento',
                color: 'cyan',
                badge: 'Em breve'
            }
        ]
    }
];

function MainLink({ icon: Icon, color, label, description, to, active, onClick, badge }) {
    return (
        <Tooltip
            label={description}
            position="right"
            withArrow
            transitionProps={{ duration: 0 }}
            openDelay={500}
        >
            <UnstyledButton
                onClick={onClick}
                style={(theme) => ({
                    display: 'block',
                    width: '100%',
                    padding: theme.spacing.xs,
                    borderRadius: theme.radius.sm,
                    color: active 
                        ? 'light-dark(var(--mantine-color-white), var(--mantine-color-white))'
                        : 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-3))',
                    backgroundColor: active 
                        ? `var(--mantine-color-${color}-6)`
                        : 'transparent',
                    '&:hover': {
                        backgroundColor: active 
                            ? `var(--mantine-color-${color}-7)`
                            : 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                    },
                    transition: 'all 150ms ease'
                })}
            >
                <Group gap="sm" wrap="nowrap">
                    <ThemeIcon
                        variant={active ? 'white' : 'light'}
                        color={color}
                        size={40}
                        radius="md"
                    >
                        <Icon size={20} />
                    </ThemeIcon>

                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Group gap="xs" wrap="nowrap">
                            <Text size="sm" fw={500} truncate>
                                {label}
                            </Text>
                            {badge && (
                                <Badge
                                    size="xs"
                                    variant="light"
                                    color="orange"
                                >
                                    {badge}
                                </Badge>
                            )}
                        </Group>
                        <Text size="xs" c="dimmed" truncate>
                            {description}
                        </Text>
                    </Box>

                    <IconChevronRight 
                        size={16} 
                        style={{ 
                            opacity: active ? 1 : 0.5,
                            transition: 'opacity 150ms ease'
                        }} 
                    />
                </Group>
            </UnstyledButton>
        </Tooltip>
    );
}

function UserButton({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
    const getInitials = (name) => {
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .slice(0, 2);
    };

    return (
        <Box
            style={{
                paddingTop: 'var(--mantine-spacing-sm)',
                borderTop: '1px solid light-dark(var(--mantine-color-gray-2), var(--mantine-color-dark-4))',
                marginTop: 'var(--mantine-spacing-sm)'
            }}
        >
            <Menu shadow="md" width={250} position="right-end">
                <Menu.Target>
                    <UnstyledButton
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: 'var(--mantine-spacing-xs)',
                            borderRadius: 'var(--mantine-radius-sm)',
                            color: 'light-dark(var(--mantine-color-dark-0), var(--mantine-color-gray-7))',
                            '&:hover': {
                                backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-6))',
                            },
                        }}
                    >
                        <Group gap="sm">
                            <Avatar size={36} radius="xl" color="orange">
                                {getInitials(userName)}
                            </Avatar>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                <Text size="sm" fw={500} truncate>
                                    {userName}
                                </Text>
                                <Text size="xs" c="dimmed" truncate>
                                    {userEmail}
                                </Text>
                            </Box>
                            <IconDots size={16} />
                        </Group>
                    </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                    <Menu.Label>Configurações</Menu.Label>
                    
                    <Menu.Item
                        leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                        onClick={toggleColorScheme}
                    >
                        {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Label>Conta</Menu.Label>
                    
                    <Menu.Item
                        leftSection={<IconUser size={16} />}
                        disabled
                    >
                        Meu Perfil
                    </Menu.Item>

                    <Menu.Divider />

                    <Menu.Item
                        leftSection={<IconLogout size={16} />}
                        color="red"
                        onClick={onLogout}
                    >
                        Sair
                    </Menu.Item>
                </Menu.Dropdown>
            </Menu>
        </Box>
    );
}

export function DoubleNavbar({ 
    userName, 
    userEmail, 
    onLogout, 
    toggleColorScheme, 
    colorScheme 
}) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (to) => {
        navigate(to);
    };

    const isActive = (to) => {
        return location.pathname === to;
    };

    const links = navigationData.map((section) => (
        <Box key={section.label} mb="xl">
            <Group gap="xs" mb="md" px="xs">
                <Text 
                    size="xs" 
                    fw={600} 
                    c="dimmed" 
                    tt="uppercase" 
                    style={{ letterSpacing: '0.5px' }}
                >
                    {section.label}
                </Text>
                <Divider style={{ flex: 1 }} />
            </Group>

            <Stack gap="xs">
                {section.items.map((item) => (
                    <MainLink
                        key={item.label}
                        icon={item.icon}
                        color={item.color}
                        label={item.label}
                        description={item.description}
                        to={item.to}
                        active={isActive(item.to)}
                        onClick={() => handleNavigation(item.to)}
                        badge={item.badge}
                    />
                ))}
            </Stack>
        </Box>
    ));

    return (
        <Navbar width={{ sm: 320 }} p="md" style={{ 
            borderRight: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
            backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-7))'
        }}>
            <Navbar.Section>
                <Paper
                    p="md"
                    radius="md"
                    style={{
                        background: 'linear-gradient(135deg, var(--mantine-color-orange-6), var(--mantine-color-red-6))',
                        marginBottom: 'var(--mantine-spacing-xl)'
                    }}
                >
                    <Group gap="sm">
                        <ThemeIcon size="lg" radius="md" variant="white" color="orange">
                            <IconBrain size={24} />
                        </ThemeIcon>
                        <Box>
                            <Text fw={700} size="lg" c="white">
                                ChegouHub
                            </Text>
                            <Text size="sm" c="orange.1">
                                Centro de Comando
                            </Text>
                        </Box>
                    </Group>
                </Paper>
            </Navbar.Section>

            <Navbar.Section grow component={ScrollArea}>
                {links}
            </Navbar.Section>

            <Navbar.Section>
                <UserButton
                    userName={userName}
                    userEmail={userEmail}
                    onLogout={onLogout}
                    toggleColorScheme={toggleColorScheme}
                    colorScheme={colorScheme}
                />
            </Navbar.Section>
        </Navbar>
    );
}