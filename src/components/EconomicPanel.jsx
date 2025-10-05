import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Switch } from './ui/switch';
import { Separator } from './ui/separator';
import { Info } from 'lucide-react';

export default function EconomicPanel({ params, onParamsChange, economicStats }) {
    const handleChange = (key, value) => {
        onParamsChange({
            ...params,
            [key]: value
        });
    };

    const applyPreset = (presetParams) => {
        onParamsChange({
            ...params,
            ...presetParams
        });
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>Экономическая модель</CardTitle>
                    <CardDescription>
                        Настройка производства, потребления и выживания агентов
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Включение экономики */}
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <Label htmlFor="economic-enabled">Включить экономическую модель</Label>
                            <p className="text-sm text-muted-foreground">
                                Добавляет производство и потребление ресурсов
                            </p>
                        </div>
                        <Switch
                            id="economic-enabled"
                            checked={params.enabled === true} // Исправлено: четкая проверка на true
                            onCheckedChange={(checked) => handleChange('enabled', checked)}
                        />
                    </div>

                    {params.enabled && (
                        <>
                            <Separator />

                            {/* Уровень сложности */}
                            <div className="space-y-4 p-4 bg-muted/50 rounded-lg">
                                <div className="flex items-center gap-2">
                                    <Label className="text-base font-semibold">⚙️ Настройки сложности</Label>
                                    <Info className="h-4 w-4 text-muted-foreground" />
                                </div>
                                
                                {/* Диапазон эффективности */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Минимальная эффективность</Label>
                                        <span className="text-sm font-medium">{((params.minEfficiency || 0.8) * 100).toFixed(0)}%</span>
                                    </div>
                                    <Slider
                                        value={[(params.minEfficiency || 0.8) * 100]}
                                        onValueChange={([value]) => handleChange('minEfficiency', value / 100)}
                                        min={20}
                                        max={90}
                                        step={5}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Эффективность агента при 0 ресурсах. Ниже = сложнее выжить
                                    </p>
                                </div>

                                {/* Скорость накопления */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Скорость накопления</Label>
                                        <span className="text-sm font-medium">{((params.accumulationRate || 0.1) * 100).toFixed(0)}%</span>
                                    </div>
                                    <Slider
                                        value={[(params.accumulationRate || 0.1) * 100]}
                                        onValueChange={([value]) => handleChange('accumulationRate', value / 100)}
                                        min={1}
                                        max={15}
                                        step={1}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Процент излишков, идущих в накопления. Ниже = меньше подушка безопасности
                                    </p>
                                </div>

                                {/* Порог голодания */}
                                <div className="space-y-2">
                                    <div className="flex items-center justify-between">
                                        <Label>Порог голодания</Label>
                                        <span className="text-sm font-medium">{params.starvationThreshold || 3} цикла</span>
                                    </div>
                                    <Slider
                                        value={[params.starvationThreshold || 3]}
                                        onValueChange={([value]) => handleChange('starvationThreshold', value)}
                                        min={1}
                                        max={5}
                                        step={1}
                                        className="w-full"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        Циклов голодания до смерти. Меньше = сложнее выжить
                                    </p>
                                </div>

                                {/* Межклановое распределение */}
                                <div className="flex items-center justify-between">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="inter-clan-enabled">Межклановое распределение</Label>
                                        <p className="text-xs text-muted-foreground">
                                            Кланы делятся излишками между собой
                                        </p>
                                    </div>
                                    <Switch
                                        id="inter-clan-enabled"
                                        checked={params.interClanDistribution !== false}
                                        onCheckedChange={(checked) => handleChange('interClanDistribution', checked)}
                                    />
                                </div>

                                {/* Пресеты сложности */}
                                <div className="space-y-3 pt-2 border-t">
                                    <Label className="text-sm">Быстрые пресеты:</Label>
                                    <div className="grid grid-cols-2 gap-3">
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => applyPreset({
                                                    minEfficiency: 0.8,
                                                    accumulationRate: 0.1,
                                                    starvationThreshold: 3,
                                                    interClanDistribution: true
                                                })}
                                                className="w-full px-3 py-2 text-xs bg-green-500/20 hover:bg-green-500/30 rounded border border-green-500/50 transition-colors font-medium"
                                            >
                                                🟢 Лёгкий
                                            </button>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                Высокая эффективность, легко выжить. Для новичков.
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => applyPreset({
                                                    minEfficiency: 0.6,
                                                    accumulationRate: 0.07,
                                                    starvationThreshold: 2,
                                                    interClanDistribution: true
                                                })}
                                                className="w-full px-3 py-2 text-xs bg-yellow-500/20 hover:bg-yellow-500/30 rounded border border-yellow-500/50 transition-colors font-medium"
                                            >
                                                🟡 Средний
                                            </button>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                Сбалансированная сложность. Рекомендуется.
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => applyPreset({
                                                    minEfficiency: 0.5,
                                                    accumulationRate: 0.05,
                                                    starvationThreshold: 2,
                                                    interClanDistribution: false
                                                })}
                                                className="w-full px-3 py-2 text-xs bg-orange-500/20 hover:bg-orange-500/30 rounded border border-orange-500/50 transition-colors font-medium"
                                            >
                                                🟠 Сложный
                                            </button>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                Низкая эффективность, нет помощи между кланами.
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => applyPreset({
                                                    minEfficiency: 0.2,
                                                    accumulationRate: 0.01,
                                                    starvationThreshold: 1,
                                                    interClanDistribution: false,
                                                    baseProductivity: 8,
                                                    minSurvival: 12,
                                                    maxMultiplier: 1.4
                                                })}
                                                className="w-full px-3 py-2 text-xs bg-red-500/20 hover:bg-red-500/30 rounded border border-red-500/50 transition-colors font-medium"
                                            >
                                                🔴 Экстремальный
                                            </button>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                ⚠️ НЕВОЗМОЖНЫЙ режим! Макс. производство (11.2) &lt; потребление (12). 100% смертность неизбежна.
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <button
                                                onClick={() => applyPreset({
                                                    minEfficiency: 0.25,
                                                    accumulationRate: 0.02,
                                                    starvationThreshold: 1,
                                                    interClanDistribution: false,
                                                    baseProductivity: 9,
                                                    minSurvival: 11,
                                                    maxMultiplier: 1.5
                                                })}
                                                className="w-full px-3 py-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 rounded border border-purple-500/50 transition-colors font-medium"
                                            >
                                                🟣 Экстремальный (проходимый)
                                            </button>
                                            <p className="text-[10px] text-muted-foreground leading-tight">
                                                Очень сложно! Выживут только 30-50% с сильными связями. Макс. производство (13.5) &gt; потребление (11).
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                
                                {/* Баланс выживаемости */}
                                {params.baseProductivity && params.minSurvival && params.maxMultiplier && (
                                    <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
                                        <div className="text-xs font-semibold text-blue-400 mb-2">📊 Баланс выживаемости</div>
                                        <div className="space-y-1 text-[10px] text-muted-foreground">
                                            <div>Макс. производство: <span className="font-mono">{(params.baseProductivity * params.maxMultiplier).toFixed(1)}</span></div>
                                            <div>Потребление: <span className="font-mono">{params.minSurvival}</span></div>
                                            <div className={`font-semibold ${
                                                (params.baseProductivity * params.maxMultiplier) >= params.minSurvival 
                                                    ? 'text-green-400' 
                                                    : 'text-red-400'
                                            }`}>
                                                Баланс: <span className="font-mono">
                                                    {(params.baseProductivity * params.maxMultiplier - params.minSurvival).toFixed(1)}
                                                </span> {
                                                    (params.baseProductivity * params.maxMultiplier) >= params.minSurvival 
                                                        ? '✅ Выживание возможно' 
                                                        : '❌ Все умрут'
                                                }
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Базовая продуктивность */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Базовая продуктивность</Label>
                                    <span className="text-sm font-medium">{params.baseProductivity || 10}</span>
                                </div>
                                <Slider
                                    value={[params.baseProductivity || 10]}
                                    onValueChange={([value]) => handleChange('baseProductivity', value)}
                                    min={5}
                                    max={20}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Количество ресурсов, производимых агентом за цикл без учета связей
                                </p>
                            </div>

                            {/* Минимум для выживания */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Минимум для выживания</Label>
                                    <span className="text-sm font-medium">{params.minSurvival || 10}</span>
                                </div>
                                <Slider
                                    value={[params.minSurvival || 10]}
                                    onValueChange={([value]) => handleChange('minSurvival', value)}
                                    min={5}
                                    max={20}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Количество ресурсов, потребляемых агентом за цикл для выживания
                                </p>
                            </div>

                            {/* Максимальный множитель */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Максимальный множитель от связей</Label>
                                    <span className="text-sm font-medium">{(params.maxMultiplier || 2.0).toFixed(1)}x</span>
                                </div>
                                <Slider
                                    value={[params.maxMultiplier || 2.0]}
                                    onValueChange={([value]) => handleChange('maxMultiplier', value)}
                                    min={1.2}
                                    max={3.0}
                                    step={0.1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Максимальное увеличение производства от сильных связей
                                </p>
                            </div>

                            {/* Порог сильной связи */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Порог сильной связи</Label>
                                    <span className="text-sm font-medium">{(params.strongConnectionThreshold || 0.3).toFixed(2)}</span>
                                </div>
                                <Slider
                                    value={[params.strongConnectionThreshold || 0.3]}
                                    onValueChange={([value]) => handleChange('strongConnectionThreshold', value)}
                                    min={0.1}
                                    max={0.7}
                                    step={0.05}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Минимальная сила связи для получения бонуса к производству
                                </p>
                            </div>

                            {/* Бонус от связи */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Бонус от одной связи</Label>
                                    <span className="text-sm font-medium">{((params.connectionBonus || 0.1) * 100).toFixed(0)}%</span>
                                </div>
                                <Slider
                                    value={[params.connectionBonus || 0.1]}
                                    onValueChange={([value]) => handleChange('connectionBonus', value)}
                                    min={0.05}
                                    max={0.2}
                                    step={0.01}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Процент увеличения производства за каждую сильную связь
                                </p>
                            </div>

                            {/* Интервал экономических циклов */}
                            <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                    <Label>Интервал экономических циклов</Label>
                                    <span className="text-sm font-medium">каждые {params.economicCycleInterval || 5}</span>
                                </div>
                                <Slider
                                    value={[params.economicCycleInterval || 5]}
                                    onValueChange={([value]) => handleChange('economicCycleInterval', value)}
                                    min={3}
                                    max={10}
                                    step={1}
                                />
                                <p className="text-xs text-muted-foreground">
                                    Количество социальных циклов между экономическими решениями
                                </p>
                            </div>
                        </>
                    )}
                </CardContent>
            </Card>

            {/* Статистика экономики */}
            {params.enabled && economicStats && economicStats.aliveCount > 0 && (
                <>
                    <Card>
                        <CardHeader>
                            <CardTitle>Текущая экономическая статистика</CardTitle>
                            <CardDescription>Итоговые показатели после симуляции</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Основные показатели */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Популяция</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Живых агентов</p>
                                        <p className="text-2xl font-bold text-green-600">{economicStats.aliveCount || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Погибло</p>
                                        <p className="text-2xl font-bold text-red-500">{economicStats.deadCount || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Уровень выживаемости</p>
                                        <p className="text-2xl font-bold">
                                            {economicStats.survivalRate || 0}%
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Потери</p>
                                        <p className="text-2xl font-bold text-orange-500">
                                            {(100 - (economicStats.survivalRate || 0)).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Ресурсы */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Ресурсы</h4>
                                <div className="grid grid-cols-3 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Всего ресурсов</p>
                                        <p className="text-2xl font-bold">{economicStats.totalResources || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Средние</p>
                                        <p className="text-2xl font-bold">{economicStats.averageResources || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Медиана</p>
                                        <p className="text-2xl font-bold text-blue-600">{economicStats.medianResources || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Минимум</p>
                                        <p className="text-xl font-bold text-red-600">{economicStats.minResources || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Максимум</p>
                                        <p className="text-xl font-bold text-green-600">{economicStats.maxResources || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Ст. откл.</p>
                                        <p className="text-xl font-bold text-purple-600">{economicStats.stdDevResources || 0}</p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Распределение богатства */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Распределение богатства</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Всего накоплено</p>
                                        <p className="text-2xl font-bold text-blue-600">{economicStats.totalAccumulated || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Средние накопления</p>
                                        <p className="text-2xl font-bold text-indigo-600">{economicStats.averageAccumulated || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Коэф. неравенства</p>
                                        <p className="text-2xl font-bold text-orange-600">{economicStats.wealthInequality || 0}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Размах</p>
                                        <p className="text-2xl font-bold">
                                            {((economicStats.maxResources || 0) - (economicStats.minResources || 0)).toFixed(1)}
                                        </p>
                                    </div>
                                </div>

                                {/* Квартили */}
                                {economicStats.resourceDistribution && (
                                    <div className="mt-4 p-3 bg-purple-500/10 border border-purple-500/30 rounded-lg">
                                        <div className="text-xs font-semibold text-purple-400 mb-2">📊 Квартили распределения</div>
                                        <div className="grid grid-cols-3 gap-2 text-[10px]">
                                            <div>
                                                <div className="text-muted-foreground">Q1 (25%)</div>
                                                <div className="font-mono font-semibold">{economicStats.resourceDistribution.q1}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Q2 (50%)</div>
                                                <div className="font-mono font-semibold">{economicStats.resourceDistribution.q2}</div>
                                            </div>
                                            <div>
                                                <div className="text-muted-foreground">Q3 (75%)</div>
                                                <div className="font-mono font-semibold">{economicStats.resourceDistribution.q3}</div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <Separator />

                            {/* Социальные классы */}
                            {economicStats.poorAgents !== undefined && (
                                <div>
                                    <h4 className="text-sm font-medium mb-3">Социальная стратификация</h4>
                                    <div className="grid grid-cols-3 gap-4">
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Бедные</p>
                                            <p className="text-2xl font-bold text-red-600">{economicStats.poorAgents || 0}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {economicStats.aliveCount > 0 ? ((economicStats.poorAgents / economicStats.aliveCount) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Средний класс</p>
                                            <p className="text-2xl font-bold text-blue-600">{economicStats.middleClassAgents || 0}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {economicStats.aliveCount > 0 ? ((economicStats.middleClassAgents / economicStats.aliveCount) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                        <div className="space-y-1">
                                            <p className="text-sm text-muted-foreground">Богатые</p>
                                            <p className="text-2xl font-bold text-green-600">{economicStats.richAgents || 0}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {economicStats.aliveCount > 0 ? ((economicStats.richAgents / economicStats.aliveCount) * 100).toFixed(1) : 0}%
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </>
            )}

            {/* Информационная карточка */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-medium mb-1">Как работает экономическая модель:</p>
                            <ul className="space-y-1 list-disc list-inside">
                                <li>Агенты производят ресурсы каждый экономический цикл</li>
                                <li>Производство увеличивается при наличии сильных связей</li>
                                <li>Каждый цикл агенты потребляют минимум для выживания</li>
                                <li>Агенты без достаточных ресурсов погибают</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
