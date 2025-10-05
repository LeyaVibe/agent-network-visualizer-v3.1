/**
 * EnhancedSimulation - Расширенная симуляция с экономической моделью
 * Интегрирует социальные и экономические циклы
 */

import { runSimulation, cosineSimilarity } from './agentSimulation.js';
import { EconomicEngine } from './economicEngine.js';
import { EnhancedEconomicEngine } from './enhancedEconomicEngine.js';
import { ClanSystem } from './clanSystem.js';
import { ConflictMechanics } from './conflictMechanics.js';
import { safeClanStats } from './clanStatsHelper.js';

/**
 * Запуск расширенной симуляции с экономикой
 */
export function runEnhancedSimulation(params) {
    const {
        agents,
        topics,
        cycles = 20,
        threshold = 0.3,
        economicEnabled = false,
        economicParams = {},
        clanParams = {},
        conflictParams = {},
        eventLogger = null,
        onCycleComplete = null
    } = params;

    // Если экономика отключена, используем стандартную симуляцию
    if (!economicEnabled) {
        return runSimulation(agents, topics, cycles, threshold);
    }

    // Получаем интервал экономических циклов из параметров
    const economicCycleInterval = economicParams.economicCycleInterval || 5;

    // Используем только базовые системы без логирования событий
    
    // Инициализация расширенных систем с eventLogger
    let economicEngine;
    try {
        // Используем расширенный движок с eventLogger
        economicEngine = new EnhancedEconomicEngine(economicParams, eventLogger);
        console.log('Using EnhancedEconomicEngine with eventLogger');
    } catch (error) {
        console.error('Failed to initialize enhanced economic engine, falling back to basic:', error);
        economicEngine = new EconomicEngine(economicParams);
    }
    
    let clanSystem;
    try {
        // Используем базовую систему кланов с eventLogger
        clanSystem = new ClanSystem(clanParams, eventLogger);
        console.log('Using basic ClanSystem with eventLogger');
    } catch (error) {
        console.error('Failed to initialize clan system:', error);
        clanSystem = new ClanSystem({}, eventLogger);
    }
    
    const conflictMechanics = new ConflictMechanics(conflictParams);

    // Инициализация экономики агентов
    economicEngine.initializeAgentEconomics(agents);

    const N = agents.length;
    const connections = Array(N).fill().map(() => Array(N).fill(0));

    // Инициализируем слабые связи
    for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
            connections[i][j] = connections[j][i] = 0.1 + Math.random() * 0.2;
        }
    }

    // История для аналитики
    const history = {
        economic: [],
        clans: [],
        conflicts: [],
        survival: []
    };

    // Основной цикл симуляции
    for (let cycle = 0; cycle < cycles; cycle++) {
        // Уведомление о начале цикла (метод startCycle не нужен)
        if (onCycleComplete) {
            onCycleComplete(cycle);
        }

        const isSocialCycle = cycle % economicCycleInterval !== 0;

        if (isSocialCycle) {
            // Социальный цикл - обычное взаимодействие агентов
            executeSocialCycle(agents, topics, connections, threshold, eventLogger);
        } else {
            // Экономический цикл с расширенной функциональностью
            const economicResult = executeEconomicCycle(
                agents,
                connections,
                economicEngine,
                clanSystem,
                conflictMechanics,
                cycle,
                eventLogger
            );

            // Сохранение статистики
            history.economic.push({
                cycle: cycle,
                ...economicResult.economic
            });

            history.clans.push({
                cycle: cycle,
                ...economicResult.clans,
                freeAgents: economicResult.freeAgents || {}
            });

            if (economicResult.conflicts.length > 0) {
                history.conflicts.push({
                    cycle: cycle,
                    conflicts: economicResult.conflicts
                });
            }

            history.survival.push({
                cycle: cycle,
                alive: agents.filter(a => a.economics && a.economics.alive).length,
                dead: agents.filter(a => a.economics && !a.economics.alive).length
            });

            // Логирование экономической статистики
            if (eventLogger) {
                eventLogger.logCycleEconomics({
                    cycle,
                    ...economicResult.economic
                });
            }

            console.log(`Цикл ${cycle}: ${economicResult.economic.survived} выжило, ${economicResult.economic.died} умерло`);
        }
    }

    return {
        connections,
        agents,
        economicHistory: history
    };
}

/**
 * Выполнение социального цикла (обычное взаимодействие)
 */
function executeSocialCycle(agents, topics, connections, threshold, eventLogger = null) {
    // Получаем индексы живых агентов для эффективного выбора
    const aliveIndices = agents
        .map((agent, idx) => ({ agent, idx }))
        .filter(({ agent }) => !agent.economics || agent.economics.alive)
        .map(({ idx }) => idx);
    
    if (aliveIndices.length < 2) return; // Недостаточно живых агентов для взаимодействия
    
    const numInteractions = Math.floor(aliveIndices.length * 2);

    for (let interaction = 0; interaction < numInteractions; interaction++) {
        const i = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
        const j = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];

        if (i === j) continue;

        const agent1 = agents[i];
        const agent2 = agents[j];

        const currentConnection = connections[i][j];

        // Вероятность общения
        const baseProbability = calculateConnectionStrength(agent1, agent2, topics);
        const connectionBonus = currentConnection * 0.5;
        const finalProbability = Math.min(0.8, baseProbability * 0.3 + connectionBonus + 0.2);

        if (Math.random() < finalProbability) {
            // Общение происходит
            const topic = selectTopicForCommunication(agent1, agent2, topics);

            // Вычисляем мнения
            let opinion1 = cosineSimilarity(agent1.values, topic.vector);
            let opinion2 = cosineSimilarity(agent2.values, topic.vector);

            const randomFactor1 = (Math.random() - 0.5) * 0.2;
            const randomFactor2 = (Math.random() - 0.5) * 0.2;

            opinion1 = Math.max(-1, Math.min(1, opinion1 + randomFactor1));
            opinion2 = Math.max(-1, Math.min(1, opinion2 + randomFactor2));

            const opinionDifference = Math.abs(opinion1 - opinion2);

            // Корректируем связь
            const oldConnection = currentConnection;
            if (opinionDifference < threshold) {
                const strengthIncrease = 0.15 + Math.random() * 0.1;
                connections[i][j] = connections[j][i] = Math.min(1, currentConnection + strengthIncrease);
                
                // Логируем событие усиления связи
                if (eventLogger && oldConnection < connections[i][j]) {
                    if (oldConnection === 0) {
                        // Новая связь
                        eventLogger.logEvent('connection_formed', {
                            agent1: i,
                            agent2: j,
                            strength: connections[i][j],
                            topic: topic.name,
                            opinionDifference
                        });
                    } else {
                        // Усиление существующей связи
                        eventLogger.logEvent('connection_strengthened', {
                            agent1: i,
                            agent2: j,
                            oldStrength: oldConnection,
                            newStrength: connections[i][j],
                            topic: topic.name,
                            opinionDifference
                        });
                    }
                }
            } else {
                const strengthDecrease = 0.08 + Math.random() * 0.05;
                connections[i][j] = connections[j][i] = Math.max(0, currentConnection - strengthDecrease);
                
                // Логируем событие ослабления связи
                if (eventLogger && oldConnection > connections[i][j]) {
                    if (connections[i][j] === 0) {
                        // Связь разорвана
                        eventLogger.logEvent('connection_broken', {
                            agent1: i,
                            agent2: j,
                            oldStrength: oldConnection,
                            topic: topic.name,
                            opinionDifference
                        });
                    } else {
                        // Ослабление связи
                        eventLogger.logEvent('connection_weakened', {
                            agent1: i,
                            agent2: j,
                            oldStrength: oldConnection,
                            newStrength: connections[i][j],
                            topic: topic.name,
                            opinionDifference
                        });
                    }
                }
                
                // Логируем поляризацию при большой разнице мнений
                if (eventLogger && opinionDifference > 0.7) {
                    eventLogger.logEvent('polarization_event', {
                        agent1: i,
                        agent2: j,
                        opinionDifference,
                        topic: topic.name
                    });
                }
            }
        }
    }
}

/**
 * Выполнение расширенного экономического цикла
 */
function executeEconomicCycle(agents, connections, economicEngine, clanSystem, conflictMechanics, cycle = 0, eventLogger = null) {
    // Фаза 1: Производство и потребление с расширенной экономикой
    const economicResult = economicEngine.executeEconomicCycle(agents, connections, cycle);

    // Фаза 2: Формирование и управление кланами (используем правильный метод)
    let clans = [];
    try {
        // Базовая система кланов использует identifyClans
        if (clanSystem.identifyClans && typeof clanSystem.identifyClans === 'function') {
            clans = clanSystem.identifyClans(agents, connections);
            console.log('Clans identified successfully:', clans.length);
        } else {
            console.warn('identifyClans method not available');
        }
    } catch (error) {
        console.error('Error in clan formation:', error);
        clans = [];
    }

    // Преобразование кланов в правильный формат для обработки
    let clansForProcessing = clans;
    if (Array.isArray(clans)) {
        // Если clans - массив, преобразуем в Map
        clansForProcessing = new Map();
        clans.forEach((clan, index) => {
            clansForProcessing.set(clan.id || index, clan);
        });
    }

    // Фаза 3: Принятие решений кланами с безопасными вызовами
    if (clansForProcessing && clansForProcessing.length > 0) {
        try {
            if (clansForProcessing instanceof Map) {
                clansForProcessing.forEach(clan => {
                    if (clanSystem.makeClanDecision && typeof clanSystem.makeClanDecision === 'function') {
                        clanSystem.makeClanDecision(clan);
                    }
                });
            } else if (Array.isArray(clansForProcessing)) {
                clansForProcessing.forEach(clan => {
                    if (clanSystem.makeClanDecision && typeof clanSystem.makeClanDecision === 'function') {
                        clanSystem.makeClanDecision(clan);
                    }
                });
            }
        } catch (error) {
            console.error('Error in clan decision making:', error);
        }
    }

    // Фаза 4: Обработка конфликтов с безопасными вызовами
    let conflicts = [];
    try {
        if (conflictMechanics && conflictMechanics.processConflicts && typeof conflictMechanics.processConflicts === 'function') {
            conflicts = conflictMechanics.processConflicts(clansForProcessing, connections, agents);
        }
    } catch (error) {
        console.error('Error in conflict processing:', error);
        conflicts = [];
    }

    // Фаза 5: Распределение ресурсов внутри кланов с безопасными вызовами
    if (clansForProcessing && clanSystem.distributeResources && typeof clanSystem.distributeResources === 'function') {
        try {
            if (clansForProcessing instanceof Map) {
                clansForProcessing.forEach(clan => {
                    // Пропускаем кланы с "беспределом" - они уже атаковали
                    if (clan.decision && clan.decision.rule !== 'lawlessness') {
                        clanSystem.distributeResources(clan, connections, agents);
                    }
                });
            } else if (Array.isArray(clansForProcessing)) {
                clansForProcessing.forEach(clan => {
                    // Пропускаем кланы с "беспределом" - они уже атаковали
                    if (clan.decision && clan.decision.rule !== 'lawlessness') {
                        clanSystem.distributeResources(clan, connections, agents);
                    }
                });
            }
        } catch (error) {
            console.error('Error in resource distribution:', error);
        }
    }

    // Фаза 6: Межклановое распределение излишков (включая свободных агентов)
    if (clanSystem.distributeInterClanSurplus && typeof clanSystem.distributeInterClanSurplus === 'function') {
        try {
            clanSystem.distributeInterClanSurplus(agents, connections);
        } catch (error) {
            console.error('Error in inter-clan distribution:', error);
        }
    }

    // Получение расширенной статистики с безопасными вызовами
    let clanStats = {};
    try {
        if (clanSystem.getEnhancedClanStats && typeof clanSystem.getEnhancedClanStats === 'function') {
            clanStats = clanSystem.getEnhancedClanStats(clansForProcessing);
        } else if (clanSystem.getClanStats && typeof clanSystem.getClanStats === 'function') {
            clanStats = clanSystem.getClanStats();
        } else {
            clanStats = safeClanStats(clanSystem);
        }
    } catch (error) {
        console.error('Error getting clan stats:', error);
        clanStats = {};
    }

    let economicStats = {};
    try {
        if (economicEngine.getEnhancedEconomicStats && typeof economicEngine.getEnhancedEconomicStats === 'function') {
            economicStats = economicEngine.getEnhancedEconomicStats(agents);
        } else if (economicEngine.getEconomicStats && typeof economicEngine.getEconomicStats === 'function') {
            economicStats = economicEngine.getEconomicStats(agents);
        }
    } catch (error) {
        console.error('Error getting economic stats:', error);
        economicStats = {};
    }

    // Получение статистики свободных агентов
    let freeAgentsStats = {};
    try {
        if (clanSystem.getFreeAgentsStats && typeof clanSystem.getFreeAgentsStats === 'function') {
            freeAgentsStats = clanSystem.getFreeAgentsStats(agents);
        }
    } catch (error) {
        console.error('Error getting free agents stats:', error);
        freeAgentsStats = {};
    }

    return {
        economic: economicResult,
        economicStats: economicStats,
        clans: clanStats,
        freeAgents: freeAgentsStats,
        conflicts: conflicts,
        events: []
    };
}

/**
 * Вычисление силы связи между агентами (копия из agentSimulation.js)
 */
function calculateConnectionStrength(agent1, agent2, topics, alpha = 0.4, beta = 0.3, gamma = 0.1) {
    const valueSimilarity = Math.max(0, cosineSimilarity(agent1.values, agent2.values));

    let topicalAlignment = 0;
    topics.forEach(topic => {
        const alignment1 = Math.max(0, cosineSimilarity(agent1.values, topic.vector));
        const alignment2 = Math.max(0, cosineSimilarity(agent2.values, topic.vector));
        topicalAlignment += Math.min(alignment1, alignment2);
    });
    topicalAlignment /= topics.length;

    const probability = alpha * valueSimilarity + beta * topicalAlignment + gamma;
    return Math.max(0, Math.min(1, probability));
}

/**
 * Выбор темы для общения (копия из agentSimulation.js)
 */
function selectTopicForCommunication(agent1, agent2, topics) {
    const topicWeights = topics.map(topic => {
        const alignment1 = Math.max(0, cosineSimilarity(agent1.values, topic.vector));
        const alignment2 = Math.max(0, cosineSimilarity(agent2.values, topic.vector));
        return (alignment1 + alignment2) / 2;
    });

    const totalWeight = topicWeights.reduce((sum, weight) => sum + weight, 0);
    if (totalWeight === 0) return topics[0];

    let random = Math.random() * totalWeight;
    for (let i = 0; i < topics.length; i++) {
        random -= topicWeights[i];
        if (random <= 0) return topics[i];
    }

    return topics[topics.length - 1];
}

/**
 * Получение детальной статистики по расширенной экономической симуляции
 */
export function getEnhancedSimulationStats(agents, economicHistory, clanHistory, eventHistory) {
    const economicEngine = new EconomicEngine({});
    const clanSystem = new ClanSystem({});
    
    // Инициализация для получения статистики
    if (economicEngine.initializeAgentEconomics) {
        economicEngine.initializeAgentEconomics(agents);
    }
    
    const currentEconomicStats = economicEngine.getEconomicStats ? 
        economicEngine.getEconomicStats(agents) : {};
    
    const currentClanStats = clanSystem.getClanStats ? 
        clanSystem.getClanStats() : {};

    return {
        current: {
            economic: currentEconomicStats,
            clans: currentClanStats,
            events: eventHistory || []
        },
        history: {
            economic: economicHistory || [],
            clans: clanHistory || [],
            events: eventHistory || []
        },
        analytics: {
            economicTrends: analyzeEconomicTrends(economicHistory),
            clanEvolution: analyzeClanEvolution(clanHistory),
            eventPatterns: analyzeEventPatterns(eventHistory)
        }
    };
}

/**
 * Анализ экономических трендов
 */
function analyzeEconomicTrends(economicHistory) {
    if (!economicHistory || economicHistory.length < 2) {
        return { trend: 'insufficient_data', growth: 0, volatility: 0 };
    }

    const values = economicHistory.map(h => h.averageResources || 0);
    const growth = (values[values.length - 1] - values[0]) / Math.max(1, values[0]);
    
    // Расчет волатильности
    const changes = [];
    for (let i = 1; i < values.length; i++) {
        changes.push((values[i] - values[i-1]) / Math.max(1, values[i-1]));
    }
    
    const avgChange = changes.reduce((a, b) => a + b, 0) / changes.length;
    const volatility = Math.sqrt(
        changes.reduce((sum, change) => sum + Math.pow(change - avgChange, 2), 0) / changes.length
    );

    return {
        trend: growth > 0.1 ? 'growth' : growth < -0.1 ? 'decline' : 'stable',
        growth: growth,
        volatility: volatility,
        peakValue: Math.max(...values),
        minValue: Math.min(...values)
    };
}

/**
 * Анализ эволюции кланов
 */
function analyzeClanEvolution(clanHistory) {
    if (!clanHistory || clanHistory.length < 2) {
        return { evolution: 'insufficient_data', stability: 0 };
    }

    const clanCounts = clanHistory.map(h => Object.keys(h).length);
    const avgClanCount = clanCounts.reduce((a, b) => a + b, 0) / clanCounts.length;
    
    const countVariance = clanCounts.reduce(
        (sum, count) => sum + Math.pow(count - avgClanCount, 2), 0
    ) / clanCounts.length;
    
    const stability = 1 / (1 + countVariance); // Нормализованная стабильность

    return {
        evolution: stability > 0.8 ? 'stable' : stability > 0.5 ? 'dynamic' : 'chaotic',
        stability: stability,
        averageClanCount: avgClanCount,
        maxClans: Math.max(...clanCounts),
        minClans: Math.min(...clanCounts)
    };
}

/**
 * Анализ паттернов событий
 */
function analyzeEventPatterns(eventHistory) {
    if (!eventHistory || eventHistory.length === 0) {
        return { patterns: 'no_events', frequency: 0 };
    }

    const eventTypes = {};
    eventHistory.forEach(event => {
        const type = event.type || 'unknown';
        eventTypes[type] = (eventTypes[type] || 0) + 1;
    });

    const totalEvents = eventHistory.length;
    const mostCommonEvent = Object.entries(eventTypes)
        .sort(([,a], [,b]) => b - a)[0];

    return {
        patterns: mostCommonEvent ? mostCommonEvent[0] : 'unknown',
        frequency: totalEvents,
        eventTypes: eventTypes,
        mostCommon: mostCommonEvent ? {
            type: mostCommonEvent[0],
            count: mostCommonEvent[1],
            percentage: (mostCommonEvent[1] / totalEvents * 100).toFixed(1)
        } : null
    };
}

export default runEnhancedSimulation;
