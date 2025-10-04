/**
 * EventLogger - Система детального логирования всех событий в симуляции
 * Отслеживает экономические, социальные и конфликтные события
 */

export const EVENT_TYPES = {
    // Экономические события
    AGENT_BIRTH: 'agent_birth',
    AGENT_DEATH: 'agent_death',
    RESOURCE_PRODUCTION: 'resource_production',
    RESOURCE_CONSUMPTION: 'resource_consumption',
    STARVATION_WARNING: 'starvation_warning',
    ECONOMIC_BOOM: 'economic_boom',
    ECONOMIC_CRISIS: 'economic_crisis',
    WEALTH_INEQUALITY: 'wealth_inequality',
    
    // Социальные события
    CONNECTION_FORMED: 'connection_formed',
    CONNECTION_STRENGTHENED: 'connection_strengthened',
    CONNECTION_WEAKENED: 'connection_weakened',
    CONNECTION_BROKEN: 'connection_broken',
    OPINION_SHIFT: 'opinion_shift',
    POLARIZATION_EVENT: 'polarization_event',
    
    // События кланов
    CLAN_FORMED: 'clan_formed',
    CLAN_DISSOLVED: 'clan_dissolved',
    CLAN_MEMBER_JOINED: 'clan_member_joined',
    CLAN_MEMBER_LEFT: 'clan_member_left',
    CLAN_DECISION_MADE: 'clan_decision_made',
    CLAN_LEADERSHIP_CHANGE: 'clan_leadership_change',
    CLAN_RESOURCE_REDISTRIBUTION: 'clan_resource_redistribution',
    
    // События конфликтов
    CONFLICT_INITIATED: 'conflict_initiated',
    CONFLICT_RESOLVED: 'conflict_resolved',
    RESOURCE_THEFT: 'resource_theft',
    ALLIANCE_FORMED: 'alliance_formed',
    ALLIANCE_BROKEN: 'alliance_broken',
    TERRITORY_DISPUTE: 'territory_dispute',
    
    // Системные события
    SIMULATION_STARTED: 'simulation_started',
    SIMULATION_PAUSED: 'simulation_paused',
    SIMULATION_ENDED: 'simulation_ended',
    CYCLE_COMPLETED: 'cycle_completed',
    MILESTONE_REACHED: 'milestone_reached'
};

export const EVENT_SEVERITY = {
    INFO: 'info',
    WARNING: 'warning',
    CRITICAL: 'critical',
    MILESTONE: 'milestone'
};

export class EventLogger {
    constructor() {
        this.events = [];
        this.eventCounts = {};
        this.cycleEvents = new Map(); // События по циклам
        this.agentEvents = new Map(); // События по агентам
        this.clanEvents = new Map(); // События по кланам
        this.statistics = {
            totalEvents: 0,
            eventsByType: {},
            eventsBySeverity: {},
            eventsPerCycle: [],
            criticalEvents: []
        };
    }

    /**
     * Логирование события
     */
    logEvent(type, data = {}, severity = EVENT_SEVERITY.INFO) {
        const event = {
            id: this.events.length,
            type,
            severity,
            timestamp: Date.now(),
            cycle: data.cycle || 0,
            data: { ...data },
            description: this._generateDescription(type, data)
        };

        this.events.push(event);
        this._updateStatistics(event);
        this._categorizeEvent(event);

        // Логирование критических событий в консоль
        if (severity === EVENT_SEVERITY.CRITICAL) {
            console.warn(`🚨 Critical Event: ${event.description}`);
        }

        return event;
    }

    /**
     * Генерация описания события
     */
    _generateDescription(type, data) {
        // Безопасная функция для форматирования чисел
        const safeFixed = (value, decimals = 2) => {
            return (value !== undefined && value !== null) ? Number(value).toFixed(decimals) : '0';
        };

        switch (type) {
            case EVENT_TYPES.AGENT_BIRTH:
                return `Агент ${data.agentId} родился в кластере ${data.cluster}`;
            
            case EVENT_TYPES.AGENT_DEATH:
                return `Агент ${data.agentId} умер от ${data.cause || 'неизвестной причины'} (ресурсы: ${safeFixed(data.resources)})`;
            
            case EVENT_TYPES.RESOURCE_PRODUCTION:
                return `Агент ${data.agentId || 'N/A'} произвел ${safeFixed(data.amount)} ресурсов (множитель: ${safeFixed(data.multiplier, 2) || 1})`;
            
            case EVENT_TYPES.STARVATION_WARNING:
                return `Агент ${data.agentId} голодает ${data.starvationDays || 0} дней (ресурсы: ${safeFixed(data.resources)})`;
            
            case EVENT_TYPES.ECONOMIC_BOOM:
                return `Экономический бум! Средние ресурсы: ${safeFixed(data.averageResources)} (+${safeFixed(data.growthRate, 1)}%)`;
            
            case EVENT_TYPES.ECONOMIC_CRISIS:
                return `Экономический кризис! ${safeFixed(data.deathRate, 1)}% агентов умерло за цикл`;
            
            case EVENT_TYPES.CLAN_FORMED:
                return `Клан ${data.clanId} сформирован (${data.memberCount || 0} членов, плотность: ${safeFixed(data.density)})`;
            
            case EVENT_TYPES.CLAN_DECISION_MADE:
                return `Клан ${data.clanId} выбрал ${data.decision} (голосов: ${data.votes || 0})`;
            
            case EVENT_TYPES.CONFLICT_INITIATED:
                return `Клан ${data.attackerId} атакует клан ${data.victimId} (сила: ${safeFixed(data.attackerStrength, 1)} vs ${safeFixed(data.victimStrength, 1)})`;
            
            case EVENT_TYPES.RESOURCE_THEFT:
                return `Украдено ${safeFixed(data.amount)} ресурсов у клана ${data.victimId}`;
            
            case EVENT_TYPES.CONNECTION_FORMED:
                return `Связь образована между агентами ${data.agent1} и ${data.agent2} (сила: ${safeFixed(data.strength)})`;
            
            case EVENT_TYPES.POLARIZATION_EVENT:
                return `Поляризация: ${data.connectionCount || 0} связей ослаблены на ${safeFixed(data.averageWeakening, 1)}%`;
            
            case EVENT_TYPES.MILESTONE_REACHED:
                return `Достигнута веха: ${data.milestone} (цикл ${data.cycle})`;
            
            default:
                return `Событие ${type}: ${JSON.stringify(data)}`;
        }
    }

    /**
     * Обновление статистики
     */
    _updateStatistics(event) {
        this.statistics.totalEvents++;
        
        // По типам
        if (!this.statistics.eventsByType[event.type]) {
            this.statistics.eventsByType[event.type] = 0;
        }
        this.statistics.eventsByType[event.type]++;
        
        // По серьезности
        if (!this.statistics.eventsBySeverity[event.severity]) {
            this.statistics.eventsBySeverity[event.severity] = 0;
        }
        this.statistics.eventsBySeverity[event.severity]++;
        
        // Критические события
        if (event.severity === EVENT_SEVERITY.CRITICAL) {
            this.statistics.criticalEvents.push(event);
        }
        
        // По циклам
        const cycle = event.cycle;
        if (!this.statistics.eventsPerCycle[cycle]) {
            this.statistics.eventsPerCycle[cycle] = 0;
        }
        this.statistics.eventsPerCycle[cycle]++;
    }

    /**
     * Категоризация событий
     */
    _categorizeEvent(event) {
        const cycle = event.cycle;
        
        // По циклам
        if (!this.cycleEvents.has(cycle)) {
            this.cycleEvents.set(cycle, []);
        }
        this.cycleEvents.get(cycle).push(event);
        
        // По агентам
        if (event.data.agentId !== undefined) {
            const agentId = event.data.agentId;
            if (!this.agentEvents.has(agentId)) {
                this.agentEvents.set(agentId, []);
            }
            this.agentEvents.get(agentId).push(event);
        }
        
        // По кланам
        if (event.data.clanId !== undefined) {
            const clanId = event.data.clanId;
            if (!this.clanEvents.has(clanId)) {
                this.clanEvents.set(clanId, []);
            }
            this.clanEvents.get(clanId).push(event);
        }
    }

    /**
     * Получение событий по фильтрам
     */
    getEvents(filters = {}) {
        let filteredEvents = [...this.events];
        
        if (filters.type) {
            filteredEvents = filteredEvents.filter(e => e.type === filters.type);
        }
        
        if (filters.severity) {
            filteredEvents = filteredEvents.filter(e => e.severity === filters.severity);
        }
        
        if (filters.cycle !== undefined) {
            filteredEvents = filteredEvents.filter(e => e.cycle === filters.cycle);
        }
        
        if (filters.agentId !== undefined) {
            filteredEvents = filteredEvents.filter(e => e.data.agentId === filters.agentId);
        }
        
        if (filters.clanId !== undefined) {
            filteredEvents = filteredEvents.filter(e => e.data.clanId === filters.clanId);
        }
        
        if (filters.limit) {
            filteredEvents = filteredEvents.slice(-filters.limit);
        }
        
        return filteredEvents;
    }

    /**
     * Получение событий по циклу
     */
    getEventsByCycle(cycle) {
        return this.cycleEvents.get(cycle) || [];
    }

    /**
     * Получение событий по агенту
     */
    getEventsByAgent(agentId) {
        return this.agentEvents.get(agentId) || [];
    }

    /**
     * Получение событий по клану
     */
    getEventsByClan(clanId) {
        return this.clanEvents.get(clanId) || [];
    }

    /**
     * Анализ трендов событий
     */
    analyzeTrends() {
        const trends = {
            economicHealth: this._analyzeEconomicTrends(),
            socialStability: this._analyzeSocialTrends(),
            conflictIntensity: this._analyzeConflictTrends(),
            populationDynamics: this._analyzePopulationTrends()
        };
        
        return trends;
    }

    /**
     * Анализ экономических трендов
     */
    _analyzeEconomicTrends() {
        const economicEvents = this.events.filter(e => 
            [EVENT_TYPES.RESOURCE_PRODUCTION, EVENT_TYPES.ECONOMIC_BOOM, 
             EVENT_TYPES.ECONOMIC_CRISIS, EVENT_TYPES.STARVATION_WARNING].includes(e.type)
        );
        
        const recentEvents = economicEvents.slice(-20);
        const crisisEvents = recentEvents.filter(e => e.type === EVENT_TYPES.ECONOMIC_CRISIS);
        const boomEvents = recentEvents.filter(e => e.type === EVENT_TYPES.ECONOMIC_BOOM);
        
        return {
            trend: boomEvents.length > crisisEvents.length ? 'positive' : 'negative',
            stability: Math.max(0, 1 - (crisisEvents.length / Math.max(1, recentEvents.length))),
            recentCrises: crisisEvents.length,
            recentBooms: boomEvents.length
        };
    }

    /**
     * Анализ социальных трендов
     */
    _analyzeSocialTrends() {
        const socialEvents = this.events.filter(e => 
            [EVENT_TYPES.CONNECTION_FORMED, EVENT_TYPES.CONNECTION_BROKEN, 
             EVENT_TYPES.POLARIZATION_EVENT].includes(e.type)
        );
        
        const recentEvents = socialEvents.slice(-30);
        const formedConnections = recentEvents.filter(e => e.type === EVENT_TYPES.CONNECTION_FORMED);
        const brokenConnections = recentEvents.filter(e => e.type === EVENT_TYPES.CONNECTION_BROKEN);
        const polarizationEvents = recentEvents.filter(e => e.type === EVENT_TYPES.POLARIZATION_EVENT);
        
        return {
            cohesion: formedConnections.length / Math.max(1, brokenConnections.length),
            polarization: polarizationEvents.length / Math.max(1, recentEvents.length),
            networkGrowth: formedConnections.length - brokenConnections.length
        };
    }

    /**
     * Анализ конфликтных трендов
     */
    _analyzeConflictTrends() {
        const conflictEvents = this.events.filter(e => 
            [EVENT_TYPES.CONFLICT_INITIATED, EVENT_TYPES.RESOURCE_THEFT].includes(e.type)
        );
        
        const recentConflicts = conflictEvents.slice(-10);
        const totalTheft = recentConflicts
            .filter(e => e.type === EVENT_TYPES.RESOURCE_THEFT)
            .reduce((sum, e) => sum + (e.data.amount || 0), 0);
        
        return {
            frequency: recentConflicts.length,
            intensity: totalTheft / Math.max(1, recentConflicts.length),
            trend: recentConflicts.length > 5 ? 'escalating' : 'stable'
        };
    }

    /**
     * Анализ динамики популяции
     */
    _analyzePopulationTrends() {
        const birthEvents = this.events.filter(e => e.type === EVENT_TYPES.AGENT_BIRTH);
        const deathEvents = this.events.filter(e => e.type === EVENT_TYPES.AGENT_DEATH);
        
        const recentBirths = birthEvents.slice(-20);
        const recentDeaths = deathEvents.slice(-20);
        
        return {
            birthRate: recentBirths.length,
            deathRate: recentDeaths.length,
            netGrowth: recentBirths.length - recentDeaths.length,
            mortalityCauses: this._analyzeMortalityCauses(recentDeaths)
        };
    }

    /**
     * Анализ причин смертности
     */
    _analyzeMortalityCauses(deathEvents) {
        const causes = {};
        deathEvents.forEach(event => {
            const cause = event.data.cause || 'unknown';
            causes[cause] = (causes[cause] || 0) + 1;
        });
        return causes;
    }

    /**
     * Получение сводной статистики
     */
    getStatistics() {
        return {
            ...this.statistics,
            trends: this.analyzeTrends(),
            recentEvents: this.events.slice(-10),
            eventTimeline: this._generateTimeline()
        };
    }

    /**
     * Генерация временной шкалы событий
     */
    _generateTimeline() {
        const timeline = [];
        const cycleGroups = {};
        
        this.events.forEach(event => {
            const cycle = event.cycle;
            if (!cycleGroups[cycle]) {
                cycleGroups[cycle] = [];
            }
            cycleGroups[cycle].push(event);
        });
        
        Object.keys(cycleGroups).sort((a, b) => parseInt(a) - parseInt(b)).forEach(cycle => {
            timeline.push({
                cycle: parseInt(cycle),
                events: cycleGroups[cycle],
                summary: this._generateCycleSummary(cycleGroups[cycle])
            });
        });
        
        return timeline;
    }

    /**
     * Генерация сводки по циклу
     */
    _generateCycleSummary(events) {
        const summary = {
            total: events.length,
            critical: events.filter(e => e.severity === EVENT_SEVERITY.CRITICAL).length,
            economic: events.filter(e => e.type.includes('resource') || e.type.includes('economic')).length,
            social: events.filter(e => e.type.includes('connection') || e.type.includes('clan')).length,
            conflicts: events.filter(e => e.type.includes('conflict')).length
        };
        
        return summary;
    }

    /**
     * Экспорт событий в различных форматах
     */
    exportEvents(format = 'json', filters = {}) {
        const events = this.getEvents(filters);
        
        switch (format) {
            case 'json':
                return JSON.stringify(events, null, 2);
            
            case 'csv':
                return this._exportToCSV(events);
            
            case 'timeline':
                return this._exportToTimeline(events);
            
            default:
                return events;
        }
    }

    /**
     * Экспорт в CSV
     */
    _exportToCSV(events) {
        const headers = ['ID', 'Type', 'Severity', 'Cycle', 'Timestamp', 'Description'];
        const rows = events.map(event => [
            event.id,
            event.type,
            event.severity,
            event.cycle,
            new Date(event.timestamp).toISOString(),
            event.description
        ]);
        
        return [headers, ...rows].map(row => row.join(',')).join('\n');
    }

    /**
     * Экспорт в формат временной шкалы
     */
    _exportToTimeline(events) {
        return events.map(event => ({
            time: new Date(event.timestamp).toISOString(),
            cycle: event.cycle,
            event: event.description,
            severity: event.severity,
            category: this._categorizeEventType(event.type)
        }));
    }

    /**
     * Категоризация типа события
     */
    _categorizeEventType(type) {
        if (type.includes('resource') || type.includes('economic')) return 'Economic';
        if (type.includes('connection') || type.includes('opinion')) return 'Social';
        if (type.includes('clan')) return 'Clan';
        if (type.includes('conflict')) return 'Conflict';
        return 'System';
    }

    /**
     * Начало нового цикла симуляции
     */
    startCycle(cycle) {
        this.logEvent(
            EVENT_TYPES.CYCLE_COMPLETED,
            { cycle },
            EVENT_SEVERITY.INFO
        );
    }

    /**
     * Логирование экономической статистики цикла
     */
    logCycleEconomics(data) {
        const { 
            cycle = 0, 
            survived = 0, 
            died = 0, 
            averageResources = 0, 
            totalProduction = 0 
        } = data || {};
        
        // Логируем общую экономическую статистику
        this.logEvent(
            EVENT_TYPES.RESOURCE_PRODUCTION,
            {
                cycle,
                survived,
                died,
                averageResources,
                totalProduction
            },
            EVENT_SEVERITY.INFO
        );

        // Проверяем критические ситуации
        const totalAgents = survived + died;
        if (totalAgents > 0 && died > survived * 0.1) {
            this.logEvent(
                EVENT_TYPES.ECONOMIC_CRISIS,
                {
                    cycle,
                    deathRate: (died / totalAgents) * 100,
                    died,
                    survived
                },
                EVENT_SEVERITY.CRITICAL
            );
        }

        if (averageResources > 100) {
            this.logEvent(
                EVENT_TYPES.ECONOMIC_BOOM,
                {
                    cycle,
                    averageResources,
                    growthRate: ((averageResources - 50) / 50) * 100
                },
                EVENT_SEVERITY.MILESTONE
            );
        }
    }

    /**
     * Очистка логов
     */
    clear() {
        this.events = [];
        this.eventCounts = {};
        this.cycleEvents.clear();
        this.agentEvents.clear();
        this.clanEvents.clear();
        this.statistics = {
            totalEvents: 0,
            eventsByType: {},
            eventsBySeverity: {},
            eventsPerCycle: [],
            criticalEvents: []
        };
    }
}

export default EventLogger;
