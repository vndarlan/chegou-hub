// frontend/src/components/NavbarNested/LinksGroup.js
import { useState } from 'react';
// --- IMPORTAR useNavigate ---
import { useNavigate, useLocation } from 'react-router-dom'; // Adiciona useLocation
import { Group, Box, Collapse, ThemeIcon, Text, UnstyledButton, rem } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import classes from './LinksGroup.module.css';


// Props: icon, label, initiallyOpened, links, activePage, setActivePage, collapsed, link (link direto)
export function LinksGroup({ icon: Icon, label, initiallyOpened, links, activePage, setActivePage, collapsed, link: directLink }) {
  const navigate = useNavigate(); // Hook para navegação
  const location = useLocation(); // Hook para localização atual
  const hasLinks = Array.isArray(links) && links.length > 0;
  const [opened, setOpened] = useState(initiallyOpened || false);

  // Gera os itens de sublink (páginas)
  const items = (hasLinks ? links : []).map((subLink) => (
    <Text
      component="a"
      className={classes.link}
      href={subLink.link || '#'}
      key={subLink.label}
      onClick={(event) => {
        event.preventDefault();
        setActivePage(subLink.label);
        // Se sublinks devem navegar, use navigate(subLink.link)
        if (subLink.link && subLink.link !== '#') {
             navigate(subLink.link);
        }
        console.log(`Sublink clicado: ${subLink.label}`);
      }}
      // Verifica se a ROTA do sublink corresponde à rota atual
      data-active={location.pathname === subLink.link || undefined}
    >
      {subLink.label}
    </Text>
  ));

  // Handler para clicar no item principal
  const handleControlClick = () => {
      if (hasLinks) {
          setOpened((o) => !o);
      } else if (directLink) {
          // --- NAVEGA SE FOR LINK DIRETO ---
          // setActivePage(label); // A ativação visual vem da rota agora
          navigate(directLink);
          console.log(`Link direto clicado: ${label}, navegando para ${directLink}`);
      } else {
          // setActivePage(label); // A ativação visual vem da rota agora
          console.log(`Item clicado (sem sublinks/link direto): ${label}`);
      }
  };

   // Verifica se a ROTA direta corresponde à rota atual
   // ou se a ROTA de algum sublink corresponde à rota atual
   const isActive = location.pathname === directLink ||
                    (hasLinks && links.some(subLink => location.pathname === subLink.link));


  return (
    <>
      <UnstyledButton
        onClick={handleControlClick}
        // Aplica classe 'controlActive' se a rota corresponder
        className={`${classes.control} ${collapsed ? classes.controlCollapsed : ''} ${isActive ? classes.controlActive : ''}`}
      >
        <Group justify="space-between" gap={0} wrap="nowrap">
          <Box style={{ display: 'flex', alignItems: 'center' }}>
            <ThemeIcon variant="light" size={30} color="orange">
              <Icon style={{ width: rem(18), height: rem(18) }} color='var(--mantine-color-orange-filled)'/>
            </ThemeIcon>
            <Box ml="md" className={collapsed ? classes.labelCollapsed : ''}>{label}</Box>
          </Box>
          {hasLinks && !collapsed && (
            <IconChevronRight
              className={classes.chevron}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: opened ? 'rotate(90deg)' : 'none',
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {/* Expande o grupo se um dos seus filhos estiver ativo */}
      {hasLinks ? <Collapse in={opened || isActive}>{items}</Collapse> : null}
    </>
  );
}