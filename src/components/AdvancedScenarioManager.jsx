import React, { useState, useEffect } from 'react';
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

const AdvancedScenarioManager = ({
  currentScenario,
  onScenarioChange,
  simulationParams,
  onParamsChange
}) => {
  const [activeTab, setActiveTab] = useState('basic');
  const [topicSettings, setTopicSettings] = useState({
    numTopics: 10,
    topics: []
  });
  const [opinionSettings, setOpinionSettings] = useState({
    clusterOpinions: {},
    customMatrix: null
  });

  // Инициализация настроек тем
  useEffect(() => {
    const defaultTopics = Array.from({ length: topicSettings.numTopics }, (_, i) => ({
      id: i,
      name: `Тема ${i + 1}`,
      type: 'random', // 'random', 'cluster-aligned', 'custom'
      targetCluster: 0,
      proximityLevel: 0.5, // 0-1, насколько близко к кластеру
      customVector: null
    }));

    setTopicSettings(prev => ({
      ...prev,
      topics: defaultTopics
    }));
  }, [topicSettings.numTopics]);

  // Инициализация настроек мнений
  useEffect(() => {
    const numClusters = simulationParams.numClusters || 3;
    const defaultOpinions = {};
    
    for (let cluster = 0; cluster < numClusters; cluster++) {
      defaultOpinions[cluster] = Array.from({ length: topicSettings.numTopics }, () => 0);
    }

    setOpinionSettings(prev => ({
      ...prev,
      clusterOpinions: defaultOpinions
    }));
  }, [simulationParams.numClusters, topicSettings.numTopics]);

  const handleTopicChange = (topicId, field, value) => {
    setTopicSettings(prev => ({
      ...prev,
      topics: prev.topics.map(topic => 
        topic.id === topicId ? { ...topic, [field]: value } : topic
      )
    }));
  };

  const handleOpinionChange = (clusterId, topicId, value) => {
    setOpinionSettings(prev => ({
      ...prev,
      clusterOpinions: {
        ...prev.clusterOpinions,
        [clusterId]: prev.clusterOpinions[clusterId].map((opinion, idx) => 
          idx === topicId ? parseFloat(value) : opinion
        )
      }
    }));
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    Papa.parse(file, {
      complete: (results) => {
        if (type === 'opinions') {
          // Ожидаем матрицу: строки = агенты, столбцы = темы
          const matrix = results.data.filter(row => row.some(cell => cell.trim() !== ''));
          setOpinionSettings(prev => ({
            ...prev,
            customMatrix: matrix.map(row => row.map(cell => parseFloat(cell) || 0))
          }));
        } else if (type === 'topics') {
          // Ожидаем векторы тем
          const vectors = results.data.filter(row => row.some(cell => cell.trim() !== ''));
          const newTopics = vectors.map((vector, i) => ({
            id: i,
            name: `Загруженная тема ${i + 1}`,
            type: 'custom',
            customVector: vector.map(cell => parseFloat(cell) || 0)
          }));
          setTopicSettings(prev => ({
            ...prev,
            numTopics: newTopics.length,
            topics: newTopics
          }));
        }
      },
      header: false
    });
  };

  const exportOpinionMatrix = () => {
    const { clusterOpinions } = opinionSettings;
    const numClusters = Object.keys(clusterOpinions).length;
    const agentsPerCluster = Math.floor(simulationParams.agentCount / numClusters);
    
    const matrix = [];
    const headers = topicSettings.topics.map(topic => topic.name);
    matrix.push(['Агент', ...headers]);

    // Генерируем матрицу мнений для всех агентов
    for (let cluster = 0; cluster < numClusters; cluster++) {
      const clusterOpinions_cluster = clusterOpinions[cluster] || [];
      for (let agent = 0; agent < agentsPerCluster; agent++) {
        const agentId = cluster * agentsPerCluster + agent;
        const agentOpinions = clusterOpinions_cluster.map(opinion => {
          // Добавляем небольшой шум к мнению кластера
          const noise = (Math.random() - 0.5) * 0.2;
          return Math.max(-1, Math.min(1, opinion + noise)).toFixed(3);
        });
        matrix.push([`Агент_${agentId}`, ...agentOpinions]);
      }
    }

    const csv = Papa.unparse(matrix);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'opinion_matrix.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const exportTopicVectors = () => {
    const vectors = topicSettings.topics.map(topic => {
      if (topic.customVector) {
        return topic.customVector;
      }
      // Генерируем случайный вектор для экспорта
      return Array.from({ length: simulationParams.vectorDimension }, () => 
        (Math.random() * 2 - 1).toFixed(3)
      );
    });

    const csv = Papa.unparse(vectors);
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'topic_vectors.csv';
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const applySettings = () => {
    // Передаем настройки в родительский компонент
    onParamsChange({
      ...simulationParams,
      topicSettings,
      opinionSettings
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      <h3 className="text-lg font-semibold mb-4">Расширенное управление сценариями</h3>
      
      {/* Вкладки */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          onClick={() => setActiveTab('basic')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'basic'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Основные настройки
        </button>
        <button
          onClick={() => setActiveTab('topics')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'topics'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Настройка тем
        </button>
        <button
          onClick={() => setActiveTab('opinions')}
          className={`px-4 py-2 font-medium ${
            activeTab === 'opinions'
              ? 'border-b-2 border-blue-500 text-blue-600'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          Настройка мнений
        </button>
      </div>

      {/* Основные настройки */}
      {activeTab === 'basic' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Тип сценария
            </label>
            <select
              value={currentScenario}
              onChange={(e) => onScenarioChange(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2"
            >
              <option value="A">Сценарий A (нейтральная повестка)</option>
              <option value="B">Сценарий B (ценностно-близкая тема)</option>
              <option value="custom">Пользовательский сценарий</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Количество тем в обсуждении: {topicSettings.numTopics}
            </label>
            <input
              type="range"
              min="2"
              max="20"
              value={topicSettings.numTopics}
              onChange={(e) => setTopicSettings(prev => ({ ...prev, numTopics: parseInt(e.target.value) }))}
              className="w-full"
            />
            <div className="text-xs text-gray-500 mt-1">
              Для сценария B рекомендуется 2-5 тем для лучшего эффекта
            </div>
          </div>
        </div>
      )}

      {/* Настройка тем */}
      {activeTab === 'topics' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Конфигурация тем ({topicSettings.numTopics} тем)</h4>
            <div className="space-x-2">
              <Button
                onClick={() => document.getElementById('topic-upload').click()}
                variant="outline"
                className="text-sm"
              >
                Загрузить векторы тем
              </Button>
              <Button
                onClick={exportTopicVectors}
                variant="outline"
                className="text-sm"
              >
                Экспорт векторов
              </Button>
            </div>
          </div>

          <input
            id="topic-upload"
            type="file"
            accept=".csv"
            onChange={(e) => handleFileUpload(e, 'topics')}
            className="hidden"
          />

          <div className="max-h-96 overflow-y-auto space-y-3">
            {topicSettings.topics.map((topic, index) => (
              <div key={topic.id} className="border border-gray-200 rounded-lg p-4">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Название темы
                    </label>
                    <input
                      type="text"
                      value={topic.name}
                      onChange={(e) => handleTopicChange(topic.id, 'name', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Тип темы
                    </label>
                    <select
                      value={topic.type}
                      onChange={(e) => handleTopicChange(topic.id, 'type', e.target.value)}
                      className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                    >
                      <option value="random">Случайная</option>
                      <option value="cluster-aligned">Близкая к кластеру</option>
                      <option value="custom">Пользовательская</option>
                    </select>
                  </div>

                  {topic.type === 'cluster-aligned' && (
                    <>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Целевой кластер
                        </label>
                        <select
                          value={topic.targetCluster}
                          onChange={(e) => handleTopicChange(topic.id, 'targetCluster', parseInt(e.target.value))}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          {Array.from({ length: simulationParams.numClusters || 3 }, (_, i) => (
                            <option key={i} value={i}>Кластер {i + 1}</option>
                          ))}
                        </select>
                      </div>
                      <div className="md:col-span-3">
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Степень близости: {topic.proximityLevel.toFixed(2)}
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="1"
                          step="0.1"
                          value={topic.proximityLevel}
                          onChange={(e) => handleTopicChange(topic.id, 'proximityLevel', parseFloat(e.target.value))}
                          className="w-full"
                        />
                        <div className="text-xs text-gray-500">
                          0 = случайная тема, 1 = максимально близкая к кластеру
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Настройка мнений */}
      {activeTab === 'opinions' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h4 className="font-medium">Настройка мнений по кластерам</h4>
            <div className="space-x-2">
              <Button
                onClick={() => document.getElementById('opinion-upload').click()}
                variant="outline"
                className="text-sm"
              >
                Загрузить матрицу мнений
              </Button>
              <Button
                onClick={exportOpinionMatrix}
                variant="outline"
                className="text-sm"
              >
                Экспорт матрицы
              </Button>
            </div>
          </div>

          <input
            id="opinion-upload"
            type="file"
            accept=".csv"
            onChange={(e) => handleFileUpload(e, 'opinions')}
            className="hidden"
          />

          {opinionSettings.customMatrix ? (
            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h5 className="font-medium text-green-800 mb-2">Загружена пользовательская матрица мнений</h5>
              <p className="text-sm text-green-700">
                Размер: {opinionSettings.customMatrix.length} агентов × {opinionSettings.customMatrix[0]?.length || 0} тем
              </p>
              <Button
                onClick={() => setOpinionSettings(prev => ({ ...prev, customMatrix: null }))}
                variant="outline"
                className="text-sm mt-2"
              >
                Удалить и использовать настройки кластеров
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="text-sm text-gray-600">
                Настройте среднее мнение каждого кластера по каждой теме (от -1 до +1)
              </div>
              
              {Object.keys(opinionSettings.clusterOpinions).map(clusterId => (
                <div key={clusterId} className="border border-gray-200 rounded-lg p-4">
                  <h5 className="font-medium mb-3">
                    Кластер {parseInt(clusterId) + 1} 
                    <span className="text-sm text-gray-500 ml-2">
                      (примерно {Math.floor(simulationParams.agentCount / simulationParams.numClusters)} агентов)
                    </span>
                  </h5>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {topicSettings.topics.slice(0, topicSettings.numTopics).map((topic, topicIndex) => (
                      <div key={topicIndex}>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          {topic.name}
                        </label>
                        <select
                          value={opinionSettings.clusterOpinions[clusterId]?.[topicIndex] || 0}
                          onChange={(e) => handleOpinionChange(clusterId, topicIndex, e.target.value)}
                          className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm"
                        >
                          <option value={-1}>Сильно против (-1)</option>
                          <option value={-0.5}>Против (-0.5)</option>
                          <option value={0}>Нейтрально (0)</option>
                          <option value={0.5}>За (+0.5)</option>
                          <option value={1}>Сильно за (+1)</option>
                        </select>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Кнопка применения настроек */}
      <div className="mt-6 pt-4 border-t border-gray-200">
        <Button
          onClick={applySettings}
          className="w-full"
        >
          Применить настройки сценария
        </Button>
      </div>
    </div>
  );
};

export default AdvancedScenarioManager;
