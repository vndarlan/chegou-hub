// frontend/src/components/NavbarNested/LinksGroup.js
import { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../ui/collapsible';
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
    <a
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
      <div className="flex items-center gap-2">
        {subLink.icon && (
          <div className={`w-5 h-5 flex items-center justify-center rounded ${
            location.pathname === subLink.link 
              ? 'bg-primary/10 text-primary' 
              : 'bg-muted text-muted-foreground'
          }`}>
            <subLink.icon size={14} />
          </div>
        )}
        <span className={`text-sm ${
          location.pathname === subLink.link ? 'font-semibold' : 'font-medium'
        }`}>
          {subLink.label}
        </span>
      </div>
    </a>
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
    <Collapsible open={shouldBeOpened} onOpenChange={setOpened}>
      <CollapsibleTrigger asChild>
        <Button
          variant="ghost"
          onClick={handleControlClick}
          className={`${classes.control} ${isGroupActive ? classes.controlActive : ''} w-full justify-start`}
        >
          <div className="flex justify-between items-center w-full">
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 flex items-center justify-center rounded ${
                isGroupActive 
                  ? 'bg-primary/10 text-primary' 
                  : 'bg-muted text-muted-foreground'
              }`}>
                <Icon size={18} />
              </div>
              <span className={`text-sm ${
                isGroupActive ? 'font-semibold text-primary' : 'font-medium text-foreground'
              }`}>
                {label}
              </span>
            </div>
            {hasLinks && (
              <IconChevronRight
                className={classes.chevron}
                stroke={1.5}
                size={16}
                style={{
                  transform: shouldBeOpened ? 'rotate(90deg)' : 'none',
                  transition: 'transform 200ms ease',
                }}
              />
            )}
          </div>
        </Button>
      </CollapsibleTrigger>
      {hasLinks && (
        <CollapsibleContent className="space-y-1">
          {items}
        </CollapsibleContent>
      )}
    </Collapsible>
  );
}