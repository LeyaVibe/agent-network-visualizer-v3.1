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
    constructor(params = {}, eventLogger = null) {
        this.minClanSize = params.minClanSize || 3;
        this.densityThreshold = params.densityThreshold || 0.2; // Снижено с 0.5 до 0.2 (20% связей)
        this.clans = [];
        this.clanHistory = [];
        this.eventLogger = eventLogger;
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
                
                // Логирование создания клана (если есть eventLogger)
                if (this.eventLogger && this.eventLogger.logEvent) {
                    this.eventLogger.logEvent('clan_formed', {
                        clanId: clan.id,
                        memberCount: clan.members.length,
                        density: clan.density,
                        strength: clan.strength,
                        resources: clan.totalResources
                    });
                }
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
        let internalConnections = 0;
        let externalConnections = 0;

        if (!connectionMatrix[agentIndex]) return 0;

        // Подсчет внутренних связей (внутри клана)
        clanMemberIndices.forEach(otherIndex => {
            if (otherIndex !== agentIndex) {
                const weight = connectionMatrix[agentIndex][otherIndex] || 0;
                if (weight > 0) {
                    internalStrength += weight;
                    internalConnections++;
                }
            }
        });

        // Подсчет внешних связей (вне клана)
        for (let i = 0; i < connectionMatrix[agentIndex].length; i++) {
            if (i !== agentIndex && !clanMemberIndices.includes(i)) {
                const weight = connectionMatrix[agentIndex][i] || 0;
                if (weight > 0) {
                    externalStrength += weight * 0.5; // Внешние связи менее важны для клана
                    externalConnections++;
                }
            }
        }

        // Улучшенная нормализация: взвешенная средняя сила связей
        // Внутренние связи важнее (вес 2), внешние менее важны (вес 1)
        const avgInternalStrength = internalConnections > 0 ? internalStrength / internalConnections : 0;
        const avgExternalStrength = externalConnections > 0 ? externalStrength / externalConnections : 0;
        
        const totalWeight = (internalConnections * 2) + externalConnections;
        const normalizedStrength = totalWeight > 0
            ? ((avgInternalStrength * internalConnections * 2) + (avgExternalStrength * externalConnections)) / totalWeight
            : 0;

        // Бонус за количество связей (но с убывающей отдачей)
        const connectionBonus = Math.sqrt(internalConnections + externalConnections * 0.5);
        
        return normalizedStrength * (1 + connectionBonus * 0.1);
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
     * Межклановое распределение излишков ресурсов
     * Кланы делятся излишками между собой пропорционально силе
     */
    distributeResourcesBetweenClans(agents, economicEngine = null) {
        if (this.clans.length === 0) return;

        // Получаем параметры из экономического движка
        const minSurvival = economicEngine ? economicEngine.minSurvival : 10;
        const bufferMultiplier = 2.5; // Увеличен буфер для более стабильного распределения

        // Сортируем кланы по силе
        const sortedClans = [...this.clans].sort((a, b) => b.strength - a.strength);

        // Собираем излишки со всех агентов
        let totalSurplus = 0;
        const surplusMap = new Map(); // Отслеживаем, сколько взяли у каждого агента
        
        agents.forEach(agent => {
            if (agent.economics && agent.economics.alive) {
                const bufferZone = minSurvival * bufferMultiplier;
                const surplus = Math.max(0, agent.economics.currentResources - bufferZone);
                
                if (surplus > 0) {
                    totalSurplus += surplus;
                    surplusMap.set(agent.id, surplus);
                    agent.economics.currentResources -= surplus;
                }
            }
        });

        if (totalSurplus <= 0) return;

        // Логирование только если есть eventLogger
        if (this.eventLogger && this.eventLogger.logEvent) {
            this.eventLogger.logEvent('inter_clan_distribution', {
                totalSurplus: totalSurplus,
                clansCount: sortedClans.length,
                bufferZone: minSurvival * bufferMultiplier
            });
        }

        // Распределяем между кланами пропорционально их силе
        const totalStrength = sortedClans.reduce((sum, clan) => sum + clan.strength, 0);
        
        if (totalStrength === 0) return; // Защита от деления на ноль
        
        let distributedToClans = 0;

        sortedClans.forEach(clan => {
            const clanShare = (clan.strength / totalStrength) * totalSurplus * 0.8; // 80% кланам
            distributedToClans += clanShare;

            // Распределяем долю клана между его живыми членами
            const aliveMembers = clan.members.filter(m => m.economics && m.economics.alive);
            if (aliveMembers.length === 0) return;
            
            const memberShare = clanShare / aliveMembers.length;
            aliveMembers.forEach(agent => {
                agent.economics.currentResources += memberShare;
            });
        });

        // Оставшиеся 20% распределяем между свободными агентами
        const freeAgentsSurplus = totalSurplus - distributedToClans;
        const freeAgents = this.getFreeAgents(agents);

        if (freeAgents.length > 0 && freeAgentsSurplus > 0) {
            const freeAgentShare = freeAgentsSurplus / freeAgents.length;
            freeAgents.forEach(agent => {
                if (agent.economics && agent.economics.alive) {
                    agent.economics.currentResources += freeAgentShare;
                }
            });
        }
    }

    /**
     * Получение списка свободных агентов (не входящих в кланы)
     */
    getFreeAgents(agents) {
        const clanMemberIds = new Set();
        
        this.clans.forEach(clan => {
            clan.members.forEach(member => {
                clanMemberIds.add(member.id);
            });
        });

        return agents.filter(agent => 
            agent.economics && 
            agent.economics.alive && 
            !clanMemberIds.has(agent.id)
        );
    }

    /**
     * Получение статистики по свободным агентам
     */
    getFreeAgentsStats(agents) {
        const freeAgents = this.getFreeAgents(agents);
        
        if (freeAgents.length === 0) {
            return {
                count: 0,
                totalResources: 0,
                averageResources: 0,
                minResources: 0,
                maxResources: 0
            };
        }

        let totalResources = 0;
        let minResources = Infinity;
        let maxResources = -Infinity;

        freeAgents.forEach(agent => {
            const resources = agent.economics.currentResources || 0;
            totalResources += resources;
            minResources = Math.min(minResources, resources);
            maxResources = Math.max(maxResources, resources);
        });

        return {
            count: freeAgents.length,
            totalResources: totalResources,
            averageResources: totalResources / freeAgents.length,
            minResources: minResources === Infinity ? 0 : minResources,
            maxResources: maxResources === -Infinity ? 0 : maxResources,
            agents: freeAgents.map(agent => ({
                id: agent.id,
                resources: agent.economics.currentResources || 0,
                accumulated: agent.economics.accumulatedResources || 0
            }))
        };
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
        if (this.clans.length === 0) {
            return {
                totalClans: 0,
                totalMembers: 0,
                aliveMembers: 0,
                deadMembers: 0,
                survivalRate: 0,
                averageSize: 0,
                averageDensity: 0,
                averageStrength: 0,
                totalResources: 0,
                averageResources: 0,
                clans: []
            };
        }

        // Подсчет живых и мертвых агентов
        const aliveAgents = this.clans.reduce((sum, c) => {
            return sum + c.members.filter(m => m.economics && m.economics.alive).length;
        }, 0);
        
        const totalMembers = this.clans.reduce((sum, c) => sum + c.members.length, 0);
        const deadAgents = totalMembers - aliveAgents;
        const totalResources = this.clans.reduce((sum, c) => sum + (c.totalResources || 0), 0);
        const totalStrength = this.clans.reduce((sum, c) => sum + (c.strength || 0), 0);
        const totalDensity = this.clans.reduce((sum, c) => sum + (c.density || 0), 0);
        
        return {
            totalClans: this.clans.length,
            totalMembers: totalMembers,
            aliveMembers: aliveAgents,
            deadMembers: deadAgents,
            survivalRate: totalMembers > 0 ? parseFloat((aliveAgents / totalMembers * 100).toFixed(1)) : 0,
            averageSize: parseFloat((totalMembers / this.clans.length).toFixed(1)),
            averageDensity: parseFloat((totalDensity / this.clans.length).toFixed(2)),
            averageStrength: parseFloat((totalStrength / this.clans.length).toFixed(1)),
            totalResources: Math.round(totalResources),
            averageResources: aliveAgents > 0 ? parseFloat((totalResources / aliveAgents).toFixed(1)) : 0,
            clans: this.clans.map(c => {
                const aliveMembers = c.members.filter(m => m.economics && m.economics.alive).length;
                const deadMembers = c.members.length - aliveMembers;
                const survivalRate = c.members.length > 0 ? (aliveMembers / c.members.length * 100) : 0;
                
                // Пересчитываем ресурсы клана для актуальности
                const currentResources = c.members
                    .filter(m => m.economics && m.economics.alive)
                    .reduce((sum, m) => sum + (m.economics.currentResources || 0), 0);
                
                return {
                    id: c.id,
                    size: c.members.length,
                    aliveMembers: aliveMembers,
                    deadMembers: deadMembers,
                    survivalRate: parseFloat(survivalRate.toFixed(1)),
                    density: parseFloat((c.density || 0).toFixed(2)),
                    strength: parseFloat((c.strength || 0).toFixed(1)),
                    resources: Math.round(currentResources),
                    averageResourcesPerMember: aliveMembers > 0 ? parseFloat((currentResources / aliveMembers).toFixed(1)) : 0,
                    rule: c.decision ? c.decision.rule : 'none',
                    subrule: c.decision ? c.decision.subrule : null,
                    efficiency: parseFloat(this._calculateClanEfficiency(c).toFixed(2)),
                    productivity: parseFloat(this._calculateClanProductivity(c).toFixed(1)),
                    consumption: parseFloat(this._calculateClanConsumption(c).toFixed(1))
                };
            })
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

    /**
     * Расчет эффективности клана
     */
    _calculateClanEfficiency(clan) {
        if (!clan.members || clan.members.length === 0) return 0;
        
        const aliveMembers = clan.members.filter(m => m.economics && m.economics.alive);
        if (aliveMembers.length === 0) return 0;
        
        // Эффективность = средняя производительность * плотность связей
        const avgProductivity = aliveMembers.reduce((sum, m) => {
            return sum + (m.economics.productivity || 1);
        }, 0) / aliveMembers.length;
        
        return avgProductivity * clan.density;
    }

    /**
     * Расчет продуктивности клана
     */
    _calculateClanProductivity(clan) {
        if (!clan.members || clan.members.length === 0) return 0;
        
        const aliveMembers = clan.members.filter(m => m.economics && m.economics.alive);
        if (aliveMembers.length === 0) return 0;
        
        // Продуктивность = общие ресурсы / количество живых членов
        return clan.totalResources / aliveMembers.length;
    }

    /**
     * Расчет потребления клана
     */
    _calculateClanConsumption(clan) {
        if (!clan.members || clan.members.length === 0) return 0;
        
        const aliveMembers = clan.members.filter(m => m.economics && m.economics.alive);
        if (aliveMembers.length === 0) return 0;
        
        // Потребление = количество живых членов * базовое потребление
        return aliveMembers.length * 10; // Предполагаем базовое потребление 10 единиц на агента
    }
}
