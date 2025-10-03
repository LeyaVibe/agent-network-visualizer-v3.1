# Математический аудит экономической модели

## 1. Проверка economicEngine.js

### ✅ Формула производства (КОРРЕКТНА)

```javascript
production = baseProductivity * (1 + connectionBonus)
connectionBonus = min(strongConnections * this.connectionBonus, maxMultiplier - 1.0)
```

**Пример расчета:**
- baseProductivity = 10
- strongConnections = 5
- this.connectionBonus = 0.1 (10%)
- maxMultiplier = 2.0

```
connectionBonus = min(5 * 0.1, 2.0 - 1.0) = min(0.5, 1.0) = 0.5
production = 10 * (1 + 0.5) = 10 * 1.5 = 15
```

✅ **Математика корректна**

### ⚠️ ПРОБЛЕМА 1: Подсчет сильных связей

```javascript
if (connectionMatrix && connectionMatrix[agentIndex]) {
    connectionMatrix[agentIndex].forEach(strength => {
        if (strength >= this.strongConnectionThreshold) {
            strongConnections++;
        }
    });
}
```

**Проблема:** Код предполагает, что `connectionMatrix[agentIndex]` это массив, но нужно проверить:
1. Какая структура у connectionMatrix?
2. Включает ли она саму связь агента с собой (self-loop)?
3. Считаются ли связи дважды (A→B и B→A)?

### ✅ Формула потребления (КОРРЕКТНА)

```javascript
consumption = this.minSurvival
if (agent.economics.currentResources >= consumption) {
    agent.economics.currentResources -= consumption;
} else {
    agent.economics.alive = false;
}
```

✅ **Логика корректна**

### ✅ Расчет средних ресурсов (КОРРЕКТЕН)

```javascript
totalResources = aliveAgents.reduce((sum, a) => sum + a.economics.currentResources, 0)
averageResources = totalResources / aliveAgents.length
```

✅ **Математика корректна**

---

## 2. Проверка clanSystem.js (требуется чтение файла)

Необходимо проверить:
- Формулу плотности связей
- Расчет силы клана
- Алгоритм голосования
- Распределение ресурсов

---

## 3. Проверка conflictMechanics.js (требуется чтение файла)

Необходимо проверить:
- Формулу поляризации связей
- Расчет украденных ресурсов
- Распределение украденного

---

## 4. Проверка формирования связей (требуется чтение enhancedSimulation.js)

Необходимо проверить:
- Как формируется connectionMatrix
- Симметричность матрицы
- Нормализация значений
- Порог отсечения слабых связей

---

## Статус проверки

- [x] economicEngine.js - базовые формулы
- [ ] economicEngine.js - структура connectionMatrix
- [ ] clanSystem.js
- [ ] conflictMechanics.js
- [ ] enhancedSimulation.js - формирование связей


## 2. Проверка clanSystem.js

### ⚠️ ПРОБЛЕМА 2: Формула плотности связей (НЕКОРРЕКТНА!)

```javascript
_calculateDensity(agentIndices, connectionMatrix) {
    let totalConnections = 0;
    let possibleConnections = 0;
    
    for (let i = 0; i < agentIndices.length; i++) {
        for (let j = i + 1; j < agentIndices.length; j++) {
            totalConnections += connectionMatrix[idx1][idx2];
            possibleConnections++;
        }
    }
    
    return possibleConnections > 0 ? totalConnections / possibleConnections : 0;
}
```

**ОШИБКА:** Формула плотности неправильная!

**Правильная формула плотности:**
```
density = actualConnections / possibleConnections
```

где:
- `actualConnections` = количество связей (не сумма их весов!)
- `possibleConnections` = n * (n-1) / 2` для n агентов

**Текущий код считает:**
```
density = sumOfWeights / numberOfPairs
```

Это **средний вес связей**, а не плотность!

**Пример:**
- 3 агента: A, B, C
- Связи: A-B (0.8), A-C (0.9), B-C (0.0)
- Текущий расчет: (0.8 + 0.9 + 0.0) / 3 = 0.567
- Правильный расчет: 2 / 3 = 0.667 (две связи из трех возможных)

**Исправление:**
```javascript
_calculateDensity(agentIndices, connectionMatrix, threshold = 0.1) {
    if (agentIndices.length < 2) return 0;
    
    let actualConnections = 0;
    const possibleConnections = (agentIndices.length * (agentIndices.length - 1)) / 2;
    
    for (let i = 0; i < agentIndices.length; i++) {
        for (let j = i + 1; j < agentIndices.length; j++) {
            const idx1 = agentIndices[i];
            const idx2 = agentIndices[j];
            
            if (connectionMatrix[idx1] && connectionMatrix[idx1][idx2] !== undefined) {
                if (connectionMatrix[idx1][idx2] >= threshold) {
                    actualConnections++;
                }
            }
        }
    }
    
    return actualConnections / possibleConnections;
}
```

### ⚠️ ПРОБЛЕМА 3: Формула силы клана (НЕКОРРЕКТНА!)

```javascript
_calculateClanStrength(agentIndices, connectionMatrix) {
    let sumOfConnections = 0;
    
    for (let i = 0; i < agentIndices.length; i++) {
        for (let j = i + 1; j < agentIndices.length; j++) {
            sumOfConnections += connectionMatrix[idx1][idx2];
        }
    }
    
    return agentIndices.length * sumOfConnections;
}
```

**Формула:** `strength = memberCount * sumOfInternalConnections`

**Проблема:** Формула не сбалансирована!

**Пример:**
- Клан A: 10 агентов, сумма связей = 5 → strength = 10 * 5 = 50
- Клан B: 5 агентов, сумма связей = 15 → strength = 5 * 15 = 75

Клан B сильнее, хотя у него меньше членов. Это может быть правильно, но нужно проверить логику.

**Альтернативная формула (более сбалансированная):**
```javascript
strength = memberCount + sumOfInternalConnections
// или
strength = memberCount * averageConnectionStrength
```

**Текущая формула дает квадратичный рост** при увеличении размера и связей.

### ✅ Формула силы агента (КОРРЕКТНА)

```javascript
_calculateAgentStrength(agentIndex, clanMemberIndices, connectionMatrix) {
    let strength = 0;
    
    clanMemberIndices.forEach(otherIndex => {
        if (otherIndex !== agentIndex) {
            strength += connectionMatrix[agentIndex][otherIndex];
        }
    });
    
    return strength;
}
```

✅ **Сумма связей агента с другими членами клана - корректно**

### ⚠️ ПРОБЛЕМА 4: Распределение ресурсов при диктатуре

```javascript
_distributeDictatorship(clan, connectionMatrix, agents) {
    // Находим сильнейшего
    // ...
    
    // Обнуляем ресурсы всех
    clan.members.forEach(agent => {
        agent.economics.currentResources = 0;
    });
    
    // Отдаем все сильнейшему
    strongestAgent.economics.currentResources = totalResources;
}
```

**Проблема:** Слабые агенты остаются с 0 ресурсами!

На следующем цикле потребления они **все умрут** (нужно minSurvival ресурсов).

**Это может быть задумано**, но очень жестоко. Возможно, стоит оставить минимум для выживания:

```javascript
// Оставляем минимум для выживания всем
clan.members.forEach(agent => {
    agent.economics.currentResources = this.minSurvival;
});

// Остаток отдаем сильнейшему
const remainder = totalResources - (clan.members.length * this.minSurvival);
strongestAgent.economics.currentResources += Math.max(0, remainder);
```

### ✅ Распределение при демократии (КОРРЕКТНО)

```javascript
const perAgent = totalResources / clan.members.length;
clan.members.forEach(agent => {
    agent.economics.currentResources = perAgent;
});
```

✅ **Равное распределение - корректно**

### ⚠️ ПРОБЛЕМА 5: Распределение при балансе сил

```javascript
_distributePowerBalance(clan, connectionMatrix, agents) {
    const strengths = clan.members.map(/* ... */);
    const totalStrength = strengths.reduce((a, b) => a + b, 0);
    
    if (totalStrength === 0) {
        this._distributeDemocracy(clan, agents);
        return;
    }
    
    const totalResources = clan.members.reduce(/* ... */);
    
    clan.members.forEach((agent, idx) => {
        const share = strengths[idx] / totalStrength;
        agent.economics.currentResources = totalResources * share;
    });
}
```

**Проблема:** Если у агента `strength = 0`, он получает 0 ресурсов и умрет!

**Решение:** Гарантировать минимум для выживания:

```javascript
const minPerAgent = this.minSurvival || 10;
const reservedResources = clan.members.length * minPerAgent;
const distributedResources = Math.max(0, totalResources - reservedResources);

// Сначала даем минимум всем
clan.members.forEach(agent => {
    agent.economics.currentResources = minPerAgent;
});

// Остаток распределяем пропорционально силе
if (distributedResources > 0 && totalStrength > 0) {
    clan.members.forEach((agent, idx) => {
        const share = strengths[idx] / totalStrength;
        agent.economics.currentResources += distributedResources * share;
    });
}
```

### ✅ Поиск слабейшего клана (КОРРЕКТЕН)

```javascript
findWeakestClan() {
    let weakestClan = this.clans[0];
    let minStrength = weakestClan.strength;
    
    this.clans.forEach(clan => {
        if (clan.strength < minStrength) {
            minStrength = clan.strength;
            weakestClan = clan;
        }
    });
    
    return weakestClan;
}
```

✅ **Логика корректна**

## 3. Проверка conflictMechanics.js

### ⚠️ ПРОБЛЕМА 6: Формула кражи ресурсов (ЛОГИЧЕСКАЯ ОШИБКА!)

```javascript
_stealResources(attackerClan, victimClan) {
    victimClan.members.forEach(victim => {
        // Текущие ресурсы
        const currentResources = victim.economics.currentResources;
        
        // Часть накопленных ресурсов
        const accumulatedSteal = victim.economics.accumulatedResources * this.resourceStealRatio;
        
        // Общая сумма кражи
        const stolen = currentResources + accumulatedSteal;
        
        // Отнимаем у жертвы
        victim.economics.currentResources = 0;
        victim.economics.accumulatedResources -= accumulatedSteal;
    });
}
```

**КРИТИЧЕСКАЯ ПРОБЛЕМА:** Жертвы остаются с **0 текущих ресурсов**!

На следующем цикле потребления **ВСЕ ЖЕРТВЫ УМРУТ** (нужно minSurvival ресурсов).

**Это геноцид, а не конфликт!**

**Варианты исправления:**

**Вариант 1: Оставить минимум для выживания**
```javascript
const stolen = Math.max(0, currentResources - minSurvival) + accumulatedSteal;
victim.economics.currentResources = Math.max(minSurvival, currentResources - stolen);
```

**Вариант 2: Красть только часть текущих ресурсов**
```javascript
const currentSteal = currentResources * 0.5; // Красть 50% текущих
const stolen = currentSteal + accumulatedSteal;
victim.economics.currentResources -= currentSteal;
```

### ⚠️ ПРОБЛЕМА 7: Распределение украденного (НЕСПРАВЕДЛИВО!)

```javascript
const perAttacker = totalStolen / attackerClan.members.length;

attackerClan.members.forEach(attacker => {
    attacker.economics.currentResources += perAttacker;
});
```

**Проблема:** Распределение **поровну**, а не пропорционально силе!

Согласно гайду, должно быть: "Украденные ресурсы распределяются **пропорционально силе атакующих**"

**Исправление:**
```javascript
// Рассчитываем силу каждого атакующего
const strengths = attackerClan.members.map((attacker, idx) => {
    const agentIndex = agents.indexOf(attacker);
    return this._calculateAgentStrength(agentIndex, attackerClan.memberIndices, connectionMatrix);
});

const totalStrength = strengths.reduce((a, b) => a + b, 0);

if (totalStrength > 0) {
    attackerClan.members.forEach((attacker, idx) => {
        const share = strengths[idx] / totalStrength;
        attacker.economics.currentResources += totalStolen * share;
    });
} else {
    // Если нет связей, распределяем поровну
    const perAttacker = totalStolen / attackerClan.members.length;
    attackerClan.members.forEach(attacker => {
        attacker.economics.currentResources += perAttacker;
    });
}
```

### ⚠️ ПРОБЛЕМА 8: Поляризация связей (ДУБЛИРОВАНИЕ!)

```javascript
_polarizeConnections(attackerClan, victimClan, connectionMatrix, agents) {
    attackerClan.members.forEach(attacker => {
        victimClan.members.forEach(victim => {
            // Ослабляем связь в обе стороны
            if (connectionMatrix[attackerIndex][victimIndex] !== undefined) {
                connectionMatrix[attackerIndex][victimIndex] /= this.polarizationFactor;
                polarizedCount++;
            }
            
            if (connectionMatrix[victimIndex][attackerIndex] !== undefined) {
                connectionMatrix[victimIndex][attackerIndex] /= this.polarizationFactor;
                polarizedCount++;
            }
        });
    });
}
```

**Проблема:** Если матрица **симметричная**, связь ослабляется **дважды**!

**Пример:**
- Связь A-B изначально = 0.6
- После поляризации ÷3: 
  - connectionMatrix[A][B] = 0.6 / 3 = 0.2
  - connectionMatrix[B][A] = 0.6 / 3 = 0.2 (если была симметрична)

Это правильно, **если матрица симметричная**.

Но `polarizedCount` считается **дважды** для каждой связи!

**Исправление:**
```javascript
// Считаем только в одну сторону
if (attackerIndex < victimIndex) {
    if (connectionMatrix[attackerIndex][victimIndex] !== undefined) {
        connectionMatrix[attackerIndex][victimIndex] /= this.polarizationFactor;
        polarizedCount++;
    }
    
    if (connectionMatrix[victimIndex][attackerIndex] !== undefined) {
        connectionMatrix[victimIndex][attackerIndex] /= this.polarizationFactor;
    }
}
```

### ✅ Логика инициации конфликта (КОРРЕКТНА)

```javascript
shouldInitiateConflict(clan) {
    return clan.decision && clan.decision.rule === DISTRIBUTION_RULES.LAWLESSNESS;
}
```

✅ **Логика корректна**

### ✅ Поиск слабейшего клана (КОРРЕКТЕН)

```javascript
_findWeakestClan(clans) {
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
```

✅ **Логика корректна**

### ✅ Статистика конфликтов (КОРРЕКТНА)

```javascript
getConflictStats() {
    const totalResourcesStolen = this.conflictHistory.reduce(
        (sum, c) => sum + c.stolenResources, 0
    );
    // ...
}
```

✅ **Расчеты корректны**

## 4. Проверка enhancedSimulation.js и формирования связей

### ✅ Инициализация матрицы связей (КОРРЕКТНА)

```javascript
const connections = Array(N).fill().map(() => Array(N).fill(0));

for (let i = 0; i < N; i++) {
    for (let j = i + 1; j < N; j++) {
        connections[i][j] = connections[j][i] = 0.1 + Math.random() * 0.2;
    }
}
```

**Анализ:**
- Создается **симметричная** матрица N×N
- Диагональ = 0 (нет self-loops)
- Начальные связи: 0.1-0.3 (слабые)
- `connections[i][j] = connections[j][i]` - симметрия соблюдается

✅ **Математика корректна**

### ✅ Обновление связей в социальном цикле (КОРРЕКТНО)

```javascript
if (opinionDifference < threshold) {
    const strengthIncrease = 0.15 + Math.random() * 0.1; // 0.15-0.25
    connections[i][j] = connections[j][i] = Math.min(1, currentConnection + strengthIncrease);
} else {
    const strengthDecrease = 0.08 + Math.random() * 0.05; // 0.08-0.13
    connections[i][j] = connections[j][i] = Math.max(0, currentConnection - strengthDecrease);
}
```

**Анализ:**
- Симметричное обновление: `connections[i][j] = connections[j][i]`
- Ограничение диапазона: [0, 1]
- Усиление > ослабление (0.15-0.25 vs 0.08-0.13)

✅ **Логика корректна, симметрия сохраняется**

### ⚠️ ПРОБЛЕМА 9: Подсчет сильных связей в economicEngine

**Возвращаемся к economicEngine.js:**

```javascript
calculateProduction(agent, connectionMatrix, agentIndex) {
    let strongConnections = 0;
    
    if (connectionMatrix && connectionMatrix[agentIndex]) {
        connectionMatrix[agentIndex].forEach(strength => {
            if (strength >= this.strongConnectionThreshold) {
                strongConnections++;
            }
        });
    }
    
    // ...
}
```

**ПРОБЛЕМА:** `forEach` перебирает **ВСЕ** элементы строки, включая:
1. `connectionMatrix[agentIndex][agentIndex]` - связь с самим собой (= 0)
2. Связи с **мертвыми** агентами

**Исправление:**

```javascript
calculateProduction(agent, connectionMatrix, agentIndex, agents) {
    let strongConnections = 0;
    
    if (connectionMatrix && connectionMatrix[agentIndex]) {
        for (let j = 0; j < connectionMatrix[agentIndex].length; j++) {
            if (j === agentIndex) continue; // Пропускаем self-loop
            
            // Проверяем, что другой агент жив
            if (agents[j].economics && !agents[j].economics.alive) continue;
            
            const strength = connectionMatrix[agentIndex][j];
            if (strength >= this.strongConnectionThreshold) {
                strongConnections++;
            }
        }
    }
    
    // ...
}
```

### ⚠️ ПРОБЛЕМА 10: Интервал экономических циклов

```javascript
const ECONOMIC_CYCLE_INTERVAL = 5; // Каждые 5 циклов

for (let cycle = 0; cycle < cycles; cycle++) {
    const isSocialCycle = cycle % ECONOMIC_CYCLE_INTERVAL !== 0;
    
    if (isSocialCycle) {
        executeSocialCycle(...);
    } else {
        executeEconomicCycle(...);
    }
}
```

**Проблема:** Интервал **захардкожен** в константе!

Но в UI есть параметр "Интервал экономических циклов" (economicCycleInterval).

**Исправление:**

```javascript
export function runEnhancedSimulation(params) {
    const {
        // ...
        economicParams = {},
    } = params;
    
    const economicCycleInterval = economicParams.economicCycleInterval || 5;
    
    // ...
    
    for (let cycle = 0; cycle < cycles; cycle++) {
        const isSocialCycle = cycle % economicCycleInterval !== 0;
        // ...
    }
}
```

### ✅ Порядок экономического цикла (КОРРЕКТЕН)

```javascript
function executeEconomicCycle(...) {
    // 1. Производство и потребление
    const economicResult = economicEngine.executeEconomicCycle(agents, connections);
    
    // 2. Идентификация кланов
    const clans = clanSystem.identifyClans(agents, connections);
    
    // 3. Принятие решений
    clans.forEach(clan => clanSystem.makeClanDecision(clan));
    
    // 4. Конфликты
    const conflicts = conflictMechanics.processConflicts(clans, connections, agents);
    
    // 5. Распределение ресурсов
    clans.forEach(clan => {
        if (clan.decision.rule !== 'lawlessness') {
            clanSystem.distributeResources(clan, connections, agents);
        }
    });
}
```

✅ **Порядок логичен:**
1. Сначала производство/потребление (базовая экономика)
2. Затем формирование кланов
3. Голосование за правила
4. Конфликты (если выбран беспредел)
5. Распределение ресурсов (если не беспредел)

### ⚠️ ПРОБЛЕМА 11: Пропуск мертвых агентов в социальном цикле

```javascript
function executeSocialCycle(agents, topics, connections, threshold) {
    for (let interaction = 0; interaction < numInteractions; interaction++) {
        const i = Math.floor(Math.random() * N);
        const j = Math.floor(Math.random() * N);
        
        // Пропускаем мертвых агентов
        if (agent1.economics && !agent1.economics.alive) continue;
        if (agent2.economics && !agent2.economics.alive) continue;
        
        // ... взаимодействие ...
    }
}
```

**Проблема:** Мертвые агенты **пропускаются**, но их индексы все еще **выбираются случайно**.

Это означает, что часть итераций **тратится впустую**.

**Пример:**
- 150 агентов, 100 умерло
- numInteractions = 150 * 2 = 300
- Но ~200 итераций будут пропущены (выбран мертвый агент)
- Реальных взаимодействий: ~100 вместо 300

**Исправление:**

```javascript
function executeSocialCycle(agents, topics, connections, threshold) {
    // Получаем индексы живых агентов
    const aliveIndices = agents
        .map((agent, idx) => ({ agent, idx }))
        .filter(({ agent }) => !agent.economics || agent.economics.alive)
        .map(({ idx }) => idx);
    
    if (aliveIndices.length < 2) return; // Недостаточно живых агентов
    
    const numInteractions = Math.floor(aliveIndices.length * 2);
    
    for (let interaction = 0; interaction < numInteractions; interaction++) {
        const i = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
        const j = aliveIndices[Math.floor(Math.random() * aliveIndices.length)];
        
        if (i === j) continue;
        
        // ... взаимодействие ...
    }
}
```

---

## Сводка найденных проблем

### Критические (влияют на результаты):

1. ❌ **ПРОБЛЕМА 2**: Формула плотности кланов считает средний вес, а не плотность
2. ❌ **ПРОБЛЕМА 6**: Кража ресурсов оставляет жертв с 0 ресурсов (геноцид)
3. ❌ **ПРОБЛЕМА 7**: Распределение украденного поровну, а не по силе
4. ❌ **ПРОБЛЕМА 9**: Подсчет сильных связей включает self-loop и мертвых агентов
5. ❌ **ПРОБЛЕМА 10**: Интервал экономических циклов игнорирует параметр из UI

### Важные (влияют на баланс):

6. ⚠️ **ПРОБЛЕМА 3**: Формула силы клана может быть несбалансированной
7. ⚠️ **ПРОБЛЕМА 4**: Диктатура убивает всех слабых агентов
8. ⚠️ **ПРОБЛЕМА 5**: Баланс сил может оставить агентов без ресурсов
9. ⚠️ **ПРОБЛЕМА 11**: Мертвые агенты тратят итерации социальных циклов

### Незначительные (косметические):

10. ⚠️ **ПРОБЛЕМА 8**: Подсчет поляризованных связей удваивается

---

## Рекомендации по приоритетам исправления

**Высокий приоритет:**
- Проблемы 2, 6, 7, 9, 10

**Средний приоритет:**
- Проблемы 4, 5, 11

**Низкий приоритет:**
- Проблемы 3, 8
