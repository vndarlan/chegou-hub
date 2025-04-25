// frontend/src/components/DoubleNavbar.js  <-- ESTE É O ARQUIVO QUE FALTAVA

import React from 'react'; // Importar React
import {
  IconAd,
  IconTools,
  IconChartInfographic,
  IconReceipt2,
  IconLogout,
} from '@tabler/icons-react';
import { Title, Tooltip, UnstyledButton } from '@mantine/core';
// Importar o CSS Module que JÁ EXISTE
import classes from './DoubleNavbar.module.css';

// --- NOSSAS ÁREAS ---
const areasData = [
  { icon: IconAd, label: 'ADS' },
  { icon: IconTools, label: 'Operacional' },
  { icon: IconChartInfographic, label: 'Métricas do Negócio' },
  { icon: IconReceipt2, label: 'Métricas de Vendas' },
];

// --- NOSSAS PÁGINAS DENTRO DAS ÁREAS (Exemplo) ---
const pagesData = {
  'ADS': ['Visão Geral', 'Campanhas', 'Criar Anúncio', 'Relatórios ADS'],
  'Operacional': ['Ferramenta X', 'Entrada de Dados', 'Processos Y', 'Automações'],
  'Métricas do Negócio': ['KPIs Principais', 'Visão Financeira', 'Desempenho Setores'],
  'Métricas de Vendas': ['Vendas por Período', 'Performance Vendedores', 'Funil de Vendas'],
};

// O componente que será exportado e usado em WorkspacePage
export function DoubleNavbar({ activeArea, setActiveArea, activePage, setActivePage, onLogout }) {

  const mainLinks = areasData.map((link) => (
    <Tooltip
      label={link.label}
      position="right"
      withArrow
      transitionProps={{ duration: 0 }}
      key={link.label}
    >
      <UnstyledButton
        onClick={() => {
          setActiveArea(link.label);
          const firstPageOfNewArea = pagesData[link.label]?.[0];
          setActivePage(firstPageOfNewArea || null);
          console.log(`Área ativa mudou para: ${link.label}, Página ativa: ${firstPageOfNewArea}`);
        }}
        // Usa as classes do CSS Module importado
        className={classes.mainLink}
        data-active={link.label === activeArea || undefined}
      >
        <link.icon size={22} stroke={1.5} />
      </UnstyledButton>
    </Tooltip>
  ));

  const subLinks = (pagesData[activeArea] || []).map((link) => (
    <a
      // Usa as classes do CSS Module importado
      className={classes.link}
      data-active={activePage === link || undefined}
      href="#"
      onClick={(event) => {
        event.preventDefault();
        setActivePage(link);
        console.log(`Página ativa mudou para: ${link}`);
      }}
      key={link}
    >
      {link}
    </a>
  ));

  return (
    // Usa as classes do CSS Module importado
    <nav className={classes.navbar}>
      <div className={classes.wrapper}>
        <div className={classes.aside}>
          {/* Logo pode ser adicionado aqui depois */}
          {mainLinks}
          <Tooltip label="Logout" position="right" withArrow transitionProps={{ duration: 0 }}>
             <UnstyledButton onClick={onLogout} className={classes.mainLink} style={{ marginTop: 'auto', marginBottom: '10px' }}>
               <IconLogout size={22} stroke={1.5} />
             </UnstyledButton>
          </Tooltip>
        </div>
        <div className={classes.main}>
          <Title order={4} className={classes.title}>
            {activeArea || 'Selecione uma Área'}
          </Title>
          {subLinks.length > 0 ? subLinks : <p>Nenhuma página nesta área.</p>}
        </div>
      </div>
    </nav>
  );
}

// Não precisa de 'export default' se você importa com chaves: import { DoubleNavbar } ...
// Se preferir default export, adicione no final: export default DoubleNavbar;
// e mude o import em WorkspacePage para: import DoubleNavbar from ...