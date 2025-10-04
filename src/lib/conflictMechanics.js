/**
 * ConflictMechanics - Система конфликтов между кланами
 * Управляет атаками, отъемом ресурсов и поляризацией связей
 */

import { DISTRIBUTION_RULES } from './clanSystem.js';

export class ConflictMechanics {
    constructor(params = {}) {
        this.polarizationFactor = params.polarizationFactor || 3; // Во сколько раз ослабляются связи
        this.resourceStealRatio = params.resourceStealRatio || 2/3; // Доля накопленных ресурсов для кражи
        this.conflictHistory = [];
    }

    /**
     * Сигмоидная функция для плавных переходов
     */
    _sigmoid(x) {
        return 1 / (1 + Math.exp(-x));
    }

    /**
     * Выполнение конфликта между атакующим и жертвой
     */
    executeConflict(attackerClan, victimClan, connectionMatrix, agents) {
        if (!attackerClan || !victimClan) {
            console.warn('ConflictMechanics: Invalid clans for conflict');
            return null;
        }

        const conflictResult = {
            timestamp: Date.now(),
            attackerId: attackerClan.id,
            victimId: victimClan.id,
            attackerSize: attackerClan.members.length,
            victimSize: victimClan.members.length,
            attackerStrength: attackerClan.strength,
            victimStrength: victimClan.strength,
            stolenResources: 0,
            polarizedConnections: 0
        };

        // Фаза 1: Отъем ресурсов
        const stolen = this._stealResources(attackerClan, victimClan, connectionMatrix, agents);
        conflictResult.stolenResources = stolen;

        // Фаза 2: Поляризация связей
        const polarized = this._polarizeConnections(
            attackerClan,
            victimClan,
            connectionMatrix,
            agents
        );
        conflictResult.polarizedConnections = polarized;

        // Сохранение в историю
        this.conflictHistory.push(conflictResult);

        console.log(`Конфликт: Клан ${attackerClan.id} атакует клан ${victimClan.id}, украдено ${stolen.toFixed(2)} ресурсов`);

        return conflictResult;
    }

    /**
     * Отъем ресурсов у жертвы с учетом соотношения сил кланов
     * Успех атаки зависит от относительной силы кланов
     */
    _stealResources(attackerClan, victimClan, connectionMatrix, agents) {
        let totalStolen = 0;
        const minSurvival = 10; // Минимум для выживания

        // Расчет успешности атаки на основе соотношения сил
        const strengthRatio = attackerClan.strength / Math.max(1, victimClan.strength);
        const attackSuccess = this._sigmoid(strengthRatio - 1); // Сигмоида для плавного перехода
        
        // Базовая ставка кражи зависит от успеха атаки
        const baseStealRate = 0.3 + (attackSuccess * 0.4); // От 30% до 70%
        
        // Защитный фактор жертвы
        const victimDefense = Math.min(0.5, victimClan.members.length / 20); // Больше членов = лучше защита

        // Подсчет ресурсов жертвы
        victimClan.members.forEach(victim => {
            if (victim.economics && victim.economics.alive) {
                // Эффективная ставка кражи для этого агента
                const effectiveStealRate = baseStealRate * (1 - victimDefense);
                
                // Текущие ресурсы - крадем только излишки
                const currentResources = victim.economics.currentResources;
                const currentSurplus = Math.max(0, currentResources - minSurvival * 1.2);
                const currentSteal = currentSurplus * effectiveStealRate;
                
                // Накопленные ресурсы - крадем меньший процент
                const accumulatedSteal = victim.economics.accumulatedResources * effectiveStealRate * 0.5;

                // Общая сумма кражи
                const stolen = currentSteal + accumulatedSteal;
                totalStolen += stolen;

                // Отнимаем у жертвы
                victim.economics.currentResources -= currentSteal;
                victim.economics.accumulatedResources -= accumulatedSteal;

                // Убеждаемся, что значения не уходят в минус
                victim.economics.currentResources = Math.max(minSurvival, victim.economics.currentResources);
                victim.economics.accumulatedResources = Math.max(0, victim.economics.accumulatedResources);
            }
        });

        // Распределяем украденное между атакующими пропорционально их силе
        if (totalStolen > 0 && attackerClan.members.length > 0) {
            // Рассчитываем силу каждого атакующего
            const strengths = attackerClan.members.map((attacker) => {
                const agentIndex = agents.indexOf(attacker);
                let strength = 0;
                
                attackerClan.memberIndices.forEach(otherIndex => {
                    if (otherIndex !== agentIndex) {
                        if (connectionMatrix[agentIndex] && connectionMatrix[agentIndex][otherIndex] !== undefined) {
                            strength += connectionMatrix[agentIndex][otherIndex];
                        }
                    }
                });
                
                return { agent: attacker, strength: strength };
            });

            const totalAttackerStrength = strengths.reduce((sum, s) => sum + s.strength, 0);

            // Распределяем украденное пропорционально силе
            if (totalAttackerStrength > 0) {
                strengths.forEach(({ agent, strength }) => {
                    if (agent.economics && agent.economics.alive) {
                        const share = (strength / totalAttackerStrength) * totalStolen;
                        agent.economics.currentResources += share;
                    }
                });
            } else {
                // Если нет данных о силе, распределяем поровну
                const sharePerAgent = totalStolen / attackerClan.members.length;
                attackerClan.members.forEach(agent => {
                    if (agent.economics && agent.economics.alive) {
                        agent.economics.currentResources += sharePerAgent;
                    }
                });
            }
        }

        return totalStolen;
    }

    /**
     * Поляризация связей между враждующими кланами
     * Связи ослабляются экспоненциально в зависимости от интенсивности конфликта
     */
    _polarizeConnections(attackerClan, victimClan, connectionMatrix, agents) {
        let polarizedCount = 0;
        
        // Интенсивность конфликта на основе соотношения сил
        const strengthRatio = attackerClan.strength / Math.max(1, victimClan.strength);
        const conflictIntensity = Math.min(2.0, Math.max(0.5, strengthRatio));

        // Поляризация связей между кланами
        attackerClan.memberIndices.forEach(attackerIndex => {
            victimClan.memberIndices.forEach(victimIndex => {
                if (connectionMatrix[attackerIndex] && connectionMatrix[attackerIndex][victimIndex] !== undefined) {
                    const originalWeight = connectionMatrix[attackerIndex][victimIndex];
                    if (originalWeight > 0) {
                        // Экспоненциальное ослабление связи
                        const polarizationEffect = 1 - Math.exp(-conflictIntensity / 2);
                        const newWeight = originalWeight * (1 - polarizationEffect);
                        
                        connectionMatrix[attackerIndex][victimIndex] = newWeight;
                        
                        // Симметричное обновление
                        if (connectionMatrix[victimIndex] && connectionMatrix[victimIndex][attackerIndex] !== undefined) {
                            connectionMatrix[victimIndex][attackerIndex] = newWeight;
                        }
                        
                        polarizedCount++;
                    }
                }
            });
        });

        return polarizedCount;
    }

    /**
     * Получение истории конфликтов
     */
    getConflictHistory() {
        return this.conflictHistory;
    }

    /**
     * Очистка истории конфликтов
     */
    clearHistory() {
        this.conflictHistory = [];
    }
}

export default ConflictMechanics;

    /**
     * Обработка конфликтов между кланами
     */
    processConflicts(clans, connectionMatrix, agents) {
        const conflicts = [];
        
        if (!clans || clans.size === 0) {
            return conflicts;
        }

        // Поиск кланов с решением "беспредел"
        const aggressiveClans = [];
        clans.forEach((clan, clanId) => {
            if (clan.decision && clan.decision.rule === 'lawlessness') {
                aggressiveClans.push(clan);
            }
        });

        // Выполнение атак
        aggressiveClans.forEach(attackerClan => {
            // Поиск жертвы
            const potentialVictims = [];
            clans.forEach((clan, clanId) => {
                if (clan !== attackerClan) {
                    potentialVictims.push(clan);
                }
            });

            if (potentialVictims.length > 0) {
                // Выбор случайной жертвы
                const victimClan = potentialVictims[Math.floor(Math.random() * potentialVictims.length)];
                
                // Выполнение конфликта
                const conflictResult = this.executeConflict(
                    attackerClan,
                    victimClan,
                    connectionMatrix,
                    agents
                );

                if (conflictResult) {
                    conflicts.push(conflictResult);
                }
            }
        });

        return conflicts;
    }
