import { useState } from 'react';

interface MunicipioData {
  nome: string;
  profissionais_capacitados: number;
  insercoes_realizadas: number;
}

interface MapaAlagoasProps {
  dados: Record<string, MunicipioData>;
  municipioSelecionado: string | null;
  onMunicipioClick: (municipio: string | null) => void;
}

export default function MapaAlagoas({ dados, municipioSelecionado, onMunicipioClick }: MapaAlagoasProps) {
  const [hoveredMunicipio, setHoveredMunicipio] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const getColorByIntensity = (profissionais: number): string => {
    if (profissionais === 0) return '#e2e8f0';
    if (profissionais <= 5) return '#bfdbfe';
    if (profissionais <= 10) return '#60a5fa';
    if (profissionais <= 20) return '#2563eb';
    return '#1e3a8a';
  };

  const handleMouseMove = (e: React.MouseEvent, municipio: string) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPosition({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    });
    setHoveredMunicipio(municipio);
  };

  const handleMouseLeave = () => {
    setHoveredMunicipio(null);
  };

  const handleClick = (municipio: string) => {
    if (municipioSelecionado === municipio) {
      onMunicipioClick(null);
    } else {
      onMunicipioClick(municipio);
    }
  };

  // Lista dos 102 municípios de Alagoas
  const municipios = [
    { id: 'maceio', nome: 'Maceió', path: 'M 450 320 L 480 310 L 490 330 L 470 350 L 450 340 Z' },
    { id: 'arapiraca', nome: 'Arapiraca', path: 'M 350 280 L 380 270 L 390 290 L 370 310 L 350 300 Z' },
    { id: 'palmeira-dos-indios', nome: 'Palmeira dos Índios', path: 'M 320 260 L 345 250 L 355 270 L 335 290 L 320 280 Z' },
    { id: 'uniao-dos-palmares', nome: 'União dos Palmares', path: 'M 380 310 L 405 300 L 415 320 L 395 340 L 380 330 Z' },
    { id: 'sao-miguel-dos-campos', nome: 'São Miguel dos Campos', path: 'M 420 340 L 440 330 L 450 350 L 430 370 L 420 360 Z' },
    { id: 'penedo', nome: 'Penedo', path: 'M 310 450 L 335 440 L 345 460 L 325 480 L 310 470 Z' },
    { id: 'delmiro-gouveia', nome: 'Delmiro Gouveia', path: 'M 150 180 L 175 170 L 185 190 L 165 210 L 150 200 Z' },
    { id: 'santana-do-ipanema', nome: 'Santana do Ipanema', path: 'M 200 240 L 225 230 L 235 250 L 215 270 L 200 260 Z' },
    { id: 'coruripe', nome: 'Coruripe', path: 'M 380 410 L 405 400 L 415 420 L 395 440 L 380 430 Z' },
    { id: 'pilar', nome: 'Pilar', path: 'M 440 360 L 460 350 L 470 370 L 450 390 L 440 380 Z' },
    { id: 'rio-largo', nome: 'Rio Largo', path: 'M 430 300 L 450 290 L 460 310 L 440 330 L 430 320 Z' },
    { id: 'marechal-deodoro', nome: 'Marechal Deodoro', path: 'M 460 350 L 480 340 L 490 360 L 470 380 L 460 370 Z' },
    { id: 'campo-alegre', nome: 'Campo Alegre', path: 'M 340 400 L 360 390 L 370 410 L 350 430 L 340 420 Z' },
    { id: 'viçosa', nome: 'Viçosa', path: 'M 390 330 L 410 320 L 420 340 L 400 360 L 390 350 Z' },
    { id: 'murici', nome: 'Murici', path: 'M 410 290 L 430 280 L 440 300 L 420 320 L 410 310 Z' },
    { id: 'satuba', nome: 'Satuba', path: 'M 455 315 L 470 310 L 478 325 L 463 340 L 455 330 Z' },
    { id: 'girau-do-ponciano', nome: 'Girau do Ponciano', path: 'M 340 240 L 360 230 L 370 250 L 350 270 L 340 260 Z' },
    { id: 'santana-do-mundau', nome: 'Santana do Mundaú', path: 'M 370 340 L 385 330 L 395 350 L 380 370 L 370 360 Z' },
    { id: 'igreja-nova', nome: 'Igreja Nova', path: 'M 290 430 L 310 420 L 320 440 L 300 460 L 290 450 Z' },
    { id: 'pao-de-acucar', nome: 'Pão de Açúcar', path: 'M 250 320 L 270 310 L 280 330 L 260 350 L 250 340 Z' },
    // Adicionar mais municípios aqui (total 102)
    { id: 'agua-branca', nome: 'Água Branca', path: 'M 180 200 L 200 190 L 210 210 L 190 230 L 180 220 Z' },
    { id: 'anadia', nome: 'Anadia', path: 'M 400 350 L 415 340 L 425 360 L 410 380 L 400 370 Z' },
    { id: 'atalaia', nome: 'Atalaia', path: 'M 360 360 L 375 350 L 385 370 L 370 390 L 360 380 Z' },
    { id: 'barra-de-santo-antonio', nome: 'Barra de Santo Antônio', path: 'M 480 290 L 500 280 L 510 300 L 490 320 L 480 310 Z' },
    { id: 'barra-de-sao-miguel', nome: 'Barra de São Miguel', path: 'M 470 380 L 490 370 L 500 390 L 480 410 L 470 400 Z' },
  ];

  return (
    <div className="relative bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Mapa de Alagoas: Profissionais Capacitados por Município
        </h2>
        <p className="text-sm text-gray-600">
          O mapa mostra a distribuição de profissionais capacitados por município através de variações de cores.
          {municipioSelecionado && (
            <span className="ml-2 font-medium text-[#1a4d2e]">
              Exibindo dados de: {dados[municipioSelecionado]?.nome || municipioSelecionado}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1 relative">
          <svg
            viewBox="0 0 600 600"
            className="w-full h-auto"
            style={{ maxHeight: '600px' }}
          >
            {municipios.map((municipio) => {
              const dadosMunicipio = dados[municipio.id] || { nome: municipio.nome, profissionais_capacitados: 0, insercoes_realizadas: 0 };
              const isSelected = municipioSelecionado === municipio.id;
              const isHovered = hoveredMunicipio === municipio.id;

              return (
                <path
                  key={municipio.id}
                  d={municipio.path}
                  fill={getColorByIntensity(dadosMunicipio.profissionais_capacitados)}
                  stroke={isSelected ? '#1a4d2e' : '#ffffff'}
                  strokeWidth={isSelected ? '3' : '1'}
                  className="transition-all duration-200 cursor-pointer hover:opacity-80"
                  style={{
                    filter: isHovered ? 'brightness(1.1)' : 'none'
                  }}
                  onMouseMove={(e) => handleMouseMove(e, municipio.id)}
                  onMouseLeave={handleMouseLeave}
                  onClick={() => handleClick(municipio.id)}
                />
              );
            })}
          </svg>

          {hoveredMunicipio && dados[hoveredMunicipio] && (
            <div
              className="absolute bg-gray-900 text-white px-3 py-2 rounded-lg text-sm shadow-lg pointer-events-none z-10"
              style={{
                left: `${tooltipPosition.x + 10}px`,
                top: `${tooltipPosition.y + 10}px`,
                maxWidth: '250px'
              }}
            >
              <div className="font-semibold mb-1">{dados[hoveredMunicipio].nome}</div>
              <div className="text-xs space-y-1">
                <div>Profissionais capacitados: <span className="font-medium">{dados[hoveredMunicipio].profissionais_capacitados}</span></div>
                <div>Inserções realizadas: <span className="font-medium">{dados[hoveredMunicipio].insercoes_realizadas}</span></div>
              </div>
            </div>
          )}
        </div>

        <div className="lg:w-64">
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="text-sm font-semibold text-gray-700 mb-3">Quantidade de profissionais capacitados</h3>
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#e2e8f0' }}></div>
                <span className="text-xs text-gray-600">Sem profissionais</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#bfdbfe' }}></div>
                <span className="text-xs text-gray-600">1-5</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#60a5fa' }}></div>
                <span className="text-xs text-gray-600">6-10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#2563eb' }}></div>
                <span className="text-xs text-gray-600">11-20</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#1e3a8a' }}></div>
                <span className="text-xs text-gray-600">+20</span>
              </div>
            </div>

            {municipioSelecionado && (
              <button
                onClick={() => onMunicipioClick(null)}
                className="mt-4 w-full px-3 py-2 bg-[#1a4d2e] text-white text-sm rounded-lg hover:bg-[#143d24] transition-colors"
              >
                Ver todos os municípios
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
