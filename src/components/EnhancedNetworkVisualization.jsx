import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent',
    secondary: 'bg-gray-600 text-white hover:bg-gray-700 disabled:hover:bg-gray-600'
  }
  
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={`${baseClasses} ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  )
}

const EnhancedNetworkVisualization = ({ 
  data, 
  width = 800, 
  height = 600, 
  onAgentClick,
  selectedAgent,
  scenario,
  cycles 
}) => {
  const [dimensions, setDimensions] = useState({ width, height });

  useEffect(() => {
    const updateDimensions = () => {
      const isMobile = window.innerWidth < 768;
      const newWidth = isMobile ? Math.min(width, window.innerWidth - 40) : width;
      const newHeight = isMobile ? Math.min(height, window.innerHeight * 0.6) : height;
      setDimensions({ width: newWidth, height: newHeight });
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, [width, height]);
  const svgRef = useRef();
  const [simulation, setSimulation] = useState(null);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showLabels, setShowLabels] = useState(false);
  const [highlightMode, setHighlightMode] = useState('none'); // 'none', 'cluster', 'connections'

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Настройка SVG
    const g = svg.append('g');
    
    // Zoom behavior
    const zoom = d3.zoom()
      .scaleExtent([0.1, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
        setZoomLevel(event.transform.k);
      });

    svg.call(zoom);

    // Подготовка данных
    const nodes = data.nodes.map(d => ({ ...d }));
    const links = data.links.map(d => ({ ...d }));

    // Цветовая схема для кластеров
    const clusterColors = [
      '#3b82f6', // Синий
      '#ef4444', // Красный
      '#10b981', // Зеленый
      '#8b5cf6', // Фиолетовый
      '#f59e0b', // Оранжевый
      '#ec4899', // Розовый
      '#f59e0b', // Янтарный
      '#6b7280', // Серый
      '#eab308', // Желтый
      '#06b6d4'  // Голубой
    ];
    
    // Создание симуляции
    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => 50 + (1 - d.strength) * 100))
      .force('charge', d3.forceManyBody().strength(-300))
      .force('center', d3.forceCenter(dimensions.width / 2, dimensions.height / 2))
      .force('collision', d3.forceCollide().radius(d => Math.sqrt(d.degree) * 3 + 5));

    setSimulation(sim);

    // Создание связей
    const link = g.append('g')
      .attr('class', 'links')
      .selectAll('line')
      .data(links)
      .enter().append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', d => d.strength * 0.8)
      .attr('stroke-width', d => Math.sqrt(d.strength) * 3);

    // Создание узлов
    const node = g.append('g')
      .attr('class', 'nodes')
      .selectAll('circle')
      .data(nodes)
      .enter().append('circle')
      .attr('r', d => Math.sqrt(d.degree) * 2 + 4)
      .attr('fill', d => clusterColors[d.cluster % clusterColors.length])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', dragstarted)
        .on('drag', dragged)
        .on('end', dragended));

    // Подписи узлов
    const labels = g.append('g')
      .attr('class', 'labels')
      .selectAll('text')
      .data(nodes)
      .enter().append('text')
      .text(d => d.id)
      .attr('font-size', '10px')
      .attr('dx', 12)
      .attr('dy', 4)
      .style('opacity', showLabels ? 1 : 0);

    // Обработчики событий
    node.on('click', function(event, d) {
      event.stopPropagation();
      if (onAgentClick) {
        onAgentClick(d.id);
      }
      
      // Визуальная обратная связь
      node.attr('stroke-width', n => n.id === d.id ? 4 : 2);
      
      // Подсветка связей выбранного агента
      link.attr('stroke-opacity', l => 
        (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.1
      );
    });

    node.on('mouseover', function(event, d) {
      // Показываем tooltip
      const tooltip = d3.select('body').append('div')
        .attr('class', 'tooltip')
        .style('position', 'absolute')
        .style('background', 'rgba(0, 0, 0, 0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('font-size', '12px')
        .style('pointer-events', 'none')
        .style('z-index', 1000);

      tooltip.html(`
        <strong>Агент ${d.id}</strong><br/>
        Кластер: ${d.cluster + 1}<br/>
        Связей: ${d.degree}<br/>
        Клик для подробностей
      `)
      .style('left', (event.pageX + 10) + 'px')
      .style('top', (event.pageY - 10) + 'px');

      // Подсветка при наведении
      d3.select(this).attr('stroke', '#000').attr('stroke-width', 3);
    });

    node.on('mouseout', function(event, d) {
      d3.selectAll('.tooltip').remove();
      if (selectedAgent !== d.id) {
        d3.select(this).attr('stroke', '#fff').attr('stroke-width', 2);
      }
    });

    // Обновление позиций при симуляции
    sim.on('tick', () => {
      link
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      node
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Функции перетаскивания
    function dragstarted(event, d) {
      if (!event.active) sim.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }

    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }

    function dragended(event, d) {
      if (!event.active) sim.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }

    // Обновление при изменении режима подсветки
    const updateHighlight = () => {
      if (highlightMode === 'cluster') {
        node.attr('opacity', 1);
        link.attr('opacity', l => 
          nodes[l.source.index].cluster === nodes[l.target.index].cluster ? 1 : 0.2
        );
      } else if (highlightMode === 'connections' && selectedAgent !== null) {
        node.attr('opacity', n => 
          n.id === selectedAgent || 
          links.some(l => 
            (l.source.id === selectedAgent && l.target.id === n.id) ||
            (l.target.id === selectedAgent && l.source.id === n.id)
          ) ? 1 : 0.3
        );
        link.attr('opacity', l => 
          l.source.id === selectedAgent || l.target.id === selectedAgent ? 1 : 0.1
        );
      } else {
        node.attr('opacity', 1);
        link.attr('opacity', d => d.strength * 0.8);
      }
    };

    updateHighlight();

    // Cleanup
    return () => {
      if (sim) sim.stop();
    };
  }, [data, dimensions.width, dimensions.height, showLabels, highlightMode, selectedAgent]);

  const resetZoom = () => {
    const svg = d3.select(svgRef.current);
    svg.transition().duration(750).call(
      d3.zoom().transform,
      d3.zoomIdentity
    );
  };

  const centerOnAgent = (agentId) => {
    if (!simulation || !data.nodes) return;
    
    const agent = data.nodes.find(n => n.id === agentId);
    if (!agent) return;

    const svg = d3.select(svgRef.current);
    const scale = 2;
    const translate = [dimensions.width / 2 - scale * agent.x, dimensions.height / 2 - scale * agent.y];
    
    svg.transition().duration(750).call(
      d3.zoom().transform,
      d3.zoomIdentity.translate(translate[0], translate[1]).scale(scale)
    );
  };

  const exportNetwork = () => {
    const svg = svgRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    
    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const link = document.createElement('a');
      link.download = 'network_graph.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (!data || !data.nodes || !data.links) {
    return (
      <div className="flex items-center justify-center h-96 bg-gray-50 rounded-lg">
        <p className="text-gray-500">Нет данных для отображения</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Панель управления */}
      <div className="flex flex-col sm:flex-row flex-wrap gap-2 items-start sm:items-center justify-between bg-gray-50 p-4 rounded-lg">
        <div className="flex flex-wrap gap-2">
          <Button
            onClick={() => setShowLabels(!showLabels)}
            variant={showLabels ? 'primary' : 'outline'}
            className="text-sm"
          >
            {showLabels ? 'Скрыть подписи' : 'Показать подписи'}
          </Button>
          
          <select
            value={highlightMode}
            onChange={(e) => setHighlightMode(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 text-sm"
          >
            <option value="none">Обычный вид</option>
            <option value="cluster">Подсветить кластеры</option>
            <option value="connections">Подсветить связи</option>
          </select>
          
          <Button
            onClick={resetZoom}
            variant="outline"
            className="text-sm"
          >
            Сбросить масштаб
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-2 w-full sm:w-auto">
          {selectedAgent !== null && (
            <Button
              onClick={() => centerOnAgent(selectedAgent)}
              variant="secondary"
              className="text-sm flex-1 sm:flex-none"
            >
              Центрировать на агенте {selectedAgent}
            </Button>
          )}
          
          <Button
            onClick={exportNetwork}
            variant="outline"
            className="text-sm flex-1 sm:flex-none"
          >
            Экспорт PNG
          </Button>
        </div>
      </div>

      {/* Информационная панель */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-sm">
        <div className="bg-blue-50 rounded-lg p-3">
          <div className="font-medium text-blue-800">Узлов</div>
          <div className="text-xl font-bold text-blue-600">{data.nodes.length}</div>
        </div>
        <div className="bg-green-50 rounded-lg p-3">
          <div className="font-medium text-green-800">Связей</div>
          <div className="text-xl font-bold text-green-600">{data.links.length}</div>
        </div>
        <div className="bg-purple-50 rounded-lg p-3">
          <div className="font-medium text-purple-800">Масштаб</div>
          <div className="text-xl font-bold text-purple-600">{(zoomLevel * 100).toFixed(0)}%</div>
        </div>
        <div className="bg-orange-50 rounded-lg p-3">
          <div className="font-medium text-orange-800">Кластеров</div>
          <div className="text-xl font-bold text-orange-600">
            {Math.max(...data.nodes.map(n => n.cluster)) + 1}
          </div>
        </div>
      </div>

      {/* Граф */}
      <div className="border border-gray-200 rounded-lg overflow-hidden">
        <div className="w-full overflow-x-auto">
          <svg
            ref={svgRef}
            width={dimensions.width}
            height={dimensions.height}
            style={{ background: '#fafafa', minWidth: '320px' }}
            className="touch-pan-y"
          />
        </div>
      </div>

      {/* Легенда */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <h5 className="font-medium mb-3">Легенда</h5>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h6 className="font-medium mb-2">Кластеры</h6>
            <div className="space-y-1">
              {['Синий кластер', 'Красный кластер', 'Зеленый кластер'].map((name, i) => (
                <div key={i} className="flex items-center space-x-2">
                  <div 
                    className="w-4 h-4 rounded-full"
                    style={{ backgroundColor: ['#3b82f6', '#ef4444', '#10b981'][i] }}
                  />
                  <span>{name}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h6 className="font-medium mb-2">Элементы</h6>
            <div className="space-y-1">
              <div>• Размер узла = количество связей</div>
              <div>• Толщина линии = сила связи</div>
              <div>• Клик по узлу = детали агента</div>
              <div>• Перетаскивание = изменение позиции</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EnhancedNetworkVisualization;
