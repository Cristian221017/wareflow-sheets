import { NavLink, useLocation } from "react-router-dom";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";
import { 
  BarChart3, 
  Package, 
  FileText, 
  CheckCircle, 
  Users,
  Printer
} from 'lucide-react';

const mainItems = [
  { title: "Dashboard", path: "dashboard", icon: BarChart3 },
  { title: "Fluxo de NFs", path: "fluxo-nfs", icon: Package },
  { title: "Notas Fiscais", path: "notas-fiscais", icon: Package },
  { title: "Solicitações Pendentes", path: "pedidos-liberacao", icon: FileText },
  { title: "Solicitações Confirmadas", path: "pedidos-liberados", icon: CheckCircle },
  { title: "Relatórios", path: "relatorios", icon: BarChart3 },
];

interface TransportadoraSidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function TransportadoraSidebar({ activeTab, onTabChange }: TransportadoraSidebarProps) {
  const { state } = useSidebar();

  const isActive = (path: string) => activeTab === path;
  const getNavCls = (path: string) =>
    isActive(path) ? "bg-muted text-primary font-medium" : "hover:bg-muted/50";

  return (
    <Sidebar collapsible="icon">
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu Principal</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {mainItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton 
                    onClick={() => onTabChange(item.path)}
                    className={getNavCls(item.path)}
                  >
                    <item.icon className="mr-2 h-4 w-4" />
                    {state !== "collapsed" && <span>{item.title}</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}