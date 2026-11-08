export function isEmailVerificationRequired(settingValue) {
  return settingValue === undefined
    || settingValue === null
    || !(settingValue === false || settingValue === 0 || String(settingValue) === '0');
}
