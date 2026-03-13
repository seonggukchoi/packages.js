import { Datee } from './datee';

describe('Datee', () => {
  describe('Format by unit', () => {
    describe('Year', () => {
      const year = '2024';
      const twoDigitsYear = '24';

      it('should be formatted by year correctly.', () => {
        const datee = new Datee(`${year}-01-01T00:00:00.000Z`);

        expect(datee.format('YYYY')).toBe(year);
        expect(datee.format('YY')).toBe(twoDigitsYear);
      });

      it('should be formatted by year with duplicated format correctly.', () => {
        const datee = new Datee(`${year}-01-01T00:00:00.000Z`);

        expect(datee.format('YYYYYYYY')).toBe(`${year}${year}`);
        expect(datee.format('YYYYYY')).toBe(`${year}${twoDigitsYear}`);
      });
    });

    describe('Month', () => {
      it('should be formatted month correctly.', () => {
        const month = '01';
        const oneDigitMonth = '1';
        const monthString = 'January';
        const monthShortString = 'Jan';

        const datee = new Datee(`2024-${month}-01T00:00:00.000Z`);

        expect(datee.format('MMMM')).toBe(monthString);
        expect(datee.format('MMM')).toBe(monthShortString);
        expect(datee.format('MM')).toBe(month);
        expect(datee.format('M')).toBe(oneDigitMonth);
      });

      it('should be formatted by two-digit month correctly.', () => {
        const month = '10';
        const twoDigitMonth = '10';
        const monthString = 'October';
        const monthShortString = 'Oct';

        const datee = new Datee(`2024-${month}-01T00:00:00.000Z`);

        expect(datee.format('MMMM')).toBe(monthString);
        expect(datee.format('MMM')).toBe(monthShortString);
        expect(datee.format('MM')).toBe(month);
        expect(datee.format('M')).toBe(twoDigitMonth);
      });

      it('should be formatted by month with duplicated format correctly.', () => {
        const month = '01';
        const oneDigitMonth = '1';
        const monthString = 'January';
        const monthShortString = 'Jan';

        const datee = new Datee(`2024-${month}-01T00:00:00.000Z`);

        expect(datee.format('MMMMMMMM')).toBe(`${monthString}${monthString}`);
        expect(datee.format('MMMMMMM')).toBe(`${monthString}${monthShortString}`);
        expect(datee.format('MMMMMM')).toBe(`${monthString}${month}`);
        expect(datee.format('MMMMM')).toBe(`${monthString}${oneDigitMonth}`);
      });
    });

    describe('Date', () => {
      it('should be formatted by date correctly.', () => {
        const date = '01';
        const oneDigitDate = '1';

        const datee = new Datee(`2024-01-${date}T00:00:00.000Z`);

        expect(datee.format('DD')).toBe(date);
        expect(datee.format('D')).toBe(oneDigitDate);
      });

      it('should be formatted by two-digit date correctly.', () => {
        const date = '10';
        const twoDigitDate = '10';

        const datee = new Datee(`2024-01-${date}T00:00:00.000Z`);

        expect(datee.format('DD')).toBe(date);
        expect(datee.format('D')).toBe(twoDigitDate);
      });

      it('should be formatted by date with duplicated format correctly.', () => {
        const date = '01';
        const oneDigitDate = '1';

        const datee = new Datee(`2024-01-${date}T00:00:00.000Z`);

        expect(datee.format('DDDD')).toBe(`${date}${date}`);
        expect(datee.format('DDD')).toBe(`${date}${oneDigitDate}`);
      });
    });

    describe('Quarter', () => {
      it('should be formatted by quarter correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('Q')).toBe('0');
      });

      it('should be formatted by quarter with duplicated format correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('QQ')).toBe('00');
      });
    });

    describe('Day', () => {
      it('should be formatted by day correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('WWW')).toBe('Monday');
        expect(datee.format('WW')).toBe('Mon');
        expect(datee.format('W')).toBe('1');
      });

      it('should be formatted by day with duplicated format correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('WWWWWW')).toBe('MondayMonday');
        expect(datee.format('WWWWW')).toBe('MondayMon');
        expect(datee.format('WWWW')).toBe('Monday1');
      });
    });

    describe('Week', () => {
      it('should be formatted by week correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ww')).toBe('01');
        expect(datee.format('w')).toBe('1');
      });

      it('should be formatted by week with duplicated format correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('wwww')).toBe('0101');
        expect(datee.format('www')).toBe('011');
      });
    });

    describe('Hour', () => {
      it('should be formatted by hour correctly.', () => {
        const hour = '00';
        const oneDigitHour = '0';

        const datee = new Datee(`2024-01-01T${hour}:00:00.000Z`);

        expect(datee.format('HH')).toBe(hour);
        expect(datee.format('H')).toBe(oneDigitHour);
        // expect(datee.format('hh')).toBe('12');
        // expect(datee.format('h')).toBe('12');
      });

      it('should be formatted by hour with two-digit hour correctly.', () => {
        const hour = '10';
        const twoDigitHour = '10';

        const datee = new Datee(`2024-01-01T${hour}:00:00.000Z`);

        expect(datee.format('HH')).toBe(hour);
        expect(datee.format('H')).toBe(twoDigitHour);
      });

      it('should be formatted by hour with duplicated format correctly.', () => {
        const hour = '00';
        const oneDigitHour = '0';

        const datee = new Datee(`2024-01-01T${hour}:00:00.000Z`);

        expect(datee.format('HHHH')).toBe(`${hour}${hour}`);
        expect(datee.format('HHH')).toBe(`${hour}${oneDigitHour}`);
        // expect(datee.format('hh')).toBe('12');
        // expect(datee.format('h')).toBe('12');
      });
    });

    describe('Minute', () => {
      it('should be formatted by minute correctly.', () => {
        const minute = '00';
        const oneDigitMinute = '0';

        const datee = new Datee(`2024-01-01T00:${minute}:00.000Z`);

        expect(datee.format('mm')).toBe(minute);
        expect(datee.format('m')).toBe(oneDigitMinute);
      });

      it('should be formatted by minute with two-digit minute correctly.', () => {
        const minute = '10';
        const twoDigitMinute = '10';

        const datee = new Datee(`2024-01-01T00:${minute}:00.000Z`);

        expect(datee.format('mm')).toBe(minute);
        expect(datee.format('m')).toBe(twoDigitMinute);
      });

      it('should be formatted by minute with duplicated format correctly.', () => {
        const minute = '00';
        const oneDigitMinute = '0';

        const datee = new Datee(`2024-01-01T00:${minute}:00.000Z`);

        expect(datee.format('mmmm')).toBe(`${minute}${minute}`);
        expect(datee.format('mmm')).toBe(`${minute}${oneDigitMinute}`);
      });
    });

    describe('Second', () => {
      it('should be formatted by second correctly.', () => {
        const second = '00';
        const oneDigitSecond = '0';

        const datee = new Datee(`2024-01-01T00:00:${second}.000Z`);

        expect(datee.format('ss')).toBe(second);
        expect(datee.format('s')).toBe(oneDigitSecond);
      });

      it('should be formatted by second with two-digit second correctly.', () => {
        const second = '10';
        const twoDigitSecond = '10';

        const datee = new Datee(`2024-01-01T00:00:${second}.000Z`);

        expect(datee.format('ss')).toBe(second);
        expect(datee.format('s')).toBe(twoDigitSecond);
      });

      it('should be formatted by second with duplicated format correctly.', () => {
        const second = '00';
        const oneDigitSecond = '0';

        const datee = new Datee(`2024-01-01T00:00:${second}.000Z`);

        expect(datee.format('ssss')).toBe(`${second}${second}`);
        expect(datee.format('sss')).toBe(`${second}${oneDigitSecond}`);
      });
    });

    describe('Millisecond', () => {
      it('should be formatted by millisecond correctly.', () => {
        const millisecond = '000';
        const twoDigitMillisecond = '00';
        const oneDigitMillisecond = '0';

        const datee = new Datee(`2024-01-01T00:00:00.${millisecond}Z`);

        expect(datee.format('SSS')).toBe(millisecond);
        expect(datee.format('SS')).toBe(twoDigitMillisecond);
        expect(datee.format('S')).toBe(oneDigitMillisecond);
      });

      it('should be formatted by two-digit millisecond correctly.', () => {
        const millisecond = '010';
        const twoDigitMillisecond = '10';

        const datee = new Datee(`2024-01-01T00:00:00.${millisecond}Z`);

        expect(datee.format('SSS')).toBe(millisecond);
        expect(datee.format('SS')).toBe(twoDigitMillisecond);
        expect(datee.format('S')).toBe(twoDigitMillisecond);
      });

      it('should be formatted by three-digit millisecond correctly.', () => {
        const millisecond = '100';

        const datee = new Datee(`2024-01-01T00:00:00.${millisecond}Z`);

        expect(datee.format('SSS')).toBe(millisecond);
        expect(datee.format('SS')).toBe(millisecond);
        expect(datee.format('S')).toBe(millisecond);
      });

      it('should be formatted by millisecond with duplicated format correctly.', () => {
        const millisecond = '000';
        const twoDigitMillisecond = '00';
        const oneDigitMillisecond = '0';

        const datee = new Datee(`2024-01-01T00:00:00.${millisecond}Z`);

        expect(datee.format('SSSSSS')).toBe(`${millisecond}${millisecond}`);
        expect(datee.format('SSSSS')).toBe(`${millisecond}${twoDigitMillisecond}`);
        expect(datee.format('SSSS')).toBe(`${millisecond}${oneDigitMillisecond}`);
      });
    });

    describe('Timestamp', () => {
      it('should be formatted by timestamp correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('X')).toBe('1704067200000');
        expect(datee.format('x')).toBe('1704067200');
      });

      it('should be formatted by timestamp with duplicated format correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('XX')).toBe('17040672000001704067200000');
        expect(datee.format('xx')).toBe('17040672001704067200');
      });
    });

    describe('Timezone', () => {
      it('should be formatted by timezone correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ZZZZ')).toBe('+00:00');
        expect(datee.format('ZZZ')).toBe('GMT');
      });

      it('should be formatted by timezone with duplicated format correctly.', () => {
        const datee = new Datee('2024-01-01T00:00:00.000Z');

        expect(datee.format('ZZZZZZZZ')).toBe('+00:00+00:00');
        expect(datee.format('ZZZZZZZ')).toBe('+00:00GMT');
        expect(datee.format('ZZZZZZ')).toBe('+00:00ZZ');
        expect(datee.format('ZZZZZ')).toBe('+00:00Z');
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

  describe('getWeek() edge cases', () => {
    it('should return week 1 for Dec 31, 2024 (belongs to ISO week 1 of 2025).', () => {
      const datee = new Datee('2024-12-31T00:00:00.000Z');

      expect(datee.getWeek()).toBe(1);
    });

    it('should return week 1 for Jan 1, 2025 (Wednesday, belongs to ISO week 1).', () => {
      const datee = new Datee('2025-01-01T00:00:00.000Z');

      expect(datee.getWeek()).toBe(1);
    });

    it('should return week 29 for July 15, 2024.', () => {
      const datee = new Datee('2024-07-15T00:00:00.000Z');

      expect(datee.getWeek()).toBe(29);
    });

    it('should return week 53 for Dec 31, 2020 (ISO week 53 edge case).', () => {
      const datee = new Datee('2020-12-31T00:00:00.000Z');

      expect(datee.getWeek()).toBe(53);
    });

    it('should return week 1 for Jan 1, 2024 (Monday, start of ISO week 1).', () => {
      const datee = new Datee('2024-01-01T00:00:00.000Z');

      expect(datee.getWeek()).toBe(1);
    });
  });

  describe('Combined format strings', () => {
    it('should format full ISO datetime with YYYY-MM-DDTHH:mm:ss.SSSZZZ.', () => {
      const datee = new Datee('2024-07-15T14:30:45.123Z');

      expect(datee.format('YYYY-MM-DDTHH:mm:ss.SSSZZZ')).toBe('2024-07-15T14:30:45.123GMT');
    });

    it('should format date only with YYYY/MM/DD.', () => {
      const datee = new Datee('2024-07-15T00:00:00.000Z');

      expect(datee.format('YYYY/MM/DD')).toBe('2024/07/15');
    });

    it('should format time only with HH:mm:ss.', () => {
      const datee = new Datee('2024-01-01T14:30:45.000Z');

      expect(datee.format('HH:mm:ss')).toBe('14:30:45');
    });
  });

  describe('formatQuarter edge cases', () => {
    it('should return 0 for Q1 (January).', () => {
      const datee = new Datee('2024-01-15T00:00:00.000Z');

      expect(datee.format('Q')).toBe('0');
    });

    it('should return 1 for Q2 (April).', () => {
      const datee = new Datee('2024-04-15T00:00:00.000Z');

      expect(datee.format('Q')).toBe('1');
    });

    it('should return 2 for Q3 (July).', () => {
      const datee = new Datee('2024-07-15T00:00:00.000Z');

      expect(datee.format('Q')).toBe('2');
    });

    it('should return 3 for Q4 (October).', () => {
      const datee = new Datee('2024-10-15T00:00:00.000Z');

      expect(datee.format('Q')).toBe('3');
    });

    it('should return 0 for March (last month of Q1).', () => {
      const datee = new Datee('2024-03-31T00:00:00.000Z');

      expect(datee.format('Q')).toBe('0');
    });

    it('should return 3 for December (last month of Q4).', () => {
      const datee = new Datee('2024-12-31T00:00:00.000Z');

      expect(datee.format('Q')).toBe('3');
    });
  });

  describe('getWeek() called via format', () => {
    it('should format ww as 01 for Jan 1, 2024.', () => {
      const datee = new Datee('2024-01-01T00:00:00.000Z');

      expect(datee.format('ww')).toBe('01');
    });

    it('should format ww as 29 for July 15, 2024.', () => {
      const datee = new Datee('2024-07-15T00:00:00.000Z');

      expect(datee.format('ww')).toBe('29');
    });

    it('should format ww as 53 for Dec 31, 2020.', () => {
      const datee = new Datee('2020-12-31T00:00:00.000Z');

      expect(datee.format('ww')).toBe('53');
    });

    it('should format ww as 01 for Dec 31, 2024 (ISO week 1 of 2025).', () => {
      const datee = new Datee('2024-12-31T00:00:00.000Z');

      expect(datee.format('ww')).toBe('01');
    });

    it('should format w (without padding) for single-digit weeks.', () => {
      const datee = new Datee('2024-01-01T00:00:00.000Z');

      expect(datee.format('w')).toBe('1');
    });
  });
});
