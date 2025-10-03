import React, { useState, useEffect } from 'react';
import Papa from 'papaparse';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Textarea } from './ui/textarea';
import { Upload, Download, Plus, Trash2, Edit3 } from 'lucide-react';

const VectorManager = ({ 
  simulationParams, 
  onParamsChange,
  uploadedAgents,
  setUploadedAgents,
  uploadedTopics,
  setUploadedTopics,
  onError 
}) => {
  const [vectorDimensions, setVectorDimensions] = useState([10, 50, 100, 300, 700, 1044]);
  const [customDimension, setCustomDimension] = useState('');
  const [agentVectors, setAgentVectors] = useState([]);
  const [topicVectors, setTopicVectors] = useState([]);
  const [editingVector, setEditingVector] = useState(null);

  // Инициализация векторов при изменении параметров
  useEffect(() => {
    if (!uploadedAgents) {
      generateDefaultAgentVectors();
    }
  }, [simulationParams.agentCount, simulationParams.vectorDimension]);

  useEffect(() => {
    if (!uploadedTopics) {
      generateDefaultTopicVectors();
    }
  }, [simulationParams.vectorDimension]);

  const generateDefaultAgentVectors = () => {
    const vectors = [];
    for (let i = 0; i < simulationParams.agentCount; i++) {
      const vector = Array.from({ length: simulationParams.vectorDimension }, 
        () => Math.random() * 2 - 1
      );
      vectors.push({
        id: i,
        name: `Агент ${i + 1}`,
        vector: vector,
        cluster: i % simulationParams.numClusters
      });
    }
    setAgentVectors(vectors);
  };

  const generateDefaultTopicVectors = () => {
    const vectors = [];
    for (let i = 0; i < 10; i++) {
      const vector = Array.from({ length: simulationParams.vectorDimension }, 
        () => Math.random() * 2 - 1
      );
      vectors.push({
        id: i,
        name: `Тема ${i + 1}`,
        vector: vector,
        category: 'general'
      });
    }
    setTopicVectors(vectors);
  };

  const handleDimensionChange = (dimension) => {
    const newDim = parseInt(dimension);
    onParamsChange({ vectorDimension: newDim });
  };

  const addCustomDimension = () => {
    const dim = parseInt(customDimension);
    if (dim && dim > 0 && !vectorDimensions.includes(dim)) {
      setVectorDimensions([...vectorDimensions, dim].sort((a, b) => a - b));
      setCustomDimension('');
    }
  };

  const handleFileUpload = (event, type) => {
    const file = event.target.files[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop().toLowerCase();
    
    if (fileExtension === 'csv') {
      Papa.parse(file, {
        complete: (results) => {
          try {
            processUploadedData(results.data, type);
          } catch (error) {
            onError(`Ошибка при обработке CSV файла: ${error.message}`);
          }
        },
        header: false,
        skipEmptyLines: true
      });
    } else if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      // Для Excel файлов используем FileReader
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          // Здесь можно добавить библиотеку для чтения Excel
          onError('Поддержка Excel файлов будет добавлена в следующей версии. Пожалуйста, используйте CSV формат.');
        } catch (error) {
          onError(`Ошибка при чтении Excel файла: ${error.message}`);
        }
      };
      reader.readAsArrayBuffer(file);
    }
  };

  const processUploadedData = (data, type) => {
    const cleanData = data.filter(row => row.some(cell => cell && cell.toString().trim() !== ''));
    
    if (cleanData.length === 0) {
      throw new Error('Файл не содержит данных');
    }

    // Проверяем, есть ли заголовки
    const hasHeaders = isNaN(parseFloat(cleanData[0][0]));
    const dataRows = hasHeaders ? cleanData.slice(1) : cleanData;

    const vectors = dataRows.map((row, index) => {
      const numericRow = row.map(cell => {
        const num = parseFloat(cell);
        return isNaN(num) ? 0 : num;
      });

      if (type === 'agents') {
        return {
          id: index,
          name: hasHeaders && cleanData[0][0] ? `${cleanData[0][0]} ${index + 1}` : `Агент ${index + 1}`,
          vector: numericRow,
          cluster: index % simulationParams.numClusters
        };
      } else {
        return {
          id: index,
          name: hasHeaders && cleanData[0][0] ? `${cleanData[0][0]} ${index + 1}` : `Тема ${index + 1}`,
          vector: numericRow,
          category: 'imported'
        };
      }
    });

    if (vectors.length > 0) {
      const vectorDim = vectors[0].vector.length;
      
      if (type === 'agents') {
        setUploadedAgents(vectors.map(v => v.vector));
        setAgentVectors(vectors);
        onParamsChange({ 
          agentCount: vectors.length,
          vectorDimension: vectorDim
        });
      } else {
        setUploadedTopics(vectors.map(v => v.vector));
        setTopicVectors(vectors);
        onParamsChange({ vectorDimension: vectorDim });
      }
    }
  };

  const exportVectors = (type) => {
    const vectors = type === 'agents' ? agentVectors : topicVectors;
    
    const csvData = vectors.map(v => [v.name, ...v.vector]);
    const headers = ['Name', ...Array.from({ length: simulationParams.vectorDimension }, (_, i) => `Dim_${i + 1}`)];
    csvData.unshift(headers);

    const csvContent = csvData.map(row => row.join(',')).join('\\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}_vectors.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const editVector = (vector, type) => {
    setEditingVector({ ...vector, type });
  };

  const saveEditedVector = () => {
    if (!editingVector) return;

    const updatedVector = {
      ...editingVector,
      vector: editingVector.vector.map(v => parseFloat(v) || 0)
    };

    if (editingVector.type === 'agents') {
      const newVectors = agentVectors.map(v => 
        v.id === updatedVector.id ? updatedVector : v
      );
      setAgentVectors(newVectors);
      setUploadedAgents(newVectors.map(v => v.vector));
    } else {
      const newVectors = topicVectors.map(v => 
        v.id === updatedVector.id ? updatedVector : v
      );
      setTopicVectors(newVectors);
      setUploadedTopics(newVectors.map(v => v.vector));
    }

    setEditingVector(null);
  };

  const addNewVector = (type) => {
    const newVector = {
      id: type === 'agents' ? agentVectors.length : topicVectors.length,
      name: type === 'agents' ? `Новый агент ${agentVectors.length + 1}` : `Новая тема ${topicVectors.length + 1}`,
      vector: Array.from({ length: simulationParams.vectorDimension }, () => 0),
      cluster: type === 'agents' ? 0 : undefined,
      category: type === 'topics' ? 'custom' : undefined
    };

    if (type === 'agents') {
      const newVectors = [...agentVectors, newVector];
      setAgentVectors(newVectors);
      setUploadedAgents(newVectors.map(v => v.vector));
      onParamsChange({ agentCount: newVectors.length });
    } else {
      const newVectors = [...topicVectors, newVector];
      setTopicVectors(newVectors);
      setUploadedTopics(newVectors.map(v => v.vector));
    }
  };

  const deleteVector = (id, type) => {
    if (type === 'agents') {
      const newVectors = agentVectors.filter(v => v.id !== id);
      setAgentVectors(newVectors);
      setUploadedAgents(newVectors.map(v => v.vector));
      onParamsChange({ agentCount: newVectors.length });
    } else {
      const newVectors = topicVectors.filter(v => v.id !== id);
      setTopicVectors(newVectors);
      setUploadedTopics(newVectors.map(v => v.vector));
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Edit3 className="h-5 w-5" />
          Управление векторами
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="dimension" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="dimension">Размерность</TabsTrigger>
            <TabsTrigger value="agents">Агенты</TabsTrigger>
            <TabsTrigger value="topics">Темы</TabsTrigger>
          </TabsList>

          <TabsContent value="dimension" className="space-y-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="vector-dimension">Размерность вектора</Label>
                <Select 
                  value={simulationParams.vectorDimension.toString()} 
                  onValueChange={handleDimensionChange}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Выберите размерность" />
                  </SelectTrigger>
                  <SelectContent>
                    {vectorDimensions.map(dim => (
                      <SelectItem key={dim} value={dim.toString()}>
                        {dim} измерений
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex gap-2">
                <Input
                  placeholder="Пользовательская размерность"
                  value={customDimension}
                  onChange={(e) => setCustomDimension(e.target.value)}
                  type="number"
                  min="1"
                  max="2000"
                />
                <Button onClick={addCustomDimension} variant="outline">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              <div className="text-sm text-gray-600">
                <p><strong>Текущая размерность:</strong> {simulationParams.vectorDimension}</p>
                <p><strong>Агентов:</strong> {agentVectors.length}</p>
                <p><strong>Тем:</strong> {topicVectors.length}</p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="agents" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Векторы ценностей агентов</h3>
              <div className="flex gap-2">
                <Button onClick={() => addNewVector('agents')} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить
                </Button>
                <Button onClick={() => exportVectors('agents')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Экспорт
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="agents-upload">Загрузить векторы агентов (CSV/Excel)</Label>
              <Input
                id="agents-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'agents')}
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {agentVectors.slice(0, 10).map((agent) => (
                <div key={agent.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="font-medium">{agent.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      Кластер {agent.cluster}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      onClick={() => editVector(agent, 'agents')} 
                      variant="outline" 
                      size="sm"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button 
                      onClick={() => deleteVector(agent.id, 'agents')} 
                      variant="outline" 
                      size="sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
              {agentVectors.length > 10 && (
                <p className="text-sm text-gray-500 text-center">
                  ... и еще {agentVectors.length - 10} агентов
                </p>
              )}
            </div>
          </TabsContent>

          <TabsContent value="topics" className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Векторы тем для обсуждения</h3>
              <div className="flex gap-2">
                <Button onClick={() => addNewVector('topics')} variant="outline" size="sm">
                  <Plus className="h-4 w-4 mr-1" />
                  Добавить
                </Button>
                <Button onClick={() => exportVectors('topics')} variant="outline" size="sm">
                  <Download className="h-4 w-4 mr-1" />
                  Экспорт
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="topics-upload">Загрузить векторы тем (CSV/Excel)</Label>
              <Input
                id="topics-upload"
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={(e) => handleFileUpload(e, 'topics')}
              />
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {topicVectors.map((topic) => (
                <div key={topic.id} className="flex items-center justify-between p-2 border rounded">
                  <div className="flex-1">
                    <span className="font-medium">{topic.name}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {topic.category}
                    </span>
                  </div>
                  <div className="flex gap-1">
                    <Button 
                      onClick={() => editVector(topic, 'topics')} 
                      variant="outline" 
                      size="sm"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                    <Button 
                      onClick={() => deleteVector(topic.id, 'topics')} 
                      variant="outline" 
                      size="sm"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>

        {/* Модальное окно редактирования вектора */}
        {editingVector && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white p-6 rounded-lg max-w-2xl w-full max-h-96 overflow-y-auto">
              <h3 className="text-lg font-medium mb-4">
                Редактирование: {editingVector.name}
              </h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="vector-name">Название</Label>
                  <Input
                    id="vector-name"
                    value={editingVector.name}
                    onChange={(e) => setEditingVector({
                      ...editingVector,
                      name: e.target.value
                    })}
                  />
                </div>

                <div>
                  <Label>Вектор (через запятую)</Label>
                  <Textarea
                    value={editingVector.vector.join(', ')}
                    onChange={(e) => {
                      const values = e.target.value.split(',').map(v => v.trim());
                      setEditingVector({
                        ...editingVector,
                        vector: values
                      });
                    }}
                    rows={4}
                  />
                </div>

                <div className="flex justify-end gap-2">
                  <Button 
                    onClick={() => setEditingVector(null)} 
                    variant="outline"
                  >
                    Отмена
                  </Button>
                  <Button onClick={saveEditedVector}>
                    Сохранить
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default VectorManager;
