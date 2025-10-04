/**
 * EnhancedSimulation - Расширенная симуляция с экономической моделью
 * Интегрирует социальные и экономические циклы
 */

import { runSimulation, cosineSimilarity } from './agentSimulation.js';
import { EconomicEngine } from './economicEngine.js';
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
        conflictParams = {}
    } = params;

    // Если экономика отключена, используем стандартную симуляцию
    if (!economicEnabled) {
        return runSimulation(agents, topics, cycles, threshold);
    }

    // Получаем интервал экономических циклов из параметров
    const economicCycleInterval = economicParams.economicCycleInterval || 5;

    // Инициализация экономических систем
    const economicEngine = new EconomicEngine(economicParams);
    const clanSystem = new ClanSystem(clanParams);
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
        const isSocialCycle = cycle % economicCycleInterval !== 0;

        if (isSocialCycle) {
            // Социальный цикл - обычное взаимодействие агентов
            executeSocialCycle(agents, topics, connections, threshold);
        } else {
            // Экономический цикл
            const economicResult = executeEconomicCycle(
                agents,
                connections,
                economicEngine,
                clanSystem,
                conflictMechanics
            );

            // Сохранение статистики
            history.economic.push({
                cycle: cycle,
                ...economicResult.economic
            });

            history.clans.push({
                cycle: cycle,
                ...economicResult.clans
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
function executeSocialCycle(agents, topics, connections, threshold) {
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
            if (opinionDifference < threshold) {
                const strengthIncrease = 0.15 + Math.random() * 0.1;
                connections[i][j] = connections[j][i] = Math.min(1, currentConnection + strengthIncrease);
            } else {
                const strengthDecrease = 0.08 + Math.random() * 0.05;
                connections[i][j] = connections[j][i] = Math.max(0, currentConnection - strengthDecrease);
            }
        }
    }
}

/**
 * Выполнение экономического цикла
 */
function executeEconomicCycle(agents, connections, economicEngine, clanSystem, conflictMechanics) {
    // Фаза 1: Производство и потребление
    const economicResult = economicEngine.executeEconomicCycle(agents, connections);

    // Фаза 2: Идентификация кланов
    const clans = clanSystem.identifyClans(agents, connections);

    // Фаза 3: Принятие решений кланами
    clans.forEach(clan => {
        clanSystem.makeClanDecision(clan);
    });

    // Фаза 4: Обработка конфликтов
    const conflicts = conflictMechanics.processConflicts(clans, connections, agents);

    // Фаза 5: Распределение ресурсов внутри кланов
    clans.forEach(clan => {
        // Пропускаем кланы с "беспределом" - они уже атаковали
        if (clan.decision.rule !== 'lawlessness') {
            clanSystem.distributeResources(clan, connections, agents);
        }
    });

    return {
        economic: economicResult,
        clans: safeClanStats(clanSystem),
        conflicts: conflicts
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
 * Получение детальной статистики по экономической симуляции
 */
export function getEnhancedSimulationStats(agents, economicHistory) {
    const economicEngine = new EconomicEngine();
    const currentStats = economicEngine.getEconomicStats(agents);

    return {
        current: currentStats,
        history: economicHistory
    };
}

export default runEnhancedSimulation;
