import React, { useState, useEffect } from 'react';
import './App.css';
import { generateAgentPopulation, generateTopics, runSimulation, prepareVisualizationData, generateSimulationReport, cosineSimilarity } from './lib/agentSimulation';
import AdvancedScenarioManager from './components/AdvancedScenarioManager';
import ResultsTabs from './components/ResultsTabs';
import Papa from 'papaparse';

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

function App() {
  // Основные параметры симуляции
  const [simulationParams, setSimulationParams] = useState({
    agentCount: 150,
    cycles: 20,
    threshold: 0.5,
    vectorDimension: 10,
    numClusters: 3,
    recalculateClustersAfter: 0,
    scenario: 'A'
  });

  // Расширенные настройки
  const [topicSettings, setTopicSettings] = useState({
    numTopics: 10,
    topics: []
  });

  const [opinionSettings, setOpinionSettings] = useState({
    clusterOpinions: {},
    customMatrix: null
  });

  // Состояние симуляции
  const [simulationData, setSimulationData] = useState(null);
  const [rawSimulationData, setRawSimulationData] = useState(null);
  const [simulationReport, setSimulationReport] = useState('');
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState(null);

  // Управление интерфейсом
  const [activeSection, setActiveSection] = useState('setup'); // 'setup', 'results'
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);

  // Загруженные данные
  const [uploadedAgents, setUploadedAgents] = useState(null);
  const [uploadedTopics, setUploadedTopics] = useState(null);

  // Инициализация настроек тем при изменении количества
  useEffect(() => {
    const defaultTopics = Array.from({ length: topicSettings.numTopics }, (_, i) => ({
      id: i,
      name: `Тема ${i + 1}`,
      type: 'random',
      targetCluster: 0,
      proximityLevel: 0.5,
      customVector: null
    }));

    setTopicSettings(prev => ({
      ...prev,
      topics: defaultTopics
    }));
  }, [topicSettings.numTopics]);

  // Инициализация настроек мнений
  useEffect(() => {
    const defaultOpinions = {};
    for (let cluster = 0; cluster < simulationParams.numClusters; cluster++) {
      defaultOpinions[cluster] = Array.from({ length: topicSettings.numTopics }, () => Math.random() * 2 - 1);
    }

    setOpinionSettings(prev => ({
      ...prev,
      clusterOpinions: defaultOpinions
    }));
  }, [simulationParams.numClusters, topicSettings.numTopics]);

  const handleParamsChange = (newParams) => {
    setSimulationParams(prev => ({ ...prev, ...newParams }));
    if (newParams.topicSettings) {
      setTopicSettings(newParams.topicSettings);
    }
    if (newParams.opinionSettings) {
      setOpinionSettings(newParams.opinionSettings);
    }
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        try {
          const data = results.data.filter(row => row.some(cell => cell.trim() !== ''));
          
          if (type === 'agents') {
            const vectors = data.map(row => row.map(cell => parseFloat(cell) || 0));
            setUploadedAgents(vectors);
            setSimulationParams(prev => ({
              ...prev,
              agentCount: vectors.length,
              vectorDimension: vectors[0]?.length || prev.vectorDimension
            }));
          } else if (type === 'topics') {
            const vectors = data.map(row => row.map(cell => parseFloat(cell) || 0));
            setUploadedTopics(vectors);
            setTopicSettings(prev => ({
              ...prev,
              numTopics: vectors.length
            }));
          }
        } catch (error) {
          setError(`Ошибка при загрузке файла: ${error.message}`);
        }
      },
      header: false,
      skipEmptyLines: true
    });
  };

  const runNewSimulation = async () => {
    setIsRunning(true);
    setError(null);
    
    try {
      // Генерация агентов
      const agentData = generateAgentPopulation(
        simulationParams.agentCount,
        simulationParams.vectorDimension,
        simulationParams.numClusters,
        uploadedAgents
      );

      // Генерация тем с учетом расширенных настроек
      let topics;
      if (uploadedTopics) {
        topics = uploadedTopics.map((vector, i) => ({
          id: i,
          vector: vector
        }));
      } else {
        topics = generateTopics(
          simulationParams.vectorDimension,
          simulationParams.scenario,
          agentData.clusterCenters,
          null,
          null,
          simulationParams.numClusters,
          simulationParams.recalculateClustersAfter,
          agentData.agents
        );

        // Применяем настройки тем
        topics = topics.map((topic, i) => {
          const settings = topicSettings.topics[i];
          if (settings?.type === 'cluster-aligned' && settings.targetCluster !== undefined) {
            const targetCenter = agentData.clusterCenters[settings.targetCluster];
            const proximity = settings.proximityLevel || 0.5;
            
            // Создаем вектор близкий к центру кластера
            const alignedVector = targetCenter.map(val => 
              val * proximity + (Math.random() - 0.5) * (1 - proximity)
            );
            
            return {
              ...topic,
              vector: alignedVector,
              name: settings.name || topic.name
            };
          }
          return {
            ...topic,
            name: settings?.name || topic.name || `Тема ${i + 1}`
          };
        });
      }

      // Добавляем мнения к агентам
      agentData.agents.forEach(agent => {
        agent.opinions = {};
        topics.forEach(topic => {
          if (opinionSettings.customMatrix) {
            // Используем загруженную матрицу мнений
            const row = opinionSettings.customMatrix[agent.id];
            agent.opinions[topic.id] = row?.[topic.id] || 0;
          } else {
            // Генерируем мнения на основе настроек кластера
            const opinion = cosineSimilarity(agent.values, topic.vector);
            agent.opinions[topic.id] = opinion;
          }
        });
      });

      // Запуск симуляции
      const simulationResult = runSimulation(
        agentData.agents,
        topics,
        simulationParams.cycles,
        simulationParams.threshold,
        simulationParams.recalculateClustersAfter
      );

      // Подготовка данных для визуализации
      const vizData = prepareVisualizationData(
        simulationResult.agents,
        simulationResult.connections,
        simulationParams.threshold
      );

      // Генерация отчета
      const report = generateSimulationReport(
        simulationResult.agents,
        simulationResult.connections,
        topics,
        simulationParams.scenario,
        simulationParams.cycles,
        simulationParams.threshold
      );

      // Сохранение результатов
      setSimulationData(vizData);
      setRawSimulationData({
        ...simulationResult,
        topics,
        agentData
      });
      setSimulationReport(report);
      setActiveSection('results');

    } catch (error) {
      console.error('Ошибка симуляции:', error);
      setError(error.message);
    } finally {
      setIsRunning(false);
    }
  };

  const exportResults = (format) => {
    if (!rawSimulationData) return;

    try {
      let content, filename, mimeType;

      switch (format) {
        case 'csv':
          const csvData = rawSimulationData.connections.map((row, i) => 
            [i, ...row].join(',')
          );
          csvData.unshift(['Agent', ...Array.from({ length: rawSimulationData.agents.length }, (_, i) => i)].join(','));
          content = csvData.join('\n');
          filename = 'connection_matrix.csv';
          mimeType = 'text/csv';
          break;

        case 'json':
          content = JSON.stringify({
            parameters: simulationParams,
            topicSettings,
            opinionSettings,
            results: rawSimulationData
          }, null, 2);
          filename = 'simulation_results.json';
          mimeType = 'application/json';
          break;

        case 'report':
          content = simulationReport;
          filename = 'simulation_report.md';
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
      setError(`Ошибка экспорта: ${error.message}`);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Заголовок */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Визуализатор агентного моделирования
          </h1>
          <p className="text-gray-600">
            Расширенная версия с визуализацией мнений и детализированной аналитикой
          </p>
        </div>

        {/* Навигация */}
        <div className="flex justify-center mb-8">
          <div className="flex space-x-4 bg-white rounded-lg p-1 shadow-sm">
            <Button
              onClick={() => setActiveSection('setup')}
              variant={activeSection === 'setup' ? 'primary' : 'outline'}
            >
              Настройка симуляции
            </Button>
            <Button
              onClick={() => setActiveSection('results')}
              variant={activeSection === 'results' ? 'primary' : 'outline'}
              disabled={!simulationData}
            >
              Результаты и анализ
            </Button>
          </div>
        </div>

        {/* Отображение ошибок */}
        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800">{error}</p>
            <Button
              onClick={() => setError(null)}
              variant="outline"
              className="mt-2 text-sm"
            >
              Закрыть
            </Button>
          </div>
        )}

        {/* Секция настройки */}
        {activeSection === 'setup' && (
          <div className="space-y-6">
            {/* Основные параметры */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Основные параметры</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество агентов: {simulationParams.agentCount}
                  </label>
                  <input
                    type="range"
                    min="10"
                    max="300"
                    value={simulationParams.agentCount}
                    onChange={(e) => handleParamsChange({ agentCount: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Циклы симуляции: {simulationParams.cycles}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="50"
                    value={simulationParams.cycles}
                    onChange={(e) => handleParamsChange({ cycles: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Порог отображения связей: {simulationParams.threshold}
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="0.9"
                    step="0.1"
                    value={simulationParams.threshold}
                    onChange={(e) => handleParamsChange({ threshold: parseFloat(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Размерность вектора: {simulationParams.vectorDimension}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="100"
                    value={simulationParams.vectorDimension}
                    onChange={(e) => handleParamsChange({ vectorDimension: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Количество кластеров: {simulationParams.numClusters}
                  </label>
                  <input
                    type="range"
                    min="2"
                    max="10"
                    value={simulationParams.numClusters}
                    onChange={(e) => handleParamsChange({ numClusters: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Пересчет кластеров каждые: {simulationParams.recalculateClustersAfter || 'никогда'}
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="20"
                    value={simulationParams.recalculateClustersAfter}
                    onChange={(e) => handleParamsChange({ recalculateClustersAfter: parseInt(e.target.value) })}
                    className="w-full"
                  />
                </div>
              </div>
            </div>

            {/* Загрузка данных */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Загрузка данных</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Загрузить векторы агентов (CSV)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'agents')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {uploadedAgents && (
                    <p className="text-sm text-green-600 mt-1">
                      Загружено {uploadedAgents.length} агентов
                    </p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Загрузить векторы тем (CSV)
                  </label>
                  <input
                    type="file"
                    accept=".csv"
                    onChange={(e) => handleFileUpload(e, 'topics')}
                    className="w-full border border-gray-300 rounded-md px-3 py-2"
                  />
                  {uploadedTopics && (
                    <p className="text-sm text-green-600 mt-1">
                      Загружено {uploadedTopics.length} тем
                    </p>
                  )}
                </div>
              </div>
            </div>

            {/* Расширенные настройки */}
            <div>
              <Button
                onClick={() => setShowAdvancedSettings(!showAdvancedSettings)}
                variant="outline"
                className="mb-4"
              >
                {showAdvancedSettings ? 'Скрыть' : 'Показать'} расширенные настройки
              </Button>

              {showAdvancedSettings && (
                <AdvancedScenarioManager
                  currentScenario={simulationParams.scenario}
                  onScenarioChange={(scenario) => handleParamsChange({ scenario })}
                  simulationParams={simulationParams}
                  onParamsChange={handleParamsChange}
                />
              )}
            </div>

            {/* Кнопка запуска */}
            <div className="text-center">
              <Button
                onClick={runNewSimulation}
                disabled={isRunning}
                className="px-8 py-3 text-lg"
              >
                {isRunning ? 'Выполняется симуляция...' : 'Запустить симуляцию'}
              </Button>
            </div>
          </div>
        )}

        {/* Секция результатов */}
        {activeSection === 'results' && (
          <div className="space-y-6">
            {/* Панель экспорта */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h3 className="text-lg font-semibold mb-4">Экспорт результатов</h3>
              <div className="flex flex-wrap gap-2">
                <Button
                  onClick={() => exportResults('csv')}
                  variant="outline"
                  className="text-sm"
                >
                  Экспорт матрицы связей (CSV)
                </Button>
                <Button
                  onClick={() => exportResults('json')}
                  variant="outline"
                  className="text-sm"
                >
                  Экспорт всех данных (JSON)
                </Button>
                <Button
                  onClick={() => exportResults('report')}
                  variant="outline"
                  className="text-sm"
                >
                  Экспорт отчета (MD)
                </Button>
              </div>
            </div>

            {/* Результаты с вкладками */}
            <ResultsTabs
              simulationData={simulationData}
              rawSimulationData={rawSimulationData}
              simulationParams={simulationParams}
              topicSettings={topicSettings}
              opinionSettings={opinionSettings}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
