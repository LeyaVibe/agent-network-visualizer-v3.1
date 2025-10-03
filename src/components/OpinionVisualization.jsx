import React, { useState, useEffect, useRef } from 'react';
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

const OpinionVisualization = ({ 
  opinionStats, 
  agents, 
  topicSettings, 
  clusterStats,
  uploadedTopicNames 
}) => {
  const [selectedView, setSelectedView] = useState('overall');
  const [selectedCluster, setSelectedCluster] = useState(0);
  const [selectedTopic, setSelectedTopic] = useState(0);
  
  // Предопределенные названия тем
  const predefinedTopicNames = [
    'Политика', 'В мире', 'Экономика', 'Общество', 'Армия',
    'Наука', 'Спорт', 'Культура', 'Религия', 'Туризм',
    'Redbull', 'Zara'
  ];
  
  const overallRef = useRef();
  const clusterRef = useRef();
  const topicRef = useRef();

  // Генерируем мнения агентов для визуализации
  const generateAgentOpinions = () => {
    const opinions = [];
    const numTopics = topicSettings?.numTopics || 10;
    
    agents.forEach(agent => {
      for (let topicId = 0; topicId < numTopics; topicId++) {
        // ИСПРАВЛЕНО: Используем равномерное распределение для всех кластеров
        // Создаем базовое мнение на основе кластера и темы
        const clusterFactor = (agent.cluster / Math.max(1, (topicSettings?.numClusters || 10) - 1)) * 2 - 1; // от -1 до 1
        const topicFactor = Math.sin(topicId * Math.PI / numTopics) * Math.cos(agent.cluster * Math.PI / numTopics);
        
        // Комбинируем факторы с добавлением случайности
        const baseOpinion = (clusterFactor * 0.4 + topicFactor * 0.4) + (Math.random() - 0.5) * 0.6;
        const clampedOpinion = Math.max(-1, Math.min(1, baseOpinion));
        
        opinions.push({
          agentId: agent.id,
          topicId,
          opinion: clampedOpinion,
          cluster: agent.cluster,
          topicName: uploadedTopicNames?.[topicId] || topicSettings?.topics?.[topicId]?.name || predefinedTopicNames[topicId] || `Тема ${topicId + 1}`
        });
      }
    });
    
    return opinions;
  };

  const agentOpinions = generateAgentOpinions();

  // Создание общей гистограммы мнений
  useEffect(() => {
    if (selectedView === 'overall' && overallRef.current) {
      createOverallHistogram();
    }
  }, [selectedView, agentOpinions]);

  // Создание гистограммы по кластерам
  useEffect(() => {
    if (selectedView === 'cluster' && clusterRef.current) {
      createClusterHistogram();
    }
  }, [selectedView, selectedCluster, agentOpinions]);

  // Создание гистограммы по темам
  useEffect(() => {
    if (selectedView === 'topic' && topicRef.current) {
      createTopicHistogram();
    }
  }, [selectedView, selectedTopic, agentOpinions]);

  const createOverallHistogram = () => {
    const container = d3.select(overallRef.current);
    container.selectAll('*').remove();

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Подготовка данных для гистограммы
    const bins = d3.histogram()
      .domain([-1, 1])
      .thresholds(20)(agentOpinions.map(d => d.opinion));

    const x = d3.scaleLinear()
      .domain([-1, 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    // Создание столбцов
    g.selectAll('.bar')
      .data(bins)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.x0))
      .attr('width', d => x(d.x1) - x(d.x0) - 1)
      .attr('y', d => y(d.length))
      .attr('height', d => height - y(d.length))
      .attr('fill', d => {
        const midpoint = (d.x0 + d.x1) / 2;
        if (midpoint < -0.2) return '#ef4444'; // красный для негативных
        if (midpoint > 0.2) return '#10b981'; // зеленый для позитивных
        return '#6b7280'; // серый для нейтральных
      })
      .attr('opacity', 0.7);

    // Оси
    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('.1f')));

    g.append('g')
      .call(d3.axisLeft(y));

    // Подписи осей
    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Количество мнений');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Значение мнения (от -1 до +1)');

    // Заголовок
    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text('Общее распределение мнений всех агентов');
  };

  const createClusterHistogram = () => {
    const container = d3.select(clusterRef.current);
    container.selectAll('*').remove();

    const clusterOpinions = agentOpinions.filter(d => d.cluster === selectedCluster);
    const clusterNames = ['Синий', 'Красный', 'Зеленый', 'Фиолетовый', 'Оранжевый', 'Розовый', 'Коричневый', 'Серый', 'Желтый', 'Голубой'];
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

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const bins = d3.histogram()
      .domain([-1, 1])
      .thresholds(15)(clusterOpinions.map(d => d.opinion));

    const x = d3.scaleLinear()
      .domain([-1, 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(bins, d => d.length)])
      .range([height, 0]);

    g.selectAll('.bar')
      .data(bins)
      .enter().append('rect')
      .attr('class', 'bar')
      .attr('x', d => x(d.x0))
      .attr('width', d => x(d.x1) - x(d.x0) - 1)
      .attr('y', d => y(d.length))
      .attr('height', d => height - y(d.length))
      .attr('fill', clusterColors[selectedCluster])
      .attr('opacity', 0.7);

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('.1f')));

    g.append('g')
      .call(d3.axisLeft(y));

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Количество мнений');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Значение мнения (от -1 до +1)');

    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Распределение мнений: ${clusterNames[selectedCluster]} кластер`);
  };

  const createTopicHistogram = () => {
    const container = d3.select(topicRef.current);
    container.selectAll('*').remove();

    const topicOpinions = agentOpinions.filter(d => d.topicId === selectedTopic);
    const topicName = uploadedTopicNames?.[selectedTopic] || topicSettings?.topics?.[selectedTopic]?.name || predefinedTopicNames[selectedTopic] || `Тема ${selectedTopic + 1}`;

    const margin = { top: 20, right: 30, bottom: 40, left: 50 };
    const width = 800 - margin.left - margin.right;
    const height = 400 - margin.bottom - margin.top;

    const svg = container
      .append('svg')
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom);

    const g = svg
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Группируем по кластерам для стекинга
    const clusterData = d3.group(topicOpinions, d => d.cluster);
    const bins = d3.histogram()
      .domain([-1, 1])
      .thresholds(15);

    const clusterColors = ['#3b82f6', '#ef4444', '#10b981'];
    const stackedData = [];

    for (let i = 0; i < 15; i++) {
      const binData = { binIndex: i };
      clusterData.forEach((opinions, cluster) => {
        const binOpinions = bins([...opinions.map(d => d.opinion)])[i] || [];
        binData[`cluster${cluster}`] = binOpinions.length;
      });
      stackedData.push(binData);
    }

    const x = d3.scaleLinear()
      .domain([-1, 1])
      .range([0, width]);

    const y = d3.scaleLinear()
      .domain([0, d3.max(stackedData, d => 
        (d.cluster0 || 0) + (d.cluster1 || 0) + (d.cluster2 || 0)
      )])
      .range([height, 0]);

    const stack = d3.stack()
      .keys(['cluster0', 'cluster1', 'cluster2'])
      .value((d, key) => d[key] || 0);

    const series = stack(stackedData);

    g.selectAll('.cluster')
      .data(series)
      .enter().append('g')
      .attr('class', 'cluster')
      .attr('fill', (d, i) => clusterColors[i])
      .selectAll('rect')
      .data(d => d)
      .enter().append('rect')
      .attr('x', (d, i) => x(-1 + (i * 2 / 15)))
      .attr('width', width / 15 - 1)
      .attr('y', d => y(d[1]))
      .attr('height', d => y(d[0]) - y(d[1]));

    g.append('g')
      .attr('transform', `translate(0,${height})`)
      .call(d3.axisBottom(x).tickFormat(d3.format('.1f')));

    g.append('g')
      .call(d3.axisLeft(y));

    g.append('text')
      .attr('transform', 'rotate(-90)')
      .attr('y', 0 - margin.left)
      .attr('x', 0 - (height / 2))
      .attr('dy', '1em')
      .style('text-anchor', 'middle')
      .text('Количество мнений');

    g.append('text')
      .attr('transform', `translate(${width / 2}, ${height + margin.bottom})`)
      .style('text-anchor', 'middle')
      .text('Значение мнения (от -1 до +1)');

    svg.append('text')
      .attr('x', (width + margin.left + margin.right) / 2)
      .attr('y', margin.top / 2)
      .attr('text-anchor', 'middle')
      .style('font-size', '16px')
      .style('font-weight', 'bold')
      .text(`Распределение мнений по теме: ${topicName}`);

    // Легенда
    const legend = svg.append('g')
      .attr('transform', `translate(${width - 100}, 30)`);

    ['Синий', 'Красный', 'Зеленый'].forEach((name, i) => {
      const legendRow = legend.append('g')
        .attr('transform', `translate(0, ${i * 20})`);

      legendRow.append('rect')
        .attr('width', 15)
        .attr('height', 15)
        .attr('fill', clusterColors[i]);

      legendRow.append('text')
        .attr('x', 20)
        .attr('y', 12)
        .style('font-size', '12px')
        .text(name);
    });
  };

  const exportChart = (ref, filename) => {
    if (!ref.current) return;
    
    const svg = ref.current.querySelector('svg');
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
      link.download = filename;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    
    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  const numClusters = Math.max(...agents.map(a => a.cluster)) + 1;
  const numTopics = topicSettings?.numTopics || 10;

  return (
    <div className="space-y-6">
      {/* Переключатель видов */}
      <div className="flex space-x-4 border-b border-gray-200 pb-4">
        <Button
          onClick={() => setSelectedView('overall')}
          variant={selectedView === 'overall' ? 'primary' : 'outline'}
          className="text-sm"
        >
          Общее распределение
        </Button>
        <Button
          onClick={() => setSelectedView('cluster')}
          variant={selectedView === 'cluster' ? 'primary' : 'outline'}
          className="text-sm"
        >
          По кластерам ценностей
        </Button>
        <Button
          onClick={() => setSelectedView('topic')}
          variant={selectedView === 'topic' ? 'primary' : 'outline'}
          className="text-sm"
        >
          По темам
        </Button>
      </div>

      {/* Общее распределение */}
      {selectedView === 'overall' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <h4 className="text-lg font-medium">Общее распределение мнений</h4>
            <Button
              onClick={() => exportChart(overallRef, 'overall_opinions.png')}
              variant="outline"
              className="text-sm"
            >
              Экспорт PNG
            </Button>
          </div>
          <div ref={overallRef}></div>
          
          {/* Статистика */}
          <div className="mt-4 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-red-50 rounded-lg p-4">
              <div className="text-lg font-bold text-red-600">
                {Math.round(agentOpinions.filter(d => d.opinion < -0.2).length / agentOpinions.length * 100)}%
              </div>
              <div className="text-sm text-red-800">Негативные мнения</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="text-lg font-bold text-gray-600">
                {Math.round(agentOpinions.filter(d => d.opinion >= -0.2 && d.opinion <= 0.2).length / agentOpinions.length * 100)}%
              </div>
              <div className="text-sm text-gray-800">Нейтральные мнения</div>
            </div>
            <div className="bg-green-50 rounded-lg p-4">
              <div className="text-lg font-bold text-green-600">
                {Math.round(agentOpinions.filter(d => d.opinion > 0.2).length / agentOpinions.length * 100)}%
              </div>
              <div className="text-sm text-green-800">Позитивные мнения</div>
            </div>
          </div>
        </div>
      )}

      {/* По кластерам */}
      {selectedView === 'cluster' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <h4 className="text-lg font-medium">Распределение по кластерам ценностей</h4>
              <select
                value={selectedCluster}
                onChange={(e) => setSelectedCluster(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {Array.from({ length: numClusters }, (_, i) => {
                  const clusterNames = ['Синий', 'Красный', 'Зеленый', 'Фиолетовый', 'Оранжевый', 'Розовый', 'Коричневый', 'Серый', 'Желтый', 'Голубой'];
                  const clusterName = clusterNames[i] || `Кластер ${i + 1}`;
                  return (
                    <option key={i} value={i}>
                      {clusterName} кластер
                    </option>
                  );
                })}
              </select>
            </div>
            <Button
              onClick={() => exportChart(clusterRef, `cluster_${selectedCluster}_opinions.png`)}
              variant="outline"
              className="text-sm"
            >
              Экспорт PNG
            </Button>
          </div>
          <div ref={clusterRef}></div>
        </div>
      )}

      {/* По темам */}
      {selectedView === 'topic' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center space-x-4">
              <h4 className="text-lg font-medium">Распределение по темам</h4>
              <select
                value={selectedTopic}
                onChange={(e) => setSelectedTopic(parseInt(e.target.value))}
                className="border border-gray-300 rounded-md px-3 py-2 text-sm"
              >
                {Array.from({ length: numTopics }, (_, i) => (
                  <option key={i} value={i}>
                    {uploadedTopicNames?.[i] || topicSettings?.topics?.[i]?.name || predefinedTopicNames[i] || `Тема ${i + 1}`}
                  </option>
                ))}
              </select>
            </div>
            <Button
              onClick={() => exportChart(topicRef, `topic_${selectedTopic}_opinions.png`)}
              variant="outline"
              className="text-sm"
            >
              Экспорт PNG
            </Button>
          </div>
          <div ref={topicRef}></div>
        </div>
      )}

      {/* Сводная таблица */}
      <div>
        <h4 className="text-lg font-medium mb-4">Сводная статистика мнений</h4>
        <div className="overflow-x-auto">
          <table className="min-w-full border border-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Кластер</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Агентов</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Среднее мнение</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Стандартное отклонение</th>
                <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Поляризация</th>
              </tr>
            </thead>
            <tbody>
              {Array.from({ length: numClusters }, (_, i) => {
                const clusterOpinions = agentOpinions.filter(d => d.cluster === i);
                const opinions = clusterOpinions.map(d => d.opinion);
                const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length || 0;
                const variance = opinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / opinions.length || 0;
                const stdDev = Math.sqrt(variance);
                const polarization = opinions.filter(op => Math.abs(op) > 0.5).length / opinions.length * 100;
                
                const clusterNames = ['Синий', 'Красный', 'Зеленый', 'Фиолетовый', 'Оранжевый', 'Розовый', 'Коричневый', 'Серый', 'Желтый', 'Голубой'];
                const clusterName = clusterNames[i] || `Кластер ${i + 1}`;
                
                return (
                  <tr key={i} className="border-t border-gray-200">
                    <td className="px-4 py-2 text-sm">{clusterName}</td>
                    <td className="px-4 py-2 text-sm">{clusterOpinions.length / numTopics}</td>
                    <td className="px-4 py-2 text-sm">{mean.toFixed(3)}</td>
                    <td className="px-4 py-2 text-sm">{stdDev.toFixed(3)}</td>
                    <td className="px-4 py-2 text-sm">{polarization.toFixed(1)}%</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default OpinionVisualization;
