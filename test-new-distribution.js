/**
 * Тест новой системы распределения ресурсов с демократическими подправилами
 */

import { ClanSystem, DISTRIBUTION_RULES, DEMOCRACY_SUBRULES } from './src/lib/clanSystem.js';

console.log('🧪 Тестирование новой системы распределения ресурсов\n');

// Создаем тестовых агентов
function createTestAgents(count) {
    const agents = [];
    for (let i = 0; i < count; i++) {
        agents.push({
            id: i,
            cluster: Math.floor(i / 5), // 5 агентов на кластер
            economics: {
                alive: true,
                currentResources: 100,
                minSurvival: 10,
                accumulatedResources: 0
            }
        });
    }
    return agents;
}

// Создаем матрицу связей
function createConnectionMatrix(agents) {
    const matrix = [];
    for (let i = 0; i < agents.length; i++) {
        matrix[i] = [];
        for (let j = 0; j < agents.length; j++) {
            if (i === j) {
                matrix[i][j] = 0;
            } else if (Math.floor(i / 5) === Math.floor(j / 5)) {
                // Сильные связи внутри кластера
                matrix[i][j] = 0.7 + Math.random() * 0.3;
            } else {
                // Слабые связи между кластерами
                matrix[i][j] = Math.random() * 0.2;
            }
        }
    }
    return matrix;
}

// Тест 1: Проверка всех подправил демократии
console.log('📊 Тест 1: Проверка всех подправил демократии\n');

const subrules = Object.values(DEMOCRACY_SUBRULES);
subrules.forEach(subrule => {
    console.log(`\n🔹 Тестирование подправила: ${subrule}`);
    
    const agents = createTestAgents(5);
    const connectionMatrix = createConnectionMatrix(agents);
    
    // Создаем клан
    const clan = {
        id: 0,
        members: agents,
        memberIndices: [0, 1, 2, 3, 4],
        density: 0.8,
        strength: 100,
        totalResources: 500,
        decision: {
            rule: DISTRIBUTION_RULES.DEMOCRACY,
            subrule: subrule
        }
    };
    
    // Сохраняем начальные ресурсы
    const initialResources = agents.map(a => a.economics.currentResources);
    
    // Распределяем ресурсы
    const clanSystem = new ClanSystem();
    clanSystem._distributeDemocracy(clan, connectionMatrix, agents, subrule);
    
    // Выводим результаты
    console.log('Начальные ресурсы:', initialResources.join(', '));
    console.log('Конечные ресурсы:', agents.map(a => a.economics.currentResources.toFixed(1)).join(', '));
    
    // Проверяем сохранение общей суммы
    const initialTotal = initialResources.reduce((sum, r) => sum + r, 0);
    const finalTotal = agents.reduce((sum, a) => sum + a.economics.currentResources, 0);
    console.log(`Сумма: ${initialTotal} → ${finalTotal.toFixed(1)} (${Math.abs(initialTotal - finalTotal) < 0.01 ? '✅' : '❌'})`);
});

// Тест 2: Проверка диктатуры
console.log('\n\n📊 Тест 2: Проверка диктатуры\n');

const agents2 = createTestAgents(5);
const connectionMatrix2 = createConnectionMatrix(agents2);

const clan2 = {
    id: 0,
    members: agents2,
    memberIndices: [0, 1, 2, 3, 4],
    density: 0.8,
    strength: 100,
    totalResources: 500,
    decision: {
        rule: DISTRIBUTION_RULES.DICTATORSHIP
    }
};

console.log('Начальные ресурсы:', agents2.map(a => a.economics.currentResources).join(', '));

const clanSystem2 = new ClanSystem();
clanSystem2._distributeDictatorship(clan2, connectionMatrix2, agents2);

console.log('Конечные ресурсы:', agents2.map(a => a.economics.currentResources.toFixed(1)).join(', '));

// Находим сильнейшего
let maxResources = 0;
let strongestIndex = -1;
agents2.forEach((agent, i) => {
    if (agent.economics.currentResources > maxResources) {
        maxResources = agent.economics.currentResources;
        strongestIndex = i;
    }
});

console.log(`Сильнейший агент: ${strongestIndex} с ${maxResources.toFixed(1)} ресурсами`);
console.log(`Остальные имеют минимум для выживания: ${agents2.filter((a, i) => i !== strongestIndex).every(a => a.economics.currentResources === 10) ? '✅' : '❌'}`);

// Тест 3: Полная симуляция с кланами
console.log('\n\n📊 Тест 3: Полная симуляция с кланами\n');

const agents3 = createTestAgents(15); // 3 клана по 5 агентов
const connectionMatrix3 = createConnectionMatrix(agents3);

const clanSystem3 = new ClanSystem({
    minClanSize: 3,
    densityThreshold: 0.5
});

// Идентифицируем кланы
const clans = clanSystem3.identifyClans(agents3, connectionMatrix3);
console.log(`Найдено кланов: ${clans.length}`);

// Для каждого клана принимаем решение и распределяем ресурсы
clans.forEach(clan => {
    clanSystem3.makeClanDecision(clan);
    console.log(`\nКлан ${clan.id + 1}:`);
    console.log(`  Размер: ${clan.members.length}`);
    console.log(`  Правило: ${clan.decision.rule}`);
    console.log(`  Подправило: ${clan.decision.subrule || 'нет'}`);
    
    const initialResources = clan.members.map(a => a.economics.currentResources);
    clanSystem3.distributeResources(clan, connectionMatrix3, agents3);
    const finalResources = clan.members.map(a => a.economics.currentResources);
    
    console.log(`  Ресурсы до: ${initialResources.map(r => r.toFixed(0)).join(', ')}`);
    console.log(`  Ресурсы после: ${finalResources.map(r => r.toFixed(1)).join(', ')}`);
});

// Статистика
const stats = clanSystem3.getClanStatistics();
console.log('\n📈 Итоговая статистика:');
console.log(`  Всего кланов: ${stats.totalClans}`);
console.log(`  Средний размер: ${stats.averageSize.toFixed(1)}`);
console.log(`  Средняя плотность: ${stats.averageDensity.toFixed(2)}`);
console.log(`  Всего ресурсов: ${stats.totalResources.toFixed(0)}`);

console.log('\n✅ Все тесты завершены!');
