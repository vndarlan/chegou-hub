// frontend/src/components/NavbarNested/LinksGroup.js
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Group, Box, Collapse, ThemeIcon, Text, UnstyledButton, rem, Popover } from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import classes from './LinksGroup.module.css';

export function LinksGroup({ icon: Icon, label, initiallyOpened, links, activePage, setActivePage, collapsed, link: directLink }) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasLinks = Array.isArray(links) && links.length > 0;
  const [opened, setOpened] = useState(initiallyOpened || false);
  const [popoverOpened, setPopoverOpened] = useState(false);

  // Verifica se o item está ativo (selecionado)
  const isActive = location.pathname === directLink ||
                   (hasLinks && links.some(subLink => location.pathname === subLink.link));
  
  // Gera os itens de sublink com ícones
  const items = (hasLinks ? links : []).map((subLink) => (
    <Text
      component="a"
      className={classes.link}
      href={subLink.link || '#'}
      key={subLink.label}
      onClick={(event) => {
        event.preventDefault();
        event.stopPropagation(); // Impede propagação do clique
        setActivePage(subLink.label);
        if (subLink.link && subLink.link !== '#') {
          navigate(subLink.link);
          if (collapsed) {
            setPopoverOpened(false); // Fecha o popover após clicar
          }
        }
      }}
      data-active={location.pathname === subLink.link || undefined}
    >
      {subLink.icon && (
        <span className={classes.sublinkIcon}>
          <subLink.icon size={16} stroke={1.5} />
        </span>
      )}
      <span>{subLink.label}</span>
    </Text>
  ));

  // Handler para clicar no item principal
  const handleControlClick = (event) => {
    if (hasLinks) {
      if (collapsed) {
        // No modo colapsado, alterna visibilidade do popover
        setPopoverOpened((o) => !o);
      } else {
        // Modo normal, abre/fecha o submenu
        setOpened((o) => !o);
      }
    } else if (directLink) {
      navigate(directLink);
    }
  };

  // No modo colapsado com subitens, usar Popover persistente
  if (collapsed && hasLinks) {
    return (
      <div className={classes.linkWrapper}>
        <Popover
          opened={popoverOpened}
          position="right"
          offset={10}
          withArrow
          arrowPosition="center"
          shadow="md"
          width={220}
          withinPortal={true}
          clickOutsideEvents={['mousedown', 'touchstart']}
          closeOnClickOutside={true}
        >
          <Popover.Target>
            <UnstyledButton
              onClick={handleControlClick}
              className={`${classes.control} ${classes.controlCollapsed} ${isActive ? classes.controlActive : ''}`}
            >
              <Group justify="center" gap={0} wrap="nowrap">
                <ThemeIcon variant="light" size={30} color="orange">
                  <Icon style={{ width: rem(18), height: rem(18) }} color='var(--mantine-color-orange-filled)'/>
                </ThemeIcon>
              </Group>
            </UnstyledButton>
          </Popover.Target>
          <Popover.Dropdown>
            <Text fw={500} size="sm" mb="xs">{label}</Text>
            <div className={classes.popoverLinks}>
              {items}
            </div>
          </Popover.Dropdown>
        </Popover>
      </div>
    );
  }

  // Versão normal (não colapsada ou sem subitens)
  return (
    <>
      <UnstyledButton
        onClick={handleControlClick}
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
                transform: (opened || isActive) ? 'rotate(90deg)' : 'none',
              }}
              data-rotate={opened || isActive || undefined}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={opened || isActive}>{items}</Collapse> : null}
    </>
  );
}