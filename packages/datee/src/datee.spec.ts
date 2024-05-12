import { Datee } from './datee';

describe('Datee', () => {
  describe('Format by unit', () => {
    describe('Year', () => {
      it.each(['2024', '2025'])('should be formatted by year correctly.', (year) => {
        const datee = new Datee(`${year}-01-01T00:00:00.000Z`);

        expect(datee.format('YYYY')).toBe(year);
        expect(datee.format('YY')).toBe(year.slice(-2));
      });
    });

    describe('Month', () => {
      it.each([
        ['1', 'January'],
        ['10', 'October'],
      ])('should be formatted by month correctly.', (month, monthString) => {
        const datee = new Datee(`2024-${month.padStart(2, '0')}-01T00:00:00.000Z`);

        expect(datee.format('MMMM')).toBe(monthString);
        expect(datee.format('MMM')).toBe(monthString.slice(0, 3));
        expect(datee.format('MM')).toBe(month.padStart(2, '0'));
        expect(datee.format('M')).toBe(month);
      });
    });

    describe('Date', () => {
      it('should be formatted by date correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('DDDD')).toBe('0101');
        expect(datee.format('DDD')).toBe('011');

        expect(datee.format('DD')).toBe('01');
        expect(datee.format('D')).toBe('1');
      });
    });

    describe('Quarter', () => {
      it('should be formatted by quarter correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('Q')).toBe('0');
      });
    });

    describe('Day', () => {
      it('should be formatted by day correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('WWW')).toBe('Monday');
        expect(datee.format('WW')).toBe('Mon');
        expect(datee.format('W')).toBe('1');
      });
    });

    describe('Week', () => {
      it('should be formatted by week correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ww')).toBe('01');
        expect(datee.format('w')).toBe('1');
      });
    });

    describe('Hour', () => {
      it('should be formatted by hour correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('HH')).toBe('00');
        expect(datee.format('H')).toBe('0');
        // expect(datee.format('hh')).toBe('12');
        // expect(datee.format('h')).toBe('12');
      });
    });

    describe('Minute', () => {
      it('should be formatted by minute correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('mm')).toBe('00');
        expect(datee.format('m')).toBe('0');
      });
    });

    describe('Second', () => {
      it('should be formatted by second correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ss')).toBe('00');
        expect(datee.format('s')).toBe('0');
      });
    });

    describe('Millisecond', () => {
      it('should be formatted by millisecond correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('SSS')).toBe('000');
        expect(datee.format('SS')).toBe('00');
        expect(datee.format('S')).toBe('0');
      });
    });

    describe('Timestamp', () => {
      it('should be formatted by timestamp correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('X')).toBe('1704067200000');
        expect(datee.format('x')).toBe('1704067200');
      });
    });

    describe('Timezone', () => {
      it('should be formatted by timezone correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ZZZZ')).toBe('+00:00');
        expect(datee.format('ZZZ')).toBe('GMT');
      });
    });

    describe.skip('AM/PM', () => {
      it('should be formatted by AM/PM correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('A')).toBe('AM');
        expect(datee.format('a')).toBe('am');
      });
    });

    describe('Literal Character', () => {
      it('should be literal character correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('T')).toBe('T');
      });
    });
  });
});
