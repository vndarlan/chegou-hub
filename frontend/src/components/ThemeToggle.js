// frontend/src/components/ThemeToggle.js
import React from 'react';
import { Button } from './ui/button';
import { IconSun, IconMoon } from '@tabler/icons-react';

// Este componente recebe colorScheme e toggleColorScheme como props
function ThemeToggle({ colorScheme, toggleColorScheme }) {
  const isDark = colorScheme === 'dark';

  return (
    <Button
      onClick={toggleColorScheme}
      variant="outline"
      size="icon"
      aria-label="Alternar tema"
      title={isDark ? "Modo Claro" : "Modo Escuro"}
    >
      {isDark ? <IconSun size={18} /> : <IconMoon size={18} />}
    </Button>
  );
}

export default ThemeToggle;