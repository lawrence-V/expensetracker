export class DateHelpers {
  /**
   * Get start and end dates for the past week
   * @returns {startDate: Date, endDate: Date}
   */
  public static getPastWeekRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 7);
    
    // Set to start of day for startDate and end of day for endDate
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Get start and end dates for the past month
   * @returns {startDate: Date, endDate: Date}
   */
  public static getPastMonthRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 1);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Get start and end dates for the past 3 months
   * @returns {startDate: Date, endDate: Date}
   */
  public static getPast3MonthsRange(): { startDate: Date; endDate: Date } {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - 3);
    
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    
    return { startDate, endDate };
  }

  /**
   * Parse and validate date string
   * @param dateString - Date string in ISO format
   * @returns Date | null
   */
  public static parseDate(dateString: string): Date | null {
    try {
      const date = new Date(dateString);
      if (isNaN(date.getTime())) {
        return null;
      }
      return date;
    } catch (error) {
      return null;
    }
  }

  /**
   * Get custom date range with validation
   * @param startDateString - Start date string
   * @param endDateString - End date string
   * @returns {startDate: Date, endDate: Date} | null
   */
  public static getCustomRange(
    startDateString: string,
    endDateString: string
  ): { startDate: Date; endDate: Date } | null {
    const startDate = this.parseDate(startDateString);
    const endDate = this.parseDate(endDateString);

    if (!startDate || !endDate) {
      return null;
    }

    // Ensure start date is before end date
    if (startDate > endDate) {
      return null;
    }

    // Set to start of day for startDate and end of day for endDate
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);

    return { startDate, endDate };
  }

  /**
   * Get date range based on period
   * @param period - Time period
   * @param startDateString - Custom start date (for custom period)
   * @param endDateString - Custom end date (for custom period)
   * @returns {startDate: Date, endDate: Date} | null
   */
  public static getDateRange(
    period?: 'week' | 'month' | '3months' | 'custom',
    startDateString?: string,
    endDateString?: string
  ): { startDate: Date; endDate: Date } | null {
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

  /**
   * Format date for display
   * @param date - Date object
   * @returns string - Formatted date
   */
  public static formatDate(date: Date): string {
    return date.toISOString().split('T')[0];
  }

  /**
   * Check if date is valid
   * @param date - Date object
   * @returns boolean
   */
  public static isValidDate(date: Date): boolean {
    return date instanceof Date && !isNaN(date.getTime());
  }

  /**
   * Get start of month
   * @param date - Date object
   * @returns Date - Start of month
   */
  public static getStartOfMonth(date: Date): Date {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    return startOfMonth;
  }

  /**
   * Get end of month
   * @param date - Date object
   * @returns Date - End of month
   */
  public static getEndOfMonth(date: Date): Date {
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    return endOfMonth;
  }
}