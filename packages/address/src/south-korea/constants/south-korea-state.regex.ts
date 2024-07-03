import { SouthKoreaStatePatternBuilder } from '../utils';

import { SOUTH_KOREA_STATE_NAME, SOUTH_KOREA_STATE_LEVEL } from './south-korea-state.constant';

export const SOUTH_KOREA_STATE_REGEX = {
  //#region 특별시
  SEOUL: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.SEOUL,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isSpecial: true,
  }).build(),
  //#endregion

  //#region 광역시
  BUSAN: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.BUSAN,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  DAEGU: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.DAEGU,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  INCHEON: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.INCHEON,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  GWANGJU: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.GWANGJU,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  DAEJEON: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.DAEJEON,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  ULSAN: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.ULSAN,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isMetropolitan: true,
  }).build(),
  //#endregion

  //#region 특별자치시
  SEJONG: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.SEJONG,
    suffix: SOUTH_KOREA_STATE_LEVEL.SI,
    isSpecial: true,
    isAutonomy: true,
  }).build(),
  //#endregion

  //#region 도
  GYEONGGI: new SouthKoreaStatePatternBuilder({ state: SOUTH_KOREA_STATE_NAME.GYEONGGI, suffix: SOUTH_KOREA_STATE_LEVEL.DO }).build(),
  CHUNGCHEONG: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.CHUNGCHEONG,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    hasDirection: true,
    isAbbreviatible: true,
  }).build(),
  JEONRA: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.JEONRA,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    hasDirection: true,
    isAbbreviatible: true,
  }).build(),
  GYEONGSANG: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.GYEONGSANG,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    hasDirection: true,
    isAbbreviatible: true,
  }).build(),
  //#endregion

  //#region 특별자치도
  GANGWON: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.GANGWON,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    isSpecial: true,
    isAutonomy: true,
  }).build(),
  JEONBUK: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.JEONBUK,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    isSpecial: true,
    isAutonomy: true,
  }).build(),
  JEJU: new SouthKoreaStatePatternBuilder({
    state: SOUTH_KOREA_STATE_NAME.JEJU,
    suffix: SOUTH_KOREA_STATE_LEVEL.DO,
    isSpecial: true,
    isAutonomy: true,
  }).build(),
  //#endregion
} as const;
