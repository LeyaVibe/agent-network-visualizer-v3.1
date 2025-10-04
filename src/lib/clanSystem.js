/**
 * ClanSystem - Система управления кланами агентов
 * Формирует кланы, управляет принятием решений и распределением ресурсов
 */

export const DISTRIBUTION_RULES = {
    DICTATORSHIP: 'dictatorship',    // Сильнейший забирает все
    DEMOCRACY: 'democracy',          // Демократическое распределение (с подправилами)
    LAWLESSNESS: 'lawlessness'       // По беспределу (атака слабых)
};

export const DEMOCRACY_SUBRULES = {
    HALF: 'half',              // Первому половина (1/2)
    THIRD: 'third',            // Первому треть (1/3)
    QUARTER: 'quarter',        // Первому четверть (1/4)
    FIFTH: 'fifth',            // Первому пятую часть (1/5)
    EQUAL: 'equal'             // Всем поровну
};

export class ClanSystem {
    constructor(params = {}) {
        this.minClanSize = params.minClanSize || 3;
        this.densityThreshold = params.densityThreshold || 0.5;
        this.clans = [];
        this.clanHistory = [];
    }

    /**
     * Идентификация кланов на основе кластеров и плотности связей
     */
    identifyClans(agents, connectionMatrix) {
        this.clans = [];
        const visited = new Set();
        const aliveAgents = agents.filter(a => a.economics && a.economics.alive);

        // Группировка агентов по кластерам
        const clusters = this._groupByClusters(aliveAgents);

        // Для каждого кластера проверяем, может ли он быть кланом
        clusters.forEach((clusterAgents, clusterId) => {
            if (clusterAgents.length < this.minClanSize) {
                return; // Слишком маленький для клана
            }

            // Получаем индексы агентов в оригинальном массиве
            const agentIndices = clusterAgents.map(a => agents.indexOf(a));

            // Проверяем плотность связей
            const density = this._calculateDensity(agentIndices, connectionMatrix);

            if (density >= this.densityThreshold) {
                // Создаем клан
                const clan = {
                    id: this.clans.length,
                    members: clusterAgents,
                    memberIndices: agentIndices,
                    density: density,
                    strength: 0,
                    totalResources: 0,
                    decision: null
                };

                // Расчет силы клана и ресурсов
                clan.strength = this._calculateClanStrength(clan, connectionMatrix);
                clan.totalResources = this._calculateClanResources(clan);

                this.clans.push(clan);
            }
        });

        // Сохраняем в историю
        this.clanHistory.push({
            timestamp: Date.now(),
            clans: this.clans.map(c => ({
                id: c.id,
                size: c.members.length,
                density: c.density,
                strength: c.strength,
                resources: c.totalResources
            }))
        });

        return this.clans;
    }

    /**
     * Группировка агентов по кластерам
     */
    _groupByClusters(agents) {
        const clusters = new Map();

        agents.forEach(agent => {
            const clusterId = agent.cluster !== undefined ? agent.cluster : 0;
            if (!clusters.has(clusterId)) {
                clusters.set(clusterId, []);
            }
            clusters.get(clusterId).push(agent);
        });

        return clusters;
    }

    /**
     * Расчет взвешенной плотности связей внутри группы агентов
     * Учитывает не только наличие связей, но и их силу
     */
    _calculateDensity(agentIndices, connectionMatrix) {
        const n = agentIndices.length;
        if (n < 2) return 0;

        const maxConnections = (n * (n - 1)) / 2;
        let totalWeight = 0;
        let connectionCount = 0;
        const significantThreshold = 0.1; // Минимальная значимая сила связи

        for (let i = 0; i < agentIndices.length; i++) {
            for (let j = i + 1; j < agentIndices.length; j++) {
                const idx1 = agentIndices[i];
                const idx2 = agentIndices[j];

                if (connectionMatrix[idx1] && connectionMatrix[idx1][idx2] !== undefined) {
                    const weight = connectionMatrix[idx1][idx2];
                    if (weight >= significantThreshold) {
                        totalWeight += weight;
                        connectionCount++;
                    }
                }
            }
        }

        if (connectionCount === 0) return 0;

        // Взвешенная плотность: учитывает и количество связей, и их силу
        const connectionDensity = connectionCount / maxConnections;
        const averageWeight = totalWeight / connectionCount;
        
        // Комбинированная метрика: плотность связей * средняя сила связей
        return connectionDensity * averageWeight;
    }

    /**
     * Расчет силы клана (сумма сил всех членов)
     */
    _calculateClanStrength(clan, connectionMatrix) {
        let totalStrength = 0;

        clan.memberIndices.forEach(agentIndex => {
            const agentStrength = this._calculateAgentStrength(agentIndex, clan.memberIndices, connectionMatrix);
            totalStrength += agentStrength;
        });

        return totalStrength;
    }

    /**
     * Расчет комплексной силы агента с учетом внутренних и внешних связей
     */
    _calculateAgentStrength(agentIndex, clanMemberIndices, connectionMatrix) {
        let internalStrength = 0;
        let externalStrength = 0;
        let totalConnections = 0;

        if (!connectionMatrix[agentIndex]) return 0;

        // Подсчет внутренних связей (внутри клана)
        clanMemberIndices.forEach(otherIndex => {
            if (otherIndex !== agentIndex) {
                const weight = connectionMatrix[agentIndex][otherIndex] || 0;
                if (weight > 0) {
                    internalStrength += weight;
                    totalConnections++;
                }
            }
        });

        // Подсчет внешних связей (вне клана)
        for (let i = 0; i < connectionMatrix[agentIndex].length; i++) {
            if (i !== agentIndex && !clanMemberIndices.includes(i)) {
                const weight = connectionMatrix[agentIndex][i] || 0;
                if (weight > 0) {
                    externalStrength += weight * 0.5; // Внешние связи менее важны для клана
                    totalConnections++;
                }
            }
        }

        // Нормализация по количеству связей для справедливого сравнения
        const normalizedStrength = totalConnections > 0 
            ? (internalStrength + externalStrength) / Math.sqrt(totalConnections)
            : 0;

        return normalizedStrength;
    }

    /**
     * Расчет общих ресурсов клана
     */
    _calculateClanResources(clan) {
        let total = 0;
        clan.members.forEach(agent => {
            if (agent.economics && agent.economics.alive) {
                total += agent.economics.currentResources || 0;
            }
        });
        return total;
    }

    /**
     * Принятие решения кланом о правилах распределения
     * Агенты голосуют на основе своих интересов и положения в клане
     */
    makeClanDecision(clan) {
        const votes = {
            [DISTRIBUTION_RULES.DICTATORSHIP]: 0,
            [DISTRIBUTION_RULES.DEMOCRACY]: 0,
            [DISTRIBUTION_RULES.LAWLESSNESS]: 0
        };

        // Расчет средних ресурсов клана для сравнения
        const averageResources = clan.totalResources / clan.members.length;

        // Каждый член клана голосует на основе своих интересов
        clan.members.forEach((agent, index) => {
            if (!agent.economics || !agent.economics.alive) return;

            const agentIndex = clan.memberIndices[index];
            const agentStrength = this._calculateAgentStrength(agentIndex, clan.memberIndices, []);
            const resourceRatio = agent.economics.currentResources / averageResources;
            const survivalPressure = 10 / Math.max(1, agent.economics.currentResources); // Минимум выживания / текущие ресурсы

            // Вероятности голосования на основе интересов агента
            let dictatorshipWeight = 0;
            let democracyWeight = 0;
            let lawlessnessWeight = 0;

            // Сильные агенты с большими ресурсами предпочитают диктатуру
            if (agentStrength > clan.strength / clan.members.length && resourceRatio > 1.2) {
                dictatorshipWeight = 0.6;
                democracyWeight = 0.3;
                lawlessnessWeight = 0.1;
            }
            // Слабые агенты с малыми ресурсами предпочитают демократию
            else if (agentStrength < clan.strength / clan.members.length && resourceRatio < 0.8) {
                dictatorshipWeight = 0.1;
                democracyWeight = 0.7;
                lawlessnessWeight = 0.2;
            }
            // Агенты под давлением выживания склонны к беспределу
            else if (survivalPressure > 1.5) {
                dictatorshipWeight = 0.2;
                democracyWeight = 0.2;
                lawlessnessWeight = 0.6;
            }
            // Средние агенты предпочитают демократию
            else {
                dictatorshipWeight = 0.2;
                democracyWeight = 0.6;
                lawlessnessWeight = 0.2;
            }

            // Случайный выбор на основе весов
            const random = Math.random();
            if (random < dictatorshipWeight) {
                votes[DISTRIBUTION_RULES.DICTATORSHIP]++;
            } else if (random < dictatorshipWeight + democracyWeight) {
                votes[DISTRIBUTION_RULES.DEMOCRACY]++;
            } else {
                votes[DISTRIBUTION_RULES.LAWLESSNESS]++;
            }
        });

        // Определяем победителя
        let maxVotes = 0;
        let winningRule = DISTRIBUTION_RULES.DEMOCRACY;

        Object.entries(votes).forEach(([rule, count]) => {
            if (count > maxVotes) {
                maxVotes = count;
                winningRule = rule;
            }
        });

        // Если выбрана демократия, выбираем подправило
        let subrule = null;
        if (winningRule === DISTRIBUTION_RULES.DEMOCRACY) {
            const subrules = Object.values(DEMOCRACY_SUBRULES);
            subrule = subrules[Math.floor(Math.random() * subrules.length)];
        }

        clan.decision = {
            rule: winningRule,
            subrule: subrule,
            votes: votes,
            timestamp: Date.now()
        };

        return { rule: winningRule, subrule: subrule };
    }

    /**
     * Распределение ресурсов внутри клана согласно выбранному правилу
     */
    distributeResources(clan, connectionMatrix, agents) {
        if (!clan.decision) {
            this.makeClanDecision(clan);
        }

        const rule = clan.decision.rule;
        const subrule = clan.decision.subrule;

        switch (rule) {
            case DISTRIBUTION_RULES.DICTATORSHIP:
                this._distributeDictatorship(clan, connectionMatrix, agents);
                break;

            case DISTRIBUTION_RULES.DEMOCRACY:
                this._distributeDemocracy(clan, connectionMatrix, agents, subrule);
                break;

            case DISTRIBUTION_RULES.LAWLESSNESS:
                // Беспредел - ресурсы не распределяются внутри клана
                // Вместо этого клан будет атаковать других
                break;
        }

        // Обновление накопленных ресурсов
        clan.members.forEach(agent => {
            if (agent.economics && agent.economics.alive) {
                agent.economics.accumulatedResources += agent.economics.currentResources;
            }
        });
    }

    /**
     * Диктатура - сильнейший забирает большую часть излишков
     */
    _distributeDictatorship(clan, connectionMatrix, agents) {
        // Находим сильнейшего агента
        let strongestAgent = null;
        let maxStrength = 0;

        clan.memberIndices.forEach(agentIndex => {
            const strength = this._calculateAgentStrength(agentIndex, clan.memberIndices, connectionMatrix);
            if (strength > maxStrength) {
                maxStrength = strength;
                strongestAgent = agents[agentIndex];
            }
        });

        if (!strongestAgent || !strongestAgent.economics) return;

        const minSurvival = 10; // Фиксированный минимум выживания
        const taxRate = 0.6; // Диктатор забирает 60% излишков

        // Собираем налог с излишков
        let totalTax = 0;
        clan.members.forEach(agent => {
            if (agent.economics && agent.economics.alive && agent !== strongestAgent) {
                const surplus = Math.max(0, agent.economics.currentResources - minSurvival * 1.5);
                const tax = surplus * taxRate;
                totalTax += tax;
                agent.economics.currentResources -= tax;
            }
        });

        // Диктатор получает собранный налог (с учетом административных расходов)
        const overhead = 0.1; // 10% административных расходов
        strongestAgent.economics.currentResources += totalTax * (1 - overhead);
    }

    /**
     * Демократия - распределение с подправилами
     * @param {string} subrule - Подправило (half, third, quarter, fifth, equal)
     */
    _distributeDemocracy(clan, connectionMatrix, agents, subrule) {
        // Сортируем агентов по силе (от сильного к слабому)
        const sortedAgents = clan.memberIndices
            .map(idx => ({
                index: idx,
                agent: agents[idx],
                strength: this._calculateAgentStrength(idx, clan.memberIndices, connectionMatrix)
            }))
            .filter(a => a.agent.economics && a.agent.economics.alive)
            .sort((a, b) => b.strength - a.strength);

        if (sortedAgents.length === 0) return;

        // Собираем все излишки
        let totalSurplus = 0;
        sortedAgents.forEach(({ agent }) => {
            const surplus = Math.max(0, agent.economics.currentResources - agent.economics.minSurvival);
            totalSurplus += surplus;
            agent.economics.currentResources = agent.economics.minSurvival;
        });

        if (totalSurplus <= 0) return;

        // Распределяем согласно подправилу
        switch (subrule) {
            case DEMOCRACY_SUBRULES.EQUAL:
                // Всем поровну
                this._distributeEqual(sortedAgents, totalSurplus);
                break;

            case DEMOCRACY_SUBRULES.HALF:
                // Первому половина, остальным рекурсивно
                this._distributeProportional(sortedAgents, totalSurplus, 0.5);
                break;

            case DEMOCRACY_SUBRULES.THIRD:
                // Первому треть, остальным рекурсивно
                this._distributeProportional(sortedAgents, totalSurplus, 1/3);
                break;

            case DEMOCRACY_SUBRULES.QUARTER:
                // Первому четверть, остальным рекурсивно
                this._distributeProportional(sortedAgents, totalSurplus, 0.25);
                break;

            case DEMOCRACY_SUBRULES.FIFTH:
                // Первому пятую часть, остальным рекурсивно
                this._distributeProportional(sortedAgents, totalSurplus, 0.2);
                break;

            default:
                // По умолчанию - поровну
                this._distributeEqual(sortedAgents, totalSurplus);
        }
    }

    /**
     * Равное распределение между всеми агентами
     */
    _distributeEqual(sortedAgents, totalSurplus) {
        const share = totalSurplus / sortedAgents.length;
        sortedAgents.forEach(({ agent }) => {
            agent.economics.currentResources += share;
        });
    }

    /**
     * Пропорциональное распределение (первому доля, остальным рекурсивно)
     * @param {number} proportion - Доля для первого (0.5 = половина, 0.33 = треть, и т.д.)
     */
    _distributeProportional(sortedAgents, totalSurplus, proportion) {
        if (sortedAgents.length === 0 || totalSurplus <= 0) return;

        if (sortedAgents.length === 1) {
            // Последнему агенту достается все
            sortedAgents[0].agent.economics.currentResources += totalSurplus;
            return;
        }

        // Первому агенту достается его доля
        const firstShare = totalSurplus * proportion;
        sortedAgents[0].agent.economics.currentResources += firstShare;

        // Остаток распределяется среди остальных
        const remaining = totalSurplus - firstShare;
        const remainingAgents = sortedAgents.slice(1);

        if (remainingAgents.length > 0) {
            // Рекурсивно распределяем остаток с той же пропорцией
            this._distributeProportional(remainingAgents, remaining, proportion);
        }
    }

    /**
     * Получение статистики по кланам
     */
    getClanStats() {
        return this.getClanStatistics();
    }

    /**
     * Получение статистики по кланам
     */
    getClanStatistics() {
        return {
            totalClans: this.clans.length,
            averageSize: this.clans.length > 0 
                ? this.clans.reduce((sum, c) => sum + c.members.length, 0) / this.clans.length 
                : 0,
            averageDensity: this.clans.length > 0
                ? this.clans.reduce((sum, c) => sum + c.density, 0) / this.clans.length
                : 0,
            totalResources: this.clans.reduce((sum, c) => sum + c.totalResources, 0),
            clans: this.clans.map(c => ({
                id: c.id,
                size: c.members.length,
                density: c.density.toFixed(2),
                strength: c.strength.toFixed(1),
                resources: Math.round(c.totalResources),
                rule: c.decision ? c.decision.rule : 'none',
                subrule: c.decision ? c.decision.subrule : null
            }))
        };
    }

    /**
     * Получение истории кланов
     */
    getClanHistory() {
        return this.clanHistory;
    }

    /**
     * Получение информации о конкретном клане
     */
    getClan(clanId) {
        return this.clans.find(c => c.id === clanId);
    }

    /**
     * Очистка системы
     */
    reset() {
        this.clans = [];
        this.clanHistory = [];
    }
}
