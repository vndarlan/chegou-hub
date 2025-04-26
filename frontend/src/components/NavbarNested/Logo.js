// frontend/src/components/NavbarNested/Logo.js
import React from 'react';
import { Text, Group, Image } from '@mantine/core';
import logoImage from './logo.png'; // Ajuste o caminho conforme a localização real

export function Logo(props) {
  return (
    <Group gap="xs" {...props}>
      <Image src={logoImage} alt="Chegou Hub Logo" width={30} height={30} />
      <div>
        <Text fw={700} size="md" style={{ lineHeight: 1.2 }}>
          Chegou Hub
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
          v1.0.2
        </Text>
      </div>
    </Group>
  );
}