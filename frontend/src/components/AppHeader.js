// frontend/src/components/AppHeader.js ou onde estiver seu cabeçalho
import { /* imports existentes */ } from '@mantine/core';
import ThemeToggle from './ThemeToggle'; // Importe o componente

function AppHeader() {
  return (
    <Header height={60} p="md">
      <Group position="apart">
        <Group>
          {/* Logo e outros itens do lado esquerdo */}
        </Group>
        
        <Group>
          {/* Outros botões/controles do cabeçalho */}
          <ThemeToggle /> {/* Adicione o botão de alternância aqui */}
        </Group>
      </Group>
    </Header>
  );
}