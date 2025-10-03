import React, { useEffect, useRef } from 'react';
import * as d3 from 'd3';

const NetworkVisualization = ({ 
  data, 
  width = 800, 
  height = 600, 
  scenario = 'A',
  cycles = 10 
}) => {
  const svgRef = useRef();

  useEffect(() => {
    if (!data || !data.nodes || !data.links) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll("*").remove(); // Очищаем предыдущую визуализацию

    // Настройки
    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const innerWidth = width - margin.left - margin.right;
    const innerHeight = height - margin.top - margin.bottom;

    // Создаем основную группу
    const g = svg
      .attr('width', width)
      .attr('height', height)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Цветовая схема для кластеров
    const colorScale = d3.scaleOrdinal()
      .domain([0, 1, 2])
      .range(['#3b82f6', '#ef4444', '#10b981']); // синий, красный, зеленый

    // Масштаб для размера узлов (по количеству связей)
    const maxDegree = d3.max(data.nodes, d => d.degree) || 1;
    const radiusScale = d3.scaleLinear()
      .domain([0, maxDegree])
      .range([4, 16]);

    // Масштаб для прозрачности связей
    const opacityScale = d3.scaleLinear()
      .domain([0.5, 1])
      .range([0.3, 0.8]);

    // Создаем симуляцию силы
    const simulation = d3.forceSimulation(data.nodes)
      .force('link', d3.forceLink(data.links)
        .id(d => d.id)
        .distance(d => 50 + (1 - d.strength) * 50)
        .strength(d => d.strength * 0.5)
      )
      .force('charge', d3.forceManyBody()
        .strength(-100)
      )
      .force('center', d3.forceCenter(innerWidth / 2, innerHeight / 2))
      .force('collision', d3.forceCollide()
        .radius(d => radiusScale(d.degree) + 2)
      );

    // Создаем связи
    const links = g.selectAll('.link')
      .data(data.links)
      .enter()
      .append('line')
      .attr('class', 'link')
      .attr('stroke', '#999')
      .attr('stroke-opacity', d => opacityScale(d.strength))
      .attr('stroke-width', d => Math.sqrt(d.strength) * 3);

    // Создаем узлы
    const nodes = g.selectAll('.node')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('class', 'node')
      .attr('r', d => radiusScale(d.degree))
      .attr('fill', d => colorScale(d.cluster))
      .attr('stroke', '#fff')
      .attr('stroke-width', 2)
      .style('cursor', 'pointer');

    // Добавляем подписи к узлам (показываем только для крупных узлов)
    const labels = g.selectAll('.label')
      .data(data.nodes.filter(d => d.degree > maxDegree * 0.3))
      .enter()
      .append('text')
      .attr('class', 'label')
      .attr('text-anchor', 'middle')
      .attr('dy', '.35em')
      .attr('font-size', '10px')
      .attr('fill', '#333')
      .text(d => d.id);

    // Добавляем интерактивность
    nodes
      .on('mouseover', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', radiusScale(d.degree) * 1.5)
          .attr('stroke-width', 3);

        // Показываем tooltip
        const tooltip = d3.select('body')
          .append('div')
          .attr('class', 'tooltip')
          .style('position', 'absolute')
          .style('background', 'rgba(0, 0, 0, 0.8)')
          .style('color', 'white')
          .style('padding', '8px')
          .style('border-radius', '4px')
          .style('font-size', '12px')
          .style('pointer-events', 'none')
          .style('opacity', 0);

        tooltip.transition()
          .duration(200)
          .style('opacity', 1);

        tooltip.html(`
          <strong>Агент ${d.id}</strong><br/>
          Кластер: ${d.cluster + 1}<br/>
          Связей: ${d.degree}
        `)
          .style('left', (event.pageX + 10) + 'px')
          .style('top', (event.pageY - 10) + 'px');
      })
      .on('mouseout', function(event, d) {
        d3.select(this)
          .transition()
          .duration(200)
          .attr('r', radiusScale(d.degree))
          .attr('stroke-width', 2);

        d3.selectAll('.tooltip').remove();
      });

    // Добавляем drag behavior
    const drag = d3.drag()
      .on('start', function(event, d) {
        if (!event.active) simulation.alphaTarget(0.3).restart();
        d.fx = d.x;
        d.fy = d.y;
      })
      .on('drag', function(event, d) {
        d.fx = event.x;
        d.fy = event.y;
      })
      .on('end', function(event, d) {
        if (!event.active) simulation.alphaTarget(0);
        d.fx = null;
        d.fy = null;
      });

    nodes.call(drag);

    // Обновляем позиции на каждом тике симуляции
    simulation.on('tick', () => {
      links
        .attr('x1', d => d.source.x)
        .attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x)
        .attr('y2', d => d.target.y);

      nodes
        .attr('cx', d => d.x)
        .attr('cy', d => d.y);

      labels
        .attr('x', d => d.x)
        .attr('y', d => d.y);
    });

    // Cleanup function
    return () => {
      simulation.stop();
      d3.selectAll('.tooltip').remove();
    };

  }, [data, width, height]);

  return (
    <div className="relative">
      <div className="mb-4 text-center">
        <h3 className="text-lg font-semibold text-gray-800">
          Сценарий {scenario} - {cycles} циклов симуляции
        </h3>
        <p className="text-sm text-gray-600">
          {scenario === 'A' 
            ? 'Нейтральная информационная повестка' 
            : 'Ценностно-близкая тема в повестке'
          }
        </p>
      </div>
      
      <svg ref={svgRef} className="border border-gray-300 rounded-lg bg-white"></svg>
      
      {/* Легенда */}
      <div className="mt-4 flex flex-wrap justify-center gap-4 text-sm">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-blue-500"></div>
          <span>Кластер 1</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-red-500"></div>
          <span>Кластер 2</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded-full bg-green-500"></div>
          <span>Кластер 3</span>
        </div>
        <div className="flex items-center gap-2">
          <span>Размер узла = количество связей</span>
        </div>
      </div>
    </div>
  );
};

export default NetworkVisualization;

