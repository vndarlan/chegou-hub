// frontend/src/components/DoubleNavbar.js
// ATUALIZADO EM: 2025-01-02 - VERSÃO COM DEBUG COMPLETO

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
    ScrollArea
} from '@mantine/core';
import {
    IconCalendar,
    IconWorld,
    IconActivity,
    IconRobot,
    IconWorkflow,
    IconHeart,
    IconHeadphones,
    IconLogout,
    IconBrain
} from '@tabler/icons-react';

// ⚡ FORÇA CONSOLE LOG PARA DEBUG
console.log('🚀 DoubleNavbar.js CARREGADO EM:', new Date().toLocaleTimeString());

const navigationSections = [
    {
        label: 'HOME',
        items: [
            { label: 'Agenda da Empresa', to: '/workspace/agenda', icon: IconCalendar, color: 'blue' },
            { label: 'Mapa de Países', to: '/workspace/mapa', icon: IconWorld, color: 'green' }
        ]
    },
    {
        label: 'IA & Automações',
        items: [
            { label: 'Logs Gerais', to: '/workspace/logs', icon: IconActivity, color: 'purple' },
            { label: 'Nicochat', to: '/workspace/nicochat', icon: IconRobot, color: 'blue' },
            { label: 'N8N', to: '/workspace/n8n', icon: IconWorkflow, color: 'grape' }
        ]
    },
    {
        label: 'OPERACIONAL',
        items: [
            { label: 'Engajamento', to: '/workspace/engajamento', icon: IconHeart, color: 'red' },
            { label: 'Suporte', to: '/workspace/suporte', icon: IconHeadphones, color: 'cyan' }
        ]
    }
];

function NavItem({ icon: Icon, label, to, active, onClick, color }) {
    return (
        <UnstyledButton
            onClick={onClick}
            style={(theme) => ({
                display: 'block',
                width: '100%',
                padding: '8px',
                borderRadius: '6px',
                color: active ? 'white' : 'inherit',
                backgroundColor: active ? `var(--mantine-color-${color}-6)` : 'transparent',
                marginBottom: '4px',
                transition: 'all 0.2s ease'
            })}
        >
            <Group gap="sm">
                <ThemeIcon
                    variant={active ? 'white' : 'light'}
                    color={color}
                    size={32}
                    radius="md"
                >
                    <Icon size={18} />
                </ThemeIcon>
                <Text size="sm" fw={active ? 600 : 500}>
                    {label}
                </Text>
            </Group>
        </UnstyledButton>
    );
}

export function DoubleNavbar({ userName, userEmail, onLogout, toggleColorScheme, colorScheme }) {
    const navigate = useNavigate();
    const location = useLocation();

    // ⚡ DEBUG COMPLETO
    console.log('🔍 DoubleNavbar RENDERIZADO!');
    console.log('🔍 Props recebidas:', { userName, userEmail, colorScheme });
    console.log('🔍 Localização atual:', location.pathname);
    console.log('🔍 Seções de navegação:', navigationSections);

    const handleNavigation = (to) => {
        console.log('🔗 Navegando para:', to);
        navigate(to);
    };

    const isActive = (to) => {
        const active = location.pathname === to;
        console.log(`🎯 Verificando ativo para ${to}:`, active);
        return active;
    };

    return (
        <Navbar 
            width={{ sm: 300 }} 
            p="md" 
            style={{ 
                borderRight: '1px solid #e0e0e0',
                backgroundColor: 'white',
                height: '100vh'
            }}
        >
            {/* Header */}
            <Navbar.Section>
                <Box 
                    p="md" 
                    style={{ 
                        background: 'linear-gradient(135deg, #fd7e14, #e03131)',
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
                            <Text 
                                size="xs" 
                                fw={600} 
                                c="dimmed" 
                                mb="sm"
                                style={{ 
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.5px'
                                }}
                            >
                                {section.label}
                            </Text>
                            
                            <Stack gap="xs">
                                {section.items.map((item, itemIndex) => {
                                    console.log(`🔢 Renderizando item ${sectionIndex}-${itemIndex}:`, item.label);
                                    return (
                                        <NavItem
                                            key={`${section.label}-${item.to}`}
                                            icon={item.icon}
                                            label={item.label}
                                            to={item.to}
                                            color={item.color}
                                            active={isActive(item.to)}
                                            onClick={() => handleNavigation(item.to)}
                                        />
                                    );
                                })}
                            </Stack>
                            
                            {sectionIndex < navigationSections.length - 1 && (
                                <Divider my="md" />
                            )}
                        </Box>
                    ))}
                </Stack>
            </Navbar.Section>

            {/* Footer com usuário */}
            <Navbar.Section>
                <Divider mb="sm" />
                <Group justify="space-between" wrap="nowrap">
                    <Box style={{ flex: 1, minWidth: 0 }}>
                        <Text size="sm" fw={500} truncate>
                            {userName || 'Usuário'}
                        </Text>
                        <Text size="xs" c="dimmed" truncate>
                            {userEmail || 'email@exemplo.com'}
                        </Text>
                    </Box>
                    <UnstyledButton 
                        onClick={() => {
                            console.log('🚪 Logout clicado');
                            onLogout();
                        }}
                        style={{
                            borderRadius: '6px',
                            padding: '4px'
                        }}
                    >
                        <ThemeIcon variant="light" color="red" size="sm">
                            <IconLogout size={16} />
                        </ThemeIcon>
                    </UnstyledButton>
                </Group>
            </Navbar.Section>
        </Navbar>
    );
}

// ⚡ LOG FINAL
console.log('✅ DoubleNavbar.js EXPORTADO COM SUCESSO');