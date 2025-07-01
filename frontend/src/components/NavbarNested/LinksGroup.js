// frontend/src/components/NavbarNested/LinksGroup.js
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  Group,
  Box,
  Collapse,
  ThemeIcon,
  Text,
  UnstyledButton,
  rem,
} from '@mantine/core';
import { IconChevronRight } from '@tabler/icons-react';
import classes from './LinksGroup.module.css';

export function LinksGroup({ 
  icon: Icon, 
  label, 
  initiallyOpened, 
  links, 
  activePage, 
  setActivePage, 
  collapsed, 
  link: directLink,
  activeMenu,
  setActiveMenu 
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const hasLinks = Array.isArray(links) && links.length > 0;
  const [opened, setOpened] = useState(initiallyOpened || false);

  // Verifica se o grupo está ativo (algum sublink está ativo)
  const isGroupActive = hasLinks && links.some(subLink => location.pathname === subLink.link);
  
  // Se o grupo está ativo, manter aberto
  const shouldBeOpened = opened || isGroupActive;

  // Gera os itens de sublink
  const items = (hasLinks ? links : []).map((subLink) => (
    <Text
      component="a"
      className={classes.link}
      href={subLink.link || '#'}
      key={subLink.label}
      onClick={(event) => {
        event.preventDefault();
        if (setActivePage) {
          setActivePage(subLink.label);
        }
        if (subLink.link && subLink.link !== '#') {
          navigate(subLink.link);
        }
      }}
      data-active={location.pathname === subLink.link || undefined}
    >
      <Group gap="sm" wrap="nowrap">
        {subLink.icon && (
          <ThemeIcon 
            variant="light" 
            color={location.pathname === subLink.link ? 'orange' : 'gray'} 
            size={20}
          >
            <subLink.icon size={14} />
          </ThemeIcon>
        )}
        <Text size="sm" fw={location.pathname === subLink.link ? 600 : 500}>
          {subLink.label}
        </Text>
      </Group>
    </Text>
  ));

  // Handler para clicar no item principal
  const handleControlClick = () => {
    if (hasLinks) {
      setOpened((o) => !o);
    } else if (directLink) {
      navigate(directLink);
    }
  };

  return (
    <>
      <UnstyledButton
        onClick={handleControlClick}
        className={`${classes.control} ${isGroupActive ? classes.controlActive : ''}`}
      >
        <Group justify="space-between" gap={0} wrap="nowrap">
          <Group gap="sm">
            <ThemeIcon 
              variant="light" 
              color={isGroupActive ? 'orange' : 'gray'} 
              size={30}
            >
              <Icon style={{ width: rem(18), height: rem(18) }} />
            </ThemeIcon>
            <Text 
              fw={isGroupActive ? 600 : 500} 
              size="sm" 
              c={isGroupActive ? 'orange.7' : 'gray.7'}
            >
              {label}
            </Text>
          </Group>
          {hasLinks && (
            <IconChevronRight
              className={classes.chevron}
              stroke={1.5}
              style={{
                width: rem(16),
                height: rem(16),
                transform: shouldBeOpened ? 'rotate(90deg)' : 'none',
                transition: 'transform 200ms ease',
              }}
            />
          )}
        </Group>
      </UnstyledButton>
      {hasLinks ? <Collapse in={shouldBeOpened}>{items}</Collapse> : null}
    </>
  );
}