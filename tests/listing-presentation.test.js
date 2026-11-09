import assert from 'node:assert/strict';
import test from 'node:test';
import { bedroomSummary } from '../listing-presentation.js';

test('listing presentation labels zero-bedroom apartments as studios', () => {
  assert.equal(bedroomSummary({ propertyType: 'apartment', bedrooms: 0 }), 'Studio');
  assert.equal(bedroomSummary({ propertyType: 'apartment', bedrooms: 1 }), '1 bedroom');
  assert.equal(bedroomSummary({ propertyType: 'house', bedrooms: 2 }), '2 bedrooms');
});
