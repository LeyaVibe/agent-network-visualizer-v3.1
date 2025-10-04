/**
 * Помощник для безопасного получения статистики кланов
 * Решает проблему с вызовом getClanStats на результате, который уже является статистикой
 */

export function safeClanStats(input) {
    // Если это уже объект статистики (содержит totalClans, clans и т.д.)
    if (input && typeof input === 'object' && 
        typeof input.totalClans === 'number' && 
        Array.isArray(input.clans)) {
        return input;
    }
    
    // Если это объект ClanSystem с методом getClanStats
    if (input && typeof input.getClanStats === 'function') {
        return input.getClanStats();
    }
    
    // Если это объект ClanSystem с методом getClanStatistics
    if (input && typeof input.getClanStatistics === 'function') {
        return input.getClanStatistics();
    }
    
    // Возвращаем пустую статистику по умолчанию
    return {
        totalClans: 0,
        averageSize: 0,
        averageDensity: 0,
        totalResources: 0,
        clans: []
    };
}

export default safeClanStats;
