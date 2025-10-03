/**
 * Комплексный тест экономической модели
 * Тестирует все компоненты с различными параметрами
 */

import { EconomicEngine } from './src/lib/economicEngine.js';
import { ClanSystem } from './src/lib/clanSystem.js';
import { ConflictMechanics } from './src/lib/conflictMechanics.js';
import { runEnhancedSimulation } from './src/lib/enhancedSimulation.js';

// Цвета для консоли
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function logTest(name, passed, details = '') {
    const status = passed ? '✅ PASS' : '❌ FAIL';
    const statusColor = passed ? 'green' : 'red';
    log(`${status}: ${name}`, statusColor);
    if (details) {
        log(`   ${details}`, 'cyan');
    }
}

// Создание тестовых агентов
function createTestAgents(count) {
    const agents = [];
    for (let i = 0; i < count; i++) {
        agents.push({
            id: i,
            cluster: Math.floor(i / (count / 5)), // 5 кластеров
            values: Array(10).fill(0).map(() => Math.random() * 2 - 1),
            economics: null
        });
    }
    return agents;
}

// Создание тестовых тем
function createTestTopics(count) {
    const topics = [];
    for (let i = 0; i < count; i++) {
        topics.push({
            id: i,
            name: `Topic ${i}`,
            vector: Array(10).fill(0).map(() => Math.random() * 2 - 1)
        });
    }
    return topics;
}

// Создание тестовой матрицы связей
function createTestConnectionMatrix(size) {
    const matrix = Array(size).fill().map(() => Array(size).fill(0));
    
    for (let i = 0; i < size; i++) {
        for (let j = i + 1; j < size; j++) {
            // Сильные связи внутри кластеров
            const cluster1 = Math.floor(i / (size / 5));
            const cluster2 = Math.floor(j / (size / 5));
            
            if (cluster1 === cluster2) {
                matrix[i][j] = matrix[j][i] = 0.5 + Math.random() * 0.5; // 0.5-1.0
            } else {
                matrix[i][j] = matrix[j][i] = Math.random() * 0.3; // 0-0.3
            }
        }
    }
    
    return matrix;
}

// ==================== ТЕСТ 1: Базовая экономика ====================

function testBasicEconomy() {
    log('\n=== ТЕСТ 1: Базовая экономика ===', 'blue');
    
    const agents = createTestAgents(50);
    const connectionMatrix = createTestConnectionMatrix(50);
    
    const economicEngine = new EconomicEngine({
        baseProductivity: 10,
        minSurvival: 10,
        maxMultiplier: 2.0,
        strongConnectionThreshold: 0.3,
        connectionBonus: 0.1
    });
    
    economicEngine.initializeAgentEconomics(agents);
    
    // Тест 1.1: Инициализация
    const allInitialized = agents.every(a => 
        a.economics && 
        a.economics.currentResources === 50 &&
        a.economics.alive === true
    );
    logTest('1.1 Инициализация агентов', allInitialized, 
        `Все ${agents.length} агентов инициализированы с 50 ресурсами`);
    
    // Тест 1.2: Производство
    let totalProduction = 0;
    agents.forEach((agent, idx) => {
        const production = economicEngine.calculateProduction(agent, connectionMatrix, idx, agents);
        totalProduction += production;
    });
    
    const avgProduction = totalProduction / agents.length;
    const productionOk = avgProduction >= 10 && avgProduction <= 20;
    logTest('1.2 Производство ресурсов', productionOk,
        `Среднее производство: ${avgProduction.toFixed(2)} (ожидается 10-20)`);
    
    // Тест 1.3: Потребление
    const consumptionResult = economicEngine.processConsumption(agents);
    const allSurvived = consumptionResult.survived === agents.length && consumptionResult.died === 0;
    logTest('1.3 Потребление ресурсов', allSurvived,
        `Выжило: ${consumptionResult.survived}, Умерло: ${consumptionResult.died}`);
    
    // Тест 1.4: Полный цикл
    const cycleResult = economicEngine.executeEconomicCycle(agents, connectionMatrix);
    const cycleOk = cycleResult.survived > 0 && cycleResult.totalProduction > 0;
    logTest('1.4 Полный экономический цикл', cycleOk,
        `Производство: ${cycleResult.totalProduction.toFixed(2)}, Потребление: ${cycleResult.totalConsumption.toFixed(2)}`);
    
    // Тест 1.5: Статистика
    const stats = economicEngine.getEconomicStats(agents);
    const statsOk = stats.aliveCount > 0 && stats.averageResources > 0;
    logTest('1.5 Статистика экономики', statsOk,
        `Живых: ${stats.aliveCount}, Средние ресурсы: ${stats.averageResources.toFixed(2)}`);
    
    return { passed: allInitialized && productionOk && allSurvived && cycleOk && statsOk };
}

// ==================== ТЕСТ 2: Система кланов ====================

function testClanSystem() {
    log('\n=== ТЕСТ 2: Система кланов ===', 'blue');
    
    const agents = createTestAgents(100);
    const connectionMatrix = createTestConnectionMatrix(100);
    
    const economicEngine = new EconomicEngine();
    economicEngine.initializeAgentEconomics(agents);
    
    const clanSystem = new ClanSystem({
        minClanSize: 5,
        densityThreshold: 0.5
    });
    
    // Тест 2.1: Идентификация кланов
    const clans = clanSystem.identifyClans(agents, connectionMatrix);
    const clansFound = clans.length > 0;
    logTest('2.1 Идентификация кланов', clansFound,
        `Найдено кланов: ${clans.length}`);
    
    // Тест 2.2: Размер кланов
    const allClansValid = clans.every(clan => clan.members.length >= 5);
    logTest('2.2 Минимальный размер кланов', allClansValid,
        `Все кланы >= 5 членов`);
    
    // Тест 2.3: Плотность кланов
    const allDenseEnough = clans.every(clan => clan.density >= 0.5);
    logTest('2.3 Плотность кланов', allDenseEnough,
        `Все кланы >= 0.5 плотности`);
    
    // Тест 2.4: Сила кланов
    const allHaveStrength = clans.every(clan => clan.strength > 0);
    logTest('2.4 Расчет силы кланов', allHaveStrength,
        `Средняя сила: ${(clans.reduce((sum, c) => sum + c.strength, 0) / clans.length).toFixed(2)}`);
    
    // Тест 2.5: Принятие решений
    clans.forEach(clan => clanSystem.makeClanDecision(clan));
    const allHaveDecisions = clans.every(clan => clan.decision && clan.decision.rule);
    logTest('2.5 Принятие решений', allHaveDecisions,
        `Все кланы приняли решения`);
    
    // Тест 2.6: Распределение ресурсов (демократия)
    const democracyClan = clans.find(c => c.decision.rule === 'democracy');
    if (democracyClan) {
        const beforeResources = democracyClan.members.map(a => a.economics.currentResources);
        clanSystem.distributeResources(democracyClan, connectionMatrix, agents);
        const afterResources = democracyClan.members.map(a => a.economics.currentResources);
        
        const allEqual = afterResources.every(r => Math.abs(r - afterResources[0]) < 0.01);
        logTest('2.6 Демократия (равное распределение)', allEqual,
            `Ресурсы после: ${afterResources[0].toFixed(2)} (все равны)`);
    }
    
    // Тест 2.7: Статистика кланов
    const clanStats = clanSystem.getClanStats();
    const statsOk = clanStats.totalClans === clans.length;
    logTest('2.7 Статистика кланов', statsOk,
        `Кланов: ${clanStats.totalClans}, Средний размер: ${clanStats.averageSize.toFixed(1)}`);
    
    return { 
        passed: clansFound && allClansValid && allDenseEnough && allHaveStrength && allHaveDecisions && statsOk,
        clans 
    };
}

// ==================== ТЕСТ 3: Конфликтная механика ====================

function testConflictMechanics() {
    log('\n=== ТЕСТ 3: Конфликтная механика ===', 'blue');
    
    const agents = createTestAgents(100);
    const connectionMatrix = createTestConnectionMatrix(100);
    
    const economicEngine = new EconomicEngine();
    economicEngine.initializeAgentEconomics(agents);
    
    const clanSystem = new ClanSystem({ minClanSize: 5, densityThreshold: 0.5 });
    const clans = clanSystem.identifyClans(agents, connectionMatrix);
    
    // Принудительно устанавливаем "беспредел" для одного клана
    if (clans.length >= 2) {
        clans[0].decision = { rule: 'lawlessness', votes: {}, timestamp: Date.now() };
    }
    
    const conflictMechanics = new ConflictMechanics({
        polarizationFactor: 3,
        resourceStealRatio: 2/3
    });
    
    // Тест 3.1: Инициация конфликта
    const shouldConflict = conflictMechanics.shouldInitiateConflict(clans[0]);
    logTest('3.1 Инициация конфликта', shouldConflict,
        `Клан с "беспределом" готов к конфликту`);
    
    if (clans.length >= 2) {
        const attackerClan = clans[0];
        const victimClan = clans[1];
        
        // Запоминаем состояние до конфликта
        const victimResourcesBefore = victimClan.members.map(a => a.economics.currentResources);
        const attackerResourcesBefore = attackerClan.members.map(a => a.economics.currentResources);
        
        // Тест 3.2: Выполнение конфликта
        const conflict = conflictMechanics.executeConflict(
            attackerClan, 
            victimClan, 
            connectionMatrix, 
            agents
        );
        
        const conflictExecuted = conflict && conflict.stolenResources > 0;
        logTest('3.2 Выполнение конфликта', conflictExecuted,
            `Украдено ресурсов: ${conflict?.stolenResources.toFixed(2)}`);
        
        // Тест 3.3: Жертвы выжили
        const victimResourcesAfter = victimClan.members.map(a => a.economics.currentResources);
        const allVictimsAlive = victimClan.members.every(a => a.economics.alive);
        const allVictimsHaveMinimum = victimResourcesAfter.every(r => r >= 10);
        
        logTest('3.3 Жертвы получили минимум для выживания', allVictimsAlive && allVictimsHaveMinimum,
            `Все жертвы живы, минимум ресурсов: ${Math.min(...victimResourcesAfter).toFixed(2)}`);
        
        // Тест 3.4: Атакующие получили ресурсы
        const attackerResourcesAfter = attackerClan.members.map(a => a.economics.currentResources);
        const attackersGotResources = attackerResourcesAfter.some((r, i) => r > attackerResourcesBefore[i]);
        
        logTest('3.4 Атакующие получили ресурсы', attackersGotResources,
            `Средний прирост: ${((attackerResourcesAfter.reduce((a,b)=>a+b,0) - attackerResourcesBefore.reduce((a,b)=>a+b,0)) / attackerClan.members.length).toFixed(2)}`);
        
        // Тест 3.5: Поляризация связей
        const polarized = conflict.polarizedConnections > 0;
        logTest('3.5 Поляризация связей', polarized,
            `Поляризовано связей: ${conflict.polarizedConnections}`);
        
        // Тест 3.6: История конфликтов
        const history = conflictMechanics.getConflictHistory();
        const historyOk = history.length > 0;
        logTest('3.6 История конфликтов', historyOk,
            `Записей в истории: ${history.length}`);
        
        // Тест 3.7: Статистика конфликтов
        const stats = conflictMechanics.getConflictStats();
        const statsOk = stats.totalConflicts > 0 && stats.totalResourcesStolen > 0;
        logTest('3.7 Статистика конфликтов', statsOk,
            `Конфликтов: ${stats.totalConflicts}, Украдено: ${stats.totalResourcesStolen.toFixed(2)}`);
        
        return { 
            passed: shouldConflict && conflictExecuted && allVictimsAlive && allVictimsHaveMinimum && attackersGotResources && polarized && historyOk && statsOk 
        };
    }
    
    return { passed: false };
}

// ==================== ТЕСТ 4: Интеграция (полная симуляция) ====================

function testFullSimulation() {
    log('\n=== ТЕСТ 4: Полная симуляция ===', 'blue');
    
    const agents = createTestAgents(150);
    const topics = createTestTopics(10);
    
    const params = {
        agents,
        topics,
        cycles: 30,
        threshold: 0.3,
        economicEnabled: true,
        economicParams: {
            baseProductivity: 10,
            minSurvival: 10,
            maxMultiplier: 2.0,
            strongConnectionThreshold: 0.3,
            connectionBonus: 0.1,
            economicCycleInterval: 5
        },
        clanParams: {
            minClanSize: 5,
            densityThreshold: 0.5
        },
        conflictParams: {
            polarizationFactor: 3,
            resourceStealRatio: 2/3
        }
    };
    
    // Тест 4.1: Запуск симуляции
    let result;
    try {
        result = runEnhancedSimulation(params);
        logTest('4.1 Запуск симуляции', true, 'Симуляция завершена без ошибок');
    } catch (error) {
        logTest('4.1 Запуск симуляции', false, `Ошибка: ${error.message}`);
        return { passed: false };
    }
    
    // Тест 4.2: Результаты симуляции
    const hasConnections = result.connections && result.connections.length > 0;
    const hasAgents = result.agents && result.agents.length > 0;
    const hasHistory = result.economicHistory && result.economicHistory.economic.length > 0;
    
    logTest('4.2 Структура результатов', hasConnections && hasAgents && hasHistory,
        `Связи: ${hasConnections}, Агенты: ${hasAgents}, История: ${hasHistory}`);
    
    // Тест 4.3: Выживаемость агентов
    const aliveAgents = result.agents.filter(a => a.economics && a.economics.alive);
    const survivalRate = (aliveAgents.length / result.agents.length) * 100;
    const survivalOk = survivalRate > 30; // Минимум 30% должны выжить
    
    logTest('4.3 Выживаемость агентов', survivalOk,
        `Выжило: ${aliveAgents.length}/${result.agents.length} (${survivalRate.toFixed(1)}%)`);
    
    // Тест 4.4: Экономическая история
    const economicHistory = result.economicHistory.economic;
    const lastEconomic = economicHistory[economicHistory.length - 1];
    const economicOk = lastEconomic && lastEconomic.survived > 0;
    
    logTest('4.4 Экономическая история', economicOk,
        `Циклов: ${economicHistory.length}, Последний: ${lastEconomic?.survived} выжило`);
    
    // Тест 4.5: История кланов
    const clanHistory = result.economicHistory.clans;
    const clansFormed = clanHistory.some(c => c.totalClans > 0);
    
    logTest('4.5 Формирование кланов', clansFormed,
        `Максимум кланов: ${Math.max(...clanHistory.map(c => c.totalClans))}`);
    
    // Тест 4.6: История конфликтов
    const conflictHistory = result.economicHistory.conflicts;
    const conflictsOccurred = conflictHistory.length > 0;
    
    logTest('4.6 Конфликты', conflictsOccurred,
        `Циклов с конфликтами: ${conflictHistory.length}`);
    
    // Тест 4.7: Интервал экономических циклов
    const economicCycles = economicHistory.map(e => e.cycle);
    const intervalCorrect = economicCycles.every((cycle, idx) => 
        idx === 0 || cycle - economicCycles[idx - 1] === 5
    );
    
    logTest('4.7 Интервал экономических циклов', intervalCorrect,
        `Циклы: ${economicCycles.join(', ')}`);
    
    return { 
        passed: hasConnections && hasAgents && hasHistory && survivalOk && economicOk && clansFormed && intervalCorrect,
        result 
    };
}

// ==================== ТЕСТ 5: Стресс-тест ====================

function testStressTest() {
    log('\n=== ТЕСТ 5: Стресс-тест (максимальная нагрузка) ===', 'blue');
    
    const agents = createTestAgents(500); // Много агентов
    const topics = createTestTopics(20);
    
    const params = {
        agents,
        topics,
        cycles: 100, // Много циклов
        threshold: 0.3,
        economicEnabled: true,
        economicParams: {
            baseProductivity: 15,
            minSurvival: 12,
            maxMultiplier: 3.0,
            strongConnectionThreshold: 0.2,
            connectionBonus: 0.15,
            economicCycleInterval: 3 // Частые экономические циклы
        },
        clanParams: {
            minClanSize: 3,
            densityThreshold: 0.4
        },
        conflictParams: {
            polarizationFactor: 5,
            resourceStealRatio: 0.8
        }
    };
    
    // Тест 5.1: Производительность
    const startTime = Date.now();
    let result;
    
    try {
        result = runEnhancedSimulation(params);
        const duration = Date.now() - startTime;
        const performanceOk = duration < 30000; // Должно завершиться за 30 секунд
        
        logTest('5.1 Производительность', performanceOk,
            `Время выполнения: ${(duration / 1000).toFixed(2)}с (500 агентов, 100 циклов)`);
    } catch (error) {
        logTest('5.1 Производительность', false, `Ошибка: ${error.message}`);
        return { passed: false };
    }
    
    // Тест 5.2: Стабильность при высокой смертности
    const aliveAgents = result.agents.filter(a => a.economics && a.economics.alive);
    const survived = aliveAgents.length > 0;
    
    logTest('5.2 Стабильность системы', survived,
        `Выжило: ${aliveAgents.length}/${result.agents.length} агентов`);
    
    // Тест 5.3: Масштабируемость кланов
    const maxClans = Math.max(...result.economicHistory.clans.map(c => c.totalClans));
    const clansScaled = maxClans > 0;
    
    logTest('5.3 Масштабируемость кланов', clansScaled,
        `Максимум кланов: ${maxClans}`);
    
    // Тест 5.4: Частота конфликтов
    const totalConflicts = result.economicHistory.conflicts.reduce(
        (sum, c) => sum + c.conflicts.length, 0
    );
    
    logTest('5.4 Конфликты при высокой нагрузке', totalConflicts >= 0,
        `Всего конфликтов: ${totalConflicts}`);
    
    return { passed: survived && clansScaled };
}

// ==================== ГЛАВНАЯ ФУНКЦИЯ ====================

async function runAllTests() {
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║  КОМПЛЕКСНОЕ ТЕСТИРОВАНИЕ ЭКОНОМИЧЕСКОЙ МОДЕЛИ v2.1       ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    const results = {
        basicEconomy: false,
        clanSystem: false,
        conflictMechanics: false,
        fullSimulation: false,
        stressTest: false
    };
    
    try {
        // Тест 1
        const test1 = testBasicEconomy();
        results.basicEconomy = test1.passed;
        
        // Тест 2
        const test2 = testClanSystem();
        results.clanSystem = test2.passed;
        
        // Тест 3
        const test3 = testConflictMechanics();
        results.conflictMechanics = test3.passed;
        
        // Тест 4
        const test4 = testFullSimulation();
        results.fullSimulation = test4.passed;
        
        // Тест 5
        const test5 = testStressTest();
        results.stressTest = test5.passed;
        
    } catch (error) {
        log(`\n❌ КРИТИЧЕСКАЯ ОШИБКА: ${error.message}`, 'red');
        console.error(error);
    }
    
    // Итоговый отчет
    log('\n╔════════════════════════════════════════════════════════════╗', 'cyan');
    log('║                    ИТОГОВЫЙ ОТЧЕТ                          ║', 'cyan');
    log('╚════════════════════════════════════════════════════════════╝', 'cyan');
    
    const passed = Object.values(results).filter(r => r).length;
    const total = Object.keys(results).length;
    
    log(`\nБазовая экономика:      ${results.basicEconomy ? '✅' : '❌'}`, results.basicEconomy ? 'green' : 'red');
    log(`Система кланов:         ${results.clanSystem ? '✅' : '❌'}`, results.clanSystem ? 'green' : 'red');
    log(`Конфликтная механика:   ${results.conflictMechanics ? '✅' : '❌'}`, results.conflictMechanics ? 'green' : 'red');
    log(`Полная симуляция:       ${results.fullSimulation ? '✅' : '❌'}`, results.fullSimulation ? 'green' : 'red');
    log(`Стресс-тест:            ${results.stressTest ? '✅' : '❌'}`, results.stressTest ? 'green' : 'red');
    
    log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`, 'cyan');
    log(`РЕЗУЛЬТАТ: ${passed}/${total} тестов пройдено`, passed === total ? 'green' : 'yellow');
    log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`, 'cyan');
    
    if (passed === total) {
        log('🎉 ВСЕ ТЕСТЫ ПРОЙДЕНЫ УСПЕШНО!', 'green');
    } else {
        log('⚠️  НЕКОТОРЫЕ ТЕСТЫ НЕ ПРОЙДЕНЫ', 'yellow');
    }
    
    process.exit(passed === total ? 0 : 1);
}

// Запуск тестов
runAllTests();
