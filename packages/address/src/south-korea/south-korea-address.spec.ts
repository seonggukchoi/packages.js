import { SouthKoreaAddress } from './south-korea-address';

describe('SouthKoreaAddress', () => {
  describe('constructor', () => {
    it('should throw an error for an unparseable address.', () => {
      expect(() => new SouthKoreaAddress('invalid address !@#$%')).toThrow('Invalid address.');
    });
  });

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

  describe('getters', () => {
    it('should return the original address via originalAddress getter.', () => {
      const address = '서울 중구 세종대로 110 서울특별시청';
      const parsed = new SouthKoreaAddress(address);

      expect(parsed.originalAddress).toBe(address);
    });

    it('should return the parsed address via parsedAddress getter.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.parsedAddress).toBe('서울 중구 세종대로 110 서울특별시청');
    });

    it('should return the postal code when present.', () => {
      const parsed = new SouthKoreaAddress('(04524) 서울 중구 세종대로 110 서울특별시청');

      expect(parsed.postalCode).toBe('(04524)');
    });

    it('should return undefined for postal code when not present.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.postalCode).toBeUndefined();
    });

    it('should return the state.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.state).toBe('서울');
    });

    it('should return the region.', () => {
      const parsed = new SouthKoreaAddress('경기 수원시 팔달구 효원로 241 수원시청');

      expect(parsed.region).toBe('수원시');
    });

    it('should return the city.', () => {
      const parsed = new SouthKoreaAddress('경기 수원시 팔달구 효원로 241 수원시청');

      expect(parsed.city).toBe('팔달구');
    });

    it('should return the street.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.street).toBe('세종대로');
    });

    it('should return the building number.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.buildingNumber).toBe('110');
    });

    it('should return the detail.', () => {
      const parsed = new SouthKoreaAddress('서울 중구 세종대로 110 서울특별시청');

      expect(parsed.detail).toBe('서울특별시청');
    });
  });

  describe('region equals city', () => {
    it('should exclude region from parsedAddress when region and city are both undefined.', () => {
      const parsed = new SouthKoreaAddress('서울 세종대로 110 서울특별시청');

      expect(parsed.region).toBeUndefined();
      expect(parsed.city).toBeUndefined();
      expect(parsed.parsedAddress).toBe('서울 세종대로 110 서울특별시청');
    });
  });
});
