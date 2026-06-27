import { describe, expect, it } from 'vitest';
import { defaultGetToken, defaultValidate, resolveGuardOptions } from './options';

describe('defaultGetToken', () => {
  it('extracts a Bearer token', () => {
    expect(defaultGetToken({ headers: { authorization: 'Bearer abc.def' } })).toBe('abc.def');
  });

  it('returns undefined without a Bearer prefix', () => {
    expect(defaultGetToken({ headers: { authorization: 'Basic xyz' } })).toBeUndefined();
  });

  it('returns undefined when the header is missing', () => {
    expect(defaultGetToken({ headers: {} })).toBeUndefined();
  });

  it('returns undefined when the header is not a string', () => {
    expect(defaultGetToken({ headers: { authorization: ['Bearer a'] } })).toBeUndefined();
  });

  it('is null-safe', () => {
    expect(defaultGetToken(undefined)).toBeUndefined();
  });

  it('is safe when the request has no headers', () => {
    expect(defaultGetToken({})).toBeUndefined();
  });
});

describe('defaultValidate', () => {
  it('returns the payload unchanged', () => {
    const payload = { sub: 'u' };
    expect(defaultValidate(payload, {})).toBe(payload);
  });
});

describe('resolveGuardOptions', () => {
  it('applies defaults', () => {
    const o = resolveGuardOptions();
    expect(o.getToken).toBe(defaultGetToken);
    expect(o.validate).toBe(defaultValidate);
    expect(o.attachTo).toBe('user');
    expect(o.verifyOptions).toBeUndefined();
  });

  it('honors overrides', () => {
    const getToken = () => 'x';
    const validate = () => ({});
    const verifyOptions = { issuer: 'me' };
    const o = resolveGuardOptions({ getToken, validate, attachTo: 'principal', verifyOptions });
    expect(o.getToken).toBe(getToken);
    expect(o.validate).toBe(validate);
    expect(o.attachTo).toBe('principal');
    expect(o.verifyOptions).toBe(verifyOptions);
  });
});
