/**
 * EconomicEngine - Базовая экономическая система для агентов
 * Управляет производством, потреблением и выживанием агентов
 */

export class EconomicEngine {
    constructor(params = {}) {
        // Базовые параметры производства
        // Настроены для баланса: изолированные агенты медленно умирают, социальные процветают
        this.baseProductivity = params.baseProductivity || 10;
        this.minSurvival = params.minSurvival || 10;
        this.maxMultiplier = params.maxMultiplier || 2.0;
        this.strongConnectionThreshold = params.strongConnectionThreshold || 0.3;
        this.connectionBonus = params.connectionBonus || 0.1;
    }

    /**
     * Инициализация экономических данных для всех агентов
     */
    initializeAgentEconomics(agents) {
        agents.forEach(agent => {
            if (!agent.economics) {
                agent.economics = {
                    currentResources: 50,           // Стартовые ресурсы
                    accumulatedResources: 0,        // Накопленные ресурсы
                    productionHistory: [],          // История производства
                    consumptionHistory: [],         // История потребления
                    alive: true                     // Статус выживания
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

        // Социальный множитель с убывающей отдачей
        const socialMultiplier = connectionCount > 0 
            ? 1 + (totalConnectionWeight * this.connectionBonus) / (1 + connectionCount * 0.1)
            : 1;

        // Ограничиваем максимальный множитель
        const cappedSocialMultiplier = Math.min(socialMultiplier, this.maxMultiplier);

        // Фактор эффективности на основе текущих ресурсов
        const optimalResources = this.baseProductivity * 5; // Оптимальный уровень ресурсов
        const efficiencyFactor = Math.min(
            1.0, 
            Math.max(0.5, agent.economics.currentResources / optimalResources)
        );

        // Итоговое производство
        const production = this.baseProductivity * cappedSocialMultiplier * efficiencyFactor;

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

            const consumption = this.minSurvival;

            // Проверка достаточности ресурсов
            if (agent.economics.currentResources >= consumption) {
                agent.economics.currentResources -= consumption;
                agent.economics.consumptionHistory.push(consumption);
                
                // Сброс счетчика голодания при успешном потреблении
                agent.economics.starvationCounter = Math.max(0, agent.economics.starvationCounter - 1);
                
                results.survived++;
                results.totalConsumed += consumption;
            } else {
                // Увеличиваем счетчик голодания
                agent.economics.starvationCounter++;
                
                // Потребляем все доступные ресурсы
                results.totalConsumed += agent.economics.currentResources;
                agent.economics.currentResources = 0;
                
                // Агент умирает только после 3 циклов голодания
                if (agent.economics.starvationCounter >= 3) {
                    agent.economics.alive = false;
                    results.died++;
                } else {
                    results.survived++;
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

        // Фаза 1.5: Накопление излишков
        agents.forEach(agent => {
            if (agent.economics && agent.economics.alive) {
                const survivalThreshold = this.minSurvival * 2; // Буферный запас
                if (agent.economics.currentResources > survivalThreshold) {
                    const surplus = agent.economics.currentResources - survivalThreshold;
                    agent.economics.accumulatedResources += surplus * 0.1; // 10% излишков накапливается
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
                totalResources: 0,
                averageResources: 0,
                minResources: 0,
                maxResources: 0,
                totalAccumulated: 0
            };
        }

        const resources = aliveAgents.map(a => a.economics.currentResources);
        const accumulated = aliveAgents.map(a => a.economics.accumulatedResources);

        return {
            aliveCount: aliveAgents.length,
            deadCount: deadAgents.length,
            totalResources: resources.reduce((a, b) => a + b, 0),
            averageResources: resources.reduce((a, b) => a + b, 0) / aliveAgents.length,
            minResources: Math.min(...resources),
            maxResources: Math.max(...resources),
            totalAccumulated: accumulated.reduce((a, b) => a + b, 0)
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
