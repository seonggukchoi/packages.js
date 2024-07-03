import { SOUTH_KOREA_STATE_ALTERNATIVE_NAMES } from './south-korea-state.constant';
import { SOUTH_KOREA_STATE_REGEX } from './south-korea-state.regex';

describe('SouthKoreaStateRegex', () => {
  describe('특별시', () => {
    describe('서울', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.SEOUL).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.SEOUL)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.SEOUL.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.SEOUL.test('시장')).toBeFalsy();
      });
    });
  });

  describe('광역시', () => {
    describe('부산', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.BUSAN).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.BUSAN)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.BUSAN.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.BUSAN.test('시장')).toBeFalsy();
      });
    });

    describe('대구', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEGU).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.DAEGU)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEGU.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEGU.test('시장')).toBeFalsy();
      });
    });

    describe('인천', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.INCHEON).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.INCHEON)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.INCHEON.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.INCHEON.test('시장')).toBeFalsy();
      });
    });

    describe('광주', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GWANGJU).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.GWANGJU)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.GWANGJU.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GWANGJU.test('시장')).toBeFalsy();
      });
    });

    describe('대전', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEJEON).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.DAEJEON)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEJEON.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.DAEJEON.test('시장')).toBeFalsy();
      });
    });

    describe('울산', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.ULSAN).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.ULSAN)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.ULSAN.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.ULSAN.test('시장')).toBeFalsy();
      });
    });
  });

  describe('특별자치시', () => {
    describe('세종', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.SEJONG).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.SEJONG)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.SEJONG.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.SEJONG.test('시장')).toBeFalsy();
      });
    });
  });

  describe('도', () => {
    describe('경기', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GYEONGGI).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.GYEONGGI)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.GYEONGGI.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GYEONGGI.test('시장')).toBeFalsy();
      });
    });

    describe('충청', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.CHUNGCHEONG).toBeInstanceOf(RegExp);
      });

      it.each([...SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.NORTH_CHUNGCHEONG, ...SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.SOUTH_CHUNGCHEONG])(
        'should be matched with %s.',
        (state) => {
          expect(SOUTH_KOREA_STATE_REGEX.CHUNGCHEONG.test(state)).toBeTruthy();
        },
      );

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.CHUNGCHEONG.test('시장')).toBeFalsy();
      });
    });

    describe('전라', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONRA).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.SOUTH_JEONRA)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONRA.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONRA.test('시장')).toBeFalsy();
      });
    });

    describe('경상', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GYEONGSANG).toBeInstanceOf(RegExp);
      });

      it.each([...SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.NORTH_GYEONGSANG, ...SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.SOUTH_GYEONGSANG])(
        'should be matched with %s.',
        (state) => {
          expect(SOUTH_KOREA_STATE_REGEX.GYEONGSANG.test(state)).toBeTruthy();
        },
      );

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GYEONGSANG.test('시장')).toBeFalsy();
      });
    });
  });

  describe('특별자치도', () => {
    describe('강원', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GANGWON).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.GANGWON)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.GANGWON.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.GANGWON.test('시장')).toBeFalsy();
      });
    });

    describe('전북', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONBUK).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.JEONBUK)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONBUK.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEONBUK.test('시장')).toBeFalsy();
      });
    });

    describe('제주', () => {
      it('should be generated correctly.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEJU).toBeInstanceOf(RegExp);
      });

      it.each(SOUTH_KOREA_STATE_ALTERNATIVE_NAMES.JEJU)('should be matched with %s.', (state) => {
        expect(SOUTH_KOREA_STATE_REGEX.JEJU.test(state)).toBeTruthy();
      });

      it('should not be matched any strange string.', () => {
        expect(SOUTH_KOREA_STATE_REGEX.JEJU.test('시장')).toBeFalsy();
      });
    });
  });
});
