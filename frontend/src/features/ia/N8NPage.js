import React from 'react';
import { Box, Title, Text, Card, ThemeIcon, Stack, Group } from '@mantine/core';
import { IconSettings, IconClock } from '@tabler/icons-react';

function N8NPage() {
    return (
        <Box p="md">
            <Card shadow="sm" padding="xl" radius="md" withBorder style={{ textAlign: 'center' }}>
                <Stack gap="lg" align="center">
                    <ThemeIcon 
                        size="xl" 
                        radius="md" 
                        variant="light" 
                        color="blue"
                        style={{ width: '80px', height: '80px' }}
                    >
                        <IconSettings size={40} />
                    </ThemeIcon>
                    
                    <Box>
                        <Title order={2} mb="sm">N8N - Workflows</Title>
                        <Text c="dimmed" size="lg">
                            Funcionalidades específicas do N8N em desenvolvimento
                        </Text>
                    </Box>
                    
                    <Group gap="sm">
                        <ThemeIcon size="sm" radius="xl" variant="light" color="orange">
                            <IconClock size={16} />
                        </ThemeIcon>
                        <Text fw={600} c="orange">Em breve</Text>
                    </Group>
                    
                    <Text size="sm" c="dimmed" ta="center" maw={400}>
                        Por enquanto, use a página <strong>Monitoramento de Erros - IA</strong> 
                        para visualizar logs do N8N com todos os filtros disponíveis.
                    </Text>
                </Stack>
            </Card>
        </Box>
    );
}

export default N8NPage;