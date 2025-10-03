import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Separator } from './ui/separator';
import { Badge } from './ui/badge';
import { 
  Download, FileImage, FileText, FileSpreadsheet, 
  Settings, Camera, BarChart3, Network, Table 
} from 'lucide-react';
import * as d3 from 'd3';

const EnhancedExportManager = ({ 
  simulationData,
  rawSimulationData,
  simulationParams,
  topicSettings,
  opinionSettings,
  simulationReport,
  onError 
}) => {
  const [exportSettings, setExportSettings] = useState({
    format: 'png',
    resolution: 'high',
    includeLabels: true,
    includeStats: true,
    matrixFormat: 'symmetric',
    reportFormat: 'markdown'
  });

  const [exportProgress, setExportProgress] = useState(null);
  const canvasRef = useRef(null);

  const exportFormats = {
    images: ['png', 'jpeg', 'svg', 'pdf'],
    data: ['csv', 'xlsx', 'json'],
    reports: ['markdown', 'html', 'pdf', 'txt']
  };

  const resolutionSettings = {
    low: { width: 800, height: 600, dpi: 72 },
    medium: { width: 1200, height: 900, dpi: 150 },
    high: { width: 1920, height: 1440, dpi: 300 },
    ultra: { width: 3840, height: 2880, dpi: 600 }
  };

  const exportConnectionMatrix = async (format) => {
    if (!rawSimulationData?.connections) {
      onError('Нет данных для экспорта матрицы связей');
      return;
    }

    setExportProgress('Подготовка матрицы связей...');

    try {
      const { connections, agents } = rawSimulationData;
      let content, filename, mimeType;

      if (exportSettings.matrixFormat === 'symmetric') {
        // Симметричная матрица
        const headers = ['Agent_ID', ...agents.map((_, i) => `Agent_${i}`)];
        const rows = connections.map((row, i) => [i, ...row]);
        
        if (format === 'csv') {
          content = [headers, ...rows].map(row => row.join(',')).join('\\n');
          filename = 'connection_matrix_symmetric.csv';
          mimeType = 'text/csv';
        } else if (format === 'json') {
          content = JSON.stringify({
            format: 'symmetric',
            headers,
            data: rows,
            metadata: {
              agentCount: agents.length,
              threshold: simulationParams.threshold,
              exportTime: new Date().toISOString()
            }
          }, null, 2);
          filename = 'connection_matrix_symmetric.json';
          mimeType = 'application/json';
        }
      } else {
        // Развернутая матрица "все связи агента"
        const expandedData = [];
        connections.forEach((row, i) => {
          row.forEach((strength, j) => {
            if (i !== j && strength > 0) {
              expandedData.push({
                source_agent: i,
                target_agent: j,
                connection_strength: strength,
                source_cluster: agents[i]?.cluster || 0,
                target_cluster: agents[j]?.cluster || 0
              });
            }
          });
        });

        if (format === 'csv') {
          const headers = Object.keys(expandedData[0] || {});
          const rows = expandedData.map(row => headers.map(h => row[h]));
          content = [headers, ...rows].map(row => row.join(',')).join('\\n');
          filename = 'connection_matrix_expanded.csv';
          mimeType = 'text/csv';
        } else if (format === 'json') {
          content = JSON.stringify({
            format: 'expanded',
            data: expandedData,
            metadata: {
              totalConnections: expandedData.length,
              agentCount: agents.length,
              threshold: simulationParams.threshold,
              exportTime: new Date().toISOString()
            }
          }, null, 2);
          filename = 'connection_matrix_expanded.json';
          mimeType = 'application/json';
        }
      }

      downloadFile(content, filename, mimeType);
      setExportProgress(null);

    } catch (error) {
      onError(`Ошибка экспорта матрицы: ${error.message}`);
      setExportProgress(null);
    }
  };

  const exportNetworkVisualization = async (format) => {
    if (!simulationData) {
      onError('Нет данных для экспорта визуализации');
      return;
    }

    setExportProgress('Создание визуализации сети...');

    try {
      const resolution = resolutionSettings[exportSettings.resolution];
      
      if (format === 'svg') {
        const svgContent = await generateSVGVisualization(resolution);
        downloadFile(svgContent, 'network_visualization.svg', 'image/svg+xml');
      } else {
        const canvas = await generateCanvasVisualization(resolution, format);
        canvas.toBlob((blob) => {
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `network_visualization.${format}`;
          a.click();
          URL.revokeObjectURL(url);
        }, `image/${format}`, format === 'jpeg' ? 0.9 : undefined);
      }

      setExportProgress(null);

    } catch (error) {
      onError(`Ошибка экспорта визуализации: ${error.message}`);
      setExportProgress(null);
    }
  };

  const generateSVGVisualization = async (resolution) => {
    const { width, height } = resolution;
    const { nodes, links } = simulationData;

    // Создаем SVG элемент
    const svg = d3.create('svg')
      .attr('width', width)
      .attr('height', height)
      .attr('viewBox', [0, 0, width, height]);

    // Настройка симуляции
    const simulation = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(50))
      .force('charge', d3.forceManyBody().strength(-100))
      .force('center', d3.forceCenter(width / 2, height / 2));

    // Запускаем симуляцию
    for (let i = 0; i < 300; ++i) simulation.tick();

    // Добавляем связи
    svg.append('g')
      .selectAll('line')
      .data(links)
      .join('line')
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y)
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', d => Math.sqrt(d.value) * 2);

    // Добавляем узлы
    const clusterColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];
    
    svg.append('g')
      .selectAll('circle')
      .data(nodes)
      .join('circle')
      .attr('cx', d => d.x)
      .attr('cy', d => d.y)
      .attr('r', 8)
      .attr('fill', d => clusterColors[d.cluster % clusterColors.length])
      .attr('stroke', '#fff')
      .attr('stroke-width', 2);

    // Добавляем подписи если нужно
    if (exportSettings.includeLabels) {
      svg.append('g')
        .selectAll('text')
        .data(nodes)
        .join('text')
        .attr('x', d => d.x + 12)
        .attr('y', d => d.y + 4)
        .text(d => `A${d.id}`)
        .attr('font-size', '10px')
        .attr('font-family', 'Arial, sans-serif');
    }

    return svg.node().outerHTML;
  };

  const generateCanvasVisualization = async (resolution, format) => {
    const { width, height } = resolution;
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');

    // Белый фон
    ctx.fillStyle = 'white';
    ctx.fillRect(0, 0, width, height);

    const { nodes, links } = simulationData;
    const clusterColors = ['#3B82F6', '#EF4444', '#10B981', '#F59E0B', '#8B5CF6'];

    // Масштабирование координат
    const scaleX = d3.scaleLinear()
      .domain(d3.extent(nodes, d => d.x))
      .range([50, width - 50]);
    
    const scaleY = d3.scaleLinear()
      .domain(d3.extent(nodes, d => d.y))
      .range([50, height - 50]);

    // Рисуем связи
    ctx.strokeStyle = '#999';
    ctx.globalAlpha = 0.6;
    links.forEach(link => {
      const sourceX = scaleX(link.source.x);
      const sourceY = scaleY(link.source.y);
      const targetX = scaleX(link.target.x);
      const targetY = scaleY(link.target.y);

      ctx.lineWidth = Math.sqrt(link.value) * 2;
      ctx.beginPath();
      ctx.moveTo(sourceX, sourceY);
      ctx.lineTo(targetX, targetY);
      ctx.stroke();
    });

    // Рисуем узлы
    ctx.globalAlpha = 1;
    ctx.lineWidth = 2;
    nodes.forEach(node => {
      const x = scaleX(node.x);
      const y = scaleY(node.y);

      // Заливка
      ctx.fillStyle = clusterColors[node.cluster % clusterColors.length];
      ctx.beginPath();
      ctx.arc(x, y, 8, 0, 2 * Math.PI);
      ctx.fill();

      // Обводка
      ctx.strokeStyle = '#fff';
      ctx.stroke();

      // Подписи
      if (exportSettings.includeLabels) {
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.fillText(`A${node.id}`, x + 12, y + 4);
      }
    });

    return canvas;
  };

  const exportStatisticsReport = async (format) => {
    if (!rawSimulationData) {
      onError('Нет данных для экспорта отчета');
      return;
    }

    setExportProgress('Генерация отчета...');

    try {
      let content, filename, mimeType;

      const stats = generateDetailedStatistics();

      if (format === 'markdown') {
        content = generateMarkdownReport(stats);
        filename = 'simulation_report.md';
        mimeType = 'text/markdown';
      } else if (format === 'html') {
        content = generateHTMLReport(stats);
        filename = 'simulation_report.html';
        mimeType = 'text/html';
      } else if (format === 'json') {
        content = JSON.stringify(stats, null, 2);
        filename = 'simulation_statistics.json';
        mimeType = 'application/json';
      } else if (format === 'txt') {
        content = generateTextReport(stats);
        filename = 'simulation_report.txt';
        mimeType = 'text/plain';
      }

      downloadFile(content, filename, mimeType);
      setExportProgress(null);

    } catch (error) {
      onError(`Ошибка экспорта отчета: ${error.message}`);
      setExportProgress(null);
    }
  };

  const generateDetailedStatistics = () => {
    const { agents, connections } = rawSimulationData;
    
    // Базовая статистика
    const totalAgents = agents.length;
    const totalConnections = connections.flat().filter(c => c > 0).length / 2; // Деление на 2 для симметричной матрицы
    const avgConnectionsPerAgent = totalConnections * 2 / totalAgents;

    // Статистика по кластерам
    const clusterStats = {};
    for (let i = 0; i < simulationParams.numClusters; i++) {
      const clusterAgents = agents.filter(a => a.cluster === i);
      clusterStats[i] = {
        size: clusterAgents.length,
        percentage: (clusterAgents.length / totalAgents * 100).toFixed(1),
        internalConnections: 0,
        externalConnections: 0
      };
    }

    // Подсчет связей
    connections.forEach((row, i) => {
      const agentI = agents[i];
      row.forEach((strength, j) => {
        if (i < j && strength > 0) { // Избегаем двойного подсчета
          const agentJ = agents[j];
          if (agentI.cluster === agentJ.cluster) {
            clusterStats[agentI.cluster].internalConnections++;
          } else {
            clusterStats[agentI.cluster].externalConnections++;
            clusterStats[agentJ.cluster].externalConnections++;
          }
        }
      });
    });

    // Статистика по темам и мнениям
    const topicStats = topicSettings.topics.map((topic, index) => {
      const opinions = agents.map(agent => agent.opinions?.[index] || 0);
      return {
        name: topic.name,
        avgOpinion: (opinions.reduce((sum, op) => sum + op, 0) / opinions.length).toFixed(3),
        polarization: calculatePolarization(opinions),
        consensus: calculateConsensus(opinions)
      };
    });

    return {
      basic: {
        totalAgents,
        totalConnections,
        avgConnectionsPerAgent: avgConnectionsPerAgent.toFixed(2),
        networkDensity: (totalConnections / (totalAgents * (totalAgents - 1) / 2) * 100).toFixed(2)
      },
      clusters: clusterStats,
      topics: topicStats,
      parameters: simulationParams,
      exportTime: new Date().toISOString()
    };
  };

  const calculatePolarization = (opinions) => {
    const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
    const variance = opinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / opinions.length;
    return Math.sqrt(variance).toFixed(3);
  };

  const calculateConsensus = (opinions) => {
    const range = Math.max(...opinions) - Math.min(...opinions);
    return (1 - range / 2).toFixed(3); // Нормализованный консенсус
  };

  const generateMarkdownReport = (stats) => {
    return `# Отчет по симуляции агентного моделирования

## Основная статистика

- **Общее количество агентов:** ${stats.basic.totalAgents}
- **Общее количество связей:** ${stats.basic.totalConnections}
- **Среднее количество связей на агента:** ${stats.basic.avgConnectionsPerAgent}
- **Плотность сети:** ${stats.basic.networkDensity}%

## Статистика по кластерам

${Object.entries(stats.clusters).map(([id, cluster]) => `
### Кластер ${parseInt(id) + 1}
- Размер: ${cluster.size} агентов (${cluster.percentage}%)
- Внутренние связи: ${cluster.internalConnections}
- Внешние связи: ${cluster.externalConnections}
`).join('')}

## Статистика по темам

${stats.topics.map((topic, i) => `
### ${topic.name}
- Среднее мнение: ${topic.avgOpinion}
- Поляризация: ${topic.polarization}
- Консенсус: ${topic.consensus}
`).join('')}

## Параметры симуляции

- Количество циклов: ${stats.parameters.cycles}
- Порог связи: ${stats.parameters.threshold}
- Размерность вектора: ${stats.parameters.vectorDimension}
- Количество кластеров: ${stats.parameters.numClusters}

---
*Отчет сгенерирован: ${new Date(stats.exportTime).toLocaleString()}*
`;
  };

  const generateHTMLReport = (stats) => {
    return `<!DOCTYPE html>
<html lang="ru">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Отчет по симуляции</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
        h1, h2, h3 { color: #333; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin: 20px 0; }
        .stat-card { border: 1px solid #ddd; padding: 15px; border-radius: 8px; background: #f9f9f9; }
        .stat-value { font-size: 24px; font-weight: bold; color: #2563eb; }
        table { width: 100%; border-collapse: collapse; margin: 20px 0; }
        th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
        th { background-color: #f2f2f2; }
    </style>
</head>
<body>
    <h1>Отчет по симуляции агентного моделирования</h1>
    
    <h2>Основная статистика</h2>
    <div class="stats-grid">
        <div class="stat-card">
            <div class="stat-value">${stats.basic.totalAgents}</div>
            <div>Всего агентов</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.basic.totalConnections}</div>
            <div>Всего связей</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.basic.avgConnectionsPerAgent}</div>
            <div>Среднее связей на агента</div>
        </div>
        <div class="stat-card">
            <div class="stat-value">${stats.basic.networkDensity}%</div>
            <div>Плотность сети</div>
        </div>
    </div>

    <h2>Кластеры</h2>
    <table>
        <tr><th>Кластер</th><th>Размер</th><th>Процент</th><th>Внутренние связи</th><th>Внешние связи</th></tr>
        ${Object.entries(stats.clusters).map(([id, cluster]) => 
            `<tr><td>Кластер ${parseInt(id) + 1}</td><td>${cluster.size}</td><td>${cluster.percentage}%</td><td>${cluster.internalConnections}</td><td>${cluster.externalConnections}</td></tr>`
        ).join('')}
    </table>

    <h2>Темы</h2>
    <table>
        <tr><th>Тема</th><th>Среднее мнение</th><th>Поляризация</th><th>Консенсус</th></tr>
        ${stats.topics.map(topic => 
            `<tr><td>${topic.name}</td><td>${topic.avgOpinion}</td><td>${topic.polarization}</td><td>${topic.consensus}</td></tr>`
        ).join('')}
    </table>

    <p><small>Отчет сгенерирован: ${new Date(stats.exportTime).toLocaleString()}</small></p>
</body>
</html>`;
  };

  const generateTextReport = (stats) => {
    return `ОТЧЕТ ПО СИМУЛЯЦИИ АГЕНТНОГО МОДЕЛИРОВАНИЯ
${'='.repeat(50)}

ОСНОВНАЯ СТАТИСТИКА:
- Всего агентов: ${stats.basic.totalAgents}
- Всего связей: ${stats.basic.totalConnections}
- Среднее связей на агента: ${stats.basic.avgConnectionsPerAgent}
- Плотность сети: ${stats.basic.networkDensity}%

КЛАСТЕРЫ:
${Object.entries(stats.clusters).map(([id, cluster]) => 
  `Кластер ${parseInt(id) + 1}: ${cluster.size} агентов (${cluster.percentage}%), внутр: ${cluster.internalConnections}, внеш: ${cluster.externalConnections}`
).join('\\n')}

ТЕМЫ:
${stats.topics.map(topic => 
  `${topic.name}: среднее=${topic.avgOpinion}, поляризация=${topic.polarization}, консенсус=${topic.consensus}`
).join('\\n')}

ПАРАМЕТРЫ:
- Циклы: ${stats.parameters.cycles}
- Порог: ${stats.parameters.threshold}
- Размерность: ${stats.parameters.vectorDimension}
- Кластеры: ${stats.parameters.numClusters}

Сгенерировано: ${new Date(stats.exportTime).toLocaleString()}`;
  };

  const exportCharts = async (format) => {
    setExportProgress('Создание графиков...');

    try {
      // Здесь будет логика экспорта графиков
      // Пока что заглушка
      onError('Экспорт графиков будет реализован в следующей версии');
      setExportProgress(null);
    } catch (error) {
      onError(`Ошибка экспорта графиков: ${error.message}`);
      setExportProgress(null);
    }
  };

  const exportAllData = async () => {
    setExportProgress('Подготовка полного экспорта...');

    try {
      const fullExport = {
        metadata: {
          exportTime: new Date().toISOString(),
          version: '1.0',
          description: 'Полный экспорт данных симуляции агентного моделирования'
        },
        parameters: simulationParams,
        topicSettings,
        opinionSettings,
        rawData: rawSimulationData,
        visualizationData: simulationData,
        statistics: generateDetailedStatistics(),
        report: simulationReport
      };

      const content = JSON.stringify(fullExport, null, 2);
      downloadFile(content, 'full_simulation_export.json', 'application/json');
      setExportProgress(null);

    } catch (error) {
      onError(`Ошибка полного экспорта: ${error.message}`);
      setExportProgress(null);
    }
  };

  const downloadFile = (content, filename, mimeType) => {
    const blob = new Blob([content], { type: mimeType });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Download className="h-5 w-5" />
          Расширенный экспорт данных
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="matrices" className="w-full">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="matrices">Матрицы</TabsTrigger>
            <TabsTrigger value="visualizations">Визуализации</TabsTrigger>
            <TabsTrigger value="reports">Отчеты</TabsTrigger>
            <TabsTrigger value="charts">Графики</TabsTrigger>
            <TabsTrigger value="settings">Настройки</TabsTrigger>
          </TabsList>

          <TabsContent value="matrices" className="space-y-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex-1">
                  <Label>Формат матрицы связей</Label>
                  <Select 
                    value={exportSettings.matrixFormat}
                    onValueChange={(value) => setExportSettings(prev => ({ ...prev, matrixFormat: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="symmetric">Симметричная матрица</SelectItem>
                      <SelectItem value="expanded">Развернутая (все связи агента)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Button 
                  onClick={() => exportConnectionMatrix('csv')}
                  disabled={!rawSimulationData || exportProgress}
                  className="flex items-center gap-2"
                >
                  <Table className="h-4 w-4" />
                  Экспорт в CSV
                </Button>
                <Button 
                  onClick={() => exportConnectionMatrix('json')}
                  disabled={!rawSimulationData || exportProgress}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Экспорт в JSON
                </Button>
              </div>

              <Separator />

              <div>
                <h4 className="font-medium mb-2">Дополнительные данные</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <Button 
                    onClick={exportAllData}
                    disabled={!rawSimulationData || exportProgress}
                    variant="outline"
                    size="sm"
                  >
                    Полный экспорт данных
                  </Button>
                  <Button 
                    onClick={() => {
                      const content = JSON.stringify(simulationParams, null, 2);
                      downloadFile(content, 'simulation_settings.json', 'application/json');
                    }}
                    variant="outline"
                    size="sm"
                  >
                    Настройки модели
                  </Button>
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="visualizations" className="space-y-4">
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Формат изображения</Label>
                  <Select 
                    value={exportSettings.format}
                    onValueChange={(value) => setExportSettings(prev => ({ ...prev, format: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {exportFormats.images.map(format => (
                        <SelectItem key={format} value={format}>
                          {format.toUpperCase()}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Разрешение</Label>
                  <Select 
                    value={exportSettings.resolution}
                    onValueChange={(value) => setExportSettings(prev => ({ ...prev, resolution: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="low">Низкое (800×600)</SelectItem>
                      <SelectItem value="medium">Среднее (1200×900)</SelectItem>
                      <SelectItem value="high">Высокое (1920×1440)</SelectItem>
                      <SelectItem value="ultra">Ультра (3840×2880)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-labels"
                  checked={exportSettings.includeLabels}
                  onCheckedChange={(checked) => setExportSettings(prev => ({ ...prev, includeLabels: checked }))}
                />
                <Label htmlFor="include-labels">Включить подписи агентов</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => exportNetworkVisualization(exportSettings.format)}
                  disabled={!simulationData || exportProgress}
                  className="flex items-center gap-2"
                >
                  <Network className="h-4 w-4" />
                  Экспорт сети
                </Button>
                <Button 
                  onClick={() => exportCharts(exportSettings.format)}
                  disabled={!rawSimulationData || exportProgress}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <BarChart3 className="h-4 w-4" />
                  Экспорт графиков
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Текущие настройки:</strong></p>
                <p>Формат: {exportSettings.format.toUpperCase()}, 
                   Разрешение: {resolutionSettings[exportSettings.resolution].width}×{resolutionSettings[exportSettings.resolution].height}, 
                   DPI: {resolutionSettings[exportSettings.resolution].dpi}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="reports" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label>Формат отчета</Label>
                <Select 
                  value={exportSettings.reportFormat}
                  onValueChange={(value) => setExportSettings(prev => ({ ...prev, reportFormat: value }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {exportFormats.reports.map(format => (
                      <SelectItem key={format} value={format}>
                        {format.toUpperCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="include-stats"
                  checked={exportSettings.includeStats}
                  onCheckedChange={(checked) => setExportSettings(prev => ({ ...prev, includeStats: checked }))}
                />
                <Label htmlFor="include-stats">Включить детальную статистику</Label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={() => exportStatisticsReport(exportSettings.reportFormat)}
                  disabled={!rawSimulationData || exportProgress}
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Сводка результатов
                </Button>
                <Button 
                  onClick={() => {
                    downloadFile(simulationReport, 'simulation_report.md', 'text/markdown');
                  }}
                  disabled={!simulationReport}
                  variant="outline"
                  className="flex items-center gap-2"
                >
                  <FileText className="h-4 w-4" />
                  Базовый отчет
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="charts" className="space-y-4">
            <div className="text-center py-8 text-gray-500">
              <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Экспорт графиков и гистограмм</p>
              <p className="text-sm">Будет реализован в следующей версии</p>
            </div>
          </TabsContent>

          <TabsContent value="settings" className="space-y-4">
            <div className="space-y-4">
              <h4 className="font-medium">Настройки экспорта</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card className="p-4">
                  <h5 className="font-medium mb-2">Изображения</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Формат:</span>
                      <Badge variant="outline">{exportSettings.format.toUpperCase()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Разрешение:</span>
                      <Badge variant="outline">{exportSettings.resolution}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Подписи:</span>
                      <Badge variant={exportSettings.includeLabels ? "default" : "outline"}>
                        {exportSettings.includeLabels ? 'Да' : 'Нет'}
                      </Badge>
                    </div>
                  </div>
                </Card>

                <Card className="p-4">
                  <h5 className="font-medium mb-2">Данные</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Матрица:</span>
                      <Badge variant="outline">{exportSettings.matrixFormat}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Отчет:</span>
                      <Badge variant="outline">{exportSettings.reportFormat.toUpperCase()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Статистика:</span>
                      <Badge variant={exportSettings.includeStats ? "default" : "outline"}>
                        {exportSettings.includeStats ? 'Да' : 'Нет'}
                      </Badge>
                    </div>
                  </div>
                </Card>
              </div>

              <Button 
                onClick={() => setExportSettings({
                  format: 'png',
                  resolution: 'high',
                  includeLabels: true,
                  includeStats: true,
                  matrixFormat: 'symmetric',
                  reportFormat: 'markdown'
                })}
                variant="outline"
                className="w-full"
              >
                <Settings className="h-4 w-4 mr-2" />
                Сбросить настройки
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {exportProgress && (
          <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
            <div className="flex items-center gap-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-blue-800">{exportProgress}</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default EnhancedExportManager;
