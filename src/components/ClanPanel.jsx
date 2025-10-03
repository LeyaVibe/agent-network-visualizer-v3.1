import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Slider } from './ui/slider';
import { Badge } from './ui/badge';
import { Separator } from './ui/separator';
import { Info, Users, Swords, TrendingUp } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';

const DISTRIBUTION_RULES_LABELS = {
    dictatorship: 'Диктатура',
    democracy: 'Демократия',
    lawlessness: 'Беспредел'
};

const DEMOCRACY_SUBRULES_LABELS = {
    half: 'Первому половина (1/2)',
    third: 'Первому треть (1/3)',
    quarter: 'Первому четверть (1/4)',
    fifth: 'Первому пятую часть (1/5)',
    equal: 'Всем поровну'
};

const DISTRIBUTION_RULES_COLORS = {
    dictatorship: 'bg-red-500',
    democracy: 'bg-green-500',
    lawlessness: 'bg-orange-500'
};

export default function ClanPanel({ params, onParamsChange, clanStats, conflictStats }) {
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
                    <CardTitle>Настройки кланов</CardTitle>
                    <CardDescription>
                        Параметры формирования и управления кланами агентов
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    {/* Минимальный размер клана */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Минимальный размер клана</Label>
                            <span className="text-sm font-medium">{params.minClanSize || 3} агентов</span>
                        </div>
                        <Slider
                            value={[params.minClanSize || 3]}
                            onValueChange={([value]) => handleChange('minClanSize', value)}
                            min={2}
                            max={10}
                            step={1}
                        />
                        <p className="text-xs text-muted-foreground">
                            Минимальное количество агентов для формирования клана
                        </p>
                    </div>

                    {/* Порог плотности связей */}
                    <div className="space-y-2">
                        <div className="flex items-center justify-between">
                            <Label>Порог плотности связей</Label>
                            <span className="text-sm font-medium">{(params.densityThreshold || 0.5).toFixed(2)}</span>
                        </div>
                        <Slider
                            value={[params.densityThreshold || 0.5]}
                            onValueChange={([value]) => handleChange('densityThreshold', value)}
                            min={0.3}
                            max={0.8}
                            step={0.05}
                        />
                        <p className="text-xs text-muted-foreground">
                            Минимальная средняя сила связей внутри группы для признания кланом
                        </p>
                    </div>

                    <Separator />

                    {/* Параметры конфликтов */}
                    <div className="space-y-4">
                        <h4 className="text-sm font-medium">Параметры конфликтов</h4>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Фактор поляризации</Label>
                                <span className="text-sm font-medium">÷{params.polarizationFactor || 3}</span>
                            </div>
                            <Slider
                                value={[params.polarizationFactor || 3]}
                                onValueChange={([value]) => handleChange('polarizationFactor', value)}
                                min={2}
                                max={5}
                                step={1}
                            />
                            <p className="text-xs text-muted-foreground">
                                Во сколько раз ослабляются связи между враждующими кланами
                            </p>
                        </div>

                        <div className="space-y-2">
                            <div className="flex items-center justify-between">
                                <Label>Доля кражи накоплений</Label>
                                <span className="text-sm font-medium">{((params.resourceStealRatio || 2/3) * 100).toFixed(0)}%</span>
                            </div>
                            <Slider
                                value={[params.resourceStealRatio || 2/3]}
                                onValueChange={([value]) => handleChange('resourceStealRatio', value)}
                                min={0.5}
                                max={1.0}
                                step={0.05}
                            />
                            <p className="text-xs text-muted-foreground">
                                Какая часть накопленных ресурсов отбирается при конфликте
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Статистика кланов */}
            {clanStats && clanStats.totalClans > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Users className="h-5 w-5" />
                            Текущие кланы ({clanStats.totalClans})
                        </CardTitle>
                        <CardDescription>
                            Средний размер: {clanStats.averageSize.toFixed(1)} агентов
                        </CardDescription>
                    </CardHeader>
                    <CardContent>
                        <ScrollArea className="h-[300px] pr-4">
                            <div className="space-y-3">
                                {clanStats.clans.map((clan) => (
                                    <Card key={clan.id} className="border-2">
                                        <CardContent className="pt-4">
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <h4 className="font-semibold">Клан {clan.id + 1}</h4>
                                                    <div className="flex flex-col gap-1 items-end">
                                                        <Badge className={DISTRIBUTION_RULES_COLORS[clan.rule]}>
                                                            {DISTRIBUTION_RULES_LABELS[clan.rule] || 'Нет решения'}
                                                        </Badge>
                                                        {clan.subrule && (
                                                            <Badge variant="outline" className="text-xs">
                                                                {DEMOCRACY_SUBRULES_LABELS[clan.subrule]}
                                                            </Badge>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="grid grid-cols-2 gap-2 text-sm">
                                                    <div>
                                                        <span className="text-muted-foreground">Размер:</span>
                                                        <span className="ml-2 font-medium">{clan.size}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Сила:</span>
                                                        <span className="ml-2 font-medium">{clan.strength}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Плотность:</span>
                                                        <span className="ml-2 font-medium">{clan.density}</span>
                                                    </div>
                                                    <div>
                                                        <span className="text-muted-foreground">Ресурсы:</span>
                                                        <span className="ml-2 font-medium">{clan.resources}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        </ScrollArea>
                    </CardContent>
                </Card>
            )}

            {/* Статистика конфликтов */}
            {conflictStats && conflictStats.totalConflicts > 0 && (
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Swords className="h-5 w-5 text-red-500" />
                            Статистика конфликтов
                        </CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Всего конфликтов</p>
                                <p className="text-2xl font-bold">{conflictStats.totalConflicts}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Украдено ресурсов</p>
                                <p className="text-2xl font-bold text-red-500">
                                    {conflictStats.totalResourcesStolen.toFixed(0)}
                                </p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">Поляризовано связей</p>
                                <p className="text-2xl font-bold">{conflictStats.totalConnectionsPolarized}</p>
                            </div>
                            <div className="space-y-1">
                                <p className="text-sm text-muted-foreground">В среднем за конфликт</p>
                                <p className="text-2xl font-bold">
                                    {conflictStats.averageResourcesPerConflict.toFixed(1)}
                                </p>
                            </div>
                        </div>

                        {conflictStats.mostAggressiveClan && (
                            <div className="mt-4 p-3 bg-red-50 rounded-lg">
                                <p className="text-sm font-medium text-red-900">
                                    Самый агрессивный: Клан {conflictStats.mostAggressiveClan.id + 1}
                                    <span className="ml-2 text-muted-foreground">
                                        ({conflictStats.mostAggressiveClan.count} атак)
                                    </span>
                                </p>
                            </div>
                        )}

                        {conflictStats.mostVictimizedClan && (
                            <div className="mt-2 p-3 bg-blue-50 rounded-lg">
                                <p className="text-sm font-medium text-blue-900">
                                    Самая частая жертва: Клан {conflictStats.mostVictimizedClan.id + 1}
                                    <span className="ml-2 text-muted-foreground">
                                        ({conflictStats.mostVictimizedClan.count} раз)
                                    </span>
                                </p>
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {/* Информационная карточка */}
            <Card className="border-blue-200 bg-blue-50">
                <CardContent className="pt-6">
                    <div className="flex gap-3">
                        <Info className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                        <div className="text-sm text-blue-900">
                            <p className="font-medium mb-2">Как работает клановая система:</p>
                            <ul className="space-y-1.5 list-disc list-inside">
                                <li>Кланы формируются из плотно связанных агентов</li>
                                <li>Каждый клан голосует за правила распределения ресурсов</li>
                                <li><strong>Диктатура:</strong> сильнейший забирает все излишки</li>
                                <li><strong>Демократия:</strong> распределение с подправилами:
                                    <ul className="ml-6 mt-1 space-y-0.5 list-circle">
                                        <li><em>Первому половина</em> - сильнейший получает 1/2, остальным рекурсивно</li>
                                        <li><em>Первому треть</em> - сильнейший получает 1/3, остальным рекурсивно</li>
                                        <li><em>Первому четверть</em> - сильнейший получает 1/4, остальным рекурсивно</li>
                                        <li><em>Первому пятую часть</em> - сильнейший получает 1/5, остальным рекурсивно</li>
                                        <li><em>Всем поровну</em> - равное распределение между всеми</li>
                                    </ul>
                                </li>
                                <li><strong>Беспредел:</strong> атака на самый слабый клан</li>
                            </ul>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
