// Тестовый скрипт для проверки экономической модели
import { EconomicEngine } from './src/lib/economicEngine.js';
import { ClanSystem } from './src/lib/clanSystem.js';

// Создаем тестовых агентов
const agents = Array.from({ length: 10 }, (_, i) => ({
    id: i,
    cluster: i % 3,
    vector: Array.from({ length: 5 }, () => Math.random()),
    opinions: {},
    connections: []
}));

// Создаем связи между агентами
for (let i = 0; i < agents.length; i++) {
    for (let j = i + 1; j < agents.length; j++) {
        if (Math.random() > 0.5) {
            const strength = Math.random();
            agents[i].connections.push({ targetId: j, strength });
            agents[j].connections.push({ targetId: i, strength });
        }
    }
}

console.log('=== Тест экономической модели ===');
console.log('Агентов:', agents.length);

// Инициализация экономики
const economicParams = {
    baseProductivity: 10,
    minSurvival: 10,
    maxMultiplier: 2.0,
    strongConnectionThreshold: 0.3,
    connectionBonus: 0.1
};

const economicEngine = new EconomicEngine(economicParams);
economicEngine.initializeAgents(agents);

console.log('\n=== Начальное состояние ===');
agents.forEach(agent => {
    console.log(`Агент ${agent.id}: ресурсы = ${agent.resources?.toFixed(1)}, жив = ${agent.alive}`);
});

// Запуск экономического цикла
console.log('\n=== Экономический цикл 1 ===');
const result1 = economicEngine.runEconomicCycle(agents);
console.log('Результат:', result1);

agents.forEach(agent => {
    console.log(`Агент ${agent.id}: ресурсы = ${agent.resources?.toFixed(1)}, жив = ${agent.alive}`);
});

// Тест клановой системы
console.log('\n=== Тест клановой системы ===');
const clanParams = {
    minClanSize: 2,
    densityThreshold: 0.3
};

const clanSystem = new ClanSystem(clanParams);
const clans = clanSystem.detectClans(agents);

console.log('Обнаружено кланов:', clans.length);
clans.forEach((clan, i) => {
    console.log(`Клан ${i}: размер = ${clan.members.length}, плотность = ${clan.density.toFixed(2)}`);
});

console.log('\n=== Тест завершен ===');
