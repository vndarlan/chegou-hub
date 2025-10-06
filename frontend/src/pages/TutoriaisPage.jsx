// frontend/src/pages/TutoriaisPage.jsx
import React, { useState, useEffect } from 'react';
import { ChevronRight, ChevronLeft, Home, BookOpen, Play } from 'lucide-react';
import axios from 'axios';

// shadcn/ui imports
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { ScrollArea } from '../components/ui/scroll-area';
import { Separator } from '../components/ui/separator';
import { Badge } from '../components/ui/badge';
import { LoadingSpinner } from '../components/ui';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '../components/ui/breadcrumb';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '../components/ui/collapsible';

function TutoriaisPage() {
  const [categorias, setCategorias] = useState([]);
  const [aulaAtual, setAulaAtual] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadingAula, setLoadingAula] = useState(false);
  const [error, setError] = useState(null);
  const [categoriasAbertas, setCategoriasAbertas] = useState({});

  // Carregar categorias ao montar
  useEffect(() => {
    carregarCategorias();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const carregarCategorias = async () => {
    setLoading(true);
    setError(null);
    try {
      console.log('🔍 Buscando categorias em:', '/tutoriais/categorias/');
      const response = await axios.get('/tutoriais/categorias/', {
        withCredentials: false // Página pública
      });
      console.log('✅ Categorias recebidas:', response.data);
      console.log('📊 Total de categorias:', response.data.length);

      setCategorias(response.data);

      // Abrir primeira categoria e selecionar primeira aula automaticamente
      if (response.data.length > 0) {
        const primeiraCategoria = response.data[0];
        console.log('📂 Primeira categoria:', primeiraCategoria);
        console.log('🎓 Aulas da primeira categoria:', primeiraCategoria.aulas);

        setCategoriasAbertas({ [primeiraCategoria.id]: true });

        if (primeiraCategoria.aulas && primeiraCategoria.aulas.length > 0) {
          console.log('▶️ Carregando primeira aula:', primeiraCategoria.aulas[0].slug);
          carregarAula(primeiraCategoria.aulas[0].slug);
        } else {
          console.warn('⚠️ Primeira categoria não tem aulas');
        }
      } else {
        console.warn('⚠️ Nenhuma categoria encontrada');
        setError('Nenhum tutorial disponível no momento.');
      }
    } catch (error) {
      console.error('❌ Erro ao carregar categorias:', error);
      console.error('❌ Detalhes do erro:', error.response?.data);
      console.error('❌ Status do erro:', error.response?.status);
      setError('Erro ao carregar tutoriais. Tente novamente mais tarde.');
    } finally {
      setLoading(false);
    }
  };

  const carregarAula = async (slug) => {
    setLoadingAula(true);
    try {
      const response = await axios.get(`/tutoriais/aulas/${slug}/`, {
        withCredentials: false
      });
      setAulaAtual(response.data);
    } catch (error) {
      console.error('Erro ao carregar aula:', error);
      setError('Erro ao carregar aula.');
    } finally {
      setLoadingAula(false);
    }
  };

  const toggleCategoria = (categoriaId) => {
    setCategoriasAbertas(prev => ({
      ...prev,
      [categoriaId]: !prev[categoriaId]
    }));
  };

  const navegarAula = (slug) => {
    if (slug) {
      carregarAula(slug);
    }
  };

  // Encontrar categoria e índice da aula atual
  const getAulaInfo = () => {
    if (!aulaAtual) return null;

    for (const categoria of categorias) {
      const aulaIndex = categoria.aulas?.findIndex(a => a.slug === aulaAtual.slug);
      if (aulaIndex !== -1) {
        return {
          categoria,
          aulaIndex,
          totalAulas: categoria.aulas.length
        };
      }
    }
    return null;
  };

  const aulaInfo = getAulaInfo();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="flex flex-col items-center space-y-4">
          <LoadingSpinner className="h-8 w-8 text-primary" />
          <p className="text-sm text-muted-foreground">Carregando tutoriais...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-background">
        <div className="text-center space-y-4 p-6">
          <h1 className="text-2xl font-bold text-destructive">Erro</h1>
          <p className="text-muted-foreground">{error}</p>
          <Button onClick={carregarCategorias}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar de Navegação */}
      <aside className="w-80 border-r bg-card flex flex-col">
        {/* Header da Sidebar */}
        <div className="p-6 border-b">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <BookOpen className="h-6 w-6 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-xl font-bold">Tutoriais</h1>
              <p className="text-xs text-muted-foreground">Chegou Hub</p>
            </div>
          </div>
        </div>

        {/* Lista de Categorias */}
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-2">
            {categorias.map((categoria) => (
              <Collapsible
                key={categoria.id}
                open={categoriasAbertas[categoria.id]}
                onOpenChange={() => toggleCategoria(categoria.id)}
              >
                <CollapsibleTrigger asChild>
                  <Button
                    variant="ghost"
                    className="w-full justify-start text-left font-semibold"
                  >
                    <ChevronRight
                      className={`h-4 w-4 mr-2 transition-transform ${
                        categoriasAbertas[categoria.id] ? 'rotate-90' : ''
                      }`}
                    />
                    {categoria.nome}
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="ml-6 mt-1 space-y-1">
                  {categoria.aulas?.map((aula, index) => (
                    <Button
                      key={aula.id}
                      variant={aulaAtual?.slug === aula.slug ? 'secondary' : 'ghost'}
                      className="w-full justify-start text-left text-sm"
                      onClick={() => navegarAula(aula.slug)}
                    >
                      <span className="mr-2 text-muted-foreground">{index + 1}.</span>
                      <span className="flex-1 truncate">{aula.titulo}</span>
                      {aula.duracao && (
                        <Badge variant="outline" className="ml-2 text-xs">
                          {aula.duracao}
                        </Badge>
                      )}
                    </Button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        {/* Footer da Sidebar */}
        <div className="p-4 border-t">
          <Button variant="outline" className="w-full" asChild>
            <a href="/workspace/agenda">
              <Home className="h-4 w-4 mr-2" />
              Voltar ao Workspace
            </a>
          </Button>
        </div>
      </aside>

      {/* Conteúdo Principal */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {aulaAtual ? (
          <>
            {/* Header do Conteúdo */}
            <div className="p-6 border-b bg-card">
              <Breadcrumb>
                <BreadcrumbList>
                  <BreadcrumbItem>
                    <BreadcrumbLink href="/tutoriais">Tutoriais</BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbLink>
                      {aulaAtual.categoria?.nome || 'Categoria'}
                    </BreadcrumbLink>
                  </BreadcrumbItem>
                  <BreadcrumbSeparator />
                  <BreadcrumbItem>
                    <BreadcrumbPage>{aulaAtual.titulo}</BreadcrumbPage>
                  </BreadcrumbItem>
                </BreadcrumbList>
              </Breadcrumb>
            </div>

            {/* Área de Conteúdo com Scroll */}
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-5xl mx-auto space-y-6">
                {loadingAula ? (
                  <div className="flex items-center justify-center py-12">
                    <LoadingSpinner className="h-8 w-8 text-primary" />
                  </div>
                ) : (
                  <>
                    {/* Player de Vídeo */}
                    {aulaAtual.embed_url && (
                      <Card>
                        <CardContent className="p-0">
                          <div className="relative w-full" style={{ paddingBottom: '56.25%' }}>
                            <iframe
                              src={aulaAtual.embed_url}
                              title={aulaAtual.titulo}
                              className="absolute top-0 left-0 w-full h-full rounded-lg"
                              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                              allowFullScreen
                            />
                          </div>
                        </CardContent>
                      </Card>
                    )}

                    {/* Título e Metadados */}
                    <div className="space-y-3">
                      <h1 className="text-3xl font-bold">{aulaAtual.titulo}</h1>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        {aulaAtual.duracao && (
                          <div className="flex items-center gap-1">
                            <Play className="h-4 w-4" />
                            {aulaAtual.duracao}
                          </div>
                        )}
                        {aulaInfo && (
                          <span>
                            Aula {aulaInfo.aulaIndex + 1} de {aulaInfo.totalAulas}
                          </span>
                        )}
                      </div>
                    </div>

                    <Separator />

                    {/* Descrição */}
                    {aulaAtual.descricao && (
                      <div className="prose prose-sm dark:prose-invert max-w-none">
                        <p className="text-muted-foreground whitespace-pre-wrap">
                          {aulaAtual.descricao}
                        </p>
                      </div>
                    )}

                    <Separator />

                    {/* Navegação entre Aulas */}
                    <div className="flex justify-between items-center pt-4">
                      <Button
                        variant="outline"
                        onClick={() => navegarAula(aulaAtual.aula_anterior)}
                        disabled={!aulaAtual.aula_anterior}
                      >
                        <ChevronLeft className="h-4 w-4 mr-2" />
                        Aula Anterior
                      </Button>

                      <Button
                        variant="default"
                        onClick={() => navegarAula(aulaAtual.proxima_aula)}
                        disabled={!aulaAtual.proxima_aula}
                      >
                        Próxima Aula
                        <ChevronRight className="h-4 w-4 ml-2" />
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center space-y-4">
              <BookOpen className="h-16 w-16 text-muted-foreground mx-auto" />
              <h2 className="text-2xl font-bold">Selecione uma aula</h2>
              <p className="text-muted-foreground">
                Escolha uma aula na barra lateral para começar
              </p>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default TutoriaisPage;
