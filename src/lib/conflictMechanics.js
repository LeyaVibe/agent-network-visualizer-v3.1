/**
 * ConflictMechanics - Система конфликтов между кланами
 * Управляет атаками, отъемом ресурсов и поляризацией связей
 */

import { DISTRIBUTION_RULES } from './clanSystem.js';

export class ConflictMechanics {
    constructor(params = {}, eventLogger = null) {
        this.polarizationFactor = params.polarizationFactor || 3; // Во сколько раз ослабляются связи
        this.resourceStealRatio = params.resourceStealRatio || 2/3; // Доля накопленных ресурсов для кражи
        this.conflictHistory = [];
        this.eventLogger = eventLogger;
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
            polarizedConnections: 0,
            supporters: { attacker: [], victim: [], neutral: [] }
        };

        // Фаза 0: Выбор стороны агентами (включая свободных)
        const sideSelection = this._selectSides(attackerClan, victimClan, connectionMatrix, agents);
        conflictResult.supporters = sideSelection;

        // Пересчет силы с учетом поддержки
        const attackerTotalStrength = attackerClan.strength + sideSelection.attackerSupportStrength;
        const victimTotalStrength = victimClan.strength + sideSelection.victimSupportStrength;

        console.log(`Конфликт: Клан ${attackerClan.id} (сила ${attackerTotalStrength.toFixed(1)}) vs Клан ${victimClan.id} (сила ${victimTotalStrength.toFixed(1)})`);
        console.log(`  Поддержка атакующего: ${sideSelection.attacker.length} агентов`);
        console.log(`  Поддержка жертвы: ${sideSelection.victim.length} агентов`);
        console.log(`  Нейтральные: ${sideSelection.neutral.length} агентов`);

        // Фаза 1: Отъем ресурсов с учетом новой силы
        const stolen = this._stealResourcesWithSupport(
            attackerClan, 
            victimClan, 
            sideSelection,
            attackerTotalStrength,
            victimTotalStrength,
            connectionMatrix, 
            agents
        );
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

        // Логирование события конфликта
        if (this.eventLogger) {
            this.eventLogger.logEvent('conflict_initiated', {
                attackerId: attackerClan.id,
                victimId: victimClan.id,
                attackerStrength: attackerTotalStrength,
                victimStrength: victimTotalStrength,
                stolenResources: stolen,
                attackerSupport: sideSelection.attacker.length,
                victimSupport: sideSelection.victim.length
            }, 'warning');
            
            // Если были украдены ресурсы, логируем отдельно
            if (stolen > 0) {
                this.eventLogger.logEvent('resource_theft', {
                    attackerId: attackerClan.id,
                    victimId: victimClan.id,
                    amount: stolen
                }, 'warning');
            }
        }

        return conflictResult;
    }

    /**
     * Выбор стороны агентами на основе их связей с кланами
     * Агенты вне кланов выбирают, кого поддержать
     */
    _selectSides(attackerClan, victimClan, connectionMatrix, agents) {
        const result = {
            attacker: [],
            victim: [],
            neutral: [],
            attackerSupportStrength: 0,
            victimSupportStrength: 0
        };

        // Получаем ID членов кланов
        const attackerMemberIds = new Set(attackerClan.members.map(m => m.id));
        const victimMemberIds = new Set(victimClan.members.map(m => m.id));

        // Проверяем всех агентов
        agents.forEach((agent, agentIndex) => {
            if (!agent.economics || !agent.economics.alive) return;

            // Пропускаем членов конфликтующих кланов
            if (attackerMemberIds.has(agent.id) || victimMemberIds.has(agent.id)) {
                return;
            }

            // Подсчет связей с каждым кланом
            let connectionToAttacker = 0;
            let connectionToVictim = 0;

            attackerClan.memberIndices.forEach(memberIndex => {
                if (connectionMatrix[agentIndex] && connectionMatrix[agentIndex][memberIndex] !== undefined) {
                    connectionToAttacker += connectionMatrix[agentIndex][memberIndex];
                }
            });

            victimClan.memberIndices.forEach(memberIndex => {
                if (connectionMatrix[agentIndex] && connectionMatrix[agentIndex][memberIndex] !== undefined) {
                    connectionToVictim += connectionMatrix[agentIndex][memberIndex];
                }
            });

            // Решение на основе связей и ресурсов
            const resourceFactor = agent.economics.currentResources / 20; // Нормализация
            const attackerScore = connectionToAttacker + (resourceFactor * 0.2); // Богатые склонны к агрессии
            const victimScore = connectionToVictim + ((1 / Math.max(0.1, resourceFactor)) * 0.1); // Бедные сочувствуют жертве

            // Порог для выбора стороны
            const threshold = 0.5;

            if (attackerScore > victimScore + threshold) {
                result.attacker.push(agent.id);
                result.attackerSupportStrength += connectionToAttacker;
            } else if (victimScore > attackerScore + threshold) {
                result.victim.push(agent.id);
                result.victimSupportStrength += connectionToVictim;
            } else {
                result.neutral.push(agent.id);
            }
        });

        return result;
    }

    /**
     * Отъем ресурсов у жертвы с учетом соотношения сил кланов и поддержки
     * Успех атаки зависит от относительной силы кланов с учетом союзников
     */
    _stealResourcesWithSupport(attackerClan, victimClan, sideSelection, attackerTotalStrength, victimTotalStrength, connectionMatrix, agents) {
        let totalStolen = 0;
        const minSurvival = 10; // Минимум для выживания

        // Расчет успешности атаки на основе соотношения сил С УЧЕТОМ ПОДДЕРЖКИ
        const strengthRatio = attackerTotalStrength / Math.max(1, victimTotalStrength);
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

    /**
     * Обработка конфликтов между кланами
     */
    processConflicts(clans, connectionMatrix, agents) {
        const conflicts = [];
        
        // Проверка входных данных
        if (!clans) {
            return conflicts;
        }

        // Обработка разных форматов кланов
        let clansToProcess = [];
        if (clans instanceof Map) {
            if (clans.size === 0) {
                return conflicts;
            }
            clansToProcess = Array.from(clans.values());
        } else if (Array.isArray(clans)) {
            if (clans.length === 0) {
                return conflicts;
            }
            clansToProcess = clans;
        } else {
            console.warn('ConflictMechanics: Unknown clans format', clans);
            return conflicts;
        }

        // Поиск кланов с решением "беспредел"
        const aggressiveClans = [];
        clansToProcess.forEach(clan => {
            if (clan && clan.decision && clan.decision.rule === 'lawlessness') {
                aggressiveClans.push(clan);
            }
        });

        // Выполнение атак
        aggressiveClans.forEach(attackerClan => {
            // Поиск жертвы
            const potentialVictims = [];
            clansToProcess.forEach(clan => {
                if (clan && clan !== attackerClan) {
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
}

export default ConflictMechanics;
