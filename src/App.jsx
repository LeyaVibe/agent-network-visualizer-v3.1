import React, { useState, useEffect } from 'react';
import './App.css';
import { generateAgentPopulation, generateTopics, runSimulation, prepareVisualizationData, generateSimulationReport } from './lib/agentSimulation';
import AdvancedScenarioManager from './components/AdvancedScenarioManager';
import EnhancedScenarioManager from './components/EnhancedScenarioManager';
import VectorManager from './components/VectorManager';
import ClusterManager from './components/ClusterManager';
import EnhancedExportManager from './components/EnhancedExportManager';
import AdvancedAnalytics from './components/AdvancedAnalytics';
import AdvancedAnalyticsWithExport from './components/AdvancedAnalyticsWithExport';

import AIAnalysisManager from './components/AIAnalysisManager';
import ResultsTabs from './components/ResultsTabs';
import EconomicPanel from './components/EconomicPanel';
import ClanPanel from './components/ClanPanel';
import { runEnhancedSimulation, getEnhancedSimulationStats } from './lib/enhancedSimulation';
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
    cycles: 50,
    threshold: 0.1,
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
  const [uploadedTopicNames, setUploadedTopicNames] = useState(null);

  // История кластеризации
  const [clusterHistory, setClusterHistory] = useState([]);

  // Экономические параметры
  const [economicParams, setEconomicParams] = useState({
    enabled: false,
    baseProductivity: 10,
    minSurvival: 10,
    maxMultiplier: 2.0,
    strongConnectionThreshold: 0.3,
    connectionBonus: 0.1,
    economicCycleInterval: 5
  });

  // Параметры кланов
  const [clanParams, setClanParams] = useState({
    minClanSize: 3,
    densityThreshold: 0.5,
    polarizationFactor: 3,
    resourceStealRatio: 2/3
  });

  // Статистика экономики и кланов
  const [economicStats, setEconomicStats] = useState(null);
  const [clanStats, setClanStats] = useState(null);
  const [conflictStats, setConflictStats] = useState(null);

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
      defaultOpinions[cluster] = Array.from({ length: topicSettings.numTopics }, () => 0);
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
            console.log('Загружаем темы, данные:', data);
            
            // Более надежная проверка наличия названий тем
            const firstCell = data[0]?.[0]?.toString().trim();
            
            // Проверяем, является ли первая ячейка числом или содержит ли она текст
            const isFirstCellNumber = !isNaN(parseFloat(firstCell)) && isFinite(firstCell);
            const hasTopicNames = !isFirstCellNumber && firstCell && firstCell.length > 0;
            
            console.log('Первая ячейка:', firstCell);
            console.log('Является ли числом:', isFirstCellNumber);
            console.log('Есть ли названия тем?', hasTopicNames);
            
            let vectors, topicNames;
            
            // Предопределенные названия тем
            const predefinedNames = [
              'Политика', 'В мире', 'Экономика', 'Общество', 'Армия',
              'Наука', 'Спорт', 'Культура', 'Религия', 'Туризм',
              'Redbull', 'Zara'
            ];
            
            if (hasTopicNames) {
              // Первый столбец - названия тем, остальные - векторы
              topicNames = data.map(row => row[0]?.toString().trim() || '');
              vectors = data.map(row => row.slice(1).map(cell => parseFloat(cell) || 0));
              console.log('Извлеченные названия тем:', topicNames);
            } else {
              // Только векторы, используем предопределенные названия
              vectors = data.map(row => row.map(cell => parseFloat(cell) || 0));
              topicNames = vectors.map((_, i) => predefinedNames[i] || `Тема ${i + 1}`);
              console.log('Используем предопределенные названия:', topicNames);
            }
            
            console.log('Финальные названия тем:', topicNames);
            console.log('Векторы тем:', vectors);
            
            setUploadedTopics(vectors);
            setUploadedTopicNames(topicNames);
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
      
      // Предопределенные названия тем
      const predefinedTopicNames = [
        'Политика', 'В мире', 'Экономика', 'Общество', 'Армия',
        'Наука', 'Спорт', 'Культура', 'Религия', 'Туризм',
        'Redbull', 'Zara'
      ];
      
      if (uploadedTopics) {
        topics = uploadedTopics.map((vector, i) => ({
          id: i,
          vector: vector,
          name: uploadedTopicNames?.[i] || predefinedTopicNames[i] || `Тема ${i + 1}`
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
            name: settings?.name || predefinedTopicNames[i] || `Тема ${i + 1}`
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
            const clusterOpinion = opinionSettings.clusterOpinions[agent.cluster]?.[topic.id] || 0;
            const noise = (Math.random() - 0.5) * 0.3; // Добавляем шум
            agent.opinions[topic.id] = Math.max(-1, Math.min(1, clusterOpinion + noise));
          }
        });
      });

      // Запуск симуляции (с экономикой или без)
      const simulationResult = economicParams.enabled 
        ? runEnhancedSimulation({
            agents: agentData.agents,
            topics: topics,
            cycles: simulationParams.cycles,
            threshold: simulationParams.threshold,
            economicEnabled: true,
            economicParams: economicParams,
            clanParams: clanParams,
            conflictParams: {
              polarizationFactor: clanParams.polarizationFactor,
              resourceStealRatio: clanParams.resourceStealRatio
            }
          })
        : runSimulation(
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

      // Обработка экономической статистики
      if (economicParams.enabled && simulationResult.economicHistory) {
        const enhancedStats = getEnhancedSimulationStats(
          simulationResult.agents,
          simulationResult.economicHistory.economic,
          simulationResult.economicHistory.clans,
          []
        );
        
        setEconomicStats(enhancedStats.current.economic);
        
        // Получаем последнюю статистику кланов
        const lastClanStats = simulationResult.economicHistory.clans[
          simulationResult.economicHistory.clans.length - 1
        ];
        if (lastClanStats) {
          setClanStats(lastClanStats);
        }

        // Получаем статистику конфликтов
        if (simulationResult.economicHistory.conflicts.length > 0) {
          const allConflicts = simulationResult.economicHistory.conflicts.flatMap(c => c.conflicts);
          
          // Подсчет статистики
          const totalResourcesStolen = allConflicts.reduce((sum, c) => sum + c.stolenResources, 0);
          const totalConnectionsPolarized = allConflicts.reduce((sum, c) => sum + c.polarizedConnections, 0);
          
          const attackerCounts = {};
          const victimCounts = {};
          allConflicts.forEach(conflict => {
            attackerCounts[conflict.attackerId] = (attackerCounts[conflict.attackerId] || 0) + 1;
            victimCounts[conflict.victimId] = (victimCounts[conflict.victimId] || 0) + 1;
          });

          const mostAggressiveClan = Object.entries(attackerCounts).reduce(
            (max, [id, count]) => count > (max.count || 0) ? { id: parseInt(id), count } : max,
            {}
          );

          const mostVictimizedClan = Object.entries(victimCounts).reduce(
            (max, [id, count]) => count > (max.count || 0) ? { id: parseInt(id), count } : max,
            {}
          );

          setConflictStats({
            totalConflicts: allConflicts.length,
            totalResourcesStolen,
            totalConnectionsPolarized,
            averageResourcesPerConflict: totalResourcesStolen / allConflicts.length,
            mostAggressiveClan: mostAggressiveClan.id !== undefined ? mostAggressiveClan : null,
            mostVictimizedClan: mostVictimizedClan.id !== undefined ? mostVictimizedClan : null
          });
        }
      }

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
          <div className="flex flex-wrap justify-center gap-1 bg-white rounded-lg p-1 shadow-sm">
            <Button
              onClick={() => setActiveSection('setup')}
              variant={activeSection === 'setup' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Настройки
            </Button>
            <Button
              onClick={() => setActiveSection('vectors')}
              variant={activeSection === 'vectors' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Векторы
            </Button>
            <Button
              onClick={() => setActiveSection('clusters')}
              variant={activeSection === 'clusters' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Кластеры
            </Button>
            <Button
              onClick={() => setActiveSection('scenarios')}
              variant={activeSection === 'scenarios' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Сценарии
            </Button>
            <Button
              onClick={() => setActiveSection('economic')}
              variant={activeSection === 'economic' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Экономика
            </Button>
            <Button
              onClick={() => setActiveSection('clans')}
              variant={activeSection === 'clans' ? 'primary' : 'outline'}
              className="text-xs px-2 py-1"
            >
              Кланы
            </Button>
            <Button
              onClick={() => setActiveSection('results')}
              variant={activeSection === 'results' ? 'primary' : 'outline'}
              disabled={!simulationData}
              className="text-xs px-2 py-1"
            >
              Результаты
            </Button>
            <Button
              onClick={() => setActiveSection('analytics')}
              variant={activeSection === 'analytics' ? 'primary' : 'outline'}
              disabled={!simulationData}
              className="text-xs px-2 py-1"
            >
              Аналитика
            </Button>

            <Button
              onClick={() => setActiveSection('ai')}
              variant={activeSection === 'ai' ? 'primary' : 'outline'}
              disabled={!simulationData}
              className="text-xs px-2 py-1"
            >
              AI анализ
            </Button>
            <Button
              onClick={() => setActiveSection('export')}
              variant={activeSection === 'export' ? 'primary' : 'outline'}
              disabled={!simulationData}
              className="text-xs px-2 py-1"
            >
              Экспорт
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

        {/* Секция основных настроек */}
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

        {/* Секция управления векторами */}
        {activeSection === 'vectors' && (
          <VectorManager
            simulationParams={simulationParams}
            onParamsChange={handleParamsChange}
            uploadedAgents={uploadedAgents}
            setUploadedAgents={setUploadedAgents}
            uploadedTopics={uploadedTopics}
            setUploadedTopics={setUploadedTopics}
            onError={setError}
          />
        )}

        {/* Секция управления кластерами */}
        {activeSection === 'clusters' && (
          <ClusterManager
            simulationParams={simulationParams}
            onParamsChange={handleParamsChange}
            rawSimulationData={rawSimulationData}
            onSaveClusterHistory={(historyItem) => {
              setClusterHistory(prev => [...prev, historyItem]);
            }}
          />
        )}

        {/* Секция расширенных сценариев */}
        {activeSection === 'scenarios' && (
          <EnhancedScenarioManager
            simulationParams={simulationParams}
            onParamsChange={handleParamsChange}
            topicSettings={topicSettings}
            setTopicSettings={setTopicSettings}
            opinionSettings={opinionSettings}
            setOpinionSettings={setOpinionSettings}
            onError={setError}
          />
        )}

        {/* Секция экономики */}
        {activeSection === 'economic' && (
          <EconomicPanel
            params={economicParams}
            onParamsChange={setEconomicParams}
            economicStats={economicStats}
          />
        )}

        {/* Секция кланов */}
        {activeSection === 'clans' && (
          <ClanPanel
            params={clanParams}
            onParamsChange={setClanParams}
            clanStats={clanStats}
            conflictStats={conflictStats}
          />
        )}

        {/* Секция экспорта */}
        {activeSection === 'export' && (
          <EnhancedExportManager
            simulationData={simulationData}
            rawSimulationData={rawSimulationData}
            simulationParams={simulationParams}
            topicSettings={topicSettings}
            opinionSettings={opinionSettings}
            simulationReport={simulationReport}
            onError={setError}
          />
        )}

        {/* Секция расширенной аналитики */}
        {activeSection === 'analytics' && (
          <AdvancedAnalyticsWithExport
            rawSimulationData={rawSimulationData}
            simulationParams={simulationParams}
            topicSettings={topicSettings}
            onError={setError}
          />
        )}



        {/* Секция AI анализа */}
        {activeSection === 'ai' && (
          <AIAnalysisManager
            simulationData={simulationData}
            rawSimulationData={rawSimulationData}
            simulationParams={simulationParams}
            topicSettings={topicSettings}
            onError={setError}
          />
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
              uploadedTopicNames={uploadedTopicNames}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export default App;
