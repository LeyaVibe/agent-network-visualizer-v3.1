// Утилиты для экспорта результатов симуляции

// Экспорт матрицы связей в CSV
export function exportConnectionMatrix(connections, symmetric = true) {
  const N = connections.length;
  let csvContent = '';
  
  // Заголовок
  csvContent += 'Agent,' + Array.from({length: N}, (_, i) => `Agent_${i}`).join(',') + '\n';
  
  // Данные
  for (let i = 0; i < N; i++) {
    const row = [`Agent_${i}`];
    for (let j = 0; j < N; j++) {
      if (symmetric) {
        row.push(connections[i][j].toFixed(4));
      } else {
        // Асимметричная матрица - можно добавить логику для направленных связей
        row.push(connections[i][j].toFixed(4));
      }
    }
    csvContent += row.join(',') + '\n';
  }
  
  return csvContent;
}

// Экспорт настроек модели в JSON
export function exportModelSettings(parameters, agentCount, vectorDimension, clusterCount) {
  const settings = {
    timestamp: new Date().toISOString(),
    modelParameters: {
      agentCount: agentCount,
      vectorDimension: vectorDimension,
      clusterCount: clusterCount,
      cycles: parameters.cycles,
      threshold: parameters.threshold,
      scenario: parameters.scenario
    },
    fileSettings: {
      agentVectorsLoaded: !!parameters.agentVectorsFile,
      topicVectorsLoaded: !!parameters.topicVectorsFile,
      agentVectorsFileName: parameters.agentVectorsFile?.name || null,
      topicVectorsFileName: parameters.topicVectorsFile?.name || null
    }
  };
  
  return JSON.stringify(settings, null, 2);
}

// Экспорт сводки результатов в CSV
export function exportSimulationSummary(agents, connections, parameters, threshold) {
  const totalAgents = agents.length;
  const totalConnections = connections.flat().filter(strength => strength >= threshold).length / 2; // деление на 2 из-за симметричности
  const connectionDensity = (totalConnections / (totalAgents * (totalAgents - 1) / 2) * 100);
  
  // Анализ по кластерам
  const clusterStats = {};
  const maxCluster = Math.max(...agents.map(a => a.cluster));
  
  for (let c = 0; c <= maxCluster; c++) {
    const clusterAgents = agents.filter(a => a.cluster === c);
    let internalConnections = 0;
    let externalConnections = 0;
    
    for (let i = 0; i < agents.length; i++) {
      for (let j = i + 1; j < agents.length; j++) {
        if (connections[i][j] >= threshold) {
          if (agents[i].cluster === c && agents[j].cluster === c) {
            internalConnections++;
          } else if (agents[i].cluster === c || agents[j].cluster === c) {
            externalConnections++;
          }
        }
      }
    }
    
    clusterStats[c] = {
      agentCount: clusterAgents.length,
      internalConnections,
      externalConnections
    };
  }
  
  // Анализ силы связей
  const connectionStrengths = connections.flat().filter(s => s >= threshold);
  const avgStrength = connectionStrengths.reduce((sum, s) => sum + s, 0) / connectionStrengths.length || 0;
  const strongConnections = connectionStrengths.filter(s => s > 0.7).length;
  const weakConnections = connectionStrengths.filter(s => s < 0.4).length;
  
  let csvContent = 'Metric,Value\n';
  csvContent += `Timestamp,${new Date().toISOString()}\n`;
  csvContent += `Total Agents,${totalAgents}\n`;
  csvContent += `Total Connections,${totalConnections}\n`;
  csvContent += `Connection Density (%),${connectionDensity.toFixed(2)}\n`;
  csvContent += `Average Connection Strength,${avgStrength.toFixed(4)}\n`;
  csvContent += `Strong Connections (>0.7),${strongConnections}\n`;
  csvContent += `Weak Connections (<0.4),${weakConnections}\n`;
  csvContent += `Scenario,${parameters.scenario}\n`;
  csvContent += `Cycles,${parameters.cycles}\n`;
  csvContent += `Threshold,${parameters.threshold}\n`;
  csvContent += `Vector Dimension,${agents[0]?.values?.length || 'N/A'}\n`;
  
  // Добавляем статистику по кластерам
  for (let c = 0; c <= maxCluster; c++) {
    const stats = clusterStats[c];
    csvContent += `Cluster ${c} Agent Count,${stats.agentCount}\n`;
    csvContent += `Cluster ${c} Internal Connections,${stats.internalConnections}\n`;
    csvContent += `Cluster ${c} External Connections,${stats.externalConnections}\n`;
  }
  
  return csvContent;
}

// Экспорт данных графа для внешних инструментов
export function exportGraphData(nodes, links, format = 'gexf') {
  if (format === 'gexf') {
    return exportToGEXF(nodes, links);
  } else if (format === 'graphml') {
    return exportToGraphML(nodes, links);
  } else if (format === 'json') {
    return JSON.stringify({ nodes, links }, null, 2);
  }
  
  throw new Error(`Неподдерживаемый формат: ${format}`);
}

// Экспорт в формат GEXF (для Gephi)
function exportToGEXF(nodes, links) {
  let gexf = `<?xml version="1.0" encoding="UTF-8"?>
<gexf xmlns="http://www.gexf.net/1.2draft" version="1.2">
  <meta lastmodifieddate="${new Date().toISOString()}">
    <creator>Agent Network Visualizer</creator>
    <description>Agent-based modeling network export</description>
  </meta>
  <graph mode="static" defaultedgetype="undirected">
    <attributes class="node">
      <attribute id="0" title="cluster" type="integer"/>
      <attribute id="1" title="degree" type="integer"/>
    </attributes>
    <attributes class="edge">
      <attribute id="0" title="strength" type="float"/>
    </attributes>
    <nodes>`;

  nodes.forEach(node => {
    const clusterColors = ['#3B82F6', '#EF4444', '#10B981']; // синий, красный, зеленый
    const color = clusterColors[node.cluster] || '#6B7280';
    
    gexf += `
      <node id="${node.id}" label="Agent ${node.id}">
        <attvalues>
          <attvalue for="0" value="${node.cluster}"/>
          <attvalue for="1" value="${node.degree}"/>
        </attvalues>
        <viz:color r="${parseInt(color.slice(1,3), 16)}" g="${parseInt(color.slice(3,5), 16)}" b="${parseInt(color.slice(5,7), 16)}"/>
        <viz:size value="${Math.max(5, node.degree * 2)}"/>
      </node>`;
  });

  gexf += `
    </nodes>
    <edges>`;

  links.forEach((link, index) => {
    gexf += `
      <edge id="${index}" source="${link.source}" target="${link.target}">
        <attvalues>
          <attvalue for="0" value="${link.strength}"/>
        </attvalues>
      </edge>`;
  });

  gexf += `
    </edges>
  </graph>
</gexf>`;

  return gexf;
}

// Экспорт в формат GraphML
function exportToGraphML(nodes, links) {
  let graphml = `<?xml version="1.0" encoding="UTF-8"?>
<graphml xmlns="http://graphml.graphdrawing.org/xmlns"
         xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
         xsi:schemaLocation="http://graphml.graphdrawing.org/xmlns
         http://graphml.graphdrawing.org/xmlns/1.0/graphml.xsd">
  <key id="cluster" for="node" attr.name="cluster" attr.type="int"/>
  <key id="degree" for="node" attr.name="degree" attr.type="int"/>
  <key id="strength" for="edge" attr.name="strength" attr.type="double"/>
  <graph id="G" edgedefault="undirected">`;

  nodes.forEach(node => {
    graphml += `
    <node id="${node.id}">
      <data key="cluster">${node.cluster}</data>
      <data key="degree">${node.degree}</data>
    </node>`;
  });

  links.forEach((link, index) => {
    graphml += `
    <edge id="e${index}" source="${link.source}" target="${link.target}">
      <data key="strength">${link.strength}</data>
    </edge>`;
  });

  graphml += `
  </graph>
</graphml>`;

  return graphml;
}

// Утилита для скачивания файла
export function downloadFile(content, filename, mimeType = 'text/plain') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// Экспорт изображения графа (требует canvas)
export function exportGraphImage(svgElement, filename = 'network_graph.png') {
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  const svgData = new XMLSerializer().serializeToString(svgElement);
  
  const img = new Image();
  const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  
  img.onload = function() {
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0);
    
    canvas.toBlob(function(blob) {
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    }, 'image/png');
  };
  
  img.src = url;
}

