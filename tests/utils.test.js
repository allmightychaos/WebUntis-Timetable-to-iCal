const assert = require('assert');
const { getNextSchoolYearStart } = require('../core/utils');

function withMockedCurrentDate(dateString, fn) {
  const RealDate = Date;
  global.Date = class extends RealDate {
    constructor(...args) {
      if (args.length === 0) {
        return new RealDate(dateString);
      }
      return new RealDate(...args);
    }
  };
  try {
    fn();
  } finally {
    global.Date = RealDate;
  }
}

withMockedCurrentDate('2023-06-01T00:00:00Z', () => {
  const nextStart = getNextSchoolYearStart();
  assert.strictEqual(nextStart.getDay(), 1, '2023 start should be a Monday');
});

withMockedCurrentDate('2024-06-01T00:00:00Z', () => {
  const nextStart = getNextSchoolYearStart();
  assert.strictEqual(nextStart.getDay(), 1, '2024 start should be a Monday');
});

console.log('All tests passed.');

