import { EconomicEngine } from './src/lib/economicEngine.js';

console.log('=== ТЕСТ: Механика смерти агентов ===\n');

// Создаем экономический движок с жесткими параметрами
const engine = new EconomicEngine({
    baseProductivity: 5,        // Низкое производство
    minSurvival: 10,            // Высокое потребление
    maxMultiplier: 1.5,         // Низкий бонус от связей
    strongConnectionThreshold: 0.5,
    connectionBonus: 0.05       // Маленький бонус (5% за связь)
});

// Создаем тестовых агентов
const agents = [];
for (let i = 0; i < 10; i++) {
    agents.push({
        id: i,
        economics: {
            alive: true,
            currentResources: i < 5 ? 15 : 5, // Первые 5 с запасом, остальные на грани
            productionHistory: [],
            consumptionHistory: []
        }
    });
}

// Создаем пустую матрицу связей (нет бонусов)
const connectionMatrix = Array(10).fill(null).map(() => Array(10).fill(0));

console.log('Начальное состояние:');
agents.forEach(agent => {
    console.log(`Агент ${agent.id}: ${agent.economics.currentResources} ресурсов, живой: ${agent.economics.alive}`);
});

console.log('\n--- Цикл 1: Производство и потребление ---\n');

// Производство (без связей = базовая продуктивность)
agents.forEach((agent, i) => {
    if (agent.economics.alive) {
        const production = engine.calculateProduction(agent, i, connectionMatrix, agents);
        agent.economics.currentResources += production;
        console.log(`Агент ${agent.id}: произвел ${production.toFixed(2)}, всего ${agent.economics.currentResources.toFixed(2)}`);
    }
});

// Потребление
const consumptionResults = engine.processConsumption(agents);

console.log('\nРезультаты потребления:');
console.log(`- Выжило: ${consumptionResults.survived}`);
console.log(`- Умерло: ${consumptionResults.died}`);
console.log(`- Всего потреблено: ${consumptionResults.totalConsumed}`);

console.log('\nСостояние после цикла 1:');
agents.forEach(agent => {
    console.log(`Агент ${agent.id}: ${agent.economics.currentResources.toFixed(2)} ресурсов, живой: ${agent.economics.alive}`);
});

console.log('\n--- Цикл 2: Производство и потребление ---\n');

// Второй цикл
agents.forEach((agent, i) => {
    if (agent.economics.alive) {
        const production = engine.calculateProduction(agent, i, connectionMatrix, agents);
        agent.economics.currentResources += production;
        console.log(`Агент ${agent.id}: произвел ${production.toFixed(2)}, всего ${agent.economics.currentResources.toFixed(2)}`);
    }
});

const consumptionResults2 = engine.processConsumption(agents);

console.log('\nРезультаты потребления:');
console.log(`- Выжило: ${consumptionResults2.survived}`);
console.log(`- Умерло: ${consumptionResults2.died}`);
console.log(`- Всего потреблено: ${consumptionResults2.totalConsumed}`);

console.log('\nФинальное состояние:');
agents.forEach(agent => {
    console.log(`Агент ${agent.id}: ${agent.economics.currentResources.toFixed(2)} ресурсов, живой: ${agent.economics.alive}`);
});

console.log('\n=== ВЫВОД ===');
const totalAlive = agents.filter(a => a.economics.alive).length;
const totalDead = agents.filter(a => !a.economics.alive).length;
console.log(`Живых: ${totalAlive}, Мертвых: ${totalDead}`);

if (totalDead > 0) {
    console.log('✅ Механика смерти работает!');
} else {
    console.log('❌ Никто не умер - нужно проверить баланс параметров');
}
