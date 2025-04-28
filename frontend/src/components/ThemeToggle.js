// frontend/src/components/ThemeToggle.js
import React from 'react';
import { ActionIcon, useMantineColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ThemeToggle({ colorScheme, toggleColorScheme }) {
  const isDark = colorScheme === 'dark';

  return (
    <ActionIcon
      onClick={toggleColorScheme}
      variant="default"
      size="lg"
      aria-label="Alternar tema"
      title={isDark ? "Modo Claro" : "Modo Escuro"}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </ActionIcon>
  );
}

export default ThemeToggle;