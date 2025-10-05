/**
 * EnhancedEconomicEngine - Расширенная экономическая система с детальной статистикой и событиями
 * Включает торговлю, инвестиции, экономические циклы и детальную аналитику
 */

import { EconomicEngine } from './economicEngine.js';
import { EVENT_TYPES, EVENT_SEVERITY } from './eventLogger.js';

export class EnhancedEconomicEngine extends EconomicEngine {
    constructor(params = {}, eventLogger = null) {
        super(params);
        
        this.eventLogger = eventLogger;
        
        // Расширенные параметры
        this.tradeEnabled = params.tradeEnabled || true;
        this.investmentEnabled = params.investmentEnabled || true;
        this.inflationRate = params.inflationRate || 0.02;
        this.taxRate = params.taxRate || 0.1;
        this.wealthTaxThreshold = params.wealthTaxThreshold || 100;
        
        // Экономические циклы
        this.economicCycle = {
            phase: 'growth', // growth, peak, recession, trough
            duration: 0,
            intensity: 1.0
        };
        
        // Рыночные данные
        this.market = {
            resourcePrice: 1.0,
            priceHistory: [1.0],
            totalTrades: 0,
            tradeVolume: 0
        };
        
        // Статистика
        this.statistics = {
            totalCycles: 0,
            economicEvents: [],
            wealthDistribution: [],
            productivityTrends: [],
            mortalityRates: [],
            tradeMetrics: {
                totalTrades: 0,
                averageTradeSize: 0,
                marketEfficiency: 0
            },
            investmentMetrics: {
                totalInvestments: 0,
                averageReturn: 0,
                riskLevel: 0
            }
        };
    }

    /**
     * Инициализация расширенных экономических данных
     */
    initializeAgentEconomics(agents) {
        super.initializeAgentEconomics(agents);
        
        agents.forEach((agent, index) => {
            agent.economics = {
                ...agent.economics,
                // Расширенные данные
                wealth: 50, // Общее богатство (ресурсы + инвестиции)
                investments: 0, // Инвестированные средства
                debt: 0, // Долги
                creditRating: 0.5, // Кредитный рейтинг (0-1)
                
                // Торговля
                tradeHistory: [],
                tradingSkill: Math.random() * 0.5 + 0.5, // 0.5-1.0
                riskTolerance: Math.random(), // 0-1
                
                // Производственные данные
                productivity: 1.0,
                efficiency: 1.0,
                innovation: Math.random() * 0.3, // 0-0.3
                
                // Социальные факторы
                reputation: 0.5,
                trustLevel: 0.5,
                cooperativeness: Math.random(),
                
                // История и тренды
                wealthHistory: [50],
                productivityHistory: [1.0],
                efficiencyHistory: [1.0],
                
                // Жизненные события
                lifeEvents: [],
                economicShocks: 0,
                recoveryRate: 0.1
            };
            
            this._logEvent(EVENT_TYPES.AGENT_BIRTH, {
                agentId: index,
                cluster: agent.cluster || 0,
                initialWealth: agent.economics.wealth,
                tradingSkill: agent.economics.tradingSkill.toFixed(2)
            });
        });
    }

    /**
     * Расширенный расчет производства с учетом множества факторов
     */
    calculateProduction(agent, connectionMatrix, agentIndex, agents, cycle = 0) {
        if (!agent.economics || !agent.economics.alive) {
            return 0;
        }

        // Базовое производство из родительского класса
        const baseProduction = super.calculateProduction(agent, connectionMatrix, agentIndex, agents);
        
        // Модификаторы производства
        const productivityMod = agent.economics.productivity;
        const efficiencyMod = agent.economics.efficiency;
        const innovationMod = 1 + agent.economics.innovation;
        const cycleMod = this.economicCycle.intensity;
        
        // Социальные модификаторы
        const reputationMod = 0.8 + (agent.economics.reputation * 0.4);
        const cooperationMod = 0.9 + (agent.economics.cooperativeness * 0.2);
        
        // Стрессовые факторы
        const debtStress = Math.max(0.5, 1 - (agent.economics.debt / agent.economics.wealth));
        const shockRecovery = Math.max(0.7, 1 - (agent.economics.economicShocks * 0.1));
        
        // Итоговое производство
        const totalProduction = baseProduction * 
            productivityMod * 
            efficiencyMod * 
            innovationMod * 
            cycleMod * 
            reputationMod * 
            cooperationMod * 
            debtStress * 
            shockRecovery;

        // Обновление статистики агента
        agent.economics.productivityHistory.push(totalProduction);
        
        // Логирование производства для всех агентов (с ограничением для статистики)
        if (Math.random() < 0.1 || totalProduction > baseProduction * 1.5) { // Логируем 10% случайных + значительные изменения
            this._logEvent(EVENT_TYPES.RESOURCE_PRODUCTION, {
                agentId: agentIndex,
                cycle,
                amount: totalProduction,
                multiplier: totalProduction / baseProduction,
                factors: {
                    productivity: productivityMod,
                    efficiency: efficiencyMod,
                    innovation: innovationMod,
                    reputation: reputationMod
                }
            });
        }

        return totalProduction;
    }

    /**
     * Обработка торговли между агентами
     */
    processTrade(agents, connectionMatrix, cycle) {
        if (!this.tradeEnabled) return { trades: 0, volume: 0 };

        let totalTrades = 0;
        let totalVolume = 0;
        const tradeOpportunities = [];

        // Поиск торговых возможностей
        for (let i = 0; i < agents.length; i++) {
            if (!agents[i].economics?.alive) continue;

            for (let j = i + 1; j < agents.length; j++) {
                if (!agents[j].economics?.alive) continue;
                
                // Проверка связи между агентами
                const connectionStrength = connectionMatrix?.[i]?.[j] || 0;
                if (connectionStrength < 0.2) continue;

                // Расчет торговой выгоды
                const agent1 = agents[i];
                const agent2 = agents[j];
                
                const tradeBenefit = this._calculateTradeBenefit(agent1, agent2, connectionStrength);
                
                if (tradeBenefit > 0.1) {
                    tradeOpportunities.push({
                        agent1: i,
                        agent2: j,
                        benefit: tradeBenefit,
                        connection: connectionStrength
                    });
                }
            }
        }

        // Выполнение торговых сделок
        tradeOpportunities
            .sort((a, b) => b.benefit - a.benefit)
            .slice(0, Math.min(10, tradeOpportunities.length))
            .forEach(opportunity => {
                const trade = this._executeTrade(
                    agents[opportunity.agent1], 
                    agents[opportunity.agent2], 
                    opportunity.agent1,
                    opportunity.agent2,
                    cycle
                );
                
                if (trade.success) {
                    totalTrades++;
                    totalVolume += trade.volume;
                }
            });

        // Обновление рыночной статистики
        this.market.totalTrades += totalTrades;
        this.market.tradeVolume += totalVolume;
        
        if (totalTrades > 0) {
            this.statistics.tradeMetrics.totalTrades += totalTrades;
            this.statistics.tradeMetrics.averageTradeSize = 
                this.market.tradeVolume / this.market.totalTrades;
        }

        return { trades: totalTrades, volume: totalVolume };
    }

    /**
     * Расчет торговой выгоды между двумя агентами
     */
    _calculateTradeBenefit(agent1, agent2, connectionStrength) {
        const wealth1 = agent1.economics.wealth;
        const wealth2 = agent2.economics.wealth;
        const resources1 = agent1.economics.currentResources;
        const resources2 = agent2.economics.currentResources;
        
        // Выгода от различий в ресурсах и богатстве
        const resourceDiff = Math.abs(resources1 - resources2) / Math.max(resources1, resources2, 1);
        const wealthDiff = Math.abs(wealth1 - wealth2) / Math.max(wealth1, wealth2, 1);
        
        // Торговые навыки
        const skill1 = agent1.economics.tradingSkill;
        const skill2 = agent2.economics.tradingSkill;
        const avgSkill = (skill1 + skill2) / 2;
        
        // Доверие
        const trust1 = agent1.economics.trustLevel;
        const trust2 = agent2.economics.trustLevel;
        const avgTrust = (trust1 + trust2) / 2;
        
        return (resourceDiff + wealthDiff) * avgSkill * avgTrust * connectionStrength;
    }

    /**
     * Выполнение торговой сделки
     */
    _executeTrade(agent1, agent2, agent1Id, agent2Id, cycle) {
        const maxTradeSize = Math.min(
            agent1.economics.currentResources * 0.2,
            agent2.economics.currentResources * 0.2,
            10
        );
        
        if (maxTradeSize < 1) {
            return { success: false, volume: 0 };
        }

        const tradeSize = Math.random() * maxTradeSize;
        const price = this.market.resourcePrice * (0.9 + Math.random() * 0.2);
        
        // Определение направления торговли
        const agent1Sells = agent1.economics.currentResources > agent2.economics.currentResources;
        
        if (agent1Sells) {
            agent1.economics.currentResources -= tradeSize;
            agent1.economics.wealth += tradeSize * price;
            agent2.economics.currentResources += tradeSize;
            agent2.economics.wealth -= tradeSize * price;
        } else {
            agent2.economics.currentResources -= tradeSize;
            agent2.economics.wealth += tradeSize * price;
            agent1.economics.currentResources += tradeSize;
            agent1.economics.wealth -= tradeSize * price;
        }

        // Обновление торговой истории
        const tradeRecord = {
            cycle,
            partner: agent1Sells ? agent2Id : agent1Id,
            size: tradeSize,
            price,
            profit: tradeSize * (price - this.market.resourcePrice)
        };
        
        agent1.economics.tradeHistory.push({ ...tradeRecord, sold: agent1Sells });
        agent2.economics.tradeHistory.push({ ...tradeRecord, sold: !agent1Sells });

        // Улучшение торговых навыков
        agent1.economics.tradingSkill = Math.min(1.0, agent1.economics.tradingSkill + 0.01);
        agent2.economics.tradingSkill = Math.min(1.0, agent2.economics.tradingSkill + 0.01);

        this._logEvent(EVENT_TYPES.RESOURCE_PRODUCTION, {
            type: 'trade',
            cycle,
            agent1: agent1Id,
            agent2: agent2Id,
            volume: tradeSize,
            price: price.toFixed(2)
        });

        return { success: true, volume: tradeSize * price };
    }

    /**
     * Обработка инвестиций
     */
    processInvestments(agents, cycle) {
        if (!this.investmentEnabled) return { investments: 0, returns: 0 };

        let totalInvestments = 0;
        let totalReturns = 0;

        agents.forEach((agent, index) => {
            if (!agent.economics?.alive) return;

            // Решение об инвестировании
            const investmentDecision = this._makeInvestmentDecision(agent, cycle);
            
            if (investmentDecision.shouldInvest && investmentDecision.amount > 0) {
                const investment = this._executeInvestment(agent, investmentDecision.amount, cycle);
                totalInvestments += investment.amount;
                
                this._logEvent(EVENT_TYPES.RESOURCE_PRODUCTION, {
                    type: 'investment',
                    agentId: index,
                    cycle,
                    amount: investment.amount,
                    expectedReturn: investment.expectedReturn
                });
            }

            // Обработка существующих инвестиций
            const returns = this._processExistingInvestments(agent, cycle);
            totalReturns += returns;
        });

        this.statistics.investmentMetrics.totalInvestments += totalInvestments;
        
        return { investments: totalInvestments, returns: totalReturns };
    }

    /**
     * Принятие решения об инвестировании
     */
    _makeInvestmentDecision(agent, cycle) {
        const availableWealth = agent.economics.wealth - agent.economics.debt;
        const riskTolerance = agent.economics.riskTolerance;
        const currentPhase = this.economicCycle.phase;
        
        // Не инвестируем если мало средств
        if (availableWealth < 20) {
            return { shouldInvest: false, amount: 0 };
        }

        // Фактор экономического цикла
        const cycleFactors = {
            growth: 1.2,
            peak: 0.8,
            recession: 0.3,
            trough: 1.5
        };
        
        const cycleFactor = cycleFactors[currentPhase] || 1.0;
        const investmentProbability = riskTolerance * cycleFactor * 0.3;
        
        if (Math.random() < investmentProbability) {
            const maxInvestment = availableWealth * riskTolerance * 0.5;
            const amount = Math.random() * maxInvestment;
            
            return { shouldInvest: true, amount };
        }

        return { shouldInvest: false, amount: 0 };
    }

    /**
     * Выполнение инвестиции
     */
    _executeInvestment(agent, amount, cycle) {
        agent.economics.wealth -= amount;
        agent.economics.investments += amount;
        
        // Расчет ожидаемой доходности
        const baseReturn = 0.05 + (Math.random() - 0.5) * 0.1; // 0% - 10%
        const riskAdjustment = agent.economics.riskTolerance * 0.05;
        const expectedReturn = baseReturn + riskAdjustment;
        
        return { amount, expectedReturn };
    }

    /**
     * Обработка существующих инвестиций
     */
    _processExistingInvestments(agent, cycle) {
        if (agent.economics.investments <= 0) return 0;

        // Простая модель доходности инвестиций
        const marketPerformance = 0.95 + Math.random() * 0.1; // 95% - 105%
        const cycleFactor = this.economicCycle.intensity;
        const returns = agent.economics.investments * 0.02 * marketPerformance * cycleFactor;
        
        agent.economics.wealth += returns;
        
        return returns;
    }

    /**
     * Обновление экономического цикла
     */
    updateEconomicCycle(agents, cycle) {
        this.economicCycle.duration++;
        
        // Анализ экономических показателей
        const aliveAgents = agents.filter(a => a.economics?.alive);
        const avgWealth = aliveAgents.length > 0 
            ? aliveAgents.reduce((sum, a) => sum + a.economics.wealth, 0) / aliveAgents.length 
            : 0;
        
        const wealthGrowth = this.statistics.wealthDistribution.length > 0
            ? (avgWealth - this.statistics.wealthDistribution[this.statistics.wealthDistribution.length - 1]) / avgWealth
            : 0;

        // Определение фазы цикла
        const phaseDurations = { growth: 15, peak: 5, recession: 10, trough: 8 };
        const currentPhaseDuration = phaseDurations[this.economicCycle.phase];

        if (this.economicCycle.duration >= currentPhaseDuration) {
            this._transitionEconomicPhase(wealthGrowth, cycle);
        }

        // Обновление интенсивности
        this._updateCycleIntensity(wealthGrowth);
        
        // Сохранение статистики
        this.statistics.wealthDistribution.push(avgWealth);
    }

    /**
     * Переход к следующей фазе экономического цикла
     */
    _transitionEconomicPhase(wealthGrowth, cycle) {
        const phases = ['growth', 'peak', 'recession', 'trough'];
        const currentIndex = phases.indexOf(this.economicCycle.phase);
        const nextPhase = phases[(currentIndex + 1) % phases.length];
        
        this.economicCycle.phase = nextPhase;
        this.economicCycle.duration = 0;
        
        // Логирование смены фазы
        const severity = nextPhase === 'recession' ? EVENT_SEVERITY.WARNING : EVENT_SEVERITY.INFO;
        this._logEvent(EVENT_TYPES.ECONOMIC_BOOM, {
            cycle,
            phase: nextPhase,
            previousPhase: phases[currentIndex],
            wealthGrowth: (wealthGrowth * 100).toFixed(1)
        }, severity);
    }

    /**
     * Обновление интенсивности экономического цикла
     */
    _updateCycleIntensity(wealthGrowth) {
        const phaseIntensities = {
            growth: 1.1,
            peak: 1.2,
            recession: 0.8,
            trough: 0.7
        };
        
        const baseIntensity = phaseIntensities[this.economicCycle.phase];
        const growthAdjustment = Math.max(-0.2, Math.min(0.2, wealthGrowth));
        
        this.economicCycle.intensity = baseIntensity + growthAdjustment;
    }

    /**
     * Расширенный экономический цикл
     */
    executeEconomicCycle(agents, connectionMatrix, cycle = 0) {
        // Базовый цикл
        const baseResults = super.executeEconomicCycle(agents, connectionMatrix);
        
        // Расширенные процессы
        const tradeResults = this.processTrade(agents, connectionMatrix, cycle);
        const investmentResults = this.processInvestments(agents, cycle);
        
        // Обновление экономического цикла
        this.updateEconomicCycle(agents, cycle);
        
        // Обработка налогов и инфляции
        this.processEconomicPolicies(agents, cycle);
        
        // Анализ экономических событий
        this.analyzeEconomicEvents(agents, cycle);
        
        // Обновление статистики
        this.updateStatistics(agents, cycle);
        
        return {
            ...baseResults,
            trades: tradeResults.trades,
            tradeVolume: tradeResults.volume,
            investments: investmentResults.investments,
            investmentReturns: investmentResults.returns,
            economicPhase: this.economicCycle.phase,
            cycleIntensity: this.economicCycle.intensity,
            marketPrice: this.market.resourcePrice
        };
    }

    /**
     * Обработка экономической политики (налоги, инфляция)
     */
    processEconomicPolicies(agents, cycle) {
        agents.forEach((agent, index) => {
            if (!agent.economics?.alive) return;

            // Инфляция
            if (this.inflationRate > 0) {
                agent.economics.wealth *= (1 - this.inflationRate);
            }

            // Налог на богатство
            if (agent.economics.wealth > this.wealthTaxThreshold) {
                const tax = (agent.economics.wealth - this.wealthTaxThreshold) * this.taxRate;
                agent.economics.wealth -= tax;
                
                if (tax > 5) {
                    this._logEvent(EVENT_TYPES.RESOURCE_CONSUMPTION, {
                        type: 'wealth_tax',
                        agentId: index,
                        cycle,
                        amount: tax
                    });
                }
            }
        });

        // Обновление рыночной цены
        this._updateMarketPrice(agents);
    }

    /**
     * Обновление рыночной цены ресурсов
     */
    _updateMarketPrice(agents) {
        const aliveAgents = agents.filter(a => a.economics?.alive);
        if (aliveAgents.length === 0) return;

        const totalSupply = aliveAgents.reduce((sum, a) => sum + a.economics.currentResources, 0);
        const totalDemand = aliveAgents.length * this.minSurvival;
        
        const supplyDemandRatio = totalSupply / Math.max(1, totalDemand);
        const priceChange = (1 / supplyDemandRatio - 1) * 0.1;
        
        this.market.resourcePrice = Math.max(0.1, this.market.resourcePrice * (1 + priceChange));
        this.market.priceHistory.push(this.market.resourcePrice);
        
        // Ограничиваем историю цен
        if (this.market.priceHistory.length > 100) {
            this.market.priceHistory.shift();
        }
    }

    /**
     * Анализ экономических событий
     */
    analyzeEconomicEvents(agents, cycle) {
        const aliveAgents = agents.filter(a => a.economics?.alive);
        const deadAgents = agents.filter(a => a.economics && !a.economics.alive);
        
        // Анализ смертности
        const mortalityRate = deadAgents.length / agents.length;
        this.statistics.mortalityRates.push(mortalityRate);
        
        if (mortalityRate > 0.1) {
            this._logEvent(EVENT_TYPES.ECONOMIC_CRISIS, {
                cycle,
                mortalityRate: (mortalityRate * 100).toFixed(1),
                aliveCount: aliveAgents.length,
                deadCount: deadAgents.length
            }, EVENT_SEVERITY.CRITICAL);
        }
        
        // Анализ неравенства богатства
        if (aliveAgents.length > 0) {
            const wealths = aliveAgents.map(a => a.economics.wealth).sort((a, b) => a - b);
            const giniCoefficient = this._calculateGiniCoefficient(wealths);
            
            if (giniCoefficient > 0.7) {
                this._logEvent(EVENT_TYPES.WEALTH_INEQUALITY, {
                    cycle,
                    giniCoefficient: giniCoefficient.toFixed(3),
                    richestWealth: wealths[wealths.length - 1].toFixed(2),
                    poorestWealth: wealths[0].toFixed(2)
                }, EVENT_SEVERITY.WARNING);
            }
        }
    }

    /**
     * Расчет коэффициента Джини для неравенства богатства
     */
    _calculateGiniCoefficient(sortedWealths) {
        const n = sortedWealths.length;
        if (n === 0) return 0;
        
        let sum = 0;
        for (let i = 0; i < n; i++) {
            sum += (2 * (i + 1) - n - 1) * sortedWealths[i];
        }
        
        const totalWealth = sortedWealths.reduce((a, b) => a + b, 0);
        return sum / (n * totalWealth);
    }

    /**
     * Обновление статистики
     */
    updateStatistics(agents, cycle) {
        this.statistics.totalCycles = cycle;
        
        const aliveAgents = agents.filter(a => a.economics?.alive);
        
        // Тренды продуктивности
        if (aliveAgents.length > 0) {
            const avgProductivity = aliveAgents.reduce(
                (sum, a) => sum + a.economics.productivity, 0
            ) / aliveAgents.length;
            
            this.statistics.productivityTrends.push(avgProductivity);
        }
        
        // Рыночная эффективность
        if (this.market.totalTrades > 0) {
            this.statistics.tradeMetrics.marketEfficiency = 
                this.market.tradeVolume / this.market.totalTrades;
        }
    }

    /**
     * Получение расширенной статистики
     */
    getEnhancedEconomicStats(agents) {
        const baseStats = super.getEconomicStats(agents);
        const aliveAgents = agents.filter(a => a.economics?.alive);
        
        if (aliveAgents.length === 0) {
            return {
                ...baseStats,
                enhanced: {
                    totalWealth: 0,
                    averageWealth: 0,
                    wealthDistribution: { gini: 0, top10Percent: 0, bottom10Percent: 0 },
                    marketMetrics: this.market,
                    economicCycle: this.economicCycle,
                    tradeMetrics: this.statistics.tradeMetrics,
                    investmentMetrics: this.statistics.investmentMetrics
                }
            };
        }

        const wealths = aliveAgents.map(a => a.economics.wealth).sort((a, b) => b - a);
        const totalWealth = wealths.reduce((a, b) => a + b, 0);
        
        const top10Index = Math.floor(wealths.length * 0.1);
        const bottom10Index = Math.floor(wealths.length * 0.9);
        
        return {
            ...baseStats,
            enhanced: {
                totalWealth,
                averageWealth: totalWealth / aliveAgents.length,
                wealthDistribution: {
                    gini: this._calculateGiniCoefficient([...wealths].sort((a, b) => a - b)),
                    top10Percent: wealths.slice(0, top10Index).reduce((a, b) => a + b, 0) / totalWealth,
                    bottom10Percent: wealths.slice(bottom10Index).reduce((a, b) => a + b, 0) / totalWealth,
                    median: wealths[Math.floor(wealths.length / 2)],
                    range: { min: wealths[wealths.length - 1], max: wealths[0] }
                },
                marketMetrics: {
                    ...this.market,
                    priceVolatility: this._calculatePriceVolatility(),
                    tradingActivity: this.market.totalTrades / Math.max(1, this.statistics.totalCycles)
                },
                economicCycle: this.economicCycle,
                tradeMetrics: this.statistics.tradeMetrics,
                investmentMetrics: this.statistics.investmentMetrics,
                trends: {
                    wealthGrowth: this._calculateWealthGrowthTrend(),
                    productivityTrend: this._calculateProductivityTrend(),
                    mortalityTrend: this._calculateMortalityTrend()
                }
            }
        };
    }

    /**
     * Расчет волатильности цен
     */
    _calculatePriceVolatility() {
        if (this.market.priceHistory.length < 2) return 0;
        
        const prices = this.market.priceHistory.slice(-20); // Последние 20 периодов
        const returns = [];
        
        for (let i = 1; i < prices.length; i++) {
            returns.push((prices[i] - prices[i-1]) / prices[i-1]);
        }
        
        const avgReturn = returns.reduce((a, b) => a + b, 0) / returns.length;
        const variance = returns.reduce((sum, r) => sum + Math.pow(r - avgReturn, 2), 0) / returns.length;
        
        return Math.sqrt(variance);
    }

    /**
     * Расчет тренда роста богатства
     */
    _calculateWealthGrowthTrend() {
        if (this.statistics.wealthDistribution.length < 2) return 0;
        
        const recent = this.statistics.wealthDistribution.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        return (last - first) / Math.max(1, first);
    }

    /**
     * Расчет тренда продуктивности
     */
    _calculateProductivityTrend() {
        if (this.statistics.productivityTrends.length < 2) return 0;
        
        const recent = this.statistics.productivityTrends.slice(-10);
        const first = recent[0];
        const last = recent[recent.length - 1];
        
        return (last - first) / Math.max(1, first);
    }

    /**
     * Расчет тренда смертности
     */
    _calculateMortalityTrend() {
        if (this.statistics.mortalityRates.length < 2) return 0;
        
        const recent = this.statistics.mortalityRates.slice(-10);
        return recent.reduce((a, b) => a + b, 0) / recent.length;
    }

    /**
     * Логирование событий
     */
    _logEvent(type, data, severity = EVENT_SEVERITY.INFO) {
        if (this.eventLogger) {
            this.eventLogger.logEvent(type, data, severity);
        }
    }

    /**
     * Экспорт расширенной статистики
     */
    exportEnhancedStats(format = 'json') {
        const stats = {
            economicCycle: this.economicCycle,
            market: this.market,
            statistics: this.statistics,
            timestamp: new Date().toISOString()
        };
        
        switch (format) {
            case 'json':
                return JSON.stringify(stats, null, 2);
            case 'csv':
                return this._exportStatsToCSV(stats);
            default:
                return stats;
        }
    }

    /**
     * Экспорт статистики в CSV
     */
    _exportStatsToCSV(stats) {
        const lines = [];
        lines.push('Metric,Value');
        lines.push(`Economic Phase,${stats.economicCycle.phase}`);
        lines.push(`Cycle Intensity,${stats.economicCycle.intensity}`);
        lines.push(`Market Price,${stats.market.resourcePrice}`);
        lines.push(`Total Trades,${stats.market.totalTrades}`);
        lines.push(`Trade Volume,${stats.market.tradeVolume}`);
        lines.push(`Total Cycles,${stats.statistics.totalCycles}`);
        
        return lines.join('\n');
    }
}

export default EnhancedEconomicEngine;
