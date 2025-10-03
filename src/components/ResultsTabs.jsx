import React, { useState, useRef } from 'react';
import EnhancedNetworkVisualization from './EnhancedNetworkVisualization';
import OpinionVisualization from './OpinionVisualization';
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

const ResultsTabs = ({ 
  simulationData, 
  rawSimulationData, 
  simulationParams, 
  topicSettings,
  opinionSettings,
  uploadedTopicNames 
}) => {
  const [activeTab, setActiveTab] = useState('summary');
  const [selectedAgent, setSelectedAgent] = useState(null);
  const summaryRef = useRef();
  const connectionsRef = useRef();
  const opinionsRef = useRef();

  if (!simulationData || !rawSimulationData) {
    return (
      <div className="bg-white rounded-lg shadow-md p-6">
        <p className="text-gray-500">Запустите симуляцию для просмотра результатов</p>
      </div>
    );
  }

  const { nodes, links } = simulationData;
  const { agents, connections } = rawSimulationData;

  // Вычисление статистики
  const totalAgents = agents.length;
  const totalConnections = links.length;
  const connectionDensity = (totalConnections / (totalAgents * (totalAgents - 1) / 2) * 100).toFixed(1);
  
  // Статистика по кластерам
  const clusterStats = {};
  const numClusters = simulationParams.numClusters || 3;
  
  for (let i = 0; i < numClusters; i++) {
    const clusterAgents = nodes.filter(node => node.cluster === i);
    const clusterConnections = links.filter(link => 
      nodes[link.source].cluster === i && nodes[link.target].cluster === i
    );
    const crossClusterConnections = links.filter(link => 
      (nodes[link.source].cluster === i && nodes[link.target].cluster !== i) ||
      (nodes[link.target].cluster === i && nodes[link.source].cluster !== i)
    );
    
    clusterStats[i] = {
      agentCount: clusterAgents.length,
      internalConnections: clusterConnections.length,
      externalConnections: crossClusterConnections.length,
      avgDegree: clusterAgents.reduce((sum, agent) => sum + agent.degree, 0) / clusterAgents.length || 0
    };
  }

  // Статистика мнений (если доступна)
  const opinionStats = calculateOpinionStats(agents, topicSettings, opinionSettings);

  const exportImage = (ref, filename) => {
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

  return (
    <div className="bg-white rounded-lg shadow-md">
      {/* Вкладки */}
      <div className="flex border-b border-gray-200">
        <button
          onClick={() => setActiveTab('summary')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'summary'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Общая сводка
        </button>
        <button
          onClick={() => setActiveTab('connections')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'connections'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Детализация по связям
        </button>
        <button
          onClick={() => setActiveTab('opinions')}
          className={`px-6 py-3 font-medium ${
            activeTab === 'opinions'
              ? 'border-b-2 border-blue-500 text-blue-600 bg-blue-50'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Детализация по мнениям
        </button>
      </div>

      {/* Содержимое вкладок */}
      <div className="p-6">
        {/* Общая сводка */}
        {activeTab === 'summary' && (
          <div ref={summaryRef} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Общая сводка результатов</h3>
              <Button
                onClick={() => exportImage(summaryRef, 'summary.png')}
                variant="outline"
                className="text-sm"
              >
                Экспорт изображения
              </Button>
            </div>

            {/* Основные показатели */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{totalAgents}</div>
                <div className="text-sm text-blue-800">Всего агентов</div>
              </div>
              <div className="bg-green-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-green-600">{totalConnections}</div>
                <div className="text-sm text-green-800">Активных связей</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">{connectionDensity}%</div>
                <div className="text-sm text-purple-800">Плотность сети</div>
              </div>
              <div className="bg-orange-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-orange-600">{topicSettings?.numTopics || 10}</div>
                <div className="text-sm text-orange-800">Тем обсуждения</div>
              </div>
            </div>

            {/* Статистика по кластерам */}
            <div>
              <h4 className="text-lg font-medium mb-4">Статистика по кластерам связей</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {Object.entries(clusterStats).map(([clusterId, stats]) => {
                  const clusterNames = ['Синий', 'Красный', 'Зеленый', 'Фиолетовый', 'Оранжевый', 'Розовый', 'Коричневый', 'Серый', 'Желтый', 'Голубой'];
                  const clusterColors = [
                    'bg-blue-100 text-blue-800', 
                    'bg-red-100 text-red-800', 
                    'bg-green-100 text-green-800',
                    'bg-purple-100 text-purple-800',
                    'bg-orange-100 text-orange-800',
                    'bg-pink-100 text-pink-800',
                    'bg-amber-100 text-amber-800',
                    'bg-gray-100 text-gray-800',
                    'bg-yellow-100 text-yellow-800',
                    'bg-cyan-100 text-cyan-800'
                  ];
                  
                  const clusterIndex = parseInt(clusterId);
                  const clusterName = clusterNames[clusterIndex] || `Кластер ${clusterIndex + 1}`;
                  const clusterColor = clusterColors[clusterIndex] || 'bg-gray-100 text-gray-800';
                  
                  return (
                    <div key={clusterId} className={`rounded-lg p-4 ${clusterColor}`}>
                      <h5 className="font-medium mb-2">{clusterName} кластер</h5>
                      <div className="space-y-1 text-sm">
                        <div>Агентов: {stats.agentCount}</div>
                        <div>Внутренних связей: {stats.internalConnections}</div>
                        <div>Внешних связей: {stats.externalConnections}</div>
                        <div>Среднее связей на агента: {stats.avgDegree.toFixed(1)}</div>
                        <div>Замкнутость: {((stats.internalConnections / (stats.internalConnections + stats.externalConnections)) * 100 || 0).toFixed(1)}%</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Баланс мнений по кластерам */}
            {opinionStats && (
              <div>
                <h4 className="text-lg font-medium mb-4">Баланс мнений по кластерам</h4>
                <OpinionSummaryChart opinionStats={opinionStats} />
              </div>
            )}
          </div>
        )}

        {/* Детализация по связям */}
        {activeTab === 'connections' && (
          <div ref={connectionsRef} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Детализация по связям</h3>
              <Button
                onClick={() => exportImage(connectionsRef, 'connections.png')}
                variant="outline"
                className="text-sm"
              >
                Экспорт изображения
              </Button>
            </div>

            {/* Интерактивный граф */}
            <div className="border border-gray-200 rounded-lg p-4">
              <div className="w-full overflow-x-auto">
                <EnhancedNetworkVisualization 
                  data={simulationData}
                  width={Math.min(1500, window.innerWidth - 100)}
                  height={Math.min(800, window.innerHeight - 200)}
                  scenario={simulationParams.scenario}
                  cycles={simulationParams.cycles}
                  onAgentClick={setSelectedAgent}
                  selectedAgent={selectedAgent}
                />
              </div>
            </div>

            {/* Информация о выбранном агенте */}
            {selectedAgent !== null && (
              <AgentDetails 
                agent={agents[selectedAgent]}
                connections={connections[selectedAgent]}
                agents={agents}
                topicSettings={topicSettings}
                opinionSettings={opinionSettings}
              />
            )}

            {/* Подробная статистика кластеров */}
            <div>
              <h4 className="text-lg font-medium mb-4">Подробная статистика кластеров</h4>
              <ClusterDetailsTable clusterStats={clusterStats} nodes={nodes} />
            </div>
          </div>
        )}

        {/* Детализация по мнениям */}
        {activeTab === 'opinions' && (
          <div ref={opinionsRef} className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-xl font-semibold">Детализация по мнениям</h3>
              <Button
                onClick={() => exportImage(opinionsRef, 'opinions.png')}
                variant="outline"
                className="text-sm"
              >
                Экспорт изображения
              </Button>
            </div>

            {opinionStats ? (
              <OpinionVisualization 
                opinionStats={opinionStats}
                agents={agents}
                topicSettings={topicSettings}
                clusterStats={clusterStats}
                uploadedTopicNames={uploadedTopicNames}
              />
            ) : (
              <div className="text-center py-8 text-gray-500">
                <p>Данные о мнениях недоступны</p>
                <p className="text-sm">Настройте мнения в расширенном управлении сценариями</p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// Компонент для отображения деталей агента
const AgentDetails = ({ agent, connections, agents, topicSettings, opinionSettings }) => {
  const ownClusterConnections = connections.filter((strength, idx) => 
    idx !== agent.id && strength > 0.3 && agents[idx].cluster === agent.cluster
  ).length;
  
  const otherClusterConnections = connections.filter((strength, idx) => 
    idx !== agent.id && strength > 0.3 && agents[idx].cluster !== agent.cluster
  ).length;
  
  const avgStrength = connections.reduce((sum, strength, idx) => 
    idx !== agent.id && strength > 0.3 ? sum + strength : sum, 0
  ) / (ownClusterConnections + otherClusterConnections || 1);

  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <h5 className="font-medium mb-3">Детали агента {agent.id}</h5>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h6 className="font-medium text-sm mb-2">Связи</h6>
          <div className="space-y-1 text-sm">
            <div>В своем кластере: {ownClusterConnections}</div>
            <div>В других кластерах: {otherClusterConnections}</div>
            <div>Средняя сила связи: {avgStrength.toFixed(3)}</div>
            <div>Кластер: {agent.cluster + 1}</div>
          </div>
        </div>
        <div>
          <h6 className="font-medium text-sm mb-2">Мнения по темам</h6>
          <div className="space-y-1 text-sm max-h-32 overflow-y-auto">
            {topicSettings?.topics?.slice(0, 5).map((topic, idx) => {
              const opinion = agent.opinions?.[topic.id] || 
                             (Math.random() * 2 - 1).toFixed(2); // Заглушка
              return (
                <div key={idx} className="flex justify-between">
                  <span>{topic.name}:</span>
                  <span className={opinion > 0 ? 'text-green-600' : opinion < 0 ? 'text-red-600' : 'text-gray-600'}>
                    {typeof opinion === 'number' ? opinion.toFixed(2) : opinion}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

// Компонент для таблицы деталей кластеров
const ClusterDetailsTable = ({ clusterStats, nodes }) => {
  const clusterNames = ['Синий', 'Красный', 'Зеленый', 'Фиолетовый', 'Оранжевый', 'Розовый', 'Коричневый', 'Серый', 'Желтый', 'Голубой'];
  
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Кластер</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Агентов</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Плотность связей</th>
              <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Хабы (&gt;5 связей)</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Внешние связи</th>
            <th className="px-4 py-2 text-left text-sm font-medium text-gray-700">Коэффициент замкнутости</th>
          </tr>
        </thead>
        <tbody>
          {Object.entries(clusterStats).map(([clusterId, stats]) => {
            const clusterNodes = nodes.filter(node => node.cluster === parseInt(clusterId));
            const hubs = clusterNodes.filter(node => node.degree > 5).length;
            const density = stats.agentCount > 1 ? 
              (stats.internalConnections / (stats.agentCount * (stats.agentCount - 1) / 2) * 100).toFixed(1) : 0;
            const closure = ((stats.internalConnections / (stats.internalConnections + stats.externalConnections)) * 100 || 0).toFixed(1);
            
            const clusterIndex = parseInt(clusterId);
            const clusterName = clusterNames[clusterIndex] || `Кластер ${clusterIndex + 1}`;
            
            return (
              <tr key={clusterId} className="border-t border-gray-200">
                <td className="px-4 py-2 text-sm">{clusterName}</td>
                <td className="px-4 py-2 text-sm">{stats.agentCount}</td>
                <td className="px-4 py-2 text-sm">{density}%</td>
                <td className="px-4 py-2 text-sm">{hubs}</td>
                <td className="px-4 py-2 text-sm">{stats.externalConnections}</td>
                <td className="px-4 py-2 text-sm">{closure}%</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

// Компонент для краткой диаграммы мнений
const OpinionSummaryChart = ({ opinionStats }) => {
  // Простая реализация - можно расширить с помощью D3 или Recharts
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {opinionStats.clusterSummary.map((cluster, idx) => (
        <div key={idx} className="border border-gray-200 rounded-lg p-4">
          <h6 className="font-medium mb-2">Кластер {idx + 1}</h6>
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Позитивные:</span>
              <span className="text-green-600">{cluster.positive}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Нейтральные:</span>
              <span className="text-gray-600">{cluster.neutral}%</span>
            </div>
            <div className="flex justify-between text-sm">
              <span>Негативные:</span>
              <span className="text-red-600">{cluster.negative}%</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};

// Функция для вычисления статистики мнений
function calculateOpinionStats(agents, topicSettings, opinionSettings) {
  if (!agents || agents.length === 0) return null;
  
  // Определяем количество кластеров
  const clusterIds = [...new Set(agents.map(a => a.cluster))].sort((a, b) => a - b);
  const clusterSummary = [];
  
  // Получаем количество тем
  let numTopics = 0;
  if (topicSettings?.topics) {
    numTopics = topicSettings.topics.length;
  } else if (topicSettings?.numTopics) {
    numTopics = topicSettings.numTopics;
  } else if (agents[0]?.opinions) {
    // Пытаемся определить из структуры данных агентов
    if (Array.isArray(agents[0].opinions)) {
      numTopics = agents[0].opinions.length;
    } else if (typeof agents[0].opinions === 'object') {
      numTopics = Object.keys(agents[0].opinions).length;
    }
  }
  
  if (numTopics === 0) {
    // Если не можем определить темы, создаем пустую статистику
    clusterIds.forEach(clusterId => {
      clusterSummary.push({
        positive: 0,
        neutral: 100,
        negative: 0
      });
    });
    return { clusterSummary };
  }
  
  clusterIds.forEach(clusterId => {
    const clusterAgents = agents.filter(a => a.cluster === clusterId);
    let positive = 0, neutral = 0, negative = 0;
    
    clusterAgents.forEach(agent => {
      for (let topicIndex = 0; topicIndex < numTopics; topicIndex++) {
        let opinion = 0;
        
        // Получаем мнение агента по теме
        if (agent.opinions) {
          if (Array.isArray(agent.opinions)) {
            opinion = agent.opinions[topicIndex] || 0;
          } else if (typeof agent.opinions === 'object') {
            // Если opinions - объект, берем по ключу или индексу
            const topicKey = topicSettings?.topics?.[topicIndex]?.id || topicIndex;
            opinion = agent.opinions[topicKey] || 0;
          }
        } else if (opinionSettings?.clusterOpinions) {
          // Fallback к настройкам кластера
          const clusterOpinion = opinionSettings.clusterOpinions[clusterId];
          if (clusterOpinion) {
            const topicKey = topicSettings?.topics?.[topicIndex]?.id || topicIndex;
            opinion = clusterOpinion[topicKey] || 0;
            // Добавляем небольшой шум
            // opinion += (Math.random() - 0.5) * 0.2; // Убрали шум, чтобы не искажать базовые мнения
          }
        }
        
        // Классифицируем мнение
        if (opinion > 0.05) {
          positive++;
        } else if (opinion < -0.05) {
          negative++;
        } else {
          neutral++;
        }
      }
    });
    
    const total = positive + neutral + negative;
    if (total > 0) {
      clusterSummary.push({
        positive: Math.round((positive / total) * 100),
        neutral: Math.round((neutral / total) * 100),
        negative: Math.round((negative / total) * 100)
      });
    } else {
      // Если нет данных, показываем нейтральное распределение
      clusterSummary.push({
        positive: 0,
        neutral: 100,
        negative: 0
      });
    }
  });
  
  return { clusterSummary };
}

export default ResultsTabs;
