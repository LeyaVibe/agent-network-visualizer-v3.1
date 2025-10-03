import { EconomicEngine } from './src/lib/economicEngine.js';
import { ClanSystem } from './src/lib/clanSystem.js';
import { ConflictMechanics } from './src/lib/conflictMechanics.js';

console.log('=== ТЕСТ: Реалистичный баланс экономики ===\n');

// Создаем экономический движок с новыми дефолтными параметрами
const engine = new EconomicEngine();

console.log('📊 Новые параметры баланса:');
console.log(`- Базовая продуктивность: ${engine.baseProductivity}`);
console.log(`- Минимум для выживания: ${engine.minSurvival}`);
console.log(`- Максимальный множитель: ${engine.maxMultiplier}x`);
console.log(`- Порог сильной связи: ${engine.strongConnectionThreshold}`);
console.log(`- Бонус от связи: ${(engine.connectionBonus * 100).toFixed(0)}%`);

// Создаем тестовых агентов с разным количеством связей
const agents = [];
const scenarios = [
    { name: 'Изолированный', connections: 0 },
    { name: 'Слабо связанный', connections: 2 },
    { name: 'Средне связанный', connections: 4 },
    { name: 'Хорошо связанный', connections: 6 },
    { name: 'Очень социальный', connections: 10 }
];

for (let i = 0; i < scenarios.length; i++) {
    agents.push({
        id: i,
        name: scenarios[i].name,
        economics: {
            alive: true,
            currentResources: 30,  // Новые начальные ресурсы
            productionHistory: [],
            consumptionHistory: []
        }
    });
}

// Создаем матрицу связей
const N = agents.length;
const connectionMatrix = Array(N).fill(null).map(() => Array(N).fill(0));

// Настраиваем связи согласно сценариям
for (let i = 0; i < N; i++) {
    const targetConnections = scenarios[i].connections;
    for (let j = 0; j < N; j++) {
        if (i !== j && j < targetConnections) {
            connectionMatrix[i][j] = 0.5; // Сильная связь
        }
    }
}

console.log('\n🎮 Симуляция 10 циклов:\n');

const cycleResults = [];

for (let cycle = 0; cycle < 10; cycle++) {
    // Производство
    agents.forEach((agent, i) => {
        if (agent.economics.alive) {
            const production = engine.calculateProduction(agent, i, connectionMatrix, agents);
            agent.economics.currentResources += production;
        }
    });

    // Потребление
    const consumptionResults = engine.processConsumption(agents);

    // Сохраняем результаты
    cycleResults.push({
        cycle,
        survived: consumptionResults.survived,
        died: consumptionResults.died,
        agents: agents.map(a => ({
            name: a.name,
            alive: a.economics.alive,
            resources: a.economics.currentResources
        }))
    });

    // Выводим результаты каждого цикла
    console.log(`Цикл ${cycle}:`);
    agents.forEach(agent => {
        const status = agent.economics.alive ? '✅' : '💀';
        const resources = agent.economics.alive ? 
            agent.economics.currentResources.toFixed(1) : '0.0';
        console.log(`  ${status} ${agent.name}: ${resources} ресурсов`);
    });
    console.log(`  → Выжило: ${consumptionResults.survived}, Умерло: ${consumptionResults.died}\n`);
}

console.log('\n📈 Итоговая статистика:\n');

// Подсчет выживаемости по типам агентов
const finalStats = agents.map((agent, i) => {
    const deathCycle = cycleResults.findIndex(r => !r.agents[i].alive);
    return {
        name: agent.name,
        connections: scenarios[i].connections,
        survived: agent.economics.alive,
        deathCycle: deathCycle >= 0 ? deathCycle : 'N/A',
        finalResources: agent.economics.currentResources.toFixed(1)
    };
});

console.log('| Тип агента | Связи | Статус | Цикл смерти | Финальные ресурсы |');
console.log('|------------|-------|--------|-------------|-------------------|');
finalStats.forEach(stat => {
    const status = stat.survived ? '✅ Жив' : '💀 Мертв';
    console.log(`| ${stat.name.padEnd(22)} | ${stat.connections.toString().padStart(5)} | ${status} | ${stat.deathCycle.toString().padStart(11)} | ${stat.finalResources.padStart(17)} |`);
});

// Анализ результатов
console.log('\n🔍 Анализ баланса:\n');

const totalAlive = agents.filter(a => a.economics.alive).length;
const totalDead = agents.filter(a => !a.economics.alive).length;
const survivalRate = (totalAlive / agents.length * 100).toFixed(1);

console.log(`Выживаемость: ${totalAlive}/${agents.length} (${survivalRate}%)`);
console.log(`Смертность: ${totalDead}/${agents.length} (${(100 - survivalRate)}%)`);

// Определяем минимальное количество связей для выживания
const minConnectionsToSurvive = finalStats
    .filter(s => s.survived)
    .reduce((min, s) => Math.min(min, s.connections), Infinity);

console.log(`\nМинимум связей для выживания: ${minConnectionsToSurvive}`);

// Оценка баланса
console.log('\n🎯 Оценка баланса:');

if (totalDead === 0) {
    console.log('❌ СЛИШКОМ ЛЕГКО - никто не умер');
    console.log('   Рекомендация: увеличить minSurvival или уменьшить baseProductivity');
} else if (totalDead === agents.length) {
    console.log('❌ СЛИШКОМ СЛОЖНО - все умерли');
    console.log('   Рекомендация: уменьшить minSurvival или увеличить baseProductivity');
} else if (totalDead >= 1 && totalDead <= 2) {
    console.log('✅ ОТЛИЧНО - реалистичный баланс!');
    console.log('   Изолированные и слабо связанные агенты умирают');
    console.log('   Социальные агенты выживают');
} else if (totalDead >= 3) {
    console.log('⚠️  ЖЕСТКО - высокая смертность');
    console.log('   Только очень социальные агенты выживают');
}

// Тест с полной симуляцией (150 агентов)
console.log('\n\n=== ТЕСТ: Полная симуляция (150 агентов) ===\n');

const fullAgents = [];
for (let i = 0; i < 150; i++) {
    fullAgents.push({
        id: i,
        economics: {
            alive: true,
            currentResources: 30,
            productionHistory: [],
            consumptionHistory: []
        }
    });
}

// Создаем случайную матрицу связей (реалистичная сеть)
const fullN = fullAgents.length;
const fullConnectionMatrix = Array(fullN).fill(null).map(() => Array(fullN).fill(0));

for (let i = 0; i < fullN; i++) {
    for (let j = i + 1; j < fullN; j++) {
        const strength = Math.random();
        fullConnectionMatrix[i][j] = fullConnectionMatrix[j][i] = strength;
    }
}

engine.initializeAgentEconomics(fullAgents);

console.log('Запуск симуляции на 30 циклов...\n');

const milestones = [0, 5, 10, 15, 20, 25, 30];
const fullResults = [];

for (let cycle = 0; cycle <= 30; cycle++) {
    // Производство
    fullAgents.forEach((agent, i) => {
        if (agent.economics.alive) {
            const production = engine.calculateProduction(agent, i, fullConnectionMatrix, fullAgents);
            agent.economics.currentResources += production;
        }
    });

    // Потребление
    const consumptionResults = engine.processConsumption(fullAgents);

    if (milestones.includes(cycle)) {
        const aliveCount = fullAgents.filter(a => a.economics.alive).length;
        const deadCount = fullAgents.filter(a => !a.economics.alive).length;
        const avgResources = fullAgents
            .filter(a => a.economics.alive)
            .reduce((sum, a) => sum + a.economics.currentResources, 0) / aliveCount;
        
        console.log(`Цикл ${cycle}: ${aliveCount} живых, ${deadCount} мертвых, средние ресурсы: ${avgResources.toFixed(1)}`);
        
        fullResults.push({
            cycle,
            alive: aliveCount,
            dead: deadCount,
            avgResources
        });
    }
}

const finalAlive = fullAgents.filter(a => a.economics.alive).length;
const finalDead = fullAgents.filter(a => !a.economics.alive).length;
const finalSurvivalRate = (finalAlive / fullAgents.length * 100).toFixed(1);

console.log('\n📊 Итоговая статистика полной симуляции:\n');
console.log(`Начальное количество: 150`);
console.log(`Финальное количество живых: ${finalAlive} (${finalSurvivalRate}%)`);
console.log(`Финальное количество мертвых: ${finalDead} (${(100 - finalSurvivalRate)}%)`);

console.log('\n🎯 Оценка баланса для полной симуляции:');

if (finalDead === 0) {
    console.log('❌ СЛИШКОМ ЛЕГКО - никто не умер за 30 циклов');
} else if (finalDead > 0 && finalDead < 30) {
    console.log('✅ ОТЛИЧНО - низкая смертность (0-20%)');
    console.log('   Баланс подходит для мирных сценариев');
} else if (finalDead >= 30 && finalDead < 75) {
    console.log('✅ ХОРОШО - средняя смертность (20-50%)');
    console.log('   Баланс подходит для реалистичных сценариев');
} else if (finalDead >= 75 && finalDead < 120) {
    console.log('⚠️  ЖЕСТКО - высокая смертность (50-80%)');
    console.log('   Баланс подходит для сложных сценариев');
} else {
    console.log('❌ СЛИШКОМ СЛОЖНО - критическая смертность (>80%)');
}

console.log('\n✅ Тестирование завершено!');
