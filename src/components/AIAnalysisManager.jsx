import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Textarea } from './ui/textarea';
import { 
  Brain, Settings, MessageSquare, TrendingUp, Network, 
  Zap, AlertTriangle, CheckCircle, Loader2, Eye, Download 
} from 'lucide-react';

const AIAnalysisManager = ({ 
  simulationData,
  rawSimulationData,
  simulationParams,
  topicSettings,
  networkMetrics,
  timeSeriesData,
  onError 
}) => {
  const [apiKey, setApiKey] = useState('');
  const [selectedModel, setSelectedModel] = useState('anthropic/claude-3-haiku');
  const [analysisType, setAnalysisType] = useState('comprehensive');
  const [customPrompt, setCustomPrompt] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResults, setAnalysisResults] = useState([]);
  const [analysisHistory, setAnalysisHistory] = useState([]);

  // Доступные модели OpenRouter
  const availableModels = [
    { id: 'anthropic/claude-3-haiku', name: 'Claude 3 Haiku', provider: 'Anthropic', cost: 'Низкая' },
    { id: 'anthropic/claude-3-sonnet', name: 'Claude 3 Sonnet', provider: 'Anthropic', cost: 'Средняя' },
    { id: 'anthropic/claude-3-opus', name: 'Claude 3 Opus', provider: 'Anthropic', cost: 'Высокая' },
    { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini', provider: 'OpenAI', cost: 'Низкая' },
    { id: 'openai/gpt-4o', name: 'GPT-4o', provider: 'OpenAI', cost: 'Средняя' },
    { id: 'google/gemini-pro', name: 'Gemini Pro', provider: 'Google', cost: 'Средняя' },
    { id: 'meta-llama/llama-3.1-70b-instruct', name: 'Llama 3.1 70B', provider: 'Meta', cost: 'Средняя' }
  ];

  // Типы анализа
  const analysisTypes = [
    {
      id: 'comprehensive',
      name: 'Комплексный анализ',
      description: 'Полный анализ всех аспектов симуляции'
    },
    {
      id: 'network',
      name: 'Сетевой анализ',
      description: 'Фокус на структуре и динамике сети'
    },
    {
      id: 'opinions',
      name: 'Анализ мнений',
      description: 'Изучение эволюции и распределения мнений'
    },
    {
      id: 'clustering',
      name: 'Кластерный анализ',
      description: 'Анализ формирования и динамики кластеров'
    },
    {
      id: 'trends',
      name: 'Трендовый анализ',
      description: 'Выявление трендов и паттернов во времени'
    },
    {
      id: 'custom',
      name: 'Пользовательский',
      description: 'Анализ по вашему запросу'
    }
  ];

  useEffect(() => {
    // Загружаем сохраненный API ключ
    const savedApiKey = localStorage.getItem('openrouter_api_key');
    if (savedApiKey) {
      setApiKey(savedApiKey);
    }

    // Загружаем историю анализов
    const savedHistory = localStorage.getItem('ai_analysis_history');
    if (savedHistory) {
      try {
        setAnalysisHistory(JSON.parse(savedHistory));
      } catch (error) {
        console.error('Error loading analysis history:', error);
      }
    }
  }, []);

  // Сохранение API ключа
  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('openrouter_api_key', apiKey.trim());
    }
  };

  // Подготовка данных для анализа
  const prepareAnalysisData = (type) => {
    const baseData = {
      simulationParams,
      agentCount: rawSimulationData?.agents?.length || 0,
      topicCount: topicSettings?.topics?.length || 0,
      topics: topicSettings?.topics?.map(t => t.name) || [],
      cycles: simulationParams?.cycles || 0
    };

    switch (type) {
      case 'comprehensive':
        return {
          ...baseData,
          networkMetrics: networkMetrics ? {
            density: networkMetrics.density,
            averageDegree: networkMetrics.averageDegree,
            clusteringCoefficient: networkMetrics.clusteringCoefficient,
            modularity: networkMetrics.modularity,
            connectedComponents: networkMetrics.connectedComponents?.length
          } : null,
          opinionStats: rawSimulationData?.agents ? calculateOpinionStats() : null,
          clusterDistribution: rawSimulationData?.agents ? calculateClusterDistribution() : null,
          timeSeriesData: timeSeriesData?.slice(-10) // Последние 10 точек
        };

      case 'network':
        return {
          ...baseData,
          networkMetrics,
          connectionMatrix: rawSimulationData?.connections ? 
            summarizeConnectionMatrix(rawSimulationData.connections) : null,
          centralityStats: networkMetrics ? {
            topDegreeNodes: getTopNodes(networkMetrics.degreeCentrality, 5),
            topBetweennessNodes: getTopNodes(networkMetrics.betweennessCentrality, 5)
          } : null
        };

      case 'opinions':
        return {
          ...baseData,
          opinionDistributions: calculateOpinionDistributions(),
          opinionCorrelations: calculateOpinionCorrelations(),
          consensusMetrics: calculateConsensusMetrics(),
          polarizationIndex: calculatePolarizationIndex()
        };

      case 'clustering':
        return {
          ...baseData,
          clusterStats: calculateDetailedClusterStats(),
          interClusterConnections: calculateInterClusterConnections(),
          clusterStability: calculateClusterStability()
        };

      case 'trends':
        return {
          ...baseData,
          timeSeriesData,
          trendAnalysis: analyzeTrends(),
          seasonalityDetection: detectSeasonality(),
          changePoints: detectChangePoints()
        };

      default:
        return baseData;
    }
  };

  // Вспомогательные функции для подготовки данных
  const calculateOpinionStats = () => {
    if (!rawSimulationData?.agents) return null;

    const allOpinions = rawSimulationData.agents.flatMap(agent => agent.opinions || []);
    const mean = allOpinions.reduce((sum, op) => sum + op, 0) / allOpinions.length;
    const variance = allOpinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / allOpinions.length;

    return {
      mean: mean.toFixed(3),
      variance: variance.toFixed(3),
      standardDeviation: Math.sqrt(variance).toFixed(3),
      range: {
        min: Math.min(...allOpinions).toFixed(3),
        max: Math.max(...allOpinions).toFixed(3)
      }
    };
  };

  const calculateClusterDistribution = () => {
    if (!rawSimulationData?.agents) return null;

    const clusterCounts = {};
    rawSimulationData.agents.forEach(agent => {
      clusterCounts[agent.cluster] = (clusterCounts[agent.cluster] || 0) + 1;
    });

    return Object.entries(clusterCounts).map(([cluster, count]) => ({
      cluster: parseInt(cluster),
      count,
      percentage: ((count / rawSimulationData.agents.length) * 100).toFixed(1)
    }));
  };

  const summarizeConnectionMatrix = (connections) => {
    const totalConnections = connections.flat().filter(c => c > 0).length / 2;
    const possibleConnections = (connections.length * (connections.length - 1)) / 2;
    const density = totalConnections / possibleConnections;

    return {
      totalConnections,
      possibleConnections,
      density: density.toFixed(3),
      averageConnectionsPerAgent: (totalConnections * 2 / connections.length).toFixed(2)
    };
  };

  const getTopNodes = (centrality, count) => {
    if (!centrality) return [];
    
    return centrality
      .map((value, index) => ({ index, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, count)
      .map(node => ({
        agent: `Agent ${node.index}`,
        value: node.value.toFixed(3)
      }));
  };

  const calculateOpinionDistributions = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics) return null;

    return topicSettings.topics.map((topic, topicIndex) => {
      const opinions = rawSimulationData.agents.map(agent => agent.opinions?.[topicIndex] || 0);
      const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
      const std = Math.sqrt(opinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / opinions.length);

      return {
        topic: topic.name,
        mean: mean.toFixed(3),
        standardDeviation: std.toFixed(3),
        range: {
          min: Math.min(...opinions).toFixed(3),
          max: Math.max(...opinions).toFixed(3)
        }
      };
    });
  };

  const calculateOpinionCorrelations = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics || topicSettings.topics.length < 2) return null;

    const correlations = [];
    for (let i = 0; i < topicSettings.topics.length; i++) {
      for (let j = i + 1; j < topicSettings.topics.length; j++) {
        const opinions1 = rawSimulationData.agents.map(agent => agent.opinions?.[i] || 0);
        const opinions2 = rawSimulationData.agents.map(agent => agent.opinions?.[j] || 0);
        
        const correlation = calculatePearsonCorrelation(opinions1, opinions2);
        correlations.push({
          topic1: topicSettings.topics[i].name,
          topic2: topicSettings.topics[j].name,
          correlation: correlation.toFixed(3)
        });
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

  const calculateConsensusMetrics = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics) return null;

    return topicSettings.topics.map((topic, topicIndex) => {
      const opinions = rawSimulationData.agents.map(agent => agent.opinions?.[topicIndex] || 0);
      const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
      const variance = opinions.reduce((sum, op) => sum + Math.pow(op - mean, 2), 0) / opinions.length;
      
      // Индекс консенсуса (обратно пропорционален дисперсии)
      const consensusIndex = 1 / (1 + variance);

      return {
        topic: topic.name,
        consensusIndex: consensusIndex.toFixed(3),
        variance: variance.toFixed(3)
      };
    });
  };

  const calculatePolarizationIndex = () => {
    if (!rawSimulationData?.agents || !topicSettings?.topics) return null;

    return topicSettings.topics.map((topic, topicIndex) => {
      const opinions = rawSimulationData.agents.map(agent => agent.opinions?.[topicIndex] || 0);
      const mean = opinions.reduce((sum, op) => sum + op, 0) / opinions.length;
      
      // Индекс поляризации основан на отклонении от центра
      const polarization = opinions.reduce((sum, op) => sum + Math.abs(op - 0.5), 0) / opinions.length;

      return {
        topic: topic.name,
        polarizationIndex: polarization.toFixed(3),
        mean: mean.toFixed(3)
      };
    });
  };

  // Генерация промпта для AI анализа
  const generatePrompt = (type, data) => {
    const basePrompt = `Вы - эксперт по анализу агентного моделирования и социальной динамики. Проанализируйте следующие данные симуляции и предоставьте детальные инсайты.

Данные симуляции:
${JSON.stringify(data, null, 2)}

`;

    const typePrompts = {
      comprehensive: `Проведите комплексный анализ симуляции, включая:
1. Общую оценку динамики системы
2. Анализ сетевой структуры и её влияние на распространение мнений
3. Паттерны формирования кластеров и их стабильность
4. Эволюцию мнений и достижение консенсуса
5. Ключевые инсайты и рекомендации для улучшения модели

Предоставьте структурированный анализ с конкретными выводами и рекомендациями.`,

      network: `Сосредоточьтесь на анализе сетевой структуры:
1. Оцените топологические свойства сети
2. Проанализируйте роль центральных узлов
3. Изучите влияние сетевой структуры на динамику мнений
4. Предложите оптимизации сетевых параметров

Предоставьте технический анализ с метриками и рекомендациями.`,

      opinions: `Проанализируйте динамику мнений:
1. Оцените распределение и эволюцию мнений
2. Изучите корреляции между различными темами
3. Проанализируйте уровень консенсуса и поляризации
4. Выявите факторы, влияющие на формирование мнений

Предоставьте психологический и социологический анализ.`,

      clustering: `Изучите кластерную структуру:
1. Проанализируйте качество и стабильность кластеров
2. Оцените межкластерные взаимодействия
3. Изучите влияние кластеризации на общую динамику
4. Предложите улучшения алгоритма кластеризации

Предоставьте математический и алгоритмический анализ.`,

      trends: `Проанализируйте временные тренды:
1. Выявите основные тренды в данных
2. Определите точки изменения и их причины
3. Оцените стабильность и предсказуемость системы
4. Предложите прогнозы развития

Предоставьте статистический и прогностический анализ.`,

      custom: customPrompt || 'Проведите анализ данных симуляции согласно вашей экспертизе.'
    };

    return basePrompt + typePrompts[type];
  };

  // Выполнение AI анализа
  const performAIAnalysis = async () => {
    if (!apiKey.trim()) {
      onError('Введите API ключ OpenRouter');
      return;
    }

    if (!rawSimulationData) {
      onError('Нет данных симуляции для анализа');
      return;
    }

    setIsAnalyzing(true);

    try {
      const analysisData = prepareAnalysisData(analysisType);
      const prompt = generatePrompt(analysisType, analysisData);

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': window.location.origin,
          'X-Title': 'Agent Network Visualizer'
        },
        body: JSON.stringify({
          model: selectedModel,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          max_tokens: 4000,
          temperature: 0.7
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error?.message || `HTTP ${response.status}`);
      }

      const result = await response.json();
      const analysis = result.choices[0].message.content;

      const analysisResult = {
        id: Date.now(),
        timestamp: new Date(),
        type: analysisType,
        model: selectedModel,
        analysis,
        data: analysisData
      };

      setAnalysisResults(prev => [analysisResult, ...prev]);
      
      // Сохраняем в историю
      const newHistory = [analysisResult, ...analysisHistory].slice(0, 50); // Храним последние 50
      setAnalysisHistory(newHistory);
      localStorage.setItem('ai_analysis_history', JSON.stringify(newHistory));

    } catch (error) {
      onError(`Ошибка AI анализа: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Экспорт результатов анализа
  const exportAnalysis = (analysis) => {
    const exportData = {
      analysis: analysis.analysis,
      metadata: {
        timestamp: analysis.timestamp,
        type: analysis.type,
        model: analysis.model
      },
      simulationData: analysis.data
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-analysis-${analysis.id}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5" />
          AI Анализ с OpenRouter
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="setup" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Настройка</TabsTrigger>
            <TabsTrigger value="analysis">Анализ</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="setup" className="space-y-4">
            <Card className="p-4">
              <h4 className="font-medium mb-4 flex items-center gap-2">
                <Settings className="h-4 w-4" />
                Настройки API
              </h4>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="api-key">OpenRouter API Key</Label>
                  <div className="flex gap-2">
                    <Input
                      id="api-key"
                      type="password"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Введите ваш API ключ OpenRouter"
                      className="flex-1"
                    />
                    <Button onClick={saveApiKey} variant="outline">
                      Сохранить
                    </Button>
                  </div>
                  <p className="text-sm text-gray-600 mt-1">
                    Получите API ключ на{' '}
                    <a 
                      href="https://openrouter.ai/keys" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline"
                    >
                      openrouter.ai
                    </a>
                  </p>
                </div>

                <div>
                  <Label>Модель для анализа</Label>
                  <Select value={selectedModel} onValueChange={setSelectedModel}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {availableModels.map(model => (
                        <SelectItem key={model.id} value={model.id}>
                          <div className="flex items-center justify-between w-full">
                            <span>{model.name}</span>
                            <div className="flex gap-2 ml-4">
                              <Badge variant="outline" className="text-xs">
                                {model.provider}
                              </Badge>
                              <Badge 
                                variant={model.cost === 'Низкая' ? 'default' : model.cost === 'Средняя' ? 'secondary' : 'destructive'}
                                className="text-xs"
                              >
                                {model.cost}
                              </Badge>
                            </div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label>Тип анализа</Label>
                  <Select value={analysisType} onValueChange={setAnalysisType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {analysisTypes.map(type => (
                        <SelectItem key={type.id} value={type.id}>
                          <div>
                            <div className="font-medium">{type.name}</div>
                            <div className="text-sm text-gray-600">{type.description}</div>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {analysisType === 'custom' && (
                  <div>
                    <Label htmlFor="custom-prompt">Пользовательский запрос</Label>
                    <Textarea
                      id="custom-prompt"
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                      placeholder="Опишите, какой анализ вы хотите получить..."
                      rows={4}
                    />
                  </div>
                )}
              </div>
            </Card>

            <Card className="p-4">
              <h4 className="font-medium mb-4">Информация о данных</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <div className="text-lg font-bold text-blue-600">
                    {rawSimulationData?.agents?.length || 0}
                  </div>
                  <div className="text-gray-600">Агентов</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-green-600">
                    {topicSettings?.topics?.length || 0}
                  </div>
                  <div className="text-gray-600">Тем</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-purple-600">
                    {simulationParams?.cycles || 0}
                  </div>
                  <div className="text-gray-600">Циклов</div>
                </div>
                <div className="text-center">
                  <div className="text-lg font-bold text-orange-600">
                    {rawSimulationData?.connections ? 
                      Math.round(rawSimulationData.connections.flat().filter(c => c > 0).length / 2) : 0
                    }
                  </div>
                  <div className="text-gray-600">Связей</div>
                </div>
              </div>
            </Card>
          </TabsContent>

          <TabsContent value="analysis" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium">Запуск AI анализа</h4>
              <Button 
                onClick={performAIAnalysis} 
                disabled={isAnalyzing || !apiKey.trim() || !rawSimulationData}
              >
                {isAnalyzing ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Анализируем...
                  </>
                ) : (
                  <>
                    <Brain className="h-4 w-4 mr-2" />
                    Запустить анализ
                  </>
                )}
              </Button>
            </div>

            {analysisResults.length === 0 ? (
              <div className="text-center py-8">
                <Brain className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">Нет результатов анализа</h3>
                <p className="text-gray-600">
                  Настройте параметры и запустите AI анализ для получения инсайтов
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {analysisResults.map(result => (
                  <Card key={result.id} className="p-4">
                    <div className="flex justify-between items-start mb-4">
                      <div>
                        <div className="flex items-center gap-2 mb-2">
                          <Badge variant="default">
                            {analysisTypes.find(t => t.id === result.type)?.name}
                          </Badge>
                          <Badge variant="outline">
                            {availableModels.find(m => m.id === result.model)?.name}
                          </Badge>
                          <span className="text-sm text-gray-600">
                            {new Date(result.timestamp).toLocaleString()}
                          </span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAnalysis(result)}
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Экспорт
                        </Button>
                      </div>
                    </div>

                    <div className="prose max-w-none">
                      <div className="whitespace-pre-wrap text-sm bg-gray-50 p-4 rounded border">
                        {result.analysis}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            {analysisHistory.length === 0 ? (
              <div className="text-center py-8">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">История пуста</h3>
                <p className="text-gray-600">
                  Выполненные анализы будут сохраняться здесь
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {analysisHistory.map(analysis => (
                  <Card key={analysis.id} className="p-3">
                    <div className="flex justify-between items-center">
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline" className="text-xs">
                            {analysisTypes.find(t => t.id === analysis.type)?.name}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            {availableModels.find(m => m.id === analysis.model)?.name}
                          </Badge>
                        </div>
                        <div className="text-sm text-gray-600 mt-1">
                          {new Date(analysis.timestamp).toLocaleString()}
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setAnalysisResults(prev => [analysis, ...prev.filter(r => r.id !== analysis.id)]);
                          }}
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          Просмотр
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => exportAnalysis(analysis)}
                        >
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default AIAnalysisManager;
