// frontend/src/components/DoubleNavbar.js - ARQUIVO COMPLETO
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
    Navbar,
    ScrollArea,
    Group,
    Text,
    Avatar,
    UnstyledButton,
    Box,
    Collapse,
    ThemeIcon,
    ActionIcon,
    Divider,
    Stack,
    Button
} from '@mantine/core';
import {
    IconCalendar,
    IconMap,
    IconTrendingUp,
    IconRobot,           // ← NOVO ÍCONE
    IconHeadphones,
    IconLogout,
    IconMoon,
    IconSun,
    IconHome,
    IconChevronDown,
    IconChevronRight,
    IconBrain,           // ← NOVO ÍCONE ALTERNATIVO
    IconActivity,        // ← NOVO ÍCONE
    IconSettings         // ← NOVO ÍCONE
} from '@tabler/icons-react';

// ===================================================================
// DADOS DE NAVEGAÇÃO ATUALIZADOS COM SEÇÃO IA & AUTOMAÇÕES
// ===================================================================
const navData = [
    {
        label: 'Home',
        icon: IconHome,
        initiallyOpened: true,
        color: 'blue',
        links: [
            { label: 'Agenda', link: '/workspace/agenda', icon: IconCalendar },
            { label: 'Mapa', link: '/workspace/mapa', icon: IconMap },
        ],
    },
    {
        label: 'IA & Automações',    // ← NOVA SEÇÃO ADICIONADA
        icon: IconRobot,
        initiallyOpened: false,
        color: 'orange',
        links: [
            { label: 'Logs Gerais', link: '/workspace/ia-automacoes/logs', icon: IconActivity },
            { label: 'Nicochat', link: '/workspace/ia-automacoes/nicochat', icon: IconBrain },
            { label: 'N8N', link: '/workspace/ia-automacoes/n8n', icon: IconSettings },
        ],
    },
    {
        label: 'Operacional',
        icon: IconTrendingUp,
        initiallyOpened: false,
        color: 'green',
        links: [
            { label: 'Engajamento', link: '/workspace/engajamento', icon: IconTrendingUp },
        ],
    },
    {
        label: 'Suporte',
        icon: IconHeadphones,
        initiallyOpened: false,
        color: 'purple',
        links: [
            { label: 'Em Breve', link: '/workspace/suporte', icon: IconHeadphones },
        ],
    },
];

// ===================================================================
// COMPONENTE DE LINK DE NAVEGAÇÃO
// ===================================================================
function NavbarLink({ icon: Icon, label, link, active, onClick, color }) {
    return (
        <UnstyledButton
            onClick={() => onClick(link)}
            style={{
                display: 'block',
                width: '100%',
                padding: '8px 12px',
                borderRadius: '6px',
                textDecoration: 'none',
                backgroundColor: active ? `light-dark(var(--mantine-color-${color}-0), var(--mantine-color-${color}-9))` : 'transparent',
                color: active ? `var(--mantine-color-${color}-7)` : 'light-dark(var(--mantine-color-gray-7), var(--mantine-color-gray-3))',
                fontWeight: active ? 600 : 400,
                transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => {
                if (!active) {
                    e.target.style.backgroundColor = 'light-dark(var(--mantine-color-gray-1), var(--mantine-color-dark-6))';
                }
            }}
            onMouseLeave={(e) => {
                if (!active) {
                    e.target.style.backgroundColor = 'transparent';
                }
            }}
        >
            <Group gap="sm">
                <ThemeIcon 
                    variant={active ? 'light' : 'subtle'} 
                    color={active ? color : 'gray'} 
                    size="sm"
                >
                    <Icon size="1rem" />
                </ThemeIcon>
                <Text size="sm">{label}</Text>
            </Group>
        </UnstyledButton>
    );
}

// ===================================================================
// COMPONENTE DE SEÇÃO DE NAVEGAÇÃO (COM COLLAPSE)
// ===================================================================
function NavbarSection({ section, activeLink, onLinkClick }) {
    const [opened, setOpened] = useState(section.initiallyOpened);
    const navigate = useNavigate();

    const handleSectionClick = () => {
        setOpened(!opened);
        // Se for clicado na seção IA & Automações, navegar para logs por padrão
        if (section.label === 'IA & Automações' && !opened) {
            navigate('/workspace/ia-automacoes/logs');
        }
    };

    const items = section.links.map((link) => (
        <NavbarLink
            key={link.label}
            icon={link.icon}
            label={link.label}
            link={link.link}
            active={activeLink === link.link}
            onClick={onLinkClick}
            color={section.color}
        />
    ));

    return (
        <Box mb="md">
            <UnstyledButton
                onClick={handleSectionClick}
                style={{
                    display: 'block',
                    width: '100%',
                    padding: '8px 12px',
                    borderRadius: '6px',
                    backgroundColor: 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))',
                    border: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-5))',
                    transition: 'all 0.2s ease',
                }}
                onMouseEnter={(e) => {
                    e.target.style.backgroundColor = `light-dark(var(--mantine-color-${section.color}-0), var(--mantine-color-${section.color}-9))`;
                }}
                onMouseLeave={(e) => {
                    e.target.style.backgroundColor = 'light-dark(var(--mantine-color-gray-0), var(--mantine-color-dark-7))';
                }}
            >
                <Group justify="space-between">
                    <Group gap="sm">
                        <ThemeIcon variant="light" color={section.color} size="sm">
                            <section.icon size="1rem" />
                        </ThemeIcon>
                        <Text fw={600} size="sm">
                            {section.label}
                        </Text>
                    </Group>
                    <ThemeIcon variant="subtle" color="gray" size="xs">
                        {opened ? <IconChevronDown size="0.8rem" /> : <IconChevronRight size="0.8rem" />}
                    </ThemeIcon>
                </Group>
            </UnstyledButton>

            <Collapse in={opened}>
                <Box pl="md" pt="sm">
                    <Stack gap="xs">
                        {items}
                    </Stack>
                </Box>
            </Collapse>
        </Box>
    );
}

// ===================================================================
// COMPONENTE PRINCIPAL - DOUBLE NAVBAR
// ===================================================================
export function DoubleNavbar({ userName, userEmail, onLogout, colorScheme, toggleColorScheme }) {
    const navigate = useNavigate();
    const location = useLocation();

    const handleLinkClick = (link) => {
        navigate(link);
    };

    // Determinar link ativo baseado na URL atual
    const getActiveLink = () => {
        const pathname = location.pathname;
        
        // Verificar se está em uma das rotas de IA & Automações
        if (pathname.includes('/ia-automacoes/')) {
            if (pathname.includes('/nicochat')) return '/workspace/ia-automacoes/nicochat';
            if (pathname.includes('/n8n')) return '/workspace/ia-automacoes/n8n';
            return '/workspace/ia-automacoes/logs'; // Default para logs
        }
        
        // Outras rotas
        if (pathname.includes('/agenda')) return '/workspace/agenda';
        if (pathname.includes('/mapa')) return '/workspace/mapa';
        if (pathname.includes('/engajamento')) return '/workspace/engajamento';
        if (pathname.includes('/suporte')) return '/workspace/suporte';
        
        return pathname;
    };

    const activeLink = getActiveLink();

    return (
        <Navbar 
            width={{ base: 280 }} 
            p="md"
            style={{
                borderRight: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))',
                backgroundColor: 'light-dark(var(--mantine-color-white), var(--mantine-color-dark-8))',
            }}
        >
            <Navbar.Section>
                {/* Header com informações do usuário */}
                <Group justify="space-between" mb="md">
                    <Group gap="sm">
                        <Avatar color="orange" radius="xl" size="sm">
                            {userName?.charAt(0)?.toUpperCase() || 'U'}
                        </Avatar>
                        <Box style={{ flex: 1 }}>
                            <Text size="sm" fw={600} truncate>
                                {userName || 'Usuário'}
                            </Text>
                            <Text size="xs" c="dimmed" truncate>
                                {userEmail || 'email@exemplo.com'}
                            </Text>
                        </Box>
                    </Group>
                    
                    {/* Botão de toggle tema */}
                    <ActionIcon
                        onClick={toggleColorScheme}
                        variant="subtle"
                        color="gray"
                        size="sm"
                    >
                        {colorScheme === 'dark' ? <IconSun size="1rem" /> : <IconMoon size="1rem" />}
                    </ActionIcon>
                </Group>

                <Divider mb="md" />
            </Navbar.Section>

            {/* Seções de navegação */}
            <Navbar.Section grow component={ScrollArea}>
                {navData.map((section) => (
                    <NavbarSection
                        key={section.label}
                        section={section}
                        activeLink={activeLink}
                        onLinkClick={handleLinkClick}
                    />
                ))}
            </Navbar.Section>

            {/* Footer com botão de logout */}
            <Navbar.Section>
                <Divider mb="md" />
                <Button
                    variant="subtle"
                    color="red"
                    fullWidth
                    leftSection={<IconLogout size="1rem" />}
                    onClick={onLogout}
                    size="sm"
                >
                    Sair
                </Button>
            </Navbar.Section>
        </Navbar>
    );
}