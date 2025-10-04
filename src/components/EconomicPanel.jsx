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
                            checked={params.enabled || false}
                            onCheckedChange={(checked) => handleChange('enabled', checked)}
                        />
                    </div>

                    {params.enabled && (
                        <>
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
                                    min={1.5}
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
            {params.enabled && economicStats && (
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
                                            {((economicStats.aliveCount / (economicStats.aliveCount + economicStats.deadCount)) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Потери</p>
                                        <p className="text-2xl font-bold text-orange-500">
                                            {((economicStats.deadCount / (economicStats.aliveCount + economicStats.deadCount)) * 100).toFixed(1)}%
                                        </p>
                                    </div>
                                </div>
                            </div>

                            <Separator />

                            {/* Ресурсы */}
                            <div>
                                <h4 className="text-sm font-medium mb-3">Ресурсы</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Всего ресурсов</p>
                                        <p className="text-2xl font-bold">{(economicStats.totalResources || 0).toFixed(0)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Средние ресурсы</p>
                                        <p className="text-2xl font-bold">{(economicStats.averageResources || 0).toFixed(1)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Минимум</p>
                                        <p className="text-xl font-bold text-red-600">{(economicStats.minResources || 0).toFixed(1)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Максимум</p>
                                        <p className="text-xl font-bold text-green-600">{(economicStats.maxResources || 0).toFixed(1)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Всего накоплено</p>
                                        <p className="text-xl font-bold text-blue-600">{(economicStats.totalAccumulated || 0).toFixed(0)}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-sm text-muted-foreground">Неравенство (размах)</p>
                                        <p className="text-xl font-bold">
                                            {((economicStats.maxResources - economicStats.minResources) || 0).toFixed(1)}
                                        </p>
                                    </div>
                                </div>
                            </div>
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
