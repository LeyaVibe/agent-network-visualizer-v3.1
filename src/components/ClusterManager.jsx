import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { Layers, TrendingUp, Users, Network, Save, History } from 'lucide-react';

const ClusterManager = ({ 
  simulationParams, 
  onParamsChange,
  rawSimulationData,
  onSaveClusterHistory 
}) => {
  const [clusterHistory, setClusterHistory] = useState([]);
  const [currentClusterConfig, setCurrentClusterConfig] = useState({
    numClusters: simulationParams.numClusters,
    recalculateAfter: simulationParams.recalculateClustersAfter,
    method: 'kmeans'
  });
  const [clusterStats, setClusterStats] = useState(null);
  const [selectedHistoryItem, setSelectedHistoryItem] = useState(null);

  const clusterColors = [
    '#3B82F6', '#EF4444', '#10B981', '#F59E0B', 
    '#8B5CF6', '#F97316', '#06B6D4', '#84CC16',
    '#EC4899', '#6B7280'
  ];

  useEffect(() => {
    if (rawSimulationData) {
      calculateClusterStatistics();
    }
  }, [rawSimulationData]);

  const calculateClusterStatistics = () => {
    if (!rawSimulationData || !rawSimulationData.agents) return;

    const { agents, connections } = rawSimulationData;
    const clusterData = {};

    // Инициализация данных кластеров
    for (let i = 0; i < simulationParams.numClusters; i++) {
      clusterData[i] = {
        id: i,
        agents: [],
        internalConnections: 0,
        externalConnections: 0,
        density: 0,
        hubs: [],
        avgConnectionStrength: 0
      };
    }

    // Группировка агентов по кластерам
    agents.forEach(agent => {
      if (clusterData[agent.cluster]) {
        clusterData[agent.cluster].agents.push(agent);
      }
    });

    // Анализ связей
    connections.forEach((row, i) => {
      const agentI = agents[i];
      if (!agentI) return;

      row.forEach((strength, j) => {
        if (i !== j && strength > 0) {
          const agentJ = agents[j];
          if (!agentJ) return;

          if (agentI.cluster === agentJ.cluster) {
            clusterData[agentI.cluster].internalConnections++;
          } else {
            clusterData[agentI.cluster].externalConnections++;
          }
        }
      });
    });

    // Расчет плотности и поиск хабов
    Object.values(clusterData).forEach(cluster => {
      const clusterSize = cluster.agents.length;
      if (clusterSize > 1) {
        const maxPossibleConnections = clusterSize * (clusterSize - 1);
        cluster.density = cluster.internalConnections / maxPossibleConnections;
      }

      // Поиск хабов (агентов с большим количеством связей)
      cluster.agents.forEach(agent => {
        const agentConnections = connections[agent.id].reduce((sum, strength) => 
          sum + (strength > 0 ? 1 : 0), 0
        );
        
        if (agentConnections > clusterSize * 0.3) { // Порог для хаба
          cluster.hubs.push({
            id: agent.id,
            connections: agentConnections
          });
        }
      });

      // Средняя сила связей
      const totalStrength = connections[cluster.agents[0]?.id]?.reduce((sum, strength) => sum + strength, 0) || 0;
      cluster.avgConnectionStrength = totalStrength / clusterSize;
    });

    setClusterStats(clusterData);
  };

  const handleClusterConfigChange = (key, value) => {
    const newConfig = { ...currentClusterConfig, [key]: value };
    setCurrentClusterConfig(newConfig);
    
    if (key === 'numClusters') {
      onParamsChange({ numClusters: parseInt(value) });
    } else if (key === 'recalculateAfter') {
      onParamsChange({ recalculateClustersAfter: parseInt(value) });
    }
  };

  const saveCurrentClusterState = () => {
    if (!rawSimulationData) return;

    const timestamp = new Date().toISOString();
    const historyItem = {
      id: `${Date.now()}`,
      timestamp,
      config: { ...currentClusterConfig },
      stats: { ...clusterStats },
      note: `Конфигурация ${currentClusterConfig.numClusters} кластеров`,
      agents: rawSimulationData.agents.map(agent => ({
        id: agent.id,
        cluster: agent.cluster
      }))
    };

    const newHistory = [...clusterHistory, historyItem];
    setClusterHistory(newHistory);
    
    if (onSaveClusterHistory) {
      onSaveClusterHistory(historyItem);
    }
  };

  const loadClusterState = (historyItem) => {
    setCurrentClusterConfig(historyItem.config);
    setSelectedHistoryItem(historyItem);
    onParamsChange({
      numClusters: historyItem.config.numClusters,
      recalculateClustersAfter: historyItem.config.recalculateAfter
    });
  };

  const getClusterDistributionData = () => {
    if (!clusterStats) return [];
    
    return Object.values(clusterStats).map((cluster, index) => ({
      name: `Кластер ${cluster.id + 1}`,
      value: cluster.agents.length,
      color: clusterColors[index % clusterColors.length]
    }));
  };

  const getClusterDensityData = () => {
    if (!clusterStats) return [];
    
    return Object.values(clusterStats).map(cluster => ({
      cluster: `К${cluster.id + 1}`,
      density: (cluster.density * 100).toFixed(1),
      internal: cluster.internalConnections,
      external: cluster.externalConnections,
      hubs: cluster.hubs.length
    }));
  };

  const getInterClusterConnectionsData = () => {
    if (!clusterStats) return [];
    
    const data = [];
    Object.values(clusterStats).forEach(cluster => {
      data.push({
        cluster: `Кластер ${cluster.id + 1}`,
        internal: cluster.internalConnections,
        external: cluster.externalConnections
      });
    });
    
    return data;
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Управление кластерами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="config" className="w-full">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="config">Настройка</TabsTrigger>
            <TabsTrigger value="stats">Статистика</TabsTrigger>
            <TabsTrigger value="visualization">Визуализация</TabsTrigger>
            <TabsTrigger value="history">История</TabsTrigger>
          </TabsList>

          <TabsContent value="config" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="num-clusters">Количество кластеров</Label>
                <Select 
                  value={currentClusterConfig.numClusters.toString()}
                  onValueChange={(value) => handleClusterConfigChange('numClusters', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 9 }, (_, i) => i + 2).map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} кластеров
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="recalculate-after">Пересчет кластеров каждые (циклы)</Label>
                <Input
                  id="recalculate-after"
                  type="number"
                  min="0"
                  max="50"
                  value={currentClusterConfig.recalculateAfter}
                  onChange={(e) => handleClusterConfigChange('recalculateAfter', e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="cluster-method">Метод кластеризации</Label>
                <Select 
                  value={currentClusterConfig.method}
                  onValueChange={(value) => handleClusterConfigChange('method', value)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="kmeans">K-means</SelectItem>
                    <SelectItem value="hierarchical">Иерархическая</SelectItem>
                    <SelectItem value="dbscan">DBSCAN</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-end">
                <Button 
                  onClick={saveCurrentClusterState}
                  className="w-full"
                  disabled={!rawSimulationData}
                >
                  <Save className="h-4 w-4 mr-2" />
                  Сохранить состояние
                </Button>
              </div>
            </div>

            <Separator />

            <div className="space-y-2">
              <h4 className="font-medium">Текущая конфигурация</h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                <Badge variant="outline">
                  Кластеров: {currentClusterConfig.numClusters}
                </Badge>
                <Badge variant="outline">
                  Пересчет: {currentClusterConfig.recalculateAfter || 'Никогда'}
                </Badge>
                <Badge variant="outline">
                  Метод: {currentClusterConfig.method}
                </Badge>
                <Badge variant="outline">
                  Агентов: {rawSimulationData?.agents?.length || 0}
                </Badge>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="stats" className="space-y-4">
            {clusterStats ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  {Object.values(clusterStats).map((cluster, index) => (
                    <Card key={cluster.id} className="p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div 
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: clusterColors[index % clusterColors.length] }}
                        />
                        <h4 className="font-medium">Кластер {cluster.id + 1}</h4>
                      </div>
                      <div className="space-y-1 text-sm">
                        <div className="flex justify-between">
                          <span>Агентов:</span>
                          <span className="font-medium">{cluster.agents.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Плотность:</span>
                          <span className="font-medium">{(cluster.density * 100).toFixed(1)}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Хабов:</span>
                          <span className="font-medium">{cluster.hubs.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Внутр. связи:</span>
                          <span className="font-medium">{cluster.internalConnections}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Внеш. связи:</span>
                          <span className="font-medium">{cluster.externalConnections}</span>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <Card className="p-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4" />
                      Плотность кластеров
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getClusterDensityData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cluster" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="density" fill="#3B82F6" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>

                  <Card className="p-4">
                    <h4 className="font-medium mb-4 flex items-center gap-2">
                      <Network className="h-4 w-4" />
                      Межкластерные связи
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <BarChart data={getInterClusterConnectionsData()}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="cluster" />
                        <YAxis />
                        <Tooltip />
                        <Bar dataKey="internal" fill="#10B981" name="Внутренние" />
                        <Bar dataKey="external" fill="#EF4444" name="Внешние" />
                      </BarChart>
                    </ResponsiveContainer>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Запустите симуляцию для получения статистики кластеров
              </div>
            )}
          </TabsContent>

          <TabsContent value="visualization" className="space-y-4">
            {clusterStats ? (
              <div className="space-y-6">
                <Card className="p-4">
                  <h4 className="font-medium mb-4 flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    Распределение агентов по кластерам
                  </h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <PieChart>
                      <Pie
                        data={getClusterDistributionData()}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, value, percent }) => 
                          `${name}: ${value} (${(percent * 100).toFixed(0)}%)`
                        }
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {getClusterDistributionData().map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </Card>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-blue-600">
                      {Object.values(clusterStats).reduce((sum, cluster) => 
                        sum + cluster.internalConnections, 0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Внутрикластерные связи</div>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-red-600">
                      {Object.values(clusterStats).reduce((sum, cluster) => 
                        sum + cluster.externalConnections, 0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Межкластерные связи</div>
                  </Card>
                  
                  <Card className="p-4 text-center">
                    <div className="text-2xl font-bold text-green-600">
                      {Object.values(clusterStats).reduce((sum, cluster) => 
                        sum + cluster.hubs.length, 0
                      )}
                    </div>
                    <div className="text-sm text-gray-600">Всего хабов</div>
                  </Card>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                Запустите симуляцию для визуализации кластеров
              </div>
            )}
          </TabsContent>

          <TabsContent value="history" className="space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="font-medium flex items-center gap-2">
                <History className="h-4 w-4" />
                История кластеризации
              </h4>
              <Badge variant="outline">
                {clusterHistory.length} записей
              </Badge>
            </div>

            {clusterHistory.length > 0 ? (
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {clusterHistory.map((item) => (
                  <Card 
                    key={item.id} 
                    className={`p-3 cursor-pointer transition-colors ${
                      selectedHistoryItem?.id === item.id ? 'bg-blue-50 border-blue-200' : 'hover:bg-gray-50'
                    }`}
                    onClick={() => setSelectedHistoryItem(item)}
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-medium">{item.note}</div>
                        <div className="text-sm text-gray-600">
                          {new Date(item.timestamp).toLocaleString()}
                        </div>
                        <div className="flex gap-2 mt-1">
                          <Badge variant="outline" size="sm">
                            {item.config.numClusters} кластеров
                          </Badge>
                          <Badge variant="outline" size="sm">
                            {item.config.method}
                          </Badge>
                        </div>
                      </div>
                      <Button 
                        onClick={(e) => {
                          e.stopPropagation();
                          loadClusterState(item);
                        }}
                        variant="outline" 
                        size="sm"
                      >
                        Загрузить
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-gray-500">
                История кластеризации пуста. Сохраните текущее состояние для начала.
              </div>
            )}

            {selectedHistoryItem && (
              <Card className="p-4 bg-blue-50">
                <h5 className="font-medium mb-2">Детали записи</h5>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <strong>Конфигурация:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>Кластеров: {selectedHistoryItem.config.numClusters}</li>
                      <li>Пересчет: {selectedHistoryItem.config.recalculateAfter || 'Никогда'}</li>
                      <li>Метод: {selectedHistoryItem.config.method}</li>
                    </ul>
                  </div>
                  <div>
                    <strong>Статистика:</strong>
                    <ul className="mt-1 space-y-1">
                      <li>Агентов: {selectedHistoryItem.agents?.length || 0}</li>
                      <li>Время: {new Date(selectedHistoryItem.timestamp).toLocaleString()}</li>
                    </ul>
                  </div>
                </div>
              </Card>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ClusterManager;
