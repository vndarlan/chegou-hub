import * as React from "react"
import { ChevronRight } from "lucide-react"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "./ui/collapsible"
import {
  SidebarGroup,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
} from "./ui/sidebar"

export function NavMain({ items, navigate, currentPath }) {
  const handleItemClick = (item) => {
    if (item.external) {
      window.open(item.url, '_blank');
    } else {
      navigate(item.url);
    }
  };

  return (
    <SidebarGroup>
      <SidebarMenu>
        {items.map((item) => (
          <Collapsible key={item.title} asChild defaultOpen={item.isActive}>
            <SidebarMenuItem>
              <SidebarMenuButton asChild tooltip={item.title}>
                <a href="#" onClick={(e) => e.preventDefault()}>
                  <item.icon />
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
              {item.items?.length ? (
                <>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton>
                      <item.icon />
                      <span>{item.title}</span>
                      <ChevronRight className="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <SidebarMenuSub>
                      {item.items?.map((subItem) => (
                        <SidebarMenuSubItem key={subItem.title}>
                          <SidebarMenuSubButton 
                            asChild
                            isActive={currentPath === subItem.url}
                          >
                            <a
                              href={subItem.external ? subItem.url : "#"}
                              target={subItem.external ? "_blank" : undefined}
                              rel={subItem.external ? "noopener noreferrer" : undefined}
                              onClick={(e) => {
                                if (!subItem.external) {
                                  e.preventDefault();
                                  handleItemClick(subItem);
                                }
                              }}
                            >
                              <span>{subItem.title}</span>
                              {subItem.external && (
                                <span className="ml-auto text-xs opacity-60">↗</span>
                              )}
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  </CollapsibleContent>
                </>
              ) : null}
            </SidebarMenuItem>
          </Collapsible>
        ))}
      </SidebarMenu>
    </SidebarGroup>
  )
}