/**
 * @file setup.js
 * @description Setup global de tests: extiende `expect` con matchers de jest-dom.
 */

import "@testing-library/jest-dom/vitest";
import { beforeEach } from "vitest";

import i18n from "../lib/i18n";

beforeEach(async () => {
	await i18n.changeLanguage("es");
});
