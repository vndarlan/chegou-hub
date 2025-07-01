// frontend/src/components/DoubleNavbar.js
// CORREÇÃO ESPECÍFICA PARA PÁGINAS DE IA APARECEREM

import React from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Navbar,
    Text,
    Group,
    Box,
    UnstyledButton,
    ThemeIcon,
    Stack,
    Divider,
    ScrollArea,
    Avatar,
    Menu
} from '@mantine/core';
import {
    IconCalendar,
    IconWorld,
    IconActivity,
    IconRobot,
    IconGitBranch,
    IconHeart,
    IconHeadphones,
    IconLogout,
    IconBrain,
    IconDots,
    IconSun,
    IconMoon
} from '@tabler/icons-react';

const navigationSections = [
    {
        label: 'HOME',
        items: [
            { 
                label: 'Agenda da Empresa', 
                to: '/workspace/agenda', 
                icon: IconCalendar, 
                color: 'blue',
                description: 'Calendários e eventos'
            },
            { 
                label: 'Mapa de Países', 
                to: '/workspace/mapa', 
                icon: IconWorld, 
                color: 'green',
                description: 'Status global de operações'
            }
        ]
    },
    {
        label: 'IA & Automações',
        items: [
            { 
                label: 'Logs Gerais', 
                to: '/workspace/logs', 
                icon: IconActivity, 
                color: 'purple',
                description: 'Todos os logs de IA'
            },
            { 
                label: 'Nicochat', 
                to: '/workspace/nicochat', 
                icon: IconRobot, 
                color: 'blue',
                description: 'Monitoramento por país'
            },
            { 
                label: 'N8N', 
                to: '/workspace/n8n', 
                icon: IconGitBranch, 
                color: 'grape',
                description: 'Workflows e automações'
            }
        ]
    },
    {
        label: 'OPERACIONAL',
        items: [
            { 
                label: 'Engajamento', 
                to: '/workspace/engajamento', 
                icon: IconHeart, 
                color: 'red',
                description: 'Automação de likes'
            },
            { 
                label: 'Suporte', 
                to: '/workspace/suporte', 
                icon: IconHeadphones, 
                color: 'cyan',
                description: 'Ferramentas de atendimento'
            }
        ]
    }
];

function NavItem({ icon: Icon, label, to, active, onClick, color, description }) {
    return (
        <UnstyledButton
            onClick={onClick}
            style={(theme) => ({
                display: 'block',
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                color: active ? 'white' : 'inherit',
                backgroundColor: active ? `var(--mantine-color-${color}-6)` : 'transparent',
                marginBottom: '2px',
                transition: 'all 0.2s ease',
                '&:hover': {
                    backgroundColor: active 
                        ? `var(--mantine-color-${color}-7)`
                        : 'var(--mantine-color-gray-1)'
                }
            })}
        >
            <Group gap="sm" wrap="nowrap">
                <ThemeIcon
                    variant={active ? 'white' : 'light'}
                    color={color}
                    size={36}
                    radius="md"
                >
                    <Icon size={20} />
                </ThemeIcon>
                <Box style={{ flex: 1, minWidth: 0 }}>
                    <Text size="sm" fw={active ? 600 : 500} truncate>
                        {label}
                    </Text>
                    <Text size="xs" c={active ? 'white' : 'dimmed'} truncate>
                        {description}
                    </Text>
                </Box>
            </Group>
        </UnstyledButton>
    );
}

function UserSection({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
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
        <Box
            style={{
                paddingTop: '12px',
                borderTop: '1px solid var(--mantine-color-gray-3)',
                marginTop: '12px'
            }}
        >
            <Menu shadow="md" width={200} position="top-end">
                <Menu.Target>
                    <UnstyledButton
                        style={{
                            display: 'block',
                            width: '100%',
                            padding: '8px',
                            borderRadius: '8px',
                            '&:hover': {
                                backgroundColor: 'var(--mantine-color-gray-1)'
                            }
                        }}
                    >
                        <Group gap="sm">
                            <Avatar size={32} radius="xl" color="orange">
                                {getInitials(userName)}
                            </Avatar>
                            <Box style={{ flex: 1, minWidth: 0 }}>
                                <Text size="sm" fw={500} truncate>
                                    {userName || 'Usuário'}
                                </Text>
                                <Text size="xs" c="dimmed" truncate>
                                    {userEmail || 'email@exemplo.com'}
                                </Text>
                            </Box>
                            <IconDots size={16} />
                        </Group>
                    </UnstyledButton>
                </Menu.Target>

                <Menu.Dropdown>
                    <Menu.Label>Configurações</Menu.Label>
                    
                    {toggleColorScheme && (
                        <Menu.Item
                            leftSection={colorScheme === 'dark' ? <IconSun size={16} /> : <IconMoon size={16} />}
                            onClick={toggleColorScheme}
                        >
                            {colorScheme === 'dark' ? 'Modo Claro' : 'Modo Escuro'}
                        </Menu.Item>
                    )}

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

export function DoubleNavbar({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleNavigation = (to) => {
        navigate(to);
    };

    const isActive = (to) => {
        return location.pathname === to;
    };

    return (
        <Navbar 
            width={{ sm: 320 }} 
            p="md" 
            style={{ 
                borderRight: '1px solid var(--mantine-color-gray-3)',
                backgroundColor: 'var(--mantine-color-white)',
                height: '100vh'
            }}
        >
            {/* Header */}
            <Navbar.Section>
                <Box 
                    p="md" 
                    style={{ 
                        background: 'linear-gradient(135deg, var(--mantine-color-orange-6), var(--mantine-color-red-6))',
                        borderRadius: '8px',
                        marginBottom: '20px'
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
                            <Text size="sm" c="white" style={{ opacity: 0.9 }}>
                                Centro de Comando
                            </Text>
                        </Box>
                    </Group>
                </Box>
            </Navbar.Section>

            {/* Navigation */}
            <Navbar.Section grow component={ScrollArea}>
                <Stack gap="lg">
                    {navigationSections.map((section, sectionIndex) => (
                        <Box key={section.label}>
                            <Group gap="xs" mb="md">
                                <Text 
                                    size="xs" 
                                    fw={600} 
                                    c="dimmed" 
                                    style={{ 
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px'
                                    }}
                                >
                                    {section.label}
                                </Text>
                                <Divider style={{ flex: 1 }} />
                            </Group>
                            
                            <Stack gap="xs">
                                {section.items.map((item) => (
                                    <NavItem
                                        key={item.to}
                                        icon={item.icon}
                                        label={item.label}
                                        description={item.description}
                                        to={item.to}
                                        color={item.color}
                                        active={isActive(item.to)}
                                        onClick={() => handleNavigation(item.to)}
                                    />
                                ))}
                            </Stack>
                        </Box>
                    ))}
                </Stack>
            </Navbar.Section>

            {/* User Section */}
            <Navbar.Section>
                <UserSection
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