import React from 'react';
import { Box, Title, Text, Card, ThemeIcon, Stack, Group } from '@mantine/core';
import { IconRobot, IconClock } from '@tabler/icons-react';

function NicochatPage() {
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
                        <IconRobot size={40} />
                    </ThemeIcon>
                    
                    <Box>
                        <Title order={2} mb="sm">Nicochat - Chatbot</Title>
                        <Text c="dimmed" size="lg">
                            Funcionalidades específicas do Nicochat em desenvolvimento
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
                        para visualizar logs do Nicochat com filtros por país e ferramenta.
                    </Text>
                </Stack>
            </Card>
        </Box>
    );
}

export default NicochatPage;