// src/components/ProjetosIA/AIProjectTable.js
import React, { useState, useMemo } from 'react'; 
import { Table, ScrollArea, TextInput, Box, Text, Anchor, Badge, ActionIcon, Tooltip } from '@mantine/core';
import { IconSearch, IconExternalLink } from '@tabler/icons-react';
import { format } from 'date-fns'; // Para formatar datas

// Função para obter cor do badge baseado no status
const getStatusColor = (status) => {
    switch (status) {
        case 'Ativo': return 'green';
        case 'Em Manutenção': return 'orange';
        case 'Arquivado': return 'gray';
        case 'Backlog': return 'blue';
        case 'Em Construção': return 'yellow';
        case 'Período de Validação': return 'pink';
        default: return 'dark';
    }
};

function AIProjectTable({ projects = [] }) {
    const [searchTerm, setSearchTerm] = useState('');

    const filteredProjects = useMemo(() => {
        if (!searchTerm) return projects;
        const lowerCaseSearch = searchTerm.toLowerCase();
        return projects.filter(project =>
            project.name.toLowerCase().includes(lowerCaseSearch) ||
            (project.description && project.description.toLowerCase().includes(lowerCaseSearch)) ||
            (project.tools_used && project.tools_used.toLowerCase().includes(lowerCaseSearch)) ||
            (project.creator_names && project.creator_names.toLowerCase().includes(lowerCaseSearch)) ||
            project.status.toLowerCase().includes(lowerCaseSearch)
        );
    }, [projects, searchTerm]);


    const rows = filteredProjects.map((item) => (
        <Table.Tr key={item.id}>
            <Table.Td>
                <Text fw={500}>{item.name || '-'}</Text>
            </Table.Td>
            <Table.Td>{item.creation_date ? format(new Date(item.creation_date), 'dd/MM/yyyy') : '-'}</Table.Td>
            <Table.Td>{item.finalization_date ? format(new Date(item.finalization_date), 'dd/MM/yyyy') : '-'}</Table.Td>
            <Table.Td>
                 <Tooltip label={item.description} multiline w={220} withArrow position="top-start" disabled={!item.description || item.description.length < 50}>
                    <Text size="sm" lineClamp={2}>{item.description || '-'}</Text>
                 </Tooltip>
            </Table.Td>
            <Table.Td>
                <Badge color={getStatusColor(item.status)} variant="light">
                    {item.status || '-'}
                </Badge>
            </Table.Td>
            <Table.Td>
                {item.project_link ? (
                    <Tooltip label="Abrir link do projeto">
                        <Anchor href={item.project_link} target="_blank" rel="noopener noreferrer">
                            <ActionIcon variant="subtle" color="blue">
                               <IconExternalLink size={16} />
                            </ActionIcon>
                        </Anchor>
                    </Tooltip>
                ) : '-'}
            </Table.Td>
            <Table.Td><Text size="sm">{item.tools_used || '-'}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.project_version || '-'}</Text></Table.Td>
            <Table.Td><Text size="sm">{item.creator_names || '-'}</Text></Table.Td>
            {/* <Table.Td><Text size="sm">{item.creator_email || '-'}</Text></Table.Td> */}
        </Table.Tr>
    ));

    return (
        <Box>
            <TextInput
                placeholder="Buscar por nome, status, criador..."
                leftSection={<IconSearch size={14} />}
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.currentTarget.value)}
                mb="md"
            />
            <ScrollArea>
                <Table striped highlightOnHover withTableBorder withColumnBorders miw={1000}>
                    <Table.Thead>
                        <Table.Tr>
                            <Table.Th>Nome</Table.Th>
                            <Table.Th>Data Criação</Table.Th>
                            <Table.Th>Data Finalização</Table.Th>
                            <Table.Th>Descrição</Table.Th>
                            <Table.Th>Status</Table.Th>
                            <Table.Th>Link</Table.Th>
                            <Table.Th>Ferramentas</Table.Th>
                            <Table.Th>Versão</Table.Th>
                            <Table.Th>Criador(es)</Table.Th>
                            {/* <Table.Th>Registrado Por</Table.Th> */}
                        </Table.Tr>
                    </Table.Thead>
                    <Table.Tbody>
                        {rows.length > 0 ? rows : (
                            <Table.Tr>
                                <Table.Td colSpan={9} align="center">
                                    <Text c="dimmed">Nenhum projeto encontrado com os filtros atuais.</Text>
                                </Table.Td>
                            </Table.Tr>
                        )}
                    </Table.Tbody>
                </Table>
            </ScrollArea>
        </Box>
    );
}

export default AIProjectTable;