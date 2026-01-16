// frontend/src/features/planejamento_semanal/ApresentacaoPage.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { ChevronLeft, ChevronRight, Maximize2, Minimize2 } from 'lucide-react';

// shadcn/ui components
import { Button } from '../../components/ui/button';

// Componentes de slides
import SlideWelcome from './components/SlideWelcome';
import SlideMapa from './components/SlideMapa';
import SlideDashboard from './components/SlideDashboard';
import SlideFim from './components/SlideFim';

function ApresentacaoPage() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const containerRef = useRef(null);

  const totalSlides = 4;

  // Navegacao
  const nextSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev < totalSlides - 1 ? prev + 1 : prev));
  }, []);

  const prevSlide = useCallback(() => {
    setCurrentSlide((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  const goToSlide = useCallback((index) => {
    setCurrentSlide(index);
  }, []);

  // Navegacao por teclas
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ignorar se estiver digitando em um textarea
      if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') {
        return;
      }

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          nextSlide();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          prevSlide();
          break;
        case 'f':
        case 'F':
          toggleFullscreen();
          break;
        case 'Escape':
          if (isFullscreen) {
            exitFullscreen();
          }
          break;
        default:
          break;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [nextSlide, prevSlide, isFullscreen]);

  // Fullscreen - usar o container da apresentacao
  const toggleFullscreen = () => {
    if (!document.fullscreenElement && containerRef.current) {
      containerRef.current.requestFullscreen();
      setIsFullscreen(true);
    } else if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const exitFullscreen = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  // Detectar mudanca de fullscreen externa (ESC)
  useEffect(() => {
    const handleFullscreenChange = () => {
      setIsFullscreen(!!document.fullscreenElement);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  // Renderizar slide atual
  const renderSlide = () => {
    switch (currentSlide) {
      case 0:
        return <SlideWelcome />;
      case 1:
        return <SlideMapa />;
      case 2:
        return <SlideDashboard />;
      case 3:
        return <SlideFim />;
      default:
        return <SlideWelcome />;
    }
  };

  // Nomes dos slides para os indicadores
  const slideNames = ['Inicio', 'Mapa', 'Dashboard', 'Fim'];

  return (
    <div
      ref={containerRef}
      className={`relative w-full bg-background overflow-hidden ${isFullscreen ? 'h-screen' : 'h-[calc(100vh-4rem)]'}`}
    >
      {/* Container do slide */}
      <div className="h-full w-full">
        {renderSlide()}
      </div>

      {/* Controles de navegacao - escondidos em fullscreen */}
      {!isFullscreen && (
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-background/80 backdrop-blur-sm rounded-full px-6 py-3 shadow-lg border z-50">
        {/* Botao anterior */}
        <Button
          variant="ghost"
          size="icon"
          onClick={prevSlide}
          disabled={currentSlide === 0}
          className="rounded-full"
        >
          <ChevronLeft className="h-5 w-5" />
        </Button>

        {/* Indicadores de slide */}
        <div className="flex items-center gap-2">
          {slideNames.map((name, index) => (
            <button
              key={index}
              onClick={() => goToSlide(index)}
              className={`px-3 py-1 rounded-full text-xs font-medium transition-all ${
                currentSlide === index
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-muted text-muted-foreground hover:bg-muted/80'
              }`}
            >
              {name}
            </button>
          ))}
        </div>

        {/* Botao proximo */}
        <Button
          variant="ghost"
          size="icon"
          onClick={nextSlide}
          disabled={currentSlide === totalSlides - 1}
          className="rounded-full"
        >
          <ChevronRight className="h-5 w-5" />
        </Button>

        {/* Contador */}
        <span className="text-sm text-muted-foreground ml-2">
          {currentSlide + 1} / {totalSlides}
        </span>

        {/* Fullscreen */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleFullscreen}
          className="rounded-full ml-2"
          title={isFullscreen ? 'Sair da tela cheia (F)' : 'Tela cheia (F)'}
        >
          {isFullscreen ? (
            <Minimize2 className="h-4 w-4" />
          ) : (
            <Maximize2 className="h-4 w-4" />
          )}
        </Button>
      </div>
      )}

      {/* Setas laterais (para telas maiores) - escondidas em fullscreen */}
      {!isFullscreen && (
        <>
          <Button
            variant="ghost"
            size="icon"
            onClick={prevSlide}
            disabled={currentSlide === 0}
            className="absolute left-4 top-1/2 -translate-y-1/2 rounded-full bg-background/60 backdrop-blur-sm shadow-md hover:bg-background/80 h-12 w-12 hidden lg:flex z-50"
          >
            <ChevronLeft className="h-6 w-6" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={nextSlide}
            disabled={currentSlide === totalSlides - 1}
            className="absolute right-4 top-1/2 -translate-y-1/2 rounded-full bg-background/60 backdrop-blur-sm shadow-md hover:bg-background/80 h-12 w-12 hidden lg:flex z-50"
          >
            <ChevronRight className="h-6 w-6" />
          </Button>
        </>
      )}
    </div>
  );
}

export default ApresentacaoPage;
