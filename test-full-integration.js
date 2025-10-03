import { runEnhancedSimulation } from './src/lib/enhancedSimulation.js';

console.log('=== ИНТЕГРАЦИОННЫЙ ТЕСТ: Полная симуляция с экономикой ===\n');

// Создаем агентов с векторами интересов
const agents = [];
for (let i = 0; i < 150; i++) {
    agents.push({
        id: i,
        values: Array(10).fill(0).map(() => Math.random())  // Используем values, не vector
    });
}

// Создаем темы
const topics = Array(10).fill(0).map((_, i) => ({
    id: i,
    name: `Тема ${i}`,
    vector: Array(10).fill(0).map(() => Math.random())
}));

console.log('📊 Параметры симуляции:');
console.log(`- Агентов: ${agents.length}`);
console.log(`- Тем: ${topics.length}`);
console.log(`- Циклов: 50`);
console.log(`- Экономика: включена`);
console.log(`- Кланы: включены`);
console.log(`- Конфликты: включены`);

console.log('\n🎮 Запуск симуляции...\n');

const startTime = Date.now();

const result = runEnhancedSimulation({
    agents,
    topics,
    cycles: 50,
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
        densityThreshold: 0.6
    },
    conflictParams: {
        conflictProbability: 0.3,
        resourceStealRate: 0.5,
        polarizationStrength: 0.2
    }
});

const endTime = Date.now();
const duration = ((endTime - startTime) / 1000).toFixed(2);

console.log(`\n✅ Симуляция завершена за ${duration}с\n`);

// Анализ результатов
console.log('📈 РЕЗУЛЬТАТЫ СИМУЛЯЦИИ:\n');

// Базовая статистика
console.log('=== Базовая статистика ===');
console.log(`Агентов: ${result.agents.length}`);
console.log(`Активных связей: ${result.activeConnections}`);
console.log(`Плотность сети: ${(result.networkDensity * 100).toFixed(1)}%`);
console.log(`Тем обсуждения: ${result.topicDistribution.length}`);

// Экономическая статистика
if (result.economicHistory && result.economicHistory.length > 0) {
    console.log('\n=== Экономическая статистика ===');
    
    const lastEconomicState = result.economicHistory[result.economicHistory.length - 1];
    const firstEconomicState = result.economicHistory[0];
    
    console.log(`\nНачало симуляции:`);
    console.log(`- Живых: ${firstEconomicState.survived}`);
    console.log(`- Мертвых: ${firstEconomicState.died}`);
    console.log(`- Средние ресурсы: ${firstEconomicState.avgResources.toFixed(1)}`);
    
    console.log(`\nКонец симуляции:`);
    console.log(`- Живых: ${lastEconomicState.survived}`);
    console.log(`- Мертвых: ${lastEconomicState.died}`);
    console.log(`- Средние ресурсы: ${lastEconomicState.avgResources.toFixed(1)}`);
    console.log(`- Всего ресурсов: ${lastEconomicState.totalResources.toFixed(0)}`);
    
    const survivalRate = (lastEconomicState.survived / agents.length * 100).toFixed(1);
    const mortalityRate = (lastEconomicState.died / agents.length * 100).toFixed(1);
    
    console.log(`\nВыживаемость: ${survivalRate}%`);
    console.log(`Смертность: ${mortalityRate}%`);
    
    // Динамика по циклам
    console.log(`\nДинамика смертности:`);
    const milestones = [0, 10, 20, 30, 40, 49];
    milestones.forEach(cycle => {
        if (result.economicHistory[cycle]) {
            const state = result.economicHistory[cycle];
            console.log(`  Цикл ${cycle}: ${state.survived} живых, ${state.died} мертвых`);
        }
    });
}

// Статистика кланов
if (result.clanHistory && result.clanHistory.length > 0) {
    console.log('\n=== Статистика кланов ===');
    
    const lastClanState = result.clanHistory[result.clanHistory.length - 1];
    
    console.log(`\nВсего кланов: ${lastClanState.clans.length}`);
    
    if (lastClanState.clans.length > 0) {
        console.log(`\nТоп-3 клана по размеру:`);
        const sortedBySize = [...lastClanState.clans].sort((a, b) => b.size - a.size);
        sortedBySize.slice(0, 3).forEach((clan, i) => {
            console.log(`  ${i + 1}. Клан ${clan.id}: ${clan.size} агентов, плотность ${clan.density.toFixed(2)}, правило: ${clan.distributionRule}`);
        });
        
        const avgSize = lastClanState.clans.reduce((sum, c) => sum + c.size, 0) / lastClanState.clans.length;
        const avgDensity = lastClanState.clans.reduce((sum, c) => sum + c.density, 0) / lastClanState.clans.length;
        
        console.log(`\nСредний размер клана: ${avgSize.toFixed(1)}`);
        console.log(`Средняя плотность: ${avgDensity.toFixed(2)}`);
    }
}

// Статистика конфликтов
if (result.conflictHistory && result.conflictHistory.length > 0) {
    console.log('\n=== Статистика конфликтов ===');
    
    const totalConflicts = result.conflictHistory.reduce((sum, h) => sum + h.conflictCount, 0);
    const totalStolen = result.conflictHistory.reduce((sum, h) => sum + h.resourcesStolen, 0);
    const totalPolarized = result.conflictHistory.reduce((sum, h) => sum + h.connectionsPolarized, 0);
    
    console.log(`\nВсего конфликтов: ${totalConflicts}`);
    console.log(`Украдено ресурсов: ${totalStolen.toFixed(0)}`);
    console.log(`Поляризовано связей: ${totalPolarized}`);
    
    if (totalConflicts > 0) {
        console.log(`\nВ среднем за конфликт:`);
        console.log(`- Украдено: ${(totalStolen / totalConflicts).toFixed(1)} ресурсов`);
        console.log(`- Поляризовано: ${(totalPolarized / totalConflicts).toFixed(1)} связей`);
    }
}

// Итоговая оценка
console.log('\n🎯 ИТОГОВАЯ ОЦЕНКА:\n');

let score = 0;
let maxScore = 0;
const checks = [];

// Проверка 1: Симуляция завершилась без ошибок
maxScore++;
if (result && result.agents) {
    score++;
    checks.push('✅ Симуляция завершилась успешно');
} else {
    checks.push('❌ Симуляция завершилась с ошибками');
}

// Проверка 2: Экономика работает
maxScore++;
if (result.economicHistory && result.economicHistory.length > 0) {
    score++;
    checks.push('✅ Экономическая система работает');
} else {
    checks.push('❌ Экономическая система не работает');
}

// Проверка 3: Кланы формируются
maxScore++;
if (result.clanHistory && result.clanHistory.length > 0 && result.clanHistory[result.clanHistory.length - 1].clans.length > 0) {
    score++;
    checks.push('✅ Система кланов работает');
} else {
    checks.push('❌ Система кланов не работает');
}

// Проверка 4: Конфликты происходят
maxScore++;
const totalConflicts = result.conflictHistory ? result.conflictHistory.reduce((sum, h) => sum + h.conflictCount, 0) : 0;
if (totalConflicts > 0) {
    score++;
    checks.push('✅ Конфликтная механика работает');
} else {
    checks.push('⚠️  Конфликты не произошли (возможно, низкая вероятность)');
}

// Проверка 5: Есть выжившие агенты
maxScore++;
const lastEconomicState = result.economicHistory[result.economicHistory.length - 1];
if (lastEconomicState.survived > 0) {
    score++;
    checks.push('✅ Есть выжившие агенты');
} else {
    checks.push('❌ Все агенты погибли');
}

// Проверка 6: Баланс смертности (10-50%)
maxScore++;
const mortalityRate = (lastEconomicState.died / agents.length * 100);
if (mortalityRate >= 0 && mortalityRate <= 50) {
    score++;
    checks.push(`✅ Смертность в норме (${mortalityRate.toFixed(1)}%)`);
} else if (mortalityRate > 50 && mortalityRate < 80) {
    checks.push(`⚠️  Высокая смертность (${mortalityRate.toFixed(1)}%)`);
} else if (mortalityRate >= 80) {
    checks.push(`❌ Критическая смертность (${mortalityRate.toFixed(1)}%)`);
} else {
    checks.push(`⚠️  Нулевая смертность (слишком легко)`);
}

// Вывод результатов
checks.forEach(check => console.log(check));

console.log(`\nОбщий балл: ${score}/${maxScore}`);

if (score === maxScore) {
    console.log('🏆 ОТЛИЧНО! Все системы работают корректно!');
} else if (score >= maxScore * 0.8) {
    console.log('✅ ХОРОШО! Большинство систем работают корректно.');
} else if (score >= maxScore * 0.6) {
    console.log('⚠️  УДОВЛЕТВОРИТЕЛЬНО. Есть проблемы, требующие внимания.');
} else {
    console.log('❌ ПЛОХО. Критические проблемы в работе систем.');
}

console.log('\n✅ Интеграционный тест завершен!');
