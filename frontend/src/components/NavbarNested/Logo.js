// frontend/src/components/NavbarNested/Logo.js
import React from 'react';
import { Text, Group, Image, Box } from '@mantine/core';

export function Logo(props) {
  return (
    <Group gap="sm" {...props}>
      <Image
        src="/logo192.png"
        alt="ChegouHub Logo"
        width={32}
        height={32}
        fit="contain"
        fallbackSrc="data:image/svg+xml,%3csvg xmlns='http://www.w3.org/2000/svg' width='32' height='32' viewBox='0 0 32 32'%3e%3crect width='32' height='32' rx='6' fill='%23fd7e14'/%3e%3ctext x='16' y='20' text-anchor='middle' fill='white' font-family='Arial' font-weight='bold' font-size='12'%3eCH%3c/text%3e%3c/svg%3e"
      />
      <Box>
        <Text
          fw={700}
          size="lg"
          variant="gradient"
          gradient={{ from: 'orange', to: 'red', deg: 45 }}
          style={{ lineHeight: 1.2 }}
        >
          ChegouHub
        </Text>
        <Text size="xs" c="dimmed" style={{ lineHeight: 1 }}>
          Centro de Comando
        </Text>
      </Box>
    </Group>
  );
}