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
     * Отъем ресурсов у жертвы
     * Отбирается: часть текущих ресурсов (50%) + resourceStealRatio накопленных
     * Жертвам оставляется минимум для выживания
     */
    _stealResources(attackerClan, victimClan, connectionMatrix, agents) {
        let totalStolen = 0;
        const minSurvival = 10; // Минимум для выживания

        // Подсчет ресурсов жертвы
        victimClan.members.forEach(victim => {
            if (victim.economics && victim.economics.alive) {
                // Текущие ресурсы
                const currentResources = victim.economics.currentResources;
                
                // Красть 50% текущих ресурсов, но оставить минимум для выживания
                const currentSteal = Math.max(0, (currentResources - minSurvival) * 0.5);
                
                // Часть накопленных ресурсов
                const accumulatedSteal = victim.economics.accumulatedResources * this.resourceStealRatio;

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
                
                return strength;
            });

            const totalStrength = strengths.reduce((a, b) => a + b, 0);

            if (totalStrength > 0) {
                // Распределяем пропорционально силе
                attackerClan.members.forEach((attacker, idx) => {
                    if (attacker.economics && attacker.economics.alive) {
                        const share = strengths[idx] / totalStrength;
                        attacker.economics.currentResources += totalStolen * share;
                    }
                });
            } else {
                // Если нет связей, распределяем поровну
                const perAttacker = totalStolen / attackerClan.members.length;
                attackerClan.members.forEach(attacker => {
                    if (attacker.economics && attacker.economics.alive) {
                        attacker.economics.currentResources += perAttacker;
                    }
                });
            }
        }

        return totalStolen;
    }

    /**
     * Поляризация связей между враждующими кланами
     * Связи ослабляются в polarizationFactor раз
     */
    _polarizeConnections(attackerClan, victimClan, connectionMatrix, agents) {
        let polarizedCount = 0;

        // Для каждой пары агентов из разных кланов
        attackerClan.members.forEach(attacker => {
            const attackerIndex = agents.indexOf(attacker);

            victimClan.members.forEach(victim => {
                const victimIndex = agents.indexOf(victim);

                // Ослабляем связь в обе стороны
                if (connectionMatrix[attackerIndex] && 
                    connectionMatrix[attackerIndex][victimIndex] !== undefined) {
                    
                    const oldStrength = connectionMatrix[attackerIndex][victimIndex];
                    connectionMatrix[attackerIndex][victimIndex] = oldStrength / this.polarizationFactor;
                    polarizedCount++;
                }

                if (connectionMatrix[victimIndex] && 
                    connectionMatrix[victimIndex][attackerIndex] !== undefined) {
                    
                    const oldStrength = connectionMatrix[victimIndex][attackerIndex];
                    connectionMatrix[victimIndex][attackerIndex] = oldStrength / this.polarizationFactor;
                    polarizedCount++;
                }
            });
        });

        return polarizedCount;
    }

    /**
     * Проверка, нужен ли конфликт для данного клана
     */
    shouldInitiateConflict(clan) {
        return clan.decision && clan.decision.rule === DISTRIBUTION_RULES.LAWLESSNESS;
    }

    /**
     * Обработка всех потенциальных конфликтов в текущем цикле
     */
    processConflicts(clans, connectionMatrix, agents) {
        const conflicts = [];

        // Находим кланы, выбравшие "беспредел"
        const aggressiveClans = clans.filter(clan => this.shouldInitiateConflict(clan));

        if (aggressiveClans.length === 0) {
            return conflicts;
        }

        // Для каждого агрессивного клана
        aggressiveClans.forEach(attackerClan => {
            // Находим самый слабый клан (исключая самого атакующего)
            const potentialVictims = clans.filter(c => c.id !== attackerClan.id);

            if (potentialVictims.length === 0) {
                return; // Нет кого атаковать
            }

            const victimClan = this._findWeakestClan(potentialVictims);

            if (victimClan) {
                const conflict = this.executeConflict(
                    attackerClan,
                    victimClan,
                    connectionMatrix,
                    agents
                );

                if (conflict) {
                    conflicts.push(conflict);
                }
            }
        });

        return conflicts;
    }

    /**
     * Поиск самого слабого клана из списка
     */
    _findWeakestClan(clans) {
        if (clans.length === 0) return null;

        let weakestClan = clans[0];
        let minStrength = weakestClan.strength;

        clans.forEach(clan => {
            if (clan.strength < minStrength) {
                minStrength = clan.strength;
                weakestClan = clan;
            }
        });

        return weakestClan;
    }

    /**
     * Получение статистики по конфликтам
     */
    getConflictStats() {
        if (this.conflictHistory.length === 0) {
            return {
                totalConflicts: 0,
                totalResourcesStolen: 0,
                totalConnectionsPolarized: 0,
                averageResourcesPerConflict: 0,
                mostAggressiveClan: null,
                mostVictimizedClan: null
            };
        }

        const totalResourcesStolen = this.conflictHistory.reduce(
            (sum, c) => sum + c.stolenResources,
            0
        );

        const totalConnectionsPolarized = this.conflictHistory.reduce(
            (sum, c) => sum + c.polarizedConnections,
            0
        );

        // Подсчет самого агрессивного клана
        const attackerCounts = {};
        const victimCounts = {};

        this.conflictHistory.forEach(conflict => {
            attackerCounts[conflict.attackerId] = (attackerCounts[conflict.attackerId] || 0) + 1;
            victimCounts[conflict.victimId] = (victimCounts[conflict.victimId] || 0) + 1;
        });

        const mostAggressiveClan = Object.entries(attackerCounts).reduce(
            (max, [id, count]) => count > (max.count || 0) ? { id: parseInt(id), count } : max,
            {}
        );

        const mostVictimizedClan = Object.entries(victimCounts).reduce(
            (max, [id, count]) => count > (max.count || 0) ? { id: parseInt(id), count } : max,
            {}
        );

        return {
            totalConflicts: this.conflictHistory.length,
            totalResourcesStolen: totalResourcesStolen,
            totalConnectionsPolarized: totalConnectionsPolarized,
            averageResourcesPerConflict: totalResourcesStolen / this.conflictHistory.length,
            mostAggressiveClan: mostAggressiveClan.id !== undefined ? mostAggressiveClan : null,
            mostVictimizedClan: mostVictimizedClan.id !== undefined ? mostVictimizedClan : null,
            recentConflicts: this.conflictHistory.slice(-10) // Последние 10 конфликтов
        };
    }

    /**
     * Очистка истории конфликтов
     */
    clearHistory() {
        this.conflictHistory = [];
    }

    /**
     * Получение детальной истории конфликтов
     */
    getConflictHistory() {
        return [...this.conflictHistory];
    }
}

export default ConflictMechanics;
