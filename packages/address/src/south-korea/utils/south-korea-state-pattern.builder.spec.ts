import { SOUTH_KOREA_STATE_CLASSIFIER, SOUTH_KOREA_STATE_DIRECTION, SOUTH_KOREA_STATE_NAME, SOUTH_KOREA_STATE_LEVEL } from '../constants';

import { SouthKoreaStatePatternBuilder } from './south-korea-state-pattern.builder';

describe('SouthKoreaStatePatternBuilder', () => {
  describe('build', () => {
    it('should return a RegExp instance.', () => {
      const result = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.GYEONGGI,
        suffix: SOUTH_KOREA_STATE_LEVEL.DO,
      }).build();

      expect(result).toBeInstanceOf(RegExp);
    });

    it('should build a basic pattern with just state and suffix.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.GYEONGGI,
        suffix: SOUTH_KOREA_STATE_LEVEL.DO,
      }).build();

      expect(regex.test('경기도')).toBeTruthy();
      expect(regex.test('경기')).toBeTruthy();
      expect(regex.test('시장')).toBeFalsy();
    });

    it('should build a pattern with isSpecial option.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.SEOUL,
        suffix: SOUTH_KOREA_STATE_LEVEL.SI,
        isSpecial: true,
      }).build();

      expect(regex.test('서울')).toBeTruthy();
      expect(regex.test(`서울${SOUTH_KOREA_STATE_CLASSIFIER.SPECIAL}${SOUTH_KOREA_STATE_LEVEL.SI}`)).toBeTruthy();
      expect(regex.test('서울시')).toBeTruthy();
    });

    it('should build a pattern with isMetropolitan option.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.BUSAN,
        suffix: SOUTH_KOREA_STATE_LEVEL.SI,
        isMetropolitan: true,
      }).build();

      expect(regex.test('부산')).toBeTruthy();
      expect(regex.test(`부산${SOUTH_KOREA_STATE_CLASSIFIER.METROPOLITAN}${SOUTH_KOREA_STATE_LEVEL.SI}`)).toBeTruthy();
      expect(regex.test('부산시')).toBeTruthy();
    });

    it('should build a pattern with isAutonomy option.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.JEJU,
        suffix: SOUTH_KOREA_STATE_LEVEL.DO,
        isAutonomy: true,
      }).build();

      expect(regex.test('제주')).toBeTruthy();
      expect(regex.test(`제주${SOUTH_KOREA_STATE_CLASSIFIER.AUTONOMY}${SOUTH_KOREA_STATE_LEVEL.DO}`)).toBeTruthy();
      expect(regex.test('제주도')).toBeTruthy();
    });

    it('should build a pattern with isSpecial and isAutonomy options (multiple classifiers).', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.SEJONG,
        suffix: SOUTH_KOREA_STATE_LEVEL.SI,
        isSpecial: true,
        isAutonomy: true,
      }).build();

      expect(regex.test('세종')).toBeTruthy();
      expect(
        regex.test(`세종${SOUTH_KOREA_STATE_CLASSIFIER.SPECIAL}${SOUTH_KOREA_STATE_CLASSIFIER.AUTONOMY}${SOUTH_KOREA_STATE_LEVEL.SI}`),
      ).toBeTruthy();
    });

    it('should build a pattern with hasDirection option.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.CHUNGCHEONG,
        suffix: SOUTH_KOREA_STATE_LEVEL.DO,
        hasDirection: true,
      }).build();

      expect(regex.test(`충청${SOUTH_KOREA_STATE_DIRECTION.NORTH}${SOUTH_KOREA_STATE_LEVEL.DO}`)).toBeTruthy();
      expect(regex.test(`충청${SOUTH_KOREA_STATE_DIRECTION.SOUTH}${SOUTH_KOREA_STATE_LEVEL.DO}`)).toBeTruthy();
    });

    it('should build a pattern with isAbbreviatible option.', () => {
      const regex = new SouthKoreaStatePatternBuilder({
        state: SOUTH_KOREA_STATE_NAME.CHUNGCHEONG,
        suffix: SOUTH_KOREA_STATE_LEVEL.DO,
        isAbbreviatible: true,
      }).build();

      expect(regex.test(`충${SOUTH_KOREA_STATE_DIRECTION.NORTH}`)).toBeTruthy();
      expect(regex.test(`충${SOUTH_KOREA_STATE_DIRECTION.SOUTH}`)).toBeTruthy();
      expect(regex.test(`충청${SOUTH_KOREA_STATE_DIRECTION.NORTH}${SOUTH_KOREA_STATE_LEVEL.DO}`)).toBeTruthy();
    });
  });
});
