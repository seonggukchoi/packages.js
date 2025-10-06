import { SouthKoreaAddress } from './south-korea-address';

describe('SouthKoreaAddress', () => {
  describe('parse', () => {
    it.each([
      '서울 중구 세종대로 110 서울특별시청',
      '서울 중구 태평로1가 31 서울특별시청',
      '제주 제주시 광양9길 10 제주시청',
      '제주 제주시 이도이동 1176-1 제주시청',
      '경기 수원시 팔달구 효원로 241 수원시청',
      '경기 수원시 팔달구 인계동 1111 수원시청',
    ])('should parse the address correctly.', async (address) => {
      expect(new SouthKoreaAddress(address).parsedAddress).toBe(address);
    });
  });
});
