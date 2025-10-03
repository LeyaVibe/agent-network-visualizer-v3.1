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
     * Расчет плотности связей внутри группы агентов
     * Плотность = количество существующих связей / максимально возможное количество связей
     */
    _calculateDensity(agentIndices, connectionMatrix) {
        const n = agentIndices.length;
        if (n < 2) return 0;

        const maxConnections = (n * (n - 1)) / 2; // Максимально возможное количество связей
        let actualConnections = 0;

        for (let i = 0; i < agentIndices.length; i++) {
            for (let j = i + 1; j < agentIndices.length; j++) {
                const idx1 = agentIndices[i];
                const idx2 = agentIndices[j];

                if (connectionMatrix[idx1] && connectionMatrix[idx1][idx2] !== undefined && connectionMatrix[idx1][idx2] > 0) {
                    actualConnections++;
                }
            }
        }

        return actualConnections / maxConnections;
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
     * Расчет силы отдельного агента внутри клана
     */
    _calculateAgentStrength(agentIndex, clanMemberIndices, connectionMatrix) {
        let strength = 0;

        clanMemberIndices.forEach(otherIndex => {
            if (otherIndex !== agentIndex) {
                if (connectionMatrix[agentIndex] && connectionMatrix[agentIndex][otherIndex] !== undefined) {
                    strength += connectionMatrix[agentIndex][otherIndex];
                }
            }
        });

        return strength;
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
     * Каждый агент голосует случайно, побеждает большинство
     */
    makeClanDecision(clan) {
        const votes = {
            [DISTRIBUTION_RULES.DICTATORSHIP]: 0,
            [DISTRIBUTION_RULES.DEMOCRACY]: 0,
            [DISTRIBUTION_RULES.LAWLESSNESS]: 0
        };

        // Каждый член клана голосует
        clan.members.forEach(() => {
            const rules = Object.values(DISTRIBUTION_RULES);
            const randomRule = rules[Math.floor(Math.random() * rules.length)];
            votes[randomRule]++;
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
     * Диктатура - сильнейший забирает все
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

        // Собираем все излишки
        let totalSurplus = 0;
        clan.members.forEach(agent => {
            if (agent.economics && agent.economics.alive && agent !== strongestAgent) {
                const surplus = Math.max(0, agent.economics.currentResources - agent.economics.minSurvival);
                totalSurplus += surplus;
                agent.economics.currentResources = agent.economics.minSurvival;
            }
        });

        // Отдаем все сильнейшему
        strongestAgent.economics.currentResources += totalSurplus;
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
