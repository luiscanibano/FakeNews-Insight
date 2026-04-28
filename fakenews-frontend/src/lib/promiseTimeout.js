/**
 * @file promiseTimeout.js
 * @description Utilidad para envolver promesas con un tiempo límite y mensaje de error legible.
 */

/** Resuelve la promesa o rechaza con `timeoutMessage` si excede `timeoutMs`. */
export const withTimeout = (promise, timeoutMs, timeoutMessage) =>
  new Promise((resolve, reject) => {
    const timeoutId = window.setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, timeoutMs);

    Promise.resolve(promise)
      .then((value) => {
        window.clearTimeout(timeoutId);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timeoutId);
        reject(error);
      });
  });
