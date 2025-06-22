// frontend/src/components/NavbarNested/Logo.js
import React from 'react';
import { Text, Group } from '@mantine/core';

export function Logo(props) {
  return (
    <Group gap="xs" {...props}>
      <div
        style={{
          width: 30,
          height: 30,
          backgroundColor: 'var(--mantine-color-orange-6)',
          borderRadius: '6px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: 'white',
          fontWeight: 'bold',
          fontSize: '14px'
        }}
      >
        CH
      </div>
      <div>
        <Text fw={700} size="md" style={{ lineHeight: 1.2 }}>
          Chegou Hub
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
          BETA
        </Text>
      </div>
    </Group>
  );
}