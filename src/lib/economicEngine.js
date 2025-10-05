/**
 * EconomicEngine - Базовая экономическая система для агентов
 * Управляет производством, потреблением и выживанием агентов
 */

export class EconomicEngine {
    constructor(params = {}, eventLogger = null) {
        // Базовые параметры производства
        // Уменьшаем базовую производительность для создания дефицита
        this.baseProductivity = params.baseProductivity || 7;
        this.minSurvival = params.minSurvival || 10;
        this.maxMultiplier = params.maxMultiplier || 2.5;
        this.strongConnectionThreshold = params.strongConnectionThreshold || 0.3;
        this.connectionBonus = params.connectionBonus || 0.4;
        
        // Параметры сложности (новые)
        this.minEfficiency = params.minEfficiency !== undefined ? params.minEfficiency : 0.8;
        this.accumulationRate = params.accumulationRate !== undefined ? params.accumulationRate : 0.3;
        this.starvationThreshold = params.starvationThreshold !== undefined ? params.starvationThreshold : 3;
        this.interClanDistribution = params.interClanDistribution !== false;
        
        // Event logger для записи событий
        this.eventLogger = eventLogger;
        
        // Начальные ресурсы (зависят от сложности)
        // Уменьшаем начальные ресурсы для создания большей конкуренции
        const survivalCycles = this.minEfficiency < 0.4 ? 1.0 : (this.minEfficiency < 0.6 ? 2 : 3);
        this.initialResources = params.initialResources || Math.round(this.minSurvival * survivalCycles);
    }

    /**
     * Инициализация экономических данных для всех агентов
     */
    initializeAgentEconomics(agents) {
        agents.forEach(agent => {
            if (!agent.economics) {
                agent.economics = {
                    currentResources: this.initialResources,  // Стартовые ресурсы (зависят от сложности)
                    accumulatedResources: 0,                  // Накопленные ресурсы
                    productionHistory: [],                    // История производства
                    consumptionHistory: [],                   // История потребления
                    alive: true,                              // Статус выживания
                    starvationCounter: 0                      // Счетчик циклов голодания
                };
            }
        });
    }

    /**
     * Расчет производства ресурсов для агента
     * Улучшенная формула с учетом качества связей и экономической эффективности
     */
    calculateProduction(agent, connectionMatrix, agentIndex, agents) {
        if (!agent.economics || !agent.economics.alive) {
            return 0;
        }

        // Расчет социального множителя на основе качества связей
        let totalConnectionWeight = 0;
        let connectionCount = 0;
        
        if (connectionMatrix && connectionMatrix[agentIndex]) {
            for (let j = 0; j < connectionMatrix[agentIndex].length; j++) {
                if (j === agentIndex) continue; // Пропускаем self-loop
                
                // Проверяем, что другой агент жив
                if (agents && agents[j].economics && !agents[j].economics.alive) continue;
                
                const strength = connectionMatrix[agentIndex][j];
                if (strength >= this.strongConnectionThreshold) {
                    totalConnectionWeight += strength;
                    connectionCount++;
                }
            }
        }

        // Социальный множитель с уменьшенной убывающей отдачей
        // Уменьшаем знаменатель для более сильного эффекта от связей
        const socialMultiplier = connectionCount > 0 
            ? 1 + (totalConnectionWeight * this.connectionBonus) / (1 + connectionCount * 0.05)
            : 1;

        // Ограничиваем максимальный множитель
        const cappedSocialMultiplier = Math.min(socialMultiplier, this.maxMultiplier);

        // Фактор эффективности на основе текущих ресурсов
        // Диапазон от minEfficiency до 1.0
        const optimalResources = this.baseProductivity * 3; // Снижен оптимальный уровень
        const efficiencyRange = 1.0 - this.minEfficiency;
        const efficiencyFactor = this.minEfficiency + efficiencyRange * Math.min(
            1.0, 
            agent.economics.currentResources / optimalResources
        );

        // Добавляем случайность для создания разнообразия
        const randomFactor = 0.7 + Math.random() * 0.6; // 0.7 - 1.3
        
        // Фактор усталости - плавное снижение производительности при низких ресурсах
        // Используем сигмоидную функцию для более плавного перехода
        const resourceRatio = agent.economics.currentResources / this.minSurvival;
        const fatigueFactor = resourceRatio >= 1.0 
            ? 1.0 
            : 0.6 + 0.4 * resourceRatio; // Диапазон от 0.6 до 1.0

        // Итоговое производство с большей вариативностью
        const production = this.baseProductivity * cappedSocialMultiplier * efficiencyFactor * randomFactor * fatigueFactor;

        // Сохранение в историю
        agent.economics.productionHistory.push(production);

        return production;
    }

    /**
     * Обработка потребления ресурсов всеми агентами
     * Агенты умирают только после нескольких циклов голодания
     */
    processConsumption(agents) {
        const results = {
            survived: 0,
            died: 0,
            totalConsumed: 0
        };

        agents.forEach(agent => {
            if (!agent.economics || !agent.economics.alive) {
                return;
            }

            // Инициализация счетчика голодания если его нет
            if (agent.economics.starvationCounter === undefined) {
                agent.economics.starvationCounter = 0;
            }

            // Базовое потребление с увеличенной случайностью
            const baseConsumption = this.minSurvival;
            const consumptionVariation = 0.7 + Math.random() * 0.6; // 0.7 - 1.3
            const consumption = baseConsumption * consumptionVariation;

            // Проверка достаточности ресурсов
            if (agent.economics.currentResources >= consumption) {
                agent.economics.currentResources -= consumption;
                agent.economics.consumptionHistory.push(consumption);
                
                // Сброс счетчика голодания при успешном потреблении
                agent.economics.starvationCounter = Math.max(0, agent.economics.starvationCounter - 1);
                
                results.survived++;
                results.totalConsumed += consumption;
            } else {
                // Попытка использовать накопленные ресурсы
                const deficit = consumption - agent.economics.currentResources;
                
                if (agent.economics.accumulatedResources >= deficit) {
                    // Используем накопления для покрытия дефицита
                    agent.economics.accumulatedResources -= deficit;
                    agent.economics.currentResources = 0;
                    agent.economics.consumptionHistory.push(consumption);
                    
                    // Сброс счетчика голодания при успешном потреблении
                    agent.economics.starvationCounter = Math.max(0, agent.economics.starvationCounter - 1);
                    
                    results.survived++;
                    results.totalConsumed += consumption;
                } else {
                    // Увеличиваем счетчик голодания
                    agent.economics.starvationCounter++;
                    
                    // Потребляем все доступные ресурсы (текущие + накопленные)
                    const totalAvailable = agent.economics.currentResources + agent.economics.accumulatedResources;
                    results.totalConsumed += totalAvailable;
                    agent.economics.currentResources = 0;
                    agent.economics.accumulatedResources = 0;
                    
                    // Вероятность смерти увеличивается с каждым циклом голодания
                    // Увеличиваем вероятность смерти для создания реальной угрозы
                    const deathProbability = Math.min(0.9, agent.economics.starvationCounter / this.starvationThreshold * 0.5);
                    
                    // Агент может умереть с определенной вероятностью или после достижения порога
                    if (agent.economics.starvationCounter >= this.starvationThreshold || Math.random() < deathProbability) {
                        agent.economics.alive = false;
                        results.died++;
                        
                        // Логируем событие смерти
                        if (this.eventLogger) {
                            this.eventLogger.logEvent('agent_death', {
                                agentId: i,
                                cause: 'starvation',
                                resources: agent.economics.currentResources,
                                starvationDays: agent.economics.starvationCounter
                            }, 'critical');
                        }
                    } else {
                        results.survived++;
                    }
                }
            }
        });

        return results;
    }

    /**
     * Выполнение полного экономического цикла для всех агентов
     */
    executeEconomicCycle(agents, connectionMatrix) {
        const cycleResults = {
            totalProduction: 0,
            totalConsumption: 0,
            survived: 0,
            died: 0,
            averageResources: 0
        };

        // Фаза 1: Производство
        agents.forEach((agent, index) => {
            if (agent.economics && agent.economics.alive) {
                const production = this.calculateProduction(agent, connectionMatrix, index, agents);
                agent.economics.currentResources += production;
                cycleResults.totalProduction += production;
            }
        });

        // Фаза 1.5: Накопление излишков (прогрессивное)
        agents.forEach(agent => {
            if (agent.economics && agent.economics.alive) {
                const survivalThreshold = this.minSurvival * 2; // Буферный запас
                if (agent.economics.currentResources > survivalThreshold) {
                    const surplus = agent.economics.currentResources - survivalThreshold;
                    
                    // Прогрессивное накопление: богатые накапливают быстрее
                    // Базовая ставка увеличивается с ростом накоплений
                    const wealthBonus = Math.min(0.3, agent.economics.accumulatedResources / (this.minSurvival * 10) * 0.3);
                    const effectiveRate = this.accumulationRate + wealthBonus;
                    
                    agent.economics.accumulatedResources += surplus * effectiveRate;
                }
            }
        });

        // Фаза 2: Потребление
        const consumptionResults = this.processConsumption(agents);
        cycleResults.totalConsumption = consumptionResults.totalConsumed;
        cycleResults.survived = consumptionResults.survived;
        cycleResults.died = consumptionResults.died;

        // Расчет средних ресурсов
        const aliveAgents = agents.filter(a => a.economics && a.economics.alive);
        if (aliveAgents.length > 0) {
            const totalResources = aliveAgents.reduce(
                (sum, a) => sum + a.economics.currentResources, 
                0
            );
            cycleResults.averageResources = totalResources / aliveAgents.length;
        }

        return cycleResults;
    }

    /**
     * Получение статистики по экономике
     */
    getEconomicStats(agents) {
        const aliveAgents = agents.filter(a => a.economics && a.economics.alive);
        const deadAgents = agents.filter(a => a.economics && !a.economics.alive);

        if (aliveAgents.length === 0) {
            return {
                aliveCount: 0,
                deadCount: deadAgents.length,
                totalAgents: agents.length,
                survivalRate: 0,
                totalResources: 0,
                averageResources: 0,
                medianResources: 0,
                minResources: 0,
                maxResources: 0,
                stdDevResources: 0,
                totalAccumulated: 0,
                averageAccumulated: 0,
                resourceDistribution: {
                    q1: 0,
                    q2: 0,
                    q3: 0
                },
                wealthInequality: 0
            };
        }

        const resources = aliveAgents.map(a => a.economics.currentResources || 0);
        const accumulated = aliveAgents.map(a => a.economics.accumulatedResources || 0);
        
        // Сортируем для расчета квартилей и медианы
        const sortedResources = [...resources].sort((a, b) => a - b);
        
        // Расчет квартилей
        const q1Index = Math.floor(sortedResources.length * 0.25);
        const q2Index = Math.floor(sortedResources.length * 0.5);
        const q3Index = Math.floor(sortedResources.length * 0.75);
        
        const q1 = sortedResources[q1Index] || 0;
        const q2 = sortedResources[q2Index] || 0; // медиана
        const q3 = sortedResources[q3Index] || 0;
        
        // Расчет среднего
        const totalResources = resources.reduce((a, b) => a + b, 0);
        const averageResources = totalResources / aliveAgents.length;
        
        // Расчет стандартного отклонения
        const variance = resources.reduce((sum, r) => sum + Math.pow(r - averageResources, 2), 0) / aliveAgents.length;
        const stdDev = Math.sqrt(variance);
        
        // Расчет коэффициента неравенства (упрощенный Gini)
        const totalAccumulated = accumulated.reduce((a, b) => a + b, 0);
        const wealthInequality = averageResources > 0 ? (stdDev / averageResources) : 0;

        // Улучшенная классификация на основе квартилей
        // Бедные: ниже Q1 (нижние 25%)
        // Средний класс: между Q1 и Q3 (средние 50%)
        // Богатые: выше Q3 (верхние 25%)
        const poorAgents = sortedResources.filter(r => r < q1).length;
        const richAgents = sortedResources.filter(r => r > q3).length;
        const middleClassAgents = aliveAgents.length - poorAgents - richAgents;

        return {
            aliveCount: aliveAgents.length,
            deadCount: deadAgents.length,
            totalAgents: agents.length,
            survivalRate: parseFloat((aliveAgents.length / agents.length * 100).toFixed(1)),
            totalResources: parseFloat(totalResources.toFixed(1)),
            averageResources: parseFloat(averageResources.toFixed(1)),
            medianResources: parseFloat(q2.toFixed(1)),
            minResources: parseFloat(Math.min(...resources).toFixed(1)),
            maxResources: parseFloat(Math.max(...resources).toFixed(1)),
            stdDevResources: parseFloat(stdDev.toFixed(1)),
            totalAccumulated: parseFloat(totalAccumulated.toFixed(1)),
            averageAccumulated: parseFloat((totalAccumulated / aliveAgents.length).toFixed(1)),
            resourceDistribution: {
                q1: parseFloat(q1.toFixed(1)),
                q2: parseFloat(q2.toFixed(1)),
                q3: parseFloat(q3.toFixed(1))
            },
            wealthInequality: parseFloat(wealthInequality.toFixed(2)),
            // Социальная стратификация на основе квартилей
            poorAgents,
            richAgents,
            middleClassAgents,
            // Пороги для классов (для отображения)
            classThresholds: {
                poor: parseFloat(q1.toFixed(1)),
                rich: parseFloat(q3.toFixed(1))
            }
        };
    }

    /**
     * Валидация параметров экономики
     */
    static validateParams(params) {
        return {
            baseProductivity: Math.max(1, params.baseProductivity || 10),
            minSurvival: Math.max(1, params.minSurvival || 10),
            maxMultiplier: Math.max(1.1, params.maxMultiplier || 2.0),
            strongConnectionThreshold: Math.max(0.1, Math.min(1.0, params.strongConnectionThreshold || 0.3)),
            connectionBonus: Math.max(0.05, params.connectionBonus || 0.1)
        };
    }
}

export default EconomicEngine;
