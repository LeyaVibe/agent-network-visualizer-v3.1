/**
 * EnhancedClanSystem - Расширенная система кланов с детальной аналитикой и событиями
 * Включает политические системы, дипломатию, внутреннюю динамику и детальную статистику
 */

import { ClanSystem } from './clanSystem.js';
import { EVENT_TYPES, EVENT_SEVERITY } from './eventLogger.js';

export const POLITICAL_SYSTEMS = {
    DEMOCRACY: 'democracy',
    DICTATORSHIP: 'dictatorship',
    OLIGARCHY: 'oligarchy',
    ANARCHY: 'anarchy',
    TECHNOCRACY: 'technocracy'
};

export const DIPLOMATIC_RELATIONS = {
    ALLIED: 'allied',
    FRIENDLY: 'friendly',
    NEUTRAL: 'neutral',
    HOSTILE: 'hostile',
    WAR: 'war'
};

export const CLAN_EVENTS = {
    FORMATION: 'formation',
    DISSOLUTION: 'dissolution',
    MERGER: 'merger',
    SPLIT: 'split',
    LEADERSHIP_CHANGE: 'leadership_change',
    POLICY_CHANGE: 'policy_change',
    DIPLOMATIC_CHANGE: 'diplomatic_change',
    INTERNAL_CONFLICT: 'internal_conflict',
    RESOURCE_CRISIS: 'resource_crisis',
    EXPANSION: 'expansion'
};

export class EnhancedClanSystem extends ClanSystem {
    constructor(params = {}, eventLogger = null) {
        super(params);
        
        this.eventLogger = eventLogger;
        
        // Расширенные параметры
        this.enableDiplomacy = params.enableDiplomacy !== false;
        this.enableInternalPolitics = params.enableInternalPolitics !== false;
        this.enableClanEvolution = params.enableClanEvolution !== false;
        
        // Дипломатические отношения между кланами
        this.diplomaticRelations = new Map();
        
        // История кланов
        this.clanHistory = new Map();
        
        // Статистика системы кланов
        this.systemStats = {
            totalClansFormed: 0,
            totalClansDissolved: 0,
            totalMergers: 0,
            totalSplits: 0,
            totalWars: 0,
            totalAlliances: 0,
            averageClanLifespan: 0,
            politicalSystemDistribution: {},
            diplomaticEventHistory: []
        };
    }

    /**
     * Расширенное формирование кланов с политическими системами
     */
    formClans(agents, connectionMatrix, cycle = 0) {
        const baseClans = super.formClans(agents, connectionMatrix);
        
        // Инициализация расширенных данных для новых кланов
        baseClans.forEach((clan, clanId) => {
            if (!this.clanHistory.has(clanId)) {
                this._initializeEnhancedClan(clan, clanId, cycle);
            }
        });
        
        // Обновление существующих кланов
        this._updateExistingClans(baseClans, agents, cycle);
        
        // Обработка дипломатии
        if (this.enableDiplomacy) {
            this._processDiplomacy(baseClans, cycle);
        }
        
        // Обработка внутренней политики
        if (this.enableInternalPolitics) {
            this._processInternalPolitics(baseClans, agents, cycle);
        }
        
        // Эволюция кланов
        if (this.enableClanEvolution) {
            this._processClanEvolution(baseClans, agents, cycle);
        }
        
        return baseClans;
    }

    /**
     * Инициализация расширенных данных клана
     */
    _initializeEnhancedClan(clan, clanId, cycle) {
        const enhancedData = {
            // Основные данные
            id: clanId,
            formationCycle: cycle,
            age: 0,
            
            // Политическая система
            politicalSystem: this._determinePoliticalSystem(clan.members),
            leadership: this._selectLeadership(clan.members),
            
            // Внутренняя динамика
            cohesion: 0.7, // Сплоченность клана (0-1)
            stability: 0.8, // Политическая стабильность (0-1)
            satisfaction: 0.6, // Удовлетворенность членов (0-1)
            
            // Ресурсы и экономика
            treasury: 0, // Общая казна
            taxRate: 0.1, // Налоговая ставка
            publicGoods: 0, // Общественные блага
            
            // Военные характеристики
            militaryStrength: 0,
            defensiveBonus: 0,
            aggressiveness: Math.random() * 0.5,
            
            // Дипломатия
            diplomaticStatus: new Map(),
            alliances: new Set(),
            enemies: new Set(),
            
            // История и события
            majorEvents: [],
            leadershipHistory: [],
            politicalHistory: [],
            
            // Культура и идеология
            ideology: this._generateIdeology(),
            culturalValues: this._generateCulturalValues(),
            
            // Статистика
            membershipHistory: [clan.members.length],
            resourceHistory: [0],
            conflictHistory: [],
            
            // Специализация
            specialization: this._determineSpecialization(clan.members),
            expertise: new Map()
        };
        
        this.clanHistory.set(clanId, enhancedData);
        this.systemStats.totalClansFormed++;
        
        this._logEvent(EVENT_TYPES.CLAN_FORMED, {
            clanId,
            cycle,
            memberCount: clan.members.length,
            politicalSystem: enhancedData.politicalSystem,
            ideology: enhancedData.ideology,
            specialization: enhancedData.specialization
        });
    }

    /**
     * Определение политической системы клана
     */
    _determinePoliticalSystem(members) {
        if (members.length < 3) return POLITICAL_SYSTEMS.ANARCHY;
        
        // Анализ характеристик членов для определения подходящей системы
        const avgWealth = members.reduce((sum, m) => sum + (m.economics?.wealth || 0), 0) / members.length;
        const wealthVariance = this._calculateVariance(members.map(m => m.economics?.wealth || 0));
        const avgCooperation = members.reduce((sum, m) => sum + (m.economics?.cooperativeness || 0.5), 0) / members.length;
        
        // Логика выбора политической системы
        if (wealthVariance < 10 && avgCooperation > 0.7) {
            return POLITICAL_SYSTEMS.DEMOCRACY;
        } else if (avgWealth > 100 && wealthVariance > 50) {
            return POLITICAL_SYSTEMS.OLIGARCHY;
        } else if (avgCooperation < 0.3) {
            return POLITICAL_SYSTEMS.ANARCHY;
        } else if (members.some(m => m.economics?.innovation > 0.2)) {
            return POLITICAL_SYSTEMS.TECHNOCRACY;
        } else {
            return POLITICAL_SYSTEMS.DICTATORSHIP;
        }
    }

    /**
     * Выбор руководства клана
     */
    _selectLeadership(members) {
        if (members.length === 0) return null;
        
        // Сортировка по различным критериям в зависимости от политической системы
        const sortedMembers = [...members].sort((a, b) => {
            const scoreA = this._calculateLeadershipScore(a);
            const scoreB = this._calculateLeadershipScore(b);
            return scoreB - scoreA;
        });
        
        return {
            leader: sortedMembers[0],
            council: sortedMembers.slice(0, Math.min(3, Math.floor(members.length / 3))),
            succession: sortedMembers.slice(1, 4)
        };
    }

    /**
     * Расчет лидерского потенциала
     */
    _calculateLeadershipScore(member) {
        const wealth = member.economics?.wealth || 0;
        const reputation = member.economics?.reputation || 0.5;
        const cooperation = member.economics?.cooperativeness || 0.5;
        const innovation = member.economics?.innovation || 0;
        
        return wealth * 0.3 + reputation * 0.4 + cooperation * 0.2 + innovation * 0.1;
    }

    /**
     * Генерация идеологии клана
     */
    _generateIdeology() {
        const ideologies = [
            'collectivist', 'individualist', 'progressive', 'conservative',
            'militaristic', 'pacifist', 'technocratic', 'traditionalist',
            'egalitarian', 'hierarchical', 'expansionist', 'isolationist'
        ];
        
        return ideologies[Math.floor(Math.random() * ideologies.length)];
    }

    /**
     * Генерация культурных ценностей
     */
    _generateCulturalValues() {
        return {
            cooperation: Math.random(),
            competition: Math.random(),
            innovation: Math.random(),
            tradition: Math.random(),
            equality: Math.random(),
            hierarchy: Math.random(),
            security: Math.random(),
            freedom: Math.random()
        };
    }

    /**
     * Определение специализации клана
     */
    _determineSpecialization(members) {
        const specializations = ['military', 'economic', 'diplomatic', 'technological', 'cultural'];
        
        // Анализ характеристик членов
        const avgInnovation = members.reduce((sum, m) => sum + (m.economics?.innovation || 0), 0) / members.length;
        const avgWealth = members.reduce((sum, m) => sum + (m.economics?.wealth || 0), 0) / members.length;
        const avgCooperation = members.reduce((sum, m) => sum + (m.economics?.cooperativeness || 0.5), 0) / members.length;
        
        if (avgInnovation > 0.2) return 'technological';
        if (avgWealth > 80) return 'economic';
        if (avgCooperation > 0.8) return 'diplomatic';
        if (avgCooperation < 0.3) return 'military';
        
        return 'cultural';
    }

    /**
     * Обновление существующих кланов
     */
    _updateExistingClans(clans, agents, cycle) {
        clans.forEach((clan, clanId) => {
            const history = this.clanHistory.get(clanId);
            if (!history) return;
            
            // Обновление возраста
            history.age = cycle - history.formationCycle;
            
            // Обновление статистики членства
            history.membershipHistory.push(clan.members.length);
            
            // Обновление сплоченности
            this._updateClanCohesion(clan, history, agents);
            
            // Обновление военной силы
            this._updateMilitaryStrength(clan, history);
            
            // Обновление казны
            this._updateClanTreasury(clan, history);
            
            // Проверка стабильности
            this._checkClanStability(clan, history, cycle);
        });
    }

    /**
     * Обновление сплоченности клана
     */
    _updateClanCohesion(clan, history, agents) {
        const members = clan.members;
        if (members.length < 2) {
            history.cohesion = 1.0;
            return;
        }
        
        // Расчет внутренних связей
        let totalInternalConnections = 0;
        let connectionCount = 0;
        
        for (let i = 0; i < members.length; i++) {
            for (let j = i + 1; j < members.length; j++) {
                const member1Index = agents.findIndex(a => a === members[i]);
                const member2Index = agents.findIndex(a => a === members[j]);
                
                if (member1Index !== -1 && member2Index !== -1) {
                    // Здесь нужна матрица связей, но пока используем приблизительный расчет
                    const connection = Math.random() * 0.8; // Заглушка
                    totalInternalConnections += connection;
                    connectionCount++;
                }
            }
        }
        
        const avgInternalConnection = connectionCount > 0 ? totalInternalConnections / connectionCount : 0;
        
        // Факторы, влияющие на сплоченность
        const leadershipFactor = history.stability;
        const sizeFactor = Math.max(0.5, 1 - (members.length - 5) * 0.05); // Большие кланы менее сплочены
        const ageFactor = Math.min(1.0, history.age * 0.02); // Старые кланы более сплочены
        
        history.cohesion = Math.max(0.1, Math.min(1.0, 
            avgInternalConnection * 0.4 + 
            leadershipFactor * 0.3 + 
            sizeFactor * 0.2 + 
            ageFactor * 0.1
        ));
    }

    /**
     * Обновление военной силы клана
     */
    _updateMilitaryStrength(clan, history) {
        const baseStrength = clan.members.length;
        const cohesionBonus = history.cohesion * 0.5;
        const wealthBonus = Math.min(0.3, history.treasury / 1000);
        const specializationBonus = history.specialization === 'military' ? 0.3 : 0;
        
        history.militaryStrength = baseStrength * (1 + cohesionBonus + wealthBonus + specializationBonus);
        history.defensiveBonus = history.cohesion * 0.2 + (history.politicalSystem === POLITICAL_SYSTEMS.DEMOCRACY ? 0.1 : 0);
    }

    /**
     * Обновление казны клана
     */
    _updateClanTreasury(clan, history) {
        // Сбор налогов
        const totalWealth = clan.members.reduce((sum, member) => sum + (member.economics?.wealth || 0), 0);
        const taxIncome = totalWealth * history.taxRate;
        
        history.treasury += taxIncome;
        
        // Расходы на общественные блага
        const publicGoodsExpense = clan.members.length * 2;
        history.treasury = Math.max(0, history.treasury - publicGoodsExpense);
        history.publicGoods += publicGoodsExpense;
        
        history.resourceHistory.push(history.treasury);
    }

    /**
     * Проверка стабильности клана
     */
    _checkClanStability(clan, history, cycle) {
        // Факторы нестабильности
        const lowCohesion = history.cohesion < 0.3 ? 0.2 : 0;
        const resourceScarcity = history.treasury < clan.members.length * 5 ? 0.15 : 0;
        const largeSizePenalty = clan.members.length > 15 ? 0.1 : 0;
        const agePenalty = history.age > 30 ? 0.05 : 0;
        
        const instabilityFactor = lowCohesion + resourceScarcity + largeSizePenalty + agePenalty;
        
        history.stability = Math.max(0.1, Math.min(1.0, history.stability - instabilityFactor + 0.02));
        
        // Критическая нестабильность
        if (history.stability < 0.2 && Math.random() < 0.1) {
            this._triggerClanCrisis(clan, history, cycle);
        }
    }

    /**
     * Обработка кризиса в клане
     */
    _triggerClanCrisis(clan, history, cycle) {
        const crisisTypes = ['leadership_crisis', 'resource_crisis', 'internal_conflict', 'succession_crisis'];
        const crisisType = crisisTypes[Math.floor(Math.random() * crisisTypes.length)];
        
        history.majorEvents.push({
            type: crisisType,
            cycle,
            severity: 'high',
            description: this._generateCrisisDescription(crisisType)
        });
        
        // Последствия кризиса
        switch (crisisType) {
            case 'leadership_crisis':
                this._handleLeadershipCrisis(clan, history, cycle);
                break;
            case 'resource_crisis':
                this._handleResourceCrisis(clan, history, cycle);
                break;
            case 'internal_conflict':
                this._handleInternalConflict(clan, history, cycle);
                break;
            case 'succession_crisis':
                this._handleSuccessionCrisis(clan, history, cycle);
                break;
        }
        
        this._logEvent(EVENT_TYPES.CLAN_DECISION_MADE, {
            clanId: history.id,
            cycle,
            event: crisisType,
            stability: history.stability.toFixed(2),
            cohesion: history.cohesion.toFixed(2)
        }, EVENT_SEVERITY.WARNING);
    }

    /**
     * Генерация описания кризиса
     */
    _generateCrisisDescription(crisisType) {
        const descriptions = {
            leadership_crisis: 'Лидерство клана подвергается сомнению, возникают фракции',
            resource_crisis: 'Клан сталкивается с серьезной нехваткой ресурсов',
            internal_conflict: 'Внутренние разногласия приводят к открытому конфликту',
            succession_crisis: 'Споры о наследовании власти дестабилизируют клан'
        };
        
        return descriptions[crisisType] || 'Неизвестный кризис';
    }

    /**
     * Обработка кризиса лидерства
     */
    _handleLeadershipCrisis(clan, history, cycle) {
        // Смена лидера
        const newLeadership = this._selectLeadership(clan.members);
        history.leadershipHistory.push({
            cycle,
            oldLeader: history.leadership?.leader,
            newLeader: newLeadership.leader,
            reason: 'crisis'
        });
        
        history.leadership = newLeadership;
        history.stability *= 0.7;
        history.cohesion *= 0.8;
    }

    /**
     * Обработка ресурсного кризиса
     */
    _handleResourceCrisis(clan, history, cycle) {
        // Увеличение налогов или сокращение расходов
        if (Math.random() < 0.5) {
            history.taxRate = Math.min(0.3, history.taxRate * 1.5);
        } else {
            history.publicGoods *= 0.5;
        }
        
        history.satisfaction *= 0.6;
        history.cohesion *= 0.9;
    }

    /**
     * Обработка внутреннего конфликта
     */
    _handleInternalConflict(clan, history, cycle) {
        // Потеря членов или раскол
        const lossRate = 0.1 + Math.random() * 0.2;
        const membersLost = Math.floor(clan.members.length * lossRate);
        
        // Удаление членов (в реальной реализации нужно обновить clan.members)
        history.cohesion *= 0.5;
        history.stability *= 0.6;
        history.militaryStrength *= 0.8;
    }

    /**
     * Обработка кризиса наследования
     */
    _handleSuccessionCrisis(clan, history, cycle) {
        // Изменение политической системы
        const newSystem = this._determinePoliticalSystem(clan.members);
        if (newSystem !== history.politicalSystem) {
            history.politicalHistory.push({
                cycle,
                oldSystem: history.politicalSystem,
                newSystem,
                reason: 'succession_crisis'
            });
            
            history.politicalSystem = newSystem;
        }
        
        history.stability *= 0.8;
    }

    /**
     * Обработка дипломатии между кланами
     */
    _processDiplomacy(clans, cycle) {
        const clanIds = Array.from(clans.keys());
        
        for (let i = 0; i < clanIds.length; i++) {
            for (let j = i + 1; j < clanIds.length; j++) {
                const clan1Id = clanIds[i];
                const clan2Id = clanIds[j];
                
                this._updateDiplomaticRelations(clan1Id, clan2Id, clans, cycle);
            }
        }
    }

    /**
     * Обновление дипломатических отношений
     */
    _updateDiplomaticRelations(clan1Id, clan2Id, clans, cycle) {
        const clan1 = clans.get(clan1Id);
        const clan2 = clans.get(clan2Id);
        const history1 = this.clanHistory.get(clan1Id);
        const history2 = this.clanHistory.get(clan2Id);
        
        if (!clan1 || !clan2 || !history1 || !history2) return;
        
        const relationKey = `${Math.min(clan1Id, clan2Id)}-${Math.max(clan1Id, clan2Id)}`;
        let currentRelation = this.diplomaticRelations.get(relationKey) || DIPLOMATIC_RELATIONS.NEUTRAL;
        
        // Факторы, влияющие на отношения
        const ideologyCompatibility = this._calculateIdeologyCompatibility(history1.ideology, history2.ideology);
        const resourceCompetition = this._calculateResourceCompetition(clan1, clan2);
        const powerBalance = this._calculatePowerBalance(history1, history2);
        const geographicProximity = Math.random(); // Заглушка для географической близости
        
        // Расчет изменения отношений
        const relationChange = (
            ideologyCompatibility * 0.3 +
            (1 - resourceCompetition) * 0.3 +
            (1 - Math.abs(powerBalance)) * 0.2 +
            geographicProximity * 0.2
        ) - 0.5; // Центрирование вокруг 0
        
        // Обновление отношений
        const newRelation = this._adjustDiplomaticRelation(currentRelation, relationChange);
        
        if (newRelation !== currentRelation) {
            this.diplomaticRelations.set(relationKey, newRelation);
            
            this._logEvent(EVENT_TYPES.CLAN_DECISION_MADE, {
                type: 'diplomatic_change',
                clan1: clan1Id,
                clan2: clan2Id,
                cycle,
                oldRelation: currentRelation,
                newRelation: newRelation,
                factors: {
                    ideology: ideologyCompatibility.toFixed(2),
                    resources: resourceCompetition.toFixed(2),
                    power: powerBalance.toFixed(2)
                }
            });
            
            // Обновление союзов и врагов
            this._updateAlliancesAndEnemies(clan1Id, clan2Id, newRelation, history1, history2);
        }
    }

    /**
     * Расчет совместимости идеологий
     */
    _calculateIdeologyCompatibility(ideology1, ideology2) {
        const compatibilityMatrix = {
            'collectivist': { 'individualist': 0.2, 'collectivist': 1.0, 'progressive': 0.7 },
            'individualist': { 'collectivist': 0.2, 'individualist': 1.0, 'conservative': 0.6 },
            'progressive': { 'conservative': 0.3, 'progressive': 1.0, 'technocratic': 0.8 },
            'conservative': { 'progressive': 0.3, 'conservative': 1.0, 'traditionalist': 0.9 },
            'militaristic': { 'pacifist': 0.1, 'militaristic': 1.0, 'expansionist': 0.8 },
            'pacifist': { 'militaristic': 0.1, 'pacifist': 1.0, 'isolationist': 0.7 }
        };
        
        return compatibilityMatrix[ideology1]?.[ideology2] || 0.5;
    }

    /**
     * Расчет конкуренции за ресурсы
     */
    _calculateResourceCompetition(clan1, clan2) {
        const wealth1 = clan1.members.reduce((sum, m) => sum + (m.economics?.wealth || 0), 0);
        const wealth2 = clan2.members.reduce((sum, m) => sum + (m.economics?.wealth || 0), 0);
        
        const totalWealth = wealth1 + wealth2;
        if (totalWealth === 0) return 0;
        
        // Высокая конкуренция если кланы примерно равны по богатству
        const wealthRatio = Math.min(wealth1, wealth2) / Math.max(wealth1, wealth2);
        return wealthRatio; // 0 = один клан намного богаче, 1 = равные по богатству
    }

    /**
     * Расчет баланса сил
     */
    _calculatePowerBalance(history1, history2) {
        const power1 = history1.militaryStrength + history1.treasury * 0.01;
        const power2 = history2.militaryStrength + history2.treasury * 0.01;
        
        const totalPower = power1 + power2;
        if (totalPower === 0) return 0;
        
        return Math.abs(power1 - power2) / totalPower; // 0 = равные силы, 1 = один намного сильнее
    }

    /**
     * Корректировка дипломатических отношений
     */
    _adjustDiplomaticRelation(currentRelation, change) {
        const relations = [
            DIPLOMATIC_RELATIONS.WAR,
            DIPLOMATIC_RELATIONS.HOSTILE,
            DIPLOMATIC_RELATIONS.NEUTRAL,
            DIPLOMATIC_RELATIONS.FRIENDLY,
            DIPLOMATIC_RELATIONS.ALLIED
        ];
        
        const currentIndex = relations.indexOf(currentRelation);
        const changeSteps = Math.round(change * 2); // -1, 0, или +1 обычно
        
        const newIndex = Math.max(0, Math.min(relations.length - 1, currentIndex + changeSteps));
        return relations[newIndex];
    }

    /**
     * Обновление союзов и врагов
     */
    _updateAlliancesAndEnemies(clan1Id, clan2Id, relation, history1, history2) {
        // Очистка старых отношений
        history1.alliances.delete(clan2Id);
        history1.enemies.delete(clan2Id);
        history2.alliances.delete(clan1Id);
        history2.enemies.delete(clan1Id);
        
        // Установка новых отношений
        if (relation === DIPLOMATIC_RELATIONS.ALLIED) {
            history1.alliances.add(clan2Id);
            history2.alliances.add(clan1Id);
            this.systemStats.totalAlliances++;
        } else if (relation === DIPLOMATIC_RELATIONS.WAR || relation === DIPLOMATIC_RELATIONS.HOSTILE) {
            history1.enemies.add(clan2Id);
            history2.enemies.add(clan1Id);
            if (relation === DIPLOMATIC_RELATIONS.WAR) {
                this.systemStats.totalWars++;
            }
        }
    }

    /**
     * Обработка внутренней политики кланов
     */
    _processInternalPolitics(clans, agents, cycle) {
        clans.forEach((clan, clanId) => {
            const history = this.clanHistory.get(clanId);
            if (!history) return;
            
            // Выборы или смена власти
            if (this._shouldHoldElections(history, cycle)) {
                this._conductElections(clan, history, cycle);
            }
            
            // Политические реформы
            if (this._shouldConsiderReforms(history, cycle)) {
                this._considerPoliticalReforms(clan, history, cycle);
            }
            
            // Обновление удовлетворенности
            this._updateMemberSatisfaction(clan, history);
        });
    }

    /**
     * Проверка необходимости выборов
     */
    _shouldHoldElections(history, cycle) {
        if (history.politicalSystem !== POLITICAL_SYSTEMS.DEMOCRACY) return false;
        
        const lastElection = history.leadershipHistory[history.leadershipHistory.length - 1];
        const electionInterval = 10; // Выборы каждые 10 циклов
        
        return !lastElection || (cycle - lastElection.cycle) >= electionInterval;
    }

    /**
     * Проведение выборов
     */
    _conductElections(clan, history, cycle) {
        const candidates = clan.members.slice(0, Math.min(5, clan.members.length));
        const winner = candidates.reduce((best, candidate) => {
            const score = this._calculateElectionScore(candidate, history);
            return score > this._calculateElectionScore(best, history) ? candidate : best;
        });
        
        if (winner !== history.leadership.leader) {
            history.leadershipHistory.push({
                cycle,
                oldLeader: history.leadership.leader,
                newLeader: winner,
                reason: 'election'
            });
            
            history.leadership.leader = winner;
            history.stability = Math.min(1.0, history.stability + 0.1); // Выборы повышают стабильность
            
            this._logEvent(EVENT_TYPES.CLAN_LEADERSHIP_CHANGE, {
                clanId: history.id,
                cycle,
                newLeader: winner,
                method: 'election'
            });
        }
    }

    /**
     * Расчет электорального рейтинга
     */
    _calculateElectionScore(candidate, history) {
        const wealth = candidate.economics?.wealth || 0;
        const reputation = candidate.economics?.reputation || 0.5;
        const cooperation = candidate.economics?.cooperativeness || 0.5;
        
        // Учет предпочтений избирателей
        const wealthWeight = history.culturalValues.equality > 0.5 ? 0.2 : 0.4;
        const reputationWeight = 0.4;
        const cooperationWeight = 0.4 - wealthWeight;
        
        return wealth * wealthWeight + reputation * reputationWeight + cooperation * cooperationWeight;
    }

    /**
     * Проверка необходимости реформ
     */
    _shouldConsiderReforms(history, cycle) {
        return history.satisfaction < 0.4 || history.stability < 0.3 || Math.random() < 0.05;
    }

    /**
     * Рассмотрение политических реформ
     */
    _considerPoliticalReforms(clan, history, cycle) {
        const possibleReforms = this._generatePossibleReforms(history);
        
        if (possibleReforms.length === 0) return;
        
        const chosenReform = possibleReforms[Math.floor(Math.random() * possibleReforms.length)];
        
        if (this._voteOnReform(clan, history, chosenReform)) {
            this._implementReform(history, chosenReform, cycle);
        }
    }

    /**
     * Генерация возможных реформ
     */
    _generatePossibleReforms(history) {
        const reforms = [];
        
        if (history.taxRate > 0.15) {
            reforms.push({ type: 'tax_reduction', description: 'Снижение налогов' });
        }
        
        if (history.taxRate < 0.05) {
            reforms.push({ type: 'tax_increase', description: 'Повышение налогов' });
        }
        
        if (history.politicalSystem === POLITICAL_SYSTEMS.DICTATORSHIP && history.satisfaction < 0.3) {
            reforms.push({ type: 'democratization', description: 'Демократизация' });
        }
        
        if (history.militaryStrength < history.membershipHistory[history.membershipHistory.length - 1] * 0.8) {
            reforms.push({ type: 'military_reform', description: 'Военная реформа' });
        }
        
        return reforms;
    }

    /**
     * Голосование по реформе
     */
    _voteOnReform(clan, history, reform) {
        // Простая модель голосования
        let supportVotes = 0;
        
        clan.members.forEach(member => {
            const supportProbability = this._calculateReformSupport(member, history, reform);
            if (Math.random() < supportProbability) {
                supportVotes++;
            }
        });
        
        const supportRatio = supportVotes / clan.members.length;
        const requiredSupport = history.politicalSystem === POLITICAL_SYSTEMS.DEMOCRACY ? 0.5 : 0.3;
        
        return supportRatio >= requiredSupport;
    }

    /**
     * Расчет поддержки реформы
     */
    _calculateReformSupport(member, history, reform) {
        const baseSupport = 0.5;
        const wealthFactor = (member.economics?.wealth || 0) / 100;
        const satisfactionFactor = history.satisfaction;
        
        switch (reform.type) {
            case 'tax_reduction':
                return baseSupport + wealthFactor * 0.3 - satisfactionFactor * 0.2;
            case 'tax_increase':
                return baseSupport - wealthFactor * 0.3 + (1 - satisfactionFactor) * 0.3;
            case 'democratization':
                return baseSupport + (member.economics?.cooperativeness || 0.5) * 0.4;
            case 'military_reform':
                return baseSupport + history.aggressiveness * 0.3;
            default:
                return baseSupport;
        }
    }

    /**
     * Реализация реформы
     */
    _implementReform(history, reform, cycle) {
        switch (reform.type) {
            case 'tax_reduction':
                history.taxRate = Math.max(0.05, history.taxRate * 0.8);
                history.satisfaction = Math.min(1.0, history.satisfaction + 0.1);
                break;
            case 'tax_increase':
                history.taxRate = Math.min(0.3, history.taxRate * 1.2);
                history.satisfaction = Math.max(0.1, history.satisfaction - 0.1);
                break;
            case 'democratization':
                history.politicalSystem = POLITICAL_SYSTEMS.DEMOCRACY;
                history.stability = Math.min(1.0, history.stability + 0.2);
                history.satisfaction = Math.min(1.0, history.satisfaction + 0.3);
                break;
            case 'military_reform':
                history.militaryStrength *= 1.2;
                history.treasury = Math.max(0, history.treasury - 50);
                break;
        }
        
        history.politicalHistory.push({
            cycle,
            reform: reform.type,
            description: reform.description
        });
        
        this._logEvent(EVENT_TYPES.CLAN_DECISION_MADE, {
            clanId: history.id,
            cycle,
            decision: reform.type,
            description: reform.description
        });
    }

    /**
     * Обновление удовлетворенности членов
     */
    _updateMemberSatisfaction(clan, history) {
        // Факторы удовлетворенности
        const wealthFactor = Math.min(1.0, history.treasury / (clan.members.length * 10));
        const stabilityFactor = history.stability;
        const cohesionFactor = history.cohesion;
        const taxFactor = Math.max(0, 1 - history.taxRate * 2);
        
        const newSatisfaction = (
            wealthFactor * 0.3 +
            stabilityFactor * 0.3 +
            cohesionFactor * 0.2 +
            taxFactor * 0.2
        );
        
        history.satisfaction = Math.max(0.1, Math.min(1.0, newSatisfaction));
    }

    /**
     * Эволюция кланов
     */
    _processClanEvolution(clans, agents, cycle) {
        clans.forEach((clan, clanId) => {
            const history = this.clanHistory.get(clanId);
            if (!history) return;
            
            // Развитие экспертизы
            this._developExpertise(clan, history);
            
            // Культурная эволюция
            this._evolveCulture(clan, history);
            
            // Адаптация к окружающей среде
            this._adaptToEnvironment(clan, history, clans);
        });
    }

    /**
     * Развитие экспертизы клана
     */
    _developExpertise(clan, history) {
        const specialization = history.specialization;
        const currentLevel = history.expertise.get(specialization) || 0;
        
        // Развитие основной специализации
        const developmentRate = 0.02 * history.cohesion * history.stability;
        const newLevel = Math.min(1.0, currentLevel + developmentRate);
        history.expertise.set(specialization, newLevel);
        
        // Развитие вторичных навыков
        const secondarySkills = ['military', 'economic', 'diplomatic', 'technological', 'cultural']
            .filter(skill => skill !== specialization);
        
        secondarySkills.forEach(skill => {
            const currentSecondaryLevel = history.expertise.get(skill) || 0;
            const secondaryDevelopmentRate = 0.005 * history.cohesion;
            const newSecondaryLevel = Math.min(0.5, currentSecondaryLevel + secondaryDevelopmentRate);
            history.expertise.set(skill, newSecondaryLevel);
        });
    }

    /**
     * Культурная эволюция
     */
    _evolveCulture(clan, history) {
        // Медленное изменение культурных ценностей
        Object.keys(history.culturalValues).forEach(value => {
            const change = (Math.random() - 0.5) * 0.02; // Небольшие случайные изменения
            history.culturalValues[value] = Math.max(0, Math.min(1, history.culturalValues[value] + change));
        });
        
        // Влияние политической системы на культуру
        switch (history.politicalSystem) {
            case POLITICAL_SYSTEMS.DEMOCRACY:
                history.culturalValues.equality += 0.01;
                history.culturalValues.freedom += 0.01;
                break;
            case POLITICAL_SYSTEMS.DICTATORSHIP:
                history.culturalValues.hierarchy += 0.01;
                history.culturalValues.security += 0.01;
                break;
            case POLITICAL_SYSTEMS.TECHNOCRACY:
                history.culturalValues.innovation += 0.01;
                break;
        }
        
        // Нормализация значений
        Object.keys(history.culturalValues).forEach(value => {
            history.culturalValues[value] = Math.max(0, Math.min(1, history.culturalValues[value]));
        });
    }

    /**
     * Адаптация к окружающей среде
     */
    _adaptToEnvironment(clan, history, allClans) {
        // Анализ окружающих кланов
        const neighboringClans = Array.from(allClans.values())
            .filter(otherClan => otherClan !== clan)
            .slice(0, 3); // Ближайшие соседи
        
        if (neighboringClans.length === 0) return;
        
        // Адаптация агрессивности
        const avgNeighborAggression = neighboringClans.reduce((sum, neighbor) => {
            const neighborHistory = this.clanHistory.get(neighbor.id);
            return sum + (neighborHistory?.aggressiveness || 0);
        }, 0) / neighboringClans.length;
        
        const aggressionAdjustment = (avgNeighborAggression - history.aggressiveness) * 0.1;
        history.aggressiveness = Math.max(0, Math.min(1, history.aggressiveness + aggressionAdjustment));
        
        // Адаптация налоговой политики
        const avgNeighborTaxRate = neighboringClans.reduce((sum, neighbor) => {
            const neighborHistory = this.clanHistory.get(neighbor.id);
            return sum + (neighborHistory?.taxRate || 0.1);
        }, 0) / neighboringClans.length;
        
        if (Math.abs(history.taxRate - avgNeighborTaxRate) > 0.05) {
            const taxAdjustment = (avgNeighborTaxRate - history.taxRate) * 0.2;
            history.taxRate = Math.max(0.05, Math.min(0.3, history.taxRate + taxAdjustment));
        }
    }

    /**
     * Получение расширенной статистики кланов
     */
    getEnhancedClanStats(clans) {
        const baseStats = super.getClanStats();
        
        // Расширенная статистика
        const enhancedStats = {
            ...baseStats,
            systemMetrics: {
                ...this.systemStats,
                averageClanAge: this._calculateAverageClanAge(),
                politicalSystemDistribution: this._calculatePoliticalDistribution(clans),
                diplomaticNetworkDensity: this._calculateDiplomaticDensity(),
                averageClanStability: this._calculateAverageStability(clans),
                averageClanCohesion: this._calculateAverageCohesion(clans)
            },
            clanDetails: this._generateClanDetails(clans),
            diplomaticMap: this._generateDiplomaticMap(),
            evolutionTrends: this._analyzeEvolutionTrends(clans),
            conflictAnalysis: this._analyzeConflictPatterns(),
            culturalDiversity: this._analyzeCulturalDiversity(clans)
        };
        
        return enhancedStats;
    }

    /**
     * Расчет среднего возраста кланов
     */
    _calculateAverageClanAge() {
        const ages = Array.from(this.clanHistory.values()).map(h => h.age);
        return ages.length > 0 ? ages.reduce((a, b) => a + b, 0) / ages.length : 0;
    }

    /**
     * Расчет распределения политических систем
     */
    _calculatePoliticalDistribution(clans) {
        const distribution = {};
        
        clans.forEach((clan, clanId) => {
            const history = this.clanHistory.get(clanId);
            if (history) {
                const system = history.politicalSystem;
                distribution[system] = (distribution[system] || 0) + 1;
            }
        });
        
        return distribution;
    }

    /**
     * Расчет плотности дипломатической сети
     */
    _calculateDiplomaticDensity() {
        const totalPossibleRelations = this.clanHistory.size * (this.clanHistory.size - 1) / 2;
        const actualRelations = this.diplomaticRelations.size;
        
        return totalPossibleRelations > 0 ? actualRelations / totalPossibleRelations : 0;
    }

    /**
     * Расчет средней стабильности
     */
    _calculateAverageStability(clans) {
        const stabilities = Array.from(this.clanHistory.values()).map(h => h.stability);
        return stabilities.length > 0 ? stabilities.reduce((a, b) => a + b, 0) / stabilities.length : 0;
    }

    /**
     * Расчет средней сплоченности
     */
    _calculateAverageCohesion(clans) {
        const cohesions = Array.from(this.clanHistory.values()).map(h => h.cohesion);
        return cohesions.length > 0 ? cohesions.reduce((a, b) => a + b, 0) / cohesions.length : 0;
    }

    /**
     * Генерация детальной информации о кланах
     */
    _generateClanDetails(clans) {
        const details = [];
        
        clans.forEach((clan, clanId) => {
            const history = this.clanHistory.get(clanId);
            if (history) {
                details.push({
                    id: clanId,
                    memberCount: clan.members.length,
                    age: history.age,
                    politicalSystem: history.politicalSystem,
                    ideology: history.ideology,
                    specialization: history.specialization,
                    stability: history.stability,
                    cohesion: history.cohesion,
                    satisfaction: history.satisfaction,
                    treasury: history.treasury,
                    militaryStrength: history.militaryStrength,
                    alliances: Array.from(history.alliances),
                    enemies: Array.from(history.enemies),
                    majorEvents: history.majorEvents.slice(-5), // Последние 5 событий
                    expertise: Object.fromEntries(history.expertise),
                    culturalValues: history.culturalValues
                });
            }
        });
        
        return details;
    }

    /**
     * Генерация дипломатической карты
     */
    _generateDiplomaticMap() {
        const map = {};
        
        this.diplomaticRelations.forEach((relation, key) => {
            const [clan1, clan2] = key.split('-').map(Number);
            
            if (!map[clan1]) map[clan1] = {};
            if (!map[clan2]) map[clan2] = {};
            
            map[clan1][clan2] = relation;
            map[clan2][clan1] = relation;
        });
        
        return map;
    }

    /**
     * Анализ эволюционных трендов
     */
    _analyzeEvolutionTrends(clans) {
        const trends = {
            politicalEvolution: this._analyzePoliticalEvolution(),
            culturalConvergence: this._analyzeCulturalConvergence(),
            specializationTrends: this._analyzeSpecializationTrends(),
            stabilityTrends: this._analyzeStabilityTrends()
        };
        
        return trends;
    }

    /**
     * Анализ политической эволюции
     */
    _analyzePoliticalEvolution() {
        const evolution = {};
        
        this.clanHistory.forEach((history, clanId) => {
            if (history.politicalHistory.length > 0) {
                const changes = history.politicalHistory.map(change => ({
                    from: change.oldSystem,
                    to: change.newSystem,
                    cycle: change.cycle
                }));
                
                evolution[clanId] = changes;
            }
        });
        
        return evolution;
    }

    /**
     * Анализ культурной конвергенции
     */
    _analyzeCulturalConvergence() {
        const allValues = Array.from(this.clanHistory.values()).map(h => h.culturalValues);
        
        if (allValues.length < 2) return { convergence: 0, diversity: 1 };
        
        const valueKeys = Object.keys(allValues[0]);
        let totalVariance = 0;
        
        valueKeys.forEach(key => {
            const values = allValues.map(cv => cv[key]);
            const mean = values.reduce((a, b) => a + b, 0) / values.length;
            const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
            totalVariance += variance;
        });
        
        const avgVariance = totalVariance / valueKeys.length;
        
        return {
            convergence: Math.max(0, 1 - avgVariance * 4), // Нормализация
            diversity: avgVariance * 4,
            dominantValues: this._findDominantCulturalValues(allValues)
        };
    }

    /**
     * Поиск доминирующих культурных ценностей
     */
    _findDominantCulturalValues(allValues) {
        const valueKeys = Object.keys(allValues[0]);
        const averages = {};
        
        valueKeys.forEach(key => {
            const values = allValues.map(cv => cv[key]);
            averages[key] = values.reduce((a, b) => a + b, 0) / values.length;
        });
        
        return Object.entries(averages)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 3)
            .map(([key, value]) => ({ value: key, strength: value }));
    }

    /**
     * Анализ трендов специализации
     */
    _analyzeSpecializationTrends() {
        const specializations = {};
        
        this.clanHistory.forEach((history, clanId) => {
            const spec = history.specialization;
            specializations[spec] = (specializations[spec] || 0) + 1;
        });
        
        return specializations;
    }

    /**
     * Анализ трендов стабильности
     */
    _analyzeStabilityTrends() {
        const stabilities = Array.from(this.clanHistory.values()).map(h => h.stability);
        
        if (stabilities.length === 0) return { trend: 'stable', average: 0 };
        
        const average = stabilities.reduce((a, b) => a + b, 0) / stabilities.length;
        const variance = stabilities.reduce((sum, s) => sum + Math.pow(s - average, 2), 0) / stabilities.length;
        
        let trend = 'stable';
        if (variance > 0.1) trend = 'volatile';
        if (average < 0.3) trend = 'declining';
        if (average > 0.8) trend = 'improving';
        
        return { trend, average, variance };
    }

    /**
     * Анализ паттернов конфликтов
     */
    _analyzeConflictPatterns() {
        const patterns = {
            totalConflicts: 0,
            conflictsByType: {},
            mostAggressiveClans: [],
            mostTargetedClans: [],
            conflictCycles: []
        };
        
        this.clanHistory.forEach((history, clanId) => {
            patterns.totalConflicts += history.conflictHistory.length;
            
            // Анализ типов конфликтов
            history.conflictHistory.forEach(conflict => {
                const type = conflict.type || 'unknown';
                patterns.conflictsByType[type] = (patterns.conflictsByType[type] || 0) + 1;
            });
        });
        
        return patterns;
    }

    /**
     * Анализ культурного разнообразия
     */
    _analyzeCulturalDiversity(clans) {
        const ideologies = {};
        const politicalSystems = {};
        
        this.clanHistory.forEach((history, clanId) => {
            ideologies[history.ideology] = (ideologies[history.ideology] || 0) + 1;
            politicalSystems[history.politicalSystem] = (politicalSystems[history.politicalSystem] || 0) + 1;
        });
        
        const ideologyDiversity = this._calculateDiversityIndex(Object.values(ideologies));
        const politicalDiversity = this._calculateDiversityIndex(Object.values(politicalSystems));
        
        return {
            ideologyDiversity,
            politicalDiversity,
            ideologyDistribution: ideologies,
            politicalDistribution: politicalSystems
        };
    }

    /**
     * Расчет индекса разнообразия (индекс Шеннона)
     */
    _calculateDiversityIndex(counts) {
        const total = counts.reduce((a, b) => a + b, 0);
        if (total === 0) return 0;
        
        const proportions = counts.map(count => count / total);
        return -proportions.reduce((sum, p) => sum + (p > 0 ? p * Math.log2(p) : 0), 0);
    }

    /**
     * Расчет дисперсии
     */
    _calculateVariance(values) {
        if (values.length === 0) return 0;
        
        const mean = values.reduce((a, b) => a + b, 0) / values.length;
        return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
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
     * Экспорт расширенной статистики кланов
     */
    exportEnhancedClanStats(format = 'json') {
        const stats = this.getEnhancedClanStats(new Map());
        
        switch (format) {
            case 'json':
                return JSON.stringify(stats, null, 2);
            case 'csv':
                return this._exportClanStatsToCSV(stats);
            default:
                return stats;
        }
    }

    /**
     * Экспорт статистики кланов в CSV
     */
    _exportClanStatsToCSV(stats) {
        const lines = [];
        lines.push('Clan ID,Members,Age,Political System,Ideology,Stability,Cohesion,Treasury,Military Strength');
        
        stats.clanDetails.forEach(clan => {
            lines.push([
                clan.id,
                clan.memberCount,
                clan.age,
                clan.politicalSystem,
                clan.ideology,
                clan.stability.toFixed(2),
                clan.cohesion.toFixed(2),
                clan.treasury.toFixed(2),
                clan.militaryStrength.toFixed(2)
            ].join(','));
        });
        
        return lines.join('\n');
    }
}

export default EnhancedClanSystem;
