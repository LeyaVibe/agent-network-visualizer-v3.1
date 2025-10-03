import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar, ScatterChart, Scatter, AreaChart, Area, PieChart, Pie, Cell,
  RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar
} from 'recharts';
import { 
  TrendingUp, BarChart3, Network, 
  Brain, Clock, Target, Zap, AlertTriangle, TestTube,
  Download, FileText, Table, Image, FileSpreadsheet, FileJson
} from 'lucide-react';
import Papa from 'papaparse';

const AdvancedAnalyticsWithExport = ({ 
  rawSimulationData,
  simulationParams,
  topicSettings,
  onError 
}) => {
  // Добавление обработчика ошибок для диагностики
  useEffect(() => {
    const handleError = (error, errorInfo) => {
      console.error("Caught an error in AdvancedAnalytics:", error, errorInfo);
      if (onError) {
        onError(error, errorInfo);
      }
    };
    window.addEventListener("error", handleError);
    return () => window.removeEventListener("error", handleError);
  }, [onError]);

  const [timeSeriesData, setTimeSeriesData] = useState([]);
  const [networkMetrics, setNetworkMetrics] = useState({});
  const [statisticalTests, setStatisticalTests] = useState({});
  const [selectedMetric, setSelectedMetric] = useState('opinions');
  const [selectedTimeRange, setSelectedTimeRange] = useState('all');
  const [exportFormat, setExportFormat] = useState('csv');
  const [exportData, setExportData] = useState('all');

  const colors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

  useEffect(() => {
    if (rawSimulationData) {
      calculateTimeSeriesData();
      calculateNetworkMetrics();
      performStatisticalTests();
    }
  }, [rawSimulationData, simulationParams, topicSettings]);

  // Расчет данных временных рядов
  const calculateTimeSeriesData = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics || rawSimulationData.agents.length === 0) return;

    const data = [];
    const cycles = simulationParams?.cycles || 10;
    
    for (let cycle = 0; cycle <= cycles; cycle++) {
      const cycleData = { cycle };
      
      // Средние мнения по темам
      topicSettings.topics.forEach((topic, topicIndex) => {
        const opinions = rawSimulationData.agents.map(agent => {
          if (Array.isArray(agent.opinions)) {
            return agent.opinions[topicIndex] || 0;
          } else if (typeof agent.opinions === 'object') {
            return agent.opinions[topic.id] || agent.opinions[topicIndex] || 0;
          }
          return 0;
        });
        cycleData[`topic_${topicIndex}`] = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
      });

      // Метрики сети
      cycleData.avgConnections = calculateAverageConnections();
      cycleData.networkDensity = calculateNetworkDensity();
      cycleData.clustering = calculateClusteringCoefficient();
      
      data.push(cycleData);
    }
    setTimeSeriesData(data);
  };

  // Расчет сетевых метрик
  const calculateNetworkMetrics = () => {
    if (!rawSimulationData?.agents || !rawSimulationData?.connections || rawSimulationData.agents.length === 0 || rawSimulationData.connections.length === 0) return;

    const { agents, connections } = rawSimulationData;
    const metrics = {};

    // Базовые метрики
    metrics.nodeCount = agents.length;
    metrics.edgeCount = connections.flat().filter(c => c > 0).length / 2;
    metrics.density = calculateNetworkDensity();
    metrics.averageDegree = (metrics.edgeCount * 2) / metrics.nodeCount;

    // Центральность узлов
    metrics.degreeCentrality = calculateDegreeCentrality(connections);
    metrics.betweennessCentrality = calculateBetweennessCentrality(connections);
    metrics.closenessCentrality = calculateClosenessCentrality(connections);

    // Кластеризация
    metrics.clusteringCoefficient = calculateClusteringCoefficient();
    metrics.modularity = calculateModularity(connections, agents);

    // Компоненты связности
    metrics.connectedComponents = findConnectedComponents(connections);
    metrics.largestComponent = Math.max(...metrics.connectedComponents.map(c => c.length));

    setNetworkMetrics(metrics);
  };

  // Выполнение статистических тестов
  const performStatisticalTests = () => {
    if (!rawSimulationData?.agents) return;

    const tests = {};

    // Тест на нормальность
    tests.normalityTests = performNormalityTests();

    // Корреляционный анализ
    tests.correlations = calculateCorrelations();

    setStatisticalTests(tests);
  };

  // Вспомогательные функции
  const calculateNetworkDensity = () => {
    if (!rawSimulationData?.connections) return 0;
    const { connections } = rawSimulationData;
    const n = connections.length;
    const actualEdges = connections.flat().filter(c => c > 0).length / 2;
    const possibleEdges = (n * (n - 1)) / 2;
    return possibleEdges > 0 ? actualEdges / possibleEdges : 0;
  };

  const calculateAverageConnections = () => {
    if (!rawSimulationData?.connections) return 0;
    const { connections } = rawSimulationData;
    const totalConnections = connections.reduce((sum, row) => 
      sum + row.filter(c => c > 0).length, 0
    );
    return connections.length > 0 ? totalConnections / connections.length : 0;
  };

  const calculateClusteringCoefficient = () => {
    if (!rawSimulationData?.connections) return 0;
    const { connections } = rawSimulationData;
    const n = connections.length;
    let totalClustering = 0;

    for (let i = 0; i < n; i++) {
      const neighbors = [];
      for (let j = 0; j < n; j++) {
        if (i !== j && connections[i][j] > 0) {
          neighbors.push(j);
        }
      }

      if (neighbors.length < 2) continue;

      let triangles = 0;
      for (let j = 0; j < neighbors.length; j++) {
        for (let k = j + 1; k < neighbors.length; k++) {
          if (connections[neighbors[j]][neighbors[k]] > 0) {
            triangles++;
          }
        }
      }

      const possibleTriangles = (neighbors.length * (neighbors.length - 1)) / 2;
      totalClustering += possibleTriangles > 0 ? triangles / possibleTriangles : 0;
    }

    return n > 0 ? totalClustering / n : 0;
  };

  const calculateDegreeCentrality = (connections) => {
    return connections.map(row => row.filter(c => c > 0).length);
  };

  const calculateBetweennessCentrality = (connections) => {
    const n = connections.length;
    const betweenness = new Array(n).fill(0);
    
    // Улучшенный алгоритм Брандеса (упрощенная версия)
    for (let s = 0; s < n; s++) {
      // Стек для обратного прохода
      const stack = [];
      // Предшественники
      const predecessors = Array(n).fill().map(() => []);
      // Расстояния
      const distances = new Array(n).fill(-1);
      // Количество кратчайших путей
      const sigma = new Array(n).fill(0);
      // Зависимости
      const delta = new Array(n).fill(0);
      
      distances[s] = 0;
      sigma[s] = 1;
      
      const queue = [s];
      
      // Прямой проход (BFS)
      while (queue.length > 0) {
        const v = queue.shift();
        stack.push(v);
        
        for (let w = 0; w < n; w++) {
          if (connections[v][w] > 0) { // Есть связь
            // Первое обнаружение w?
            if (distances[w] < 0) {
              queue.push(w);
              distances[w] = distances[v] + 1;
            }
            // Кратчайший путь к w через v?
            if (distances[w] === distances[v] + 1) {
              sigma[w] += sigma[v];
              predecessors[w].push(v);
            }
          }
        }
      }
      
      // Обратный проход
      while (stack.length > 0) {
        const w = stack.pop();
        for (const v of predecessors[w]) {
          delta[v] += (sigma[v] / sigma[w]) * (1 + delta[w]);
        }
        if (w !== s) {
          betweenness[w] += delta[w];
        }
      }
    }
    
    // Нормализация для неориентированного графа
    const normalizationFactor = n > 2 ? 2.0 / ((n - 1) * (n - 2)) : 1;
    return betweenness.map(b => b * normalizationFactor);
  };

  const calculateClosenessCentrality = (connections) => {
    const n = connections.length;
    return connections.map((_, i) => {
      let totalDistance = 0;
      let reachableNodes = 0;
      
      for (let j = 0; j < n; j++) {
        if (i !== j) {
          const distance = findShortestPathDistance(connections, i, j);
          if (distance < Infinity) {
            totalDistance += distance;
            reachableNodes++;
          }
        }
      }
      
      return reachableNodes > 0 ? reachableNodes / totalDistance : 0;
    });
  };

  const calculateModularity = (connections, agents) => {
    const n = connections.length;
    const m = connections.flat().filter(c => c > 0).length / 2;
    
    if (m === 0) return 0;
    
    let modularity = 0;
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        const ki = connections[i].filter(c => c > 0).length;
        const kj = connections[j].filter(c => c > 0).length;
        const delta = agents[i].cluster === agents[j].cluster ? 1 : 0;
        
        modularity += (connections[i][j] - (ki * kj) / (2 * m)) * delta;
      }
    }
    
    return modularity / (2 * m);
  };

  const findConnectedComponents = (connections) => {
    const n = connections.length;
    const visited = new Array(n).fill(false);
    const components = [];
    
    const dfs = (node, component) => {
      visited[node] = true;
      component.push(node);
      
      for (let i = 0; i < n; i++) {
        if (!visited[i] && connections[node][i] > 0) {
          dfs(i, component);
        }
      }
    };
    
    for (let i = 0; i < n; i++) {
      if (!visited[i]) {
        const component = [];
        dfs(i, component);
        components.push(component);
      }
    }
    
    return components;
  };

  const findShortestPath = (connections, start, end) => {
    const n = connections.length;
    const visited = new Array(n).fill(false);
    const parent = new Array(n).fill(-1);
    const queue = [start];
    visited[start] = true;
    
    while (queue.length > 0) {
      const node = queue.shift();
      
      if (node === end) {
        // Восстанавливаем путь
        const path = [];
        let current = end;
        while (current !== -1) {
          path.unshift(current);
          current = parent[current];
        }
        return path;
      }
      
      for (let i = 0; i < n; i++) {
        if (!visited[i] && connections[node][i] > 0) {
          visited[i] = true;
          parent[i] = node;
          queue.push(i);
        }
      }
    }
    
    return [];
  };

  const findShortestPathDistance = (connections, start, end) => {
    const path = findShortestPath(connections, start, end);
    return path.length > 0 ? path.length - 1 : Infinity;
  };

  const performNormalityTests = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics || rawSimulationData.agents.length === 0) return {};

    const results = {};
    
    topicSettings.topics.forEach((topic, topicIndex) => {
      const opinions = rawSimulationData.agents.map(agent => {
        if (Array.isArray(agent.opinions)) {
          return agent.opinions[topicIndex] || 0;
        } else if (typeof agent.opinions === 'object') {
          return agent.opinions[topic.id] || agent.opinions[topicIndex] || 0;
        }
        return 0;
      });

      // Простой тест на нормальность (проверка асимметрии и эксцесса)
      const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
      const variance = opinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / (opinions.length - 1);
      const std = Math.sqrt(variance);
      
      // Асимметрия (skewness)
      const skewness = opinions.reduce((sum, op) => sum + Math.pow((op - mean) / std, 3), 0) / opinions.length;
      
      // Эксцесс (kurtosis)
      const kurtosis = opinions.reduce((sum, op) => sum + Math.pow((op - mean) / std, 4), 0) / opinions.length - 3;

      // Тест Жарка-Бера на нормальность
      const n = opinions.length;
      const jarqueBeraStatistic = (n / 6) * (Math.pow(skewness, 2) + Math.pow(kurtosis, 2) / 4);
      const jarqueBeraCritical = 5.991; // Критическое значение для α = 0.05
      const isNormalJB = jarqueBeraStatistic < jarqueBeraCritical;

      results[topic.name] = {
        mean: mean.toFixed(3),
        std: std.toFixed(3),
        skewness: skewness.toFixed(3),
        kurtosis: kurtosis.toFixed(3),
        jarqueBera: {
          statistic: jarqueBeraStatistic.toFixed(3),
          critical: jarqueBeraCritical.toFixed(3),
          isNormal: isNormalJB
        },
        isNormal: isNormalJB
      };
    });

    return results;
  };

  const calculateCorrelations = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics || topicSettings.topics.length < 2) return {};

    const correlations = {};
    
    for (let i = 0; i < topicSettings.topics.length; i++) {
      for (let j = i + 1; j < topicSettings.topics.length; j++) {
        const topic1 = topicSettings.topics[i];
        const topic2 = topicSettings.topics[j];
        
        const opinions1 = rawSimulationData.agents.map(agent => {
          if (Array.isArray(agent.opinions)) {
            return agent.opinions[i] || 0;
          } else if (typeof agent.opinions === 'object') {
            return agent.opinions[topic1.id] || agent.opinions[i] || 0;
          }
          return 0;
        });
        
        const opinions2 = rawSimulationData.agents.map(agent => {
          if (Array.isArray(agent.opinions)) {
            return agent.opinions[j] || 0;
          } else if (typeof agent.opinions === 'object') {
            return agent.opinions[topic2.id] || agent.opinions[j] || 0;
          }
          return 0;
        });
        
        const correlation = calculatePearsonCorrelation(opinions1, opinions2);
        correlations[`${topic1.name} - ${topic2.name}`] = correlation.toFixed(3);
      }
    }

    return correlations;
  };

  const calculatePearsonCorrelation = (x, y) => {
    const n = x.length;
    const sumX = x.reduce((sum, val) => sum + val, 0);
    const sumY = y.reduce((sum, val) => sum + val, 0);
    const sumXY = x.reduce((sum, val, i) => sum + val * y[i], 0);
    const sumX2 = x.reduce((sum, val) => sum + val * val, 0);
    const sumY2 = y.reduce((sum, val) => sum + val * val, 0);
    
    const numerator = n * sumXY - sumX * sumY;
    const denominator = Math.sqrt((n * sumX2 - sumX * sumX) * (n * sumY2 - sumY * sumY));
    
    return denominator === 0 ? 0 : numerator / denominator;
  };

  // Функции экспорта
  const exportAnalyticsData = () => {
    try {
      let content, filename, mimeType;

      switch (exportFormat) {
        case 'csv':
          content = generateCSVData();
          filename = `analytics_${exportData}_${new Date().toISOString().split('T')[0]}.csv`;
          mimeType = 'text/csv';
          break;

        case 'json':
          content = JSON.stringify(generateJSONData(), null, 2);
          filename = `analytics_${exportData}_${new Date().toISOString().split('T')[0]}.json`;
          mimeType = 'application/json';
          break;

        case 'txt':
          content = generateTextReport();
          filename = `analytics_report_${new Date().toISOString().split('T')[0]}.txt`;
          mimeType = 'text/plain';
          break;

        case 'md':
          content = generateMarkdownReport();
          filename = `analytics_report_${new Date().toISOString().split('T')[0]}.md`;
          mimeType = 'text/markdown';
          break;

        default:
          throw new Error('Неподдерживаемый формат экспорта');
      }

      const blob = new Blob([content], { type: mimeType });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);

    } catch (error) {
      if (onError) {
        onError(`Ошибка экспорта: ${error.message}`);
      }
    }
  };

  const generateCSVData = () => {
    switch (exportData) {
      case 'timeseries':
        return Papa.unparse(timeSeriesData);
      
      case 'network':
        const networkData = getNetworkMetricsData();
        return Papa.unparse(networkData);
      
      case 'statistics':
        const statsData = Object.entries(statisticalTests.normalityTests || {}).map(([topic, stats]) => ({
          topic,
          mean: stats.mean,
          std: stats.std,
          skewness: stats.skewness,
          kurtosis: stats.kurtosis,
          jarqueBera_statistic: stats.jarqueBera?.statistic || 'N/A',
          jarqueBera_critical: stats.jarqueBera?.critical || 'N/A',
          isNormal: stats.isNormal ? 'Да' : 'Нет'
        }));
        return Papa.unparse(statsData);
      
      case 'opinions':
        const opinionsData = [];
        rawSimulationData?.agents?.forEach((agent, agentIndex) => {
          topicSettings?.topics?.forEach((topic, topicIndex) => {
            let opinion = 0;
            if (Array.isArray(agent.opinions)) {
              opinion = agent.opinions[topicIndex] || 0;
            } else if (typeof agent.opinions === 'object') {
              opinion = agent.opinions[topic.id] || agent.opinions[topicIndex] || 0;
            }
            
            opinionsData.push({
              agent: `Agent_${agentIndex}`,
              topic: topic.name,
              opinion: opinion.toFixed(3),
              cluster: agent.cluster
            });
          });
        });
        return Papa.unparse(opinionsData);
      
      default:
        // Экспорт всех данных
        return Papa.unparse([
          ...timeSeriesData.map(row => ({ type: 'timeseries', ...row })),
          ...getNetworkMetricsData().map(row => ({ type: 'network', ...row }))
        ]);
    }
  };

  const generateJSONData = () => {
    const data = {
      metadata: {
        exportDate: new Date().toISOString(),
        simulationParams,
        topicSettings,
        exportType: exportData
      }
    };

    switch (exportData) {
      case 'timeseries':
        data.timeSeriesData = timeSeriesData;
        break;
      
      case 'network':
        data.networkMetrics = networkMetrics;
        data.networkData = getNetworkMetricsData();
        break;
      
      case 'statistics':
        data.statisticalTests = statisticalTests;
        break;
      
      case 'opinions':
        data.opinionsData = generateOpinionsData();
        break;
      
      default:
        data.timeSeriesData = timeSeriesData;
        data.networkMetrics = networkMetrics;
        data.statisticalTests = statisticalTests;
        data.opinionsData = generateOpinionsData();
    }

    return data;
  };

  const generateOpinionsData = () => {
    const opinionsData = [];
    rawSimulationData?.agents?.forEach((agent, agentIndex) => {
      const agentData = {
        agentId: agentIndex,
        cluster: agent.cluster,
        opinions: {}
      };
      
      topicSettings?.topics?.forEach((topic, topicIndex) => {
        let opinion = 0;
        if (Array.isArray(agent.opinions)) {
          opinion = agent.opinions[topicIndex] || 0;
        } else if (typeof agent.opinions === 'object') {
          opinion = agent.opinions[topic.id] || agent.opinions[topicIndex] || 0;
        }
        
        agentData.opinions[topic.name] = opinion;
      });
      
      opinionsData.push(agentData);
    });
    
    return opinionsData;
  };

  const generateTextReport = () => {
    let report = `ОТЧЕТ ПО АНАЛИТИКЕ АГЕНТНОГО МОДЕЛИРОВАНИЯ\n`;
    report += `Дата создания: ${new Date().toLocaleString('ru-RU')}\n`;
    report += `${'='.repeat(60)}\n\n`;

    // Основные параметры симуляции
    report += `ПАРАМЕТРЫ СИМУЛЯЦИИ:\n`;
    report += `- Количество агентов: ${simulationParams?.agentCount || 'N/A'}\n`;
    report += `- Циклы симуляции: ${simulationParams?.cycles || 'N/A'}\n`;
    report += `- Порог отображения: ${simulationParams?.threshold || 'N/A'}\n`;
    report += `- Размерность вектора: ${simulationParams?.vectorDimension || 'N/A'}\n`;
    report += `- Количество кластеров: ${simulationParams?.numClusters || 'N/A'}\n\n`;

    // Сетевые метрики
    report += `СЕТЕВЫЕ МЕТРИКИ:\n`;
    report += `- Количество узлов: ${networkMetrics.nodeCount || 'N/A'}\n`;
    report += `- Количество связей: ${networkMetrics.edgeCount || 'N/A'}\n`;
    report += `- Плотность сети: ${networkMetrics.density?.toFixed(3) || 'N/A'}\n`;
    report += `- Средняя степень: ${networkMetrics.averageDegree?.toFixed(2) || 'N/A'}\n`;
    report += `- Коэффициент кластеризации: ${networkMetrics.clusteringCoefficient?.toFixed(3) || 'N/A'}\n`;
    report += `- Модульность: ${networkMetrics.modularity?.toFixed(3) || 'N/A'}\n`;
    report += `- Компоненты связности: ${networkMetrics.connectedComponents?.length || 'N/A'}\n`;
    report += `- Размер наибольшего компонента: ${networkMetrics.largestComponent || 'N/A'}\n\n`;

    // Статистические тесты
    report += `СТАТИСТИЧЕСКИЕ ТЕСТЫ:\n`;
    Object.entries(statisticalTests.normalityTests || {}).forEach(([topic, stats]) => {
      report += `\nТема: ${topic}\n`;
      report += `  - Среднее: ${stats.mean}\n`;
      report += `  - Стандартное отклонение: ${stats.std}\n`;
      report += `  - Асимметрия: ${stats.skewness}\n`;
      report += `  - Эксцесс: ${stats.kurtosis}\n`;
      report += `  - Тест Жарка-Бера: ${stats.jarqueBera?.statistic || 'N/A'} (критическое: ${stats.jarqueBera?.critical || 'N/A'})\n`;
      report += `  - Нормальность: ${stats.isNormal ? 'Да' : 'Нет'}\n`;
    });

    // Корреляции
    report += `\nКОРРЕЛЯЦИИ МЕЖДУ ТЕМАМИ:\n`;
    Object.entries(statisticalTests.correlations || {}).forEach(([pair, correlation]) => {
      report += `- ${pair}: ${correlation}\n`;
    });

    return report;
  };

  const generateMarkdownReport = () => {
    let report = `# Отчет по аналитике агентного моделирования\n\n`;
    report += `**Дата создания:** ${new Date().toLocaleString('ru-RU')}\n\n`;

    // Основные параметры симуляции
    report += `## Параметры симуляции\n\n`;
    report += `| Параметр | Значение |\n`;
    report += `|----------|----------|\n`;
    report += `| Количество агентов | ${simulationParams?.agentCount || 'N/A'} |\n`;
    report += `| Циклы симуляции | ${simulationParams?.cycles || 'N/A'} |\n`;
    report += `| Порог отображения | ${simulationParams?.threshold || 'N/A'} |\n`;
    report += `| Размерность вектора | ${simulationParams?.vectorDimension || 'N/A'} |\n`;
    report += `| Количество кластеров | ${simulationParams?.numClusters || 'N/A'} |\n\n`;

    // Сетевые метрики
    report += `## Сетевые метрики\n\n`;
    report += `| Метрика | Значение |\n`;
    report += `|---------|----------|\n`;
    report += `| Количество узлов | ${networkMetrics.nodeCount || 'N/A'} |\n`;
    report += `| Количество связей | ${networkMetrics.edgeCount || 'N/A'} |\n`;
    report += `| Плотность сети | ${networkMetrics.density?.toFixed(3) || 'N/A'} |\n`;
    report += `| Средняя степень | ${networkMetrics.averageDegree?.toFixed(2) || 'N/A'} |\n`;
    report += `| Коэффициент кластеризации | ${networkMetrics.clusteringCoefficient?.toFixed(3) || 'N/A'} |\n`;
    report += `| Модульность | ${networkMetrics.modularity?.toFixed(3) || 'N/A'} |\n`;
    report += `| Компоненты связности | ${networkMetrics.connectedComponents?.length || 'N/A'} |\n`;
    report += `| Размер наибольшего компонента | ${networkMetrics.largestComponent || 'N/A'} |\n\n`;

    // Статистические тесты
    report += `## Статистические тесты\n\n`;
    report += `### Тесты на нормальность\n\n`;
    report += `| Тема | Среднее | Ст. откл. | Асимметрия | Эксцесс | JB статистика | Нормальность |\n`;
    report += `|------|---------|-----------|------------|---------|---------------|-------------|\n`;
    
    Object.entries(statisticalTests.normalityTests || {}).forEach(([topic, stats]) => {
      report += `| ${topic} | ${stats.mean} | ${stats.std} | ${stats.skewness} | ${stats.kurtosis} | ${stats.jarqueBera?.statistic || 'N/A'} | ${stats.isNormal ? 'Да' : 'Нет'} |\n`;
    });

    // Корреляции
    report += `\n### Корреляции между темами\n\n`;
    report += `| Пара тем | Корреляция |\n`;
    report += `|----------|------------|\n`;
    Object.entries(statisticalTests.correlations || {}).forEach(([pair, correlation]) => {
      report += `| ${pair} | ${correlation} |\n`;
    });

    return report;
  };

  // Данные для графиков
  const getNetworkMetricsData = () => {
    if (!networkMetrics.degreeCentrality || !networkMetrics.betweennessCentrality) return [];
    
    return networkMetrics.degreeCentrality.map((degree, index) => ({
      agent: `Agent ${index}`,
      degree,
      betweenness: networkMetrics.betweennessCentrality[index] || 0,
      closeness: networkMetrics.closenessCentrality?.[index] || 0
    }));
  };

  const getTimeSeriesChartData = () => {
    return timeSeriesData.slice(0, 20); // Ограничиваем для читаемости
  };

  const getOpinionDistributionData = (topicIndex) => {
    if (!rawSimulationData?.agents || rawSimulationData.agents.length === 0) return [];

    const opinions = rawSimulationData.agents.map(agent => {
      if (Array.isArray(agent.opinions)) {
        return agent.opinions[topicIndex] || 0;
      } else if (typeof agent.opinions === 'object') {
        return agent.opinions[topicSettings.topics[topicIndex].id] || agent.opinions[topicIndex] || 0;
      }
      return 0;
    });

    // Создаем гистограмму с 10 интервалами от 0 до 1
    const bins = Array(10).fill(0);
    opinions.forEach(opinion => {
      const binIndex = Math.min(Math.floor(opinion * 10), 9);
      bins[binIndex]++;
    });

    return bins.map((count, index) => ({
      range: `${(index * 0.1).toFixed(1)}-${((index + 1) * 0.1).toFixed(1)}`,
      count,
    }));
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Расширенная аналитика с экспортом
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Панель экспорта */}
        <Card className="mb-6 p-4 bg-gray-50">
          <h4 className="font-medium mb-4 flex items-center gap-2">
            <Download className="h-4 w-4" />
            Экспорт данных аналитики
          </h4>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
            <div>
              <Label htmlFor="exportFormat">Формат экспорта</Label>
              <Select value={exportFormat} onValueChange={setExportFormat}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="csv">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet className="h-4 w-4" />
                      CSV
                    </div>
                  </SelectItem>
                  <SelectItem value="json">
                    <div className="flex items-center gap-2">
                      <FileJson className="h-4 w-4" />
                      JSON
                    </div>
                  </SelectItem>
                  <SelectItem value="txt">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      TXT
                    </div>
                  </SelectItem>
                  <SelectItem value="md">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4" />
                      Markdown
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="exportData">Данные для экспорта</Label>
              <Select value={exportData} onValueChange={setExportData}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Все данные</SelectItem>
                  <SelectItem value="timeseries">Временные ряды</SelectItem>
                  <SelectItem value="network">Сетевые метрики</SelectItem>
                  <SelectItem value="statistics">Статистические тесты</SelectItem>
                  <SelectItem value="opinions">Мнения агентов</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button onClick={exportAnalyticsData} className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Экспортировать
              </Button>
            </div>
          </div>

          <div className="text-sm text-gray-600">
            <p><strong>CSV:</strong> Табличные данные для анализа в Excel/Google Sheets</p>
            <p><strong>JSON:</strong> Структурированные данные для программного анализа</p>
            <p><strong>TXT/Markdown:</strong> Читаемые отчеты с результатами анализа</p>
          </div>
        </Card>

        <Tabs defaultValue="timeseries" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="timeseries">Временные ряды</TabsTrigger>
            <TabsTrigger value="network">Сетевые метрики</TabsTrigger>
            <TabsTrigger value="statistics">Статистические тесты</TabsTrigger>
            <TabsTrigger value="opinionDistribution">Распределение мнений</TabsTrigger>
          </TabsList>

          <TabsContent value="timeseries" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <TrendingUp className="h-4 w-4" />
                Динамика мнений во времени
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <LineChart data={getTimeSeriesChartData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="cycle" />
                  <YAxis />
                  <Tooltip />
                  {topicSettings?.topics?.map((topic, index) => (
                    <Line
                      key={index}
                      type="monotone"
                      dataKey={`topic_${index}`}
                      stroke={colors[index % colors.length]}
                      strokeWidth={2}
                      name={topic.name}
                    />
                  ))}
                </LineChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4">
                <h5 className="font-medium mb-2">Плотность сети</h5>
                <div className="text-2xl font-bold text-blue-600">
                  {networkMetrics.density?.toFixed(3) || '0.000'}
                </div>
              </Card>
              
              <Card className="p-4">
                <h5 className="font-medium mb-2">Средний коэффициент кластеризации</h5>
                <div className="text-2xl font-bold text-green-600">
                  {networkMetrics.clusteringCoefficient?.toFixed(3) || '0.000'}
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-medium mb-2">Среднее количество связей</h5>
                <div className="text-2xl font-bold text-purple-600">
                  {networkMetrics.averageDegree?.toFixed(2) || '0.00'}
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="network" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Network className="h-4 w-4" />
                Метрики центральности сети
              </h4>
              <ResponsiveContainer width="100%" height={400}>
                <ScatterChart data={getNetworkMetricsData()}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="degree" name="Степень" />
                  <YAxis dataKey="betweenness" name="Посредничество" />
                  <Tooltip cursor={{ strokeDasharray: '3 3' }} />
                  <Scatter 
                    name="Агенты" 
                    data={getNetworkMetricsData()} 
                    fill="#3B82F6"
                  />
                </ScatterChart>
              </ResponsiveContainer>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card className="p-4">
                <h5 className="font-medium mb-4">Компоненты связности</h5>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span>Количество компонентов:</span>
                    <span className="font-medium">{networkMetrics.connectedComponents?.length || 0}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Размер наибольшего:</span>
                    <span className="font-medium">{networkMetrics.largestComponent || 0}</span>
                  </div>
                </div>
              </Card>

              <Card className="p-4">
                <h5 className="font-medium mb-4">Модульность</h5>
                <div className="text-center">
                  <div className="text-2xl font-bold text-orange-600">
                    {networkMetrics.modularity?.toFixed(3) || '0.000'}
                  </div>
                  <div className="text-sm text-gray-600">
                    {networkMetrics.modularity > 0.3 ? 'Высокая' :
                     networkMetrics.modularity > 0.1 ? 'Средняя' : 'Низкая'}
                  </div>
                </div>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="statistics" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <TestTube className="h-4 w-4" />
                Тесты на нормальность
              </h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b">
                      <th className="text-left p-2">Тема</th>
                      <th className="text-left p-2">Среднее</th>
                      <th className="text-left p-2">Ст. откл.</th>
                      <th className="text-left p-2">Асимметрия</th>
                      <th className="text-left p-2">Эксцесс</th>
                      <th className="text-left p-2">JB статистика</th>
                      <th className="text-left p-2">JB критическое</th>
                      <th className="text-left p-2">Нормальность (Жарк-Бера)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(statisticalTests.normalityTests || {}).map(([topic, stats]) => (
                      <tr key={topic} className="border-b">
                        <td className="p-2 font-medium">{topic}</td>
                        <td className="p-2">{stats.mean}</td>
                        <td className="p-2">{stats.std}</td>
                        <td className="p-2">{stats.skewness}</td>
                        <td className="p-2">{stats.kurtosis}</td>
                        <td className="p-2">
                          {stats.jarqueBera ? stats.jarqueBera.statistic : 'N/A'}
                        </td>
                        <td className="p-2">
                          {stats.jarqueBera ? stats.jarqueBera.critical : 'N/A'}
                        </td>
                        <td className="p-2">
                          <Badge variant={stats.isNormal ? 'default' : 'destructive'}>
                            {stats.isNormal ? 'Да' : 'Нет'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-4">Корреляции между темами</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Object.entries(statisticalTests.correlations || {}).map(([pair, correlation]) => (
                  <div key={pair} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                    <span className="text-sm">{pair}</span>
                    <Badge variant={Math.abs(correlation) > 0.5 ? 'default' : 'outline'}>
                      {correlation}
                    </Badge>
                  </div>
                ))}
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="opinionDistribution" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Brain className="h-4 w-4" />
                Распределение мнений по темам
              </h4>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {topicSettings?.topics?.map((topic, topicIndex) => (
                  <Card key={topicIndex} className="p-4">
                    <h5 className="font-medium mb-2">{topic.name}</h5>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getOpinionDistributionData(topicIndex)}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="range" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="count" fill="#8884d8" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                ))}
              </div>
            </Card>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AdvancedAnalyticsWithExport;
