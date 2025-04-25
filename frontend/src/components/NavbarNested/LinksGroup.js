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
        setActivePage(subLink.label);
        if (subLink.link && subLink.link !== '#') {
          navigate(subLink.link);
        }
        if (collapsed) {
          setPopoverOpened(false);
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
  const handleControlClick = () => {
    if (hasLinks) {
      if (collapsed) {
        // No modo colapsado, não abre/fecha
        setPopoverOpened((o) => !o);
      } else {
        // Modo normal, abre/fecha o submenu
        setOpened((o) => !o);
      }
    } else if (directLink) {
      navigate(directLink);
    }
  };

  // Se estiver colapsado e tiver subitens, usar Popover
  if (collapsed && hasLinks) {
    return (
      <Popover
        opened={popoverOpened}
        onClose={() => setPopoverOpened(false)}
        position="right"
        withArrow
        shadow="md"
        width={220}
        withinPortal
      >
        <Popover.Target>
          <div 
            onMouseEnter={() => setPopoverOpened(true)}
            onMouseLeave={() => setPopoverOpened(false)}
          >
            <UnstyledButton
              onClick={handleControlClick}
              className={`${classes.control} ${classes.controlCollapsed} ${isActive ? classes.controlActive : ''}`}
            >
              <Group justify="space-between" gap={0} wrap="nowrap">
                <Box style={{ display: 'flex', alignItems: 'center' }}>
                  <ThemeIcon variant="light" size={30} color="orange">
                    <Icon style={{ width: rem(18), height: rem(18) }} color='var(--mantine-color-orange-filled)'/>
                  </ThemeIcon>
                  <Box ml="md" className={classes.labelCollapsed}>{label}</Box>
                </Box>
              </Group>
            </UnstyledButton>
          </div>
        </Popover.Target>
        <Popover.Dropdown>
          <Text weight={500} size="sm" mb="xs">{label}</Text>
          <div className={classes.popoverLinks}>
            {items}
          </div>
        </Popover.Dropdown>
      </Popover>
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