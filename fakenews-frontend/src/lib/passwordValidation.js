export const MIN_PASSWORD_LENGTH = 8;

export const getPasswordRequirementState = (password = "") => ({
  length: password.length >= MIN_PASSWORD_LENGTH,
  lowercase: /[a-z]/.test(password),
  uppercase: /[A-Z]/.test(password),
  number: /\d/.test(password),
});

export const getPasswordValidationErrorKey = (password, prefix) => {
  const state = getPasswordRequirementState(password);

  if (!state.length) {
    return `${prefix}.errorPasswordLength`;
  }

  if (!state.lowercase) {
    return `${prefix}.errorPasswordLowercase`;
  }

  if (!state.uppercase) {
    return `${prefix}.errorPasswordUppercase`;
  }

  if (!state.number) {
    return `${prefix}.errorPasswordNumber`;
  }

  return "";
};