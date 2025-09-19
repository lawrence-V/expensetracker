"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DateHelpers = void 0;
class DateHelpers {
    static getPastWeekRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - 7);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }
    static getPastMonthRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }
    static getPast3MonthsRange() {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 3);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }
    static parseDate(dateString) {
        try {
            const date = new Date(dateString);
            if (isNaN(date.getTime())) {
                return null;
            }
            return date;
        }
        catch (error) {
            return null;
        }
    }
    static getCustomRange(startDateString, endDateString) {
        const startDate = this.parseDate(startDateString);
        const endDate = this.parseDate(endDateString);
        if (!startDate || !endDate) {
            return null;
        }
        if (startDate > endDate) {
            return null;
        }
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        return { startDate, endDate };
    }
    static getDateRange(period, startDateString, endDateString) {
        switch (period) {
            case 'week':
                return this.getPastWeekRange();
            case 'month':
                return this.getPastMonthRange();
            case '3months':
                return this.getPast3MonthsRange();
            case 'custom':
                if (!startDateString || !endDateString) {
                    return null;
                }
                return this.getCustomRange(startDateString, endDateString);
            default:
                return null;
        }
    }
    static formatDate(date) {
        return date.toISOString().split('T')[0];
    }
    static isValidDate(date) {
        return date instanceof Date && !isNaN(date.getTime());
    }
    static getStartOfMonth(date) {
        const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
        startOfMonth.setHours(0, 0, 0, 0);
        return startOfMonth;
    }
    static getEndOfMonth(date) {
        const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return endOfMonth;
    }
}
exports.DateHelpers = DateHelpers;
//# sourceMappingURL=date-helpers.js.map