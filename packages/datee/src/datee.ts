export class Datee extends Date {
  public format(format: string): string {
    let formatted = format;

    formatted = this.formatYear(formatted);
    formatted = this.formatMonth(formatted);
    formatted = this.formatDate(formatted);

    formatted = this.formatQuarter(formatted);
    formatted = this.formatDay(formatted);
    formatted = this.formatWeek(formatted);

    formatted = this.formatHour(formatted);
    formatted = this.formatMinute(formatted);
    formatted = this.formatSecond(formatted);
    formatted = this.formatAMPM(formatted);

    formatted = this.formatMillisecond(formatted);
    formatted = this.formatTimestamp(formatted);

    formatted = this.formatTimezone(formatted);

    return formatted;
  }

  public getWeek(): number {
    const date = new Datee(this.getTime());

    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() + 3 - ((date.getDay() + 6) % 7));

    const week1 = new Datee(date.getFullYear(), 0, 4);

    return 1 + Math.round(((date.getTime() - week1.getTime()) / 86400000 - 3 + ((week1.getDay() + 6) % 7)) / 7);
  }

  private formatYear(format: string): string {
    let formatted = format;

    formatted = formatted.replace('YYYY', this.getFullYear().toString());
    formatted = formatted.replace('YY', this.getFullYear().toString().slice(-2));

    return formatted;
  }

  private formatMonth(format: string): string {
    let formatted = format;

    formatted = formatted.replace('MMMM', this.toLocaleString('en', { month: 'long' }));
    formatted = formatted.replace('MMM', this.toLocaleString('en', { month: 'short' }));
    formatted = formatted.replace('MM', (this.getMonth() + 1).toString().padStart(2, '0'));
    formatted = formatted.replace('M', (this.getMonth() + 1).toString());

    return formatted;
  }

  private formatDate(format: string): string {
    let formatted = format;

    formatted = formatted.replace('DD', this.getDate().toString().padStart(2, '0'));
    formatted = formatted.replace('D', this.getDate().toString());

    return formatted;
  }

  private formatQuarter(format: string): string {
    let formatted = format;

    formatted = formatted.replace('Q', Math.floor(this.getMonth() / 3).toString());

    return formatted;
  }

  private formatDay(format: string): string {
    let formatted = format;

    formatted = formatted.replace('WWW', this.toLocaleString('en', { weekday: 'long' }));
    formatted = formatted.replace('WW', this.toLocaleString('en', { weekday: 'short' }));
    formatted = formatted.replace('W', this.getDay().toString());

    return formatted;
  }

  private formatWeek(format: string): string {
    let formatted = format;

    formatted = formatted.replace('ww', this.getWeek().toString().padStart(2, '0'));
    formatted = formatted.replace('w', this.getWeek().toString());

    return formatted;
  }

  private formatHour(format: string): string {
    let formatted = format;

    formatted = formatted.replace('HH', this.getHours().toString().padStart(2, '0'));
    formatted = formatted.replace('H', this.getHours().toString());
    // formatted = formatted.replace('hh', (this.getHours() % 12 || 12).toString().padStart(2, '0'));
    // formatted = formatted.replace('h', (this.getHours() % 12 || 12).toString());

    return formatted;
  }

  private formatMinute(format: string): string {
    let formatted = format;

    formatted = formatted.replace('mm', this.getMinutes().toString().padStart(2, '0'));
    formatted = formatted.replace('m', this.getMinutes().toString());

    return formatted;
  }

  private formatSecond(format: string): string {
    let formatted = format;

    formatted = formatted.replace('ss', this.getSeconds().toString().padStart(2, '0'));
    formatted = formatted.replace('s', this.getSeconds().toString());

    return formatted;
  }

  private formatAMPM(format: string): string {
    const formatted = format;

    // formatted = formatted.replace('A', this.getHours() < 12 ? 'AM' : 'PM');
    // formatted = formatted.replace('a', this.getHours() < 12 ? 'am' : 'pm');

    return formatted;
  }

  private formatMillisecond(format: string): string {
    let formatted = format;

    formatted = formatted.replace('SSS', this.getMilliseconds().toString().padStart(3, '0'));
    formatted = formatted.replace('SS', this.getMilliseconds().toString().padStart(2, '0'));
    formatted = formatted.replace('S', this.getMilliseconds().toString());

    return formatted;
  }

  private formatTimestamp(format: string): string {
    let formatted = format;

    formatted = formatted.replace('X', this.getTime().toString());
    formatted = formatted.replace('x', Math.floor(this.getTime() / 1000).toString());

    return formatted;
  }

  private formatTimezone(format: string): string {
    let formatted = format;

    formatted = formatted.replace(
      'ZZZZ',
      this.toTimeString()
        .match(/([+-]\d{2})(\d{2})/)
        ?.slice(1, 3)
        .join(':') ?? '',
    );
    formatted = formatted.replace(
      'ZZZ',
      this.toTimeString()
        .match(/[A-Z]{3}/)
        ?.at(0) ?? '',
    );

    return formatted;
  }
}
