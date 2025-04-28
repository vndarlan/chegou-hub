// frontend/src/components/ThemeToggle.js
import React from 'react';
import { ActionIcon, useMantineColorScheme, useComputedColorScheme } from '@mantine/core';
import { IconSun, IconMoon } from '@tabler/icons-react';

function ThemeToggle() {
  const { toggleColorScheme } = useMantineColorScheme();
  const computedColorScheme = useComputedColorScheme('light', { getInitialValueInEffect: true });
  
  const isDark = computedColorScheme === 'dark';

  return (
    <ActionIcon
      onClick={() => toggleColorScheme()}
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