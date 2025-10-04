import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Label } from './ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Activity, TrendingUp, TrendingDown, Minus, Skull, Swords, Users, DollarSign } from 'lucide-react';

export default function StatisticsPanel({ eventLogger, currentCycle }) {
    const [selectedCycle, setSelectedCycle] = useState(null);
    const [filter, setFilter] = useState('all');

    // Получение статистики
    const statistics = useMemo(() => {
        if (!eventLogger) return null;
        return eventLogger.getStatistics();
    }, [eventLogger, currentCycle]);

    // Получение событий для отображения
    const displayEvents = useMemo(() => {
        if (!eventLogger) return [];
        
        let events;
        if (selectedCycle !== null) {
            events = eventLogger.getEventsByCycle(selectedCycle);
        } else {
            events = eventLogger.getEvents({ limit: 100 });
        }

        if (filter !== 'all') {
            events = events.filter(e => e.type.includes(filter));
        }

        return events;
    }, [eventLogger, selectedCycle, filter, currentCycle]);

    // Группировка событий по циклам
    const eventsByCycle = useMemo(() => {
        if (!eventLogger) return [];
        
        const timeline = eventLogger._generateTimeline();
        return timeline.slice(-20); // Последние 20 циклов
    }, [eventLogger, currentCycle]);

    if (!eventLogger || !statistics) {
        return (
            <Card>
                <CardHeader>
                    <CardTitle>📊 Статистика</CardTitle>
                    <CardDescription>Статистика недоступна</CardDescription>
                </CardHeader>
            </Card>
        );
    }

    const getSeverityColor = (severity) => {
        switch (severity) {
            case 'critical': return 'bg-red-500/20 text-red-500 border-red-500/50';
            case 'warning': return 'bg-yellow-500/20 text-yellow-500 border-yellow-500/50';
            case 'milestone': return 'bg-purple-500/20 text-purple-500 border-purple-500/50';
            default: return 'bg-blue-500/20 text-blue-500 border-blue-500/50';
        }
    };

    const getEventIcon = (type) => {
        if (type.includes('death')) return <Skull className="h-4 w-4" />;
        if (type.includes('conflict')) return <Swords className="h-4 w-4" />;
        if (type.includes('clan')) return <Users className="h-4 w-4" />;
        if (type.includes('resource') || type.includes('economic')) return <DollarSign className="h-4 w-4" />;
        return <Activity className="h-4 w-4" />;
    };

    const getTrendIcon = (trend) => {
        if (trend === 'positive' || trend > 0) return <TrendingUp className="h-4 w-4 text-green-500" />;
        if (trend === 'negative' || trend < 0) return <TrendingDown className="h-4 w-4 text-red-500" />;
        return <Minus className="h-4 w-4 text-gray-500" />;
    };

    return (
        <div className="space-y-4">
            <Card>
                <CardHeader>
                    <CardTitle>📊 Статистика симуляции</CardTitle>
                    <CardDescription>
                        Детальная информация о событиях и трендах
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <Tabs defaultValue="overview" className="w-full">
                        <TabsList className="grid w-full grid-cols-4">
                            <TabsTrigger value="overview">Обзор</TabsTrigger>
                            <TabsTrigger value="events">События</TabsTrigger>
                            <TabsTrigger value="cycles">По циклам</TabsTrigger>
                            <TabsTrigger value="trends">Тренды</TabsTrigger>
                        </TabsList>

                        {/* Обзор */}
                        <TabsContent value="overview" className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Всего событий</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold">{statistics.totalEvents}</div>
                                        <p className="text-xs text-muted-foreground">
                                            За {currentCycle} циклов
                                        </p>
                                    </CardContent>
                                </Card>

                                <Card>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-sm font-medium">Критических</CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="text-2xl font-bold text-red-500">
                                            {statistics.criticalEvents?.length || 0}
                                        </div>
                                        <p className="text-xs text-muted-foreground">
                                            Требуют внимания
                                        </p>
                                    </CardContent>
                                </Card>
                            </div>

                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-sm font-medium">События по типам</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2">
                                        {Object.entries(statistics.eventsByType || {}).slice(0, 8).map(([type, count]) => (
                                            <div key={type} className="flex items-center justify-between">
                                                <div className="flex items-center gap-2">
                                                    {getEventIcon(type)}
                                                    <span className="text-sm">{type.replace(/_/g, ' ')}</span>
                                                </div>
                                                <Badge variant="outline">{count}</Badge>
                                            </div>
                                        ))}
                                    </div>
                                </CardContent>
                            </Card>
                        </TabsContent>

                        {/* События */}
                        <TabsContent value="events" className="space-y-4">
                            <div className="flex gap-2 flex-wrap">
                                <button
                                    onClick={() => setFilter('all')}
                                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                                        filter === 'all' 
                                            ? 'bg-primary text-primary-foreground border-primary' 
                                            : 'bg-background border-border hover:bg-muted'
                                    }`}
                                >
                                    Все
                                </button>
                                <button
                                    onClick={() => setFilter('death')}
                                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                                        filter === 'death' 
                                            ? 'bg-red-500 text-white border-red-500' 
                                            : 'bg-background border-border hover:bg-muted'
                                    }`}
                                >
                                    Смерти
                                </button>
                                <button
                                    onClick={() => setFilter('conflict')}
                                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                                        filter === 'conflict' 
                                            ? 'bg-orange-500 text-white border-orange-500' 
                                            : 'bg-background border-border hover:bg-muted'
                                    }`}
                                >
                                    Конфликты
                                </button>
                                <button
                                    onClick={() => setFilter('clan')}
                                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                                        filter === 'clan' 
                                            ? 'bg-blue-500 text-white border-blue-500' 
                                            : 'bg-background border-border hover:bg-muted'
                                    }`}
                                >
                                    Кланы
                                </button>
                                <button
                                    onClick={() => setFilter('economic')}
                                    className={`px-3 py-1 text-xs rounded border transition-colors ${
                                        filter === 'economic' 
                                            ? 'bg-green-500 text-white border-green-500' 
                                            : 'bg-background border-border hover:bg-muted'
                                    }`}
                                >
                                    Экономика
                                </button>
                            </div>

                            <ScrollArea className="h-[400px] rounded-md border p-4">
                                <div className="space-y-2">
                                    {displayEvents.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            Нет событий для отображения
                                        </p>
                                    ) : (
                                        displayEvents.reverse().map((event) => (
                                            <div
                                                key={event.id}
                                                className={`p-3 rounded-lg border ${getSeverityColor(event.severity)}`}
                                            >
                                                <div className="flex items-start gap-2">
                                                    {getEventIcon(event.type)}
                                                    <div className="flex-1 min-w-0">
                                                        <div className="flex items-center gap-2 mb-1">
                                                            <Badge variant="outline" className="text-xs">
                                                                Цикл {event.cycle}
                                                            </Badge>
                                                            <span className="text-xs text-muted-foreground">
                                                                {new Date(event.timestamp).toLocaleTimeString()}
                                                            </span>
                                                        </div>
                                                        <p className="text-sm">{event.description}</p>
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* По циклам */}
                        <TabsContent value="cycles" className="space-y-4">
                            <ScrollArea className="h-[500px] rounded-md border p-4">
                                <div className="space-y-3">
                                    {eventsByCycle.length === 0 ? (
                                        <p className="text-sm text-muted-foreground text-center py-8">
                                            Нет данных по циклам
                                        </p>
                                    ) : (
                                        eventsByCycle.reverse().map((cycleData) => (
                                            <Card key={cycleData.cycle}>
                                                <CardHeader className="pb-3">
                                                    <div className="flex items-center justify-between">
                                                        <CardTitle className="text-base">
                                                            Цикл {cycleData.cycle}
                                                        </CardTitle>
                                                        <Badge variant="outline">
                                                            {cycleData.events.length} событий
                                                        </Badge>
                                                    </div>
                                                </CardHeader>
                                                <CardContent>
                                                    <div className="grid grid-cols-4 gap-2 mb-3">
                                                        {cycleData.summary.critical > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold text-red-500">
                                                                    {cycleData.summary.critical}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Критических
                                                                </div>
                                                            </div>
                                                        )}
                                                        {cycleData.summary.economic > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold text-green-500">
                                                                    {cycleData.summary.economic}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Экономика
                                                                </div>
                                                            </div>
                                                        )}
                                                        {cycleData.summary.conflicts > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold text-orange-500">
                                                                    {cycleData.summary.conflicts}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Конфликты
                                                                </div>
                                                            </div>
                                                        )}
                                                        {cycleData.summary.social > 0 && (
                                                            <div className="text-center">
                                                                <div className="text-lg font-bold text-blue-500">
                                                                    {cycleData.summary.social}
                                                                </div>
                                                                <div className="text-xs text-muted-foreground">
                                                                    Социальные
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>
                                                    
                                                    <button
                                                        onClick={() => setSelectedCycle(
                                                            selectedCycle === cycleData.cycle ? null : cycleData.cycle
                                                        )}
                                                        className="w-full px-3 py-2 text-xs bg-muted hover:bg-muted/80 rounded transition-colors"
                                                    >
                                                        {selectedCycle === cycleData.cycle 
                                                            ? 'Скрыть детали' 
                                                            : 'Показать детали'}
                                                    </button>

                                                    {selectedCycle === cycleData.cycle && (
                                                        <div className="mt-3 space-y-2">
                                                            {cycleData.events.map((event) => (
                                                                <div
                                                                    key={event.id}
                                                                    className="p-2 rounded bg-muted/50 text-xs"
                                                                >
                                                                    <div className="flex items-center gap-2">
                                                                        {getEventIcon(event.type)}
                                                                        <span>{event.description}</span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </div>
                            </ScrollArea>
                        </TabsContent>

                        {/* Тренды */}
                        <TabsContent value="trends" className="space-y-4">
                            {statistics.trends && (
                                <>
                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium">
                                                Экономическое здоровье
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Тренд</span>
                                                    <div className="flex items-center gap-2">
                                                        {getTrendIcon(statistics.trends.economicHealth.trend)}
                                                        <span className="text-sm capitalize">
                                                            {statistics.trends.economicHealth.trend}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Стабильность</span>
                                                    <span className="text-sm font-medium">
                                                        {(statistics.trends.economicHealth.stability * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Кризисы</span>
                                                    <Badge variant="destructive">
                                                        {statistics.trends.economicHealth.recentCrises}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Бумы</span>
                                                    <Badge variant="default">
                                                        {statistics.trends.economicHealth.recentBooms}
                                                    </Badge>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium">
                                                Социальная стабильность
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Сплоченность</span>
                                                    <span className="text-sm font-medium">
                                                        {statistics.trends.socialStability.cohesion.toFixed(2)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Поляризация</span>
                                                    <span className="text-sm font-medium">
                                                        {(statistics.trends.socialStability.polarization * 100).toFixed(0)}%
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Рост сети</span>
                                                    <div className="flex items-center gap-2">
                                                        {getTrendIcon(statistics.trends.socialStability.networkGrowth)}
                                                        <span className="text-sm font-medium">
                                                            {statistics.trends.socialStability.networkGrowth}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium">
                                                Интенсивность конфликтов
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Частота</span>
                                                    <Badge variant="outline">
                                                        {statistics.trends.conflictIntensity.frequency}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Интенсивность</span>
                                                    <span className="text-sm font-medium">
                                                        {statistics.trends.conflictIntensity.intensity.toFixed(1)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Тренд</span>
                                                    <span className="text-sm capitalize">
                                                        {statistics.trends.conflictIntensity.trend}
                                                    </span>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>

                                    <Card>
                                        <CardHeader className="pb-3">
                                            <CardTitle className="text-sm font-medium">
                                                Динамика популяции
                                            </CardTitle>
                                        </CardHeader>
                                        <CardContent>
                                            <div className="space-y-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Рождения</span>
                                                    <Badge variant="default">
                                                        {statistics.trends.populationDynamics.birthRate}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Смерти</span>
                                                    <Badge variant="destructive">
                                                        {statistics.trends.populationDynamics.deathRate}
                                                    </Badge>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-sm">Чистый рост</span>
                                                    <div className="flex items-center gap-2">
                                                        {getTrendIcon(statistics.trends.populationDynamics.netGrowth)}
                                                        <span className="text-sm font-medium">
                                                            {statistics.trends.populationDynamics.netGrowth}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </>
                            )}
                        </TabsContent>
                    </Tabs>
                </CardContent>
            </Card>
        </div>
    );
}
