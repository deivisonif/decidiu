import { useEffect, useState, useRef } from 'react';
import { MapContainer, GeoJSON, useMap } from 'react-leaflet';
import type { FeatureCollection, Feature, Geometry } from 'geojson';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

interface MunicipioData {
  nome: string;
  profissionais_capacitados: number;
  insercoes: number;
  diu_inseridos: number;
  implanon_inseridos: number;
}

interface MapaAlagoasLeafletProps {
  dados: MunicipioData[];
  municipioSelecionado: string | null;
  onMunicipioClick: (municipio: string | null) => void;
}

// Coordenadas do bounding box mundial + buraco no formato Alagoas
// O polígono externo cobre o mundo todo; o interior (o "buraco") é preenchido
// pela união dos municípios de Alagoas, deixando visível apenas o estado.
function buildMaskGeoJSON(alagoasGeoJSON: FeatureCollection): object {
  // Coleta todos os anéis de coordenadas dos municípios de Alagoas
  const rings: number[][][] = [];

  alagoasGeoJSON.features.forEach(feature => {
    const geom = feature.geometry as any;
    if (!geom) return;

    if (geom.type === 'Polygon') {
      geom.coordinates.forEach((ring: number[][]) => rings.push(ring));
    } else if (geom.type === 'MultiPolygon') {
      geom.coordinates.forEach((poly: number[][][]) =>
        poly.forEach((ring: number[][]) => rings.push(ring))
      );
    }
  });

  // GeoJSON Polygon com anel externo cobrindo o mundo inteiro (sentido horário)
  // e os anéis internos dos municípios como "buracos" (sentido anti-horário).
  // Leaflet/GeoJSON usa winding rule: anel externo CW, buracos CCW.
  const worldRing = [
    [-180, -90], [180, -90], [180, 90], [-180, 90], [-180, -90]
  ];

  return {
    type: 'Feature',
    properties: {},
    geometry: {
      type: 'Polygon',
      coordinates: [worldRing, ...rings],
    },
  };
}

// Componente interno que desabilita toda interação do mapa após a montagem
function MapControls() {
  const map = useMap();

  useEffect(() => {
    map.zoomControl?.remove();
    map.dragging.disable();
    map.touchZoom.disable();
    map.doubleClickZoom.disable();
    map.scrollWheelZoom.disable();
    map.boxZoom.disable();
    map.keyboard.disable();
    if ((map as any).tap) (map as any).tap.disable();
  }, [map]);

  return null;
}

export default function MapaAlagoasLeaflet({ dados, municipioSelecionado, onMunicipioClick }: MapaAlagoasLeafletProps) {
  const [geoData, setGeoData] = useState<FeatureCollection | null>(null);
  const [maskData, setMaskData] = useState<object | null>(null);
  const [loading, setLoading] = useState(true);
  const geoJsonRef = useRef<L.GeoJSON | null>(null);

  useEffect(() => {
    fetch('/alagoas-municipios.json')
      .then(res => res.json())
      .then((data: FeatureCollection) => {
        setGeoData(data);
        setMaskData(buildMaskGeoJSON(data));
        setLoading(false);
      })
      .catch(error => {
        console.error('Erro ao carregar GeoJSON:', error);
        setLoading(false);
      });
  }, []);

  // Recalcula estilos quando o município selecionado muda
  useEffect(() => {
    if (geoJsonRef.current) {
      geoJsonRef.current.setStyle((feature) => style(feature));
    }
  }, [municipioSelecionado, dados]);

  const getDadosMunicipio = (nomeMunicipio: string): MunicipioData | undefined =>
    dados.find(d => d.nome.toLowerCase() === nomeMunicipio.toLowerCase());

  const getColorByIntensity = (capacitados: number): string => {
    if (capacitados === 0) return '#e2e8f0';
    if (capacitados <= 5) return '#bbf7d0';
    if (capacitados <= 10) return '#4ade80';
    if (capacitados <= 20) return '#16a34a';
    return '#14532d';
  };

  const style = (feature?: Feature<Geometry, any>) => {
    if (!feature) return {};
    const nomeMunicipio = feature.properties?.name || '';
    const dadosMunicipio = getDadosMunicipio(nomeMunicipio);
    const capacitados = dadosMunicipio?.profissionais_capacitados || 0;
    const isSelected = municipioSelecionado === nomeMunicipio.toLowerCase().replace(/\s+/g, '-');

    return {
      fillColor: getColorByIntensity(capacitados),
      weight: isSelected ? 3 : 1,
      opacity: 1,
      color: isSelected ? '#1a4d2e' : '#ffffff',
      fillOpacity: 0.8,
    };
  };

  const onEachFeature = (feature: Feature<Geometry, any>, layer: L.Layer) => {
    const nomeMunicipio = feature.properties?.name || '';
    const dadosMunicipio = getDadosMunicipio(nomeMunicipio);

    if (layer instanceof L.Path) {
      layer.on({
        mouseover: (e) => {
          const target = e.target as L.Path;
          target.setStyle({ weight: 3, fillOpacity: 0.95 });
          target.bringToFront();

          const diuInseridos      = dadosMunicipio?.diu_inseridos      || 0;
          const implanonInseridos = dadosMunicipio?.implanon_inseridos  || 0;

          const tooltipContent = `
            <div style="padding:10px;min-width:200px;">
              <div style="font-weight:600;margin-bottom:8px;font-size:14px;border-bottom:2px solid #e2e8f0;padding-bottom:4px;">${nomeMunicipio}</div>
              <div style="font-size:12px;line-height:1.6;">
                <div style="margin-bottom:4px;">
                  <span style="color:#4b5563;">Profissionais capacitados:</span>
                  <strong style="color:#1f2937;">${dadosMunicipio?.profissionais_capacitados || 0}</strong>
                </div>
                <div style="margin-bottom:6px;padding-top:4px;border-top:1px solid #f3f4f6;"></div>
                <div style="margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                  <div style="width:12px;height:12px;background-color:#ef4444;border-radius:2px;"></div>
                  <span style="color:#4b5563;">DIU inseridos:</span>
                  <strong style="color:#ef4444;font-size:13px;">${diuInseridos}</strong>
                </div>
                <div style="margin-bottom:4px;display:flex;align-items:center;gap:6px;">
                  <div style="width:12px;height:12px;background-color:#10b981;border-radius:2px;"></div>
                  <span style="color:#4b5563;">Implanon inseridos:</span>
                  <strong style="color:#10b981;font-size:13px;">${implanonInseridos}</strong>
                </div>
                <div style="margin-top:6px;padding-top:4px;border-top:1px solid #f3f4f6;">
                  <span style="color:#6b7280;font-size:11px;">Total de inserções:</span>
                  <strong style="color:#1f2937;">${dadosMunicipio?.insercoes || 0}</strong>
                </div>
              </div>
            </div>
          `;
          target.bindTooltip(tooltipContent, { sticky: true }).openTooltip();
        },
        mouseout: (e) => {
          const target     = e.target as L.Path;
          const isSelected = municipioSelecionado === nomeMunicipio.toLowerCase().replace(/\s+/g, '-');
          target.setStyle({ weight: isSelected ? 3 : 1, fillOpacity: 0.8 });
          target.closeTooltip();
        },
        click: () => {
          const municipioId = nomeMunicipio.toLowerCase().replace(/\s+/g, '-');
          onMunicipioClick(municipioSelecionado === municipioId ? null : municipioId);
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-10 w-10 border-4 border-[#1a4d2e] border-t-transparent mb-3"></div>
            <p className="text-gray-600">Carregando mapa...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!geoData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <div className="flex items-center justify-center h-96">
          <p className="text-red-600">Erro ao carregar mapa</p>
        </div>
      </div>
    );
  }

  const municipioSelecionadoNome = municipioSelecionado
    ? dados.find(d => d.nome.toLowerCase().replace(/\s+/g, '-') === municipioSelecionado)?.nome
    : null;

  // Bounds restritos ao estado de Alagoas
  const alagoasBounds = L.latLngBounds(
    L.latLng(-10.55, -38.25),
    L.latLng(-8.80, -35.10)
  );

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold text-gray-800 mb-2">
          Mapa de Alagoas: Profissionais Capacitados por Município
        </h2>
        <p className="text-sm text-gray-600">
          O mapa mostra a distribuição de profissionais capacitados por município através de variações de cores.
          {municipioSelecionadoNome && (
            <span className="ml-2 font-medium text-[#1a4d2e]">
              Exibindo dados de: {municipioSelecionadoNome}
            </span>
          )}
        </p>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="flex-1" style={{ height: '600px', width: '100%' }}>
          <MapContainer
            center={[-9.5713, -36.7820]}
            zoom={8.5}
            minZoom={8.5}
            maxZoom={8.5}
            maxBounds={alagoasBounds}
            maxBoundsViscosity={1.0}
            zoomControl={false}
            dragging={false}
            touchZoom={false}
            doubleClickZoom={false}
            scrollWheelZoom={false}
            boxZoom={false}
            keyboard={false}
            style={{ height: '100%', width: '100%', borderRadius: '8px', backgroundColor: '#f1f5f9', cursor: 'default' }}
          >
            <MapControls />

            {/* Camada de municípios interativa */}
            <GeoJSON
              key={municipioSelecionado}
              ref={geoJsonRef}
              data={geoData}
              style={style}
              onEachFeature={onEachFeature}
            />

            {/* Máscara ao redor de Alagoas — cobre tudo além das fronteiras do estado */}
            {maskData && (
              <GeoJSON
                data={maskData as any}
                style={{
                  fillColor: '#f1f5f9',
                  fillOpacity: 1,
                  weight: 0,
                  stroke: false,
                  interactive: false,
                } as any}
              />
            )}
          </MapContainer>
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
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#bbf7d0' }}></div>
                <span className="text-xs text-gray-600">1–5</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#4ade80' }}></div>
                <span className="text-xs text-gray-600">6–10</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#16a34a' }}></div>
                <span className="text-xs text-gray-600">11–20</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-8 h-4 rounded" style={{ backgroundColor: '#14532d' }}></div>
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
