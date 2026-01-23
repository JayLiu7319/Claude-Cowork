// Translation resources for i18next
// Used by both main process and UI layer

import enUi from './en/ui.json';
import enMain from './en/main.json';
import enCommon from './en/common.json';
import zhCnUi from './zh-CN/ui.json';
import zhCnMain from './zh-CN/main.json';
import zhCnCommon from './zh-CN/common.json';

export const resources = {
  en: {
    ui: enUi,
    main: enMain,
    common: enCommon
  },
  'zh-CN': {
    ui: zhCnUi,
    main: zhCnMain,
    common: zhCnCommon
  }
} as const;

export type TranslationResources = typeof resources;
