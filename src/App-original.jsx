import React, { useState, useEffect } from 'react'
import NetworkVisualization from './components/NetworkVisualization'
import { runSimulation, generateAgentPopulation, generateTopics, generateSimulationReport, prepareVisualizationData } from './lib/agentSimulation'
import Papa from 'papaparse'

const Button = ({ children, onClick, className = '', variant = 'primary', disabled = false }) => {
  const baseClasses = 'px-4 py-2 rounded-md font-medium transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed'
  const variants = {
    primary: 'bg-blue-600 text-white hover:bg-blue-700 disabled:hover:bg-blue-600',
    outline: 'border border-gray-300 text-gray-700 hover:bg-gray-50 disabled:hover:bg-transparent'
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
  // Основные состояния
  const [simulationData, setSimulationData] = useState(null)
  const [simulationReport, setSimulationReport] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [error, setError] = useState(null)

  // Параметры симуляции
  const [agentCount, setAgentCount] = useState(150)
  const [cycles, setCycles] = useState(10)
  const [connectionThreshold, setConnectionThreshold] = useState(0.3)
  const [vectorDimension, setVectorDimension] = useState(10)
  const [numClusters, setNumClusters] = useState(3)
  const [scenario, setScenario] = useState('A')

  // Основная функция симуляции
  const runNewSimulation = async () => {
    console.log('Starting new simulation...');
    setIsRunning(true)
    setError(null)
    
    try {
      // Генерация агентов
      console.log("Generating agents with:", { agentCount, vectorDimension, numClusters });
      const agentData = generateAgentPopulation(agentCount, vectorDimension, numClusters);
      console.log("Agents generated:", agentData);

      // Генерация тем
      const topics = generateTopics(
        vectorDimension, 
        scenario,
        agentData.clusterCenters,
        null, // initialTopicVectors
        null, // customScenario
        numClusters,
        0, // recalculateClusters
        agentData.agents
      );
      console.log("Topics generated:", topics);

      // Запуск симуляции
      const simulationResult = await runSimulation(
        agentData.agents, 
        topics, 
        cycles, 
        connectionThreshold,
        0, // recalculateClusters
        numClusters
      );
      console.log("Simulation completed:", simulationResult);

      // Подготовка данных для визуализации
      const vizData = prepareVisualizationData(simulationResult.agents, simulationResult.connections, connectionThreshold);
      console.log("Visualization data prepared:", vizData);

      // Генерация отчета
      const report = generateSimulationReport(simulationResult.agents, simulationResult.connections, topics, scenario, cycles, connectionThreshold);

      setSimulationData(vizData);
      setSimulationReport(report);
      
    } catch (error) {
      console.error('Ошибка симуляции:', error);
      setError(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  // Функция экспорта отчета
  const handleExportReport = () => {
    if (simulationReport) {
      const blob = new Blob([simulationReport], { type: 'text/markdown' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simulation_report_${new Date().toISOString().slice(0, 10)}.md`;
      a.click();
      window.URL.revokeObjectURL(url);
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Визуализатор динамики связей в группе агентов
          </h1>
          <p className="text-gray-600">
            Интерактивное моделирование социальных взаимодействий и формирования связей
          </p>
        </div>

        {/* Панель управления */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-xl font-semibold mb-6">Параметры симуляции</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Количество агентов: {agentCount}
              </label>
              <input
                type="range"
                min="10"
                max="300"
                value={agentCount}
                onChange={(e) => setAgentCount(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Циклы симуляции: {cycles}
              </label>
              <input
                type="range"
                min="1"
                max="50"
                value={cycles}
                onChange={(e) => setCycles(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Порог связи: {connectionThreshold}
              </label>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.1"
                value={connectionThreshold}
                onChange={(e) => setConnectionThreshold(parseFloat(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Размерность вектора: {vectorDimension}
              </label>
              <input
                type="range"
                min="2"
                max="100"
                value={vectorDimension}
                onChange={(e) => setVectorDimension(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Количество кластеров: {numClusters}
              </label>
              <input
                type="range"
                min="2"
                max="10"
                value={numClusters}
                onChange={(e) => setNumClusters(parseInt(e.target.value))}
                className="w-full"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Сценарий
              </label>
              <select
                value={scenario}
                onChange={(e) => setScenario(e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2"
              >
                <option value="A">Сценарий A (нейтральная повестка)</option>
                <option value="B">Сценарий B (ценностно-близкая тема)</option>
              </select>
            </div>
          </div>

          <div className="mt-6 flex gap-4">
            <Button
              onClick={runNewSimulation}
              disabled={isRunning}
              className="text-lg px-8 py-3"
            >
              {isRunning ? 'Выполняется...' : 'Запустить симуляцию'}
            </Button>
            
            {simulationReport && (
              <Button
                onClick={handleExportReport}
                variant="outline"
                className="text-lg px-8 py-3"
              >
                Экспорт отчета
              </Button>
            )}
          </div>

          {error && (
            <div className="mt-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              <strong>Ошибка:</strong> {error}
            </div>
          )}
        </div>

        {/* Визуализация */}
        {simulationData && (
          <div className="bg-white rounded-lg shadow-md p-6 mb-8">
            <h2 className="text-xl font-semibold mb-6">Визуализация сети</h2>
            <NetworkVisualization 
              data={simulationData}
              width={800}
              height={600}
              scenario={scenario}
              cycles={cycles}
            />
          </div>
        )}

        {/* Отчет */}
        {simulationReport && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-6">Отчет о симуляции</h2>
            <div className="prose max-w-none">
              <pre className="whitespace-pre-wrap text-sm">{simulationReport}</pre>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App
